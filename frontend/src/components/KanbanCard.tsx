import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CardDTO, ListDTO } from '@/types';
import { boardService } from '@/services/boardService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Trash2, Edit2 } from 'lucide-react';
import CardDetailsModal from './CardDetailsModal';

interface KanbanCardProps {
  card: CardDTO;
  index: number;
  listId: number;
  boardId: number;
}

// Helper function to get initials from name
const getInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function KanbanCard({ card, index, listId, boardId }: KanbanCardProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description || '');

  const updateCardMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      boardService.updateCard(card.id, { ...data, listId: card.listId }),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['board', boardId] });
      setIsEditing(false);
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: () => boardService.deleteCard(card.id),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['board', boardId] });
    },
  });

  const handleEdit = () => {
    setEditTitle(card.title);
    setEditDescription(card.description || '');
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTitle.trim()) {
      updateCardMutation.mutate({
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
    }
  };

  const handleCancel = () => {
    setEditTitle(card.title);
    setEditDescription(card.description || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      deleteCardMutation.mutate();
    }
  };

  return (
    <>
      <Draggable draggableId={card.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`bg-white rounded border border-gray-200 cursor-move hover:shadow-md transition-shadow ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : 'shadow-sm'
          }`}
        >
          <div {...provided.dragHandleProps} className="p-3">
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-2">
                <Input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Card title"
                  className="h-8 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full min-h-[60px] px-3 py-2 text-xs border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={updateCardMutation.isPending}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between mb-2">
                  <h3 
                    className="font-medium text-sm text-gray-900 flex-1 cursor-pointer hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsModalOpen(true);
                    }}
                  >
                    {card.title}
                  </h3>
                  <div className="flex gap-1 ml-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsModalOpen(true);
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
                        handleDelete();
                      }}
                      disabled={deleteCardMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {card.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">{card.description}</p>
                )}
              </>
            )}
            <div className="flex items-center justify-between mt-2">
              {card.assigneeName && (
                <div className="flex items-center gap-1" title={`Assigned to: ${card.assigneeName}`}>
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                    {getInitials(card.assigneeName)}
                  </div>
                </div>
              )}
              {card.dueDate && (
                <div className="text-xs text-gray-500">
                  Due: {new Date(card.dueDate).toLocaleDateString()}
                </div>
              )}
            </div>
            {card.creatorName && (
              <div className="mt-1 text-xs text-gray-400" title={`Created by: ${card.creatorName}`}>
                Created by {card.creatorName}
              </div>
            )}
          </div>
        </div>
      )}
      </Draggable>
      <CardDetailsModal
        card={card}
        boardId={boardId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}


