import { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boardService } from '@/services/boardService';
import { useKanbanStore } from '@/store/kanbanStore';
import { BoardDTO, MoveCardRequest } from '@/types';
import KanbanList from './KanbanList';
import { Button } from './ui/button';
import { Input } from './ui/input';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  board: BoardDTO;
}

export default function KanbanBoard({ board }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const { moveCardOptimistic, previousBoardState, rollbackBoard } = useKanbanStore();
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

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
      // Show error message
      const errorMessage = error.response?.data?.message || error.message || 'Failed to move card';
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
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const cardId = Number(draggableId);
    const targetListId = Number(destination.droppableId);
    const newPosition = destination.index;

    moveCardMutation.mutate({
      cardId,
      data: { targetListId, newPosition },
    });
  };

  return (
    <div className="h-full overflow-x-auto bg-gray-50">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 h-full">
          {board.lists.map((list) => (
            <KanbanList key={list.id} list={list} />
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
      </DragDropContext>
    </div>
  );
}

