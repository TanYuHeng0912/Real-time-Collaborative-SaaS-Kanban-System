import { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

  const deleteListMutation = useMutation({
    mutationFn: () => boardService.deleteList(list.id),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['board', list.boardId] });
    },
  });

  const handleDeleteList = () => {
    if (window.confirm(`Are you sure you want to delete the list "${list.name}"? This will also delete all cards in this list.`)) {
      deleteListMutation.mutate();
    }
  };

  const createCardMutation = useMutation({
    mutationFn: (title: string) =>
      boardService.createCard({ title, listId: list.id }),
    onSuccess: () => {
      // Force refetch to update the UI immediately
      queryClient.refetchQueries({ queryKey: ['board', list.boardId] });
      setNewCardTitle('');
      setIsCreatingCard(false);
    },
    onError: (error: any) => {
      console.error('Error creating card:', error);
      alert(error.response?.data?.message || 'Failed to create card. Please try again.');
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
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-900 uppercase tracking-wide flex-1">{list.name}</h2>
        <div className="flex gap-1 ml-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              // Edit functionality can be added later
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

