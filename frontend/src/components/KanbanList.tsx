import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { boardService } from '@/services/boardService';
import { ListDTO } from '@/types';
import KanbanCard from './KanbanCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Edit2 } from 'lucide-react';

interface KanbanListProps {
  list: ListDTO;
}

export default function KanbanList({ list }: KanbanListProps) {
  const queryClient = useQueryClient();
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isEditingList, setIsEditingList] = useState(false);
  const [editListName, setEditListName] = useState(list.name);

  const updateListMutation = useMutation({
    mutationFn: (name: string) => boardService.updateList(list.id, { name, boardId: list.boardId }),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['board', list.boardId] });
      setIsEditingList(false);
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: () => boardService.deleteList(list.id),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['board', list.boardId] });
    },
  });

  const handleEditList = () => {
    setEditListName(list.name);
    setIsEditingList(true);
  };

  const handleSaveList = (e: React.FormEvent) => {
    e.preventDefault();
    if (editListName.trim() && editListName.trim() !== list.name) {
      updateListMutation.mutate(editListName.trim());
    } else {
      setIsEditingList(false);
    }
  };

  const handleCancelEditList = () => {
    setEditListName(list.name);
    setIsEditingList(false);
  };

  const handleDeleteList = () => {
    if (window.confirm(`Are you sure you want to delete the list "${list.name}"? This will also delete all cards in this list.`)) {
      deleteListMutation.mutate();
    }
  };

  const createCardMutation = useMutation({
    mutationFn: (title: string) =>
      boardService.createCard({ title, listId: list.id }),
    onSuccess: () => {
      // Invalidate query to trigger refetch, but don't block UI
      queryClient.invalidateQueries({ queryKey: ['board', list.boardId] });
      setNewCardTitle('');
      setIsCreatingCard(false);
    },
    onError: (error: any) => {
      console.error('Error creating card:', error);
      toast.error(error.response?.data?.message || 'Failed to create card. Please try again.');
    },
  });

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCardTitle.trim()) {
      createCardMutation.mutate(newCardTitle.trim());
    }
  };

  return (
    <div className="flex-shrink-0 w-80 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-3 border-b border-gray-200">
        {isEditingList ? (
          <form onSubmit={handleSaveList} className="flex items-center gap-2">
            <Input
              autoFocus
              value={editListName}
              onChange={(e) => setEditListName(e.target.value)}
              className="h-7 text-sm font-semibold uppercase"
            />
            <Button
              type="submit"
              size="sm"
              className="h-7 text-xs"
              disabled={updateListMutation.isPending}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={handleCancelEditList}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-900 uppercase tracking-wide flex-1">{list.name}</h2>
            <div className="flex gap-1 ml-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-gray-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditList();
                }}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteList();
                }}
                disabled={deleteListMutation.isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
      <Droppable droppableId={list.id.toString()}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 p-3 min-h-[200px] ${
              snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-50'
            }`}
          >
            {list.cards.map((card, index) => (
              <KanbanCard key={card.id} card={card} index={index} listId={list.id} boardId={list.boardId} />
            ))}
            {provided.placeholder}
            {isCreatingCard ? (
              <form onSubmit={handleCreateCard} className="bg-white rounded border border-gray-200 p-2 shadow-sm">
                <Input
                  autoFocus
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="Enter card title"
                  className="mb-2 h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={createCardMutation.isPending} className="h-7 text-xs">
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setIsCreatingCard(false);
                      setNewCardTitle('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreatingCard(true)}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
              >
                + Add a card
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

