import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CardDTO, ListDTO } from '@/types';
import { boardService } from '@/services/boardService';
import { Button } from './ui/button';
import { Trash2, Edit2 } from 'lucide-react';

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

  const deleteCardMutation = useMutation({
    mutationFn: () => boardService.deleteCard(card.id),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['board', boardId] });
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      deleteCardMutation.mutate();
    }
  };

  return (
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
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-sm text-gray-900 flex-1">{card.title}</h3>
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
  );
}

