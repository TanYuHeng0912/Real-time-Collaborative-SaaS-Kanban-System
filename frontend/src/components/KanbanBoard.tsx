import { useState } from 'react';
import { DragDropContext, DropResult, Droppable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boardService } from '@/services/boardService';
import { useKanbanStore } from '@/store/kanbanStore';
import { BoardDTO, MoveCardRequest, MoveListRequest } from '@/types';
import KanbanList from './KanbanList';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  board: BoardDTO;
  searchQuery?: string;
}

export default function KanbanBoard({ board, searchQuery = '' }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const { moveCardOptimistic, previousBoardState, rollbackBoard, currentBoard } = useKanbanStore();
  const isSystemAdmin = useAuthStore((state) => state.isAdmin);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  // For now, allow list dragging for system admins - backend will enforce workspace admin check
  // TODO: Could add workspace admin check here for better UX
  const canMoveLists = isSystemAdmin();

  const createListMutation = useMutation({
    mutationFn: (name: string) => boardService.createList({ name, boardId: board.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
      setNewListName('');
      setIsCreatingList(false);
    },
  });

  const moveCardMutation = useMutation({
    mutationFn: ({ cardId, data }: { cardId: number; data: MoveCardRequest }) =>
      boardService.moveCard(cardId, data),
    onMutate: async ({ cardId, data }) => {
      // Optimistic update
      moveCardOptimistic(cardId, data.targetListId, data.newPosition);
    },
    onError: (error: any) => {
      // Rollback on error
      if (previousBoardState) {
        rollbackBoard(previousBoardState);
      }
      // Show error message with detailed logging
      console.error('Card move error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to move card';
      toast.error(errorMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
    },
  });

  const moveListMutation = useMutation({
    mutationFn: ({ listId, data }: { listId: number; data: MoveListRequest }) =>
      boardService.moveList(listId, data),
    onMutate: async ({ listId, data }) => {
      // Optimistic update for list position
      if (currentBoard) {
        const previousState = JSON.parse(JSON.stringify(currentBoard));
        const sortedLists = [...currentBoard.lists].sort((a, b) => a.position - b.position);
        const listIndex = sortedLists.findIndex(l => l.id === listId);
        
        if (listIndex !== -1) {
          const [movedList] = sortedLists.splice(listIndex, 1);
          sortedLists.splice(data.newPosition, 0, movedList);
          
          // Update positions
          const updatedLists = sortedLists.map((list, idx) => ({
            ...list,
            position: idx
          }));
          
          // Save previous state and update current board
          useKanbanStore.setState({ 
            previousBoardState: previousState,
            currentBoard: { ...currentBoard, lists: updatedLists }
          });
        }
      }
    },
    onError: (error: any) => {
      // Rollback on error
      if (previousBoardState) {
        rollbackBoard(previousBoardState);
      }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to move list';
      toast.error(errorMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
    },
  });

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
      createListMutation.mutate(newListName.trim());
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    
    // Check if this is a list drag (destination.droppableId is "lists" and draggableId starts with "list-")
    if (type === 'LIST' || (destination.droppableId === 'lists' && draggableId.startsWith('list-'))) {
      if (canMoveLists && destination.index !== source.index) {
        const listId = Number(draggableId.replace('list-', ''));
        moveListMutation.mutate({
          listId,
          data: { newPosition: destination.index },
        });
      }
      return;
    }
    
    // Otherwise, it's a card drag (destination is a list ID, which is a number string)
    // Card droppableId is the list ID, not "lists"
    const targetListId = Number(destination.droppableId);
    if (!isNaN(targetListId)) {
      // This is a card being moved to a list
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      const cardId = Number(draggableId);
      const newPosition = destination.index;

      moveCardMutation.mutate({
        cardId,
        data: { targetListId, newPosition },
      });
    }
  };

  const sortedLists = board.lists.slice().sort((a, b) => a.position - b.position);

  return (
    <div className="h-full overflow-x-auto bg-gray-50">
      <DragDropContext onDragEnd={handleDragEnd}>
        {canMoveLists ? (
          <Droppable droppableId="lists" direction="horizontal" type="LIST">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 p-4 h-full"
              >
                {sortedLists.map((list, index) => (
                  <KanbanList 
                    key={list.id} 
                    list={list} 
                    index={index}
                    isDraggable={canMoveLists}
                    searchQuery={searchQuery}
                  />
                ))}
                {provided.placeholder}
          <div className="flex-shrink-0 w-80">
            {isCreatingList ? (
              <form onSubmit={handleCreateList} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <Input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Enter list title"
                  className="mb-2 h-9"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={createListMutation.isPending} className="h-8">
                    Add List
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      setIsCreatingList(false);
                      setNewListName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreatingList(true)}
                className="w-full h-12 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                + Add another list
              </button>
            )}
          </div>
              </div>
            )}
          </Droppable>
        ) : (
          <div className="flex gap-4 p-4 h-full">
            {sortedLists.map((list, index) => (
              <KanbanList 
                key={list.id} 
                list={list} 
                index={index}
                isDraggable={false}
                searchQuery={searchQuery}
              />
            ))}
            <div className="flex-shrink-0 w-80">
              {isCreatingList ? (
                <form onSubmit={handleCreateList} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                  <Input
                    autoFocus
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Enter list title"
                    className="mb-2 h-9"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={createListMutation.isPending} className="h-8">
                      Add List
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => {
                        setIsCreatingList(false);
                        setNewListName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreatingList(true)}
                  className="w-full h-12 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-gray-600 hover:text-blue-600 font-medium transition-colors"
                >
                  + Add another list
                </button>
              )}
            </div>
          </div>
        )}
      </DragDropContext>
    </div>
  );
}

