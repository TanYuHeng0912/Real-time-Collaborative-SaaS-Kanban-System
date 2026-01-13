import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CardDTO } from '@/types';
import { boardService } from '@/services/boardService';
import { userService, SimpleUserDTO } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, User, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface CardDetailsModalProps {
  card: CardDTO;
  boardId: number;
  isOpen: boolean;
  onClose: () => void;
}

const getInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function CardDetailsModal({ card, boardId, isOpen, onClose }: CardDetailsModalProps) {
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [assignedTo, setAssignedTo] = useState<number | null>(card.assignedTo || null);
  const [dueDate, setDueDate] = useState(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');

  const { data: users } = useQuery({
    queryKey: ['users', 'board', boardId],
    queryFn: () => userService.getUsersByBoard(boardId),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setTitle(card.title);
      setDescription(card.description || '');
      setAssignedTo(card.assignedTo || null);
      setDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
    }
  }, [card, isOpen]);

  const updateCardMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      assignedTo?: number | null;
      dueDate?: string;
    }) => boardService.updateCard(card.id, {
      ...data,
      listId: card.listId,
      assignedTo: data.assignedTo || undefined,
      dueDate: data.dueDate || undefined,
    }),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['board', boardId] });
      toast.success('Card updated successfully');
    },
    onError: () => {
      toast.error('Failed to update card');
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    updateCardMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      assignedTo: assignedTo,
      dueDate: dueDate || undefined,
    });
  };

  const selectedUser = users?.find(u => u.id === assignedTo);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Card Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title"
              className="w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Assignee {!isAdmin() && <span className="text-xs text-gray-500">(Admin only)</span>}
            </label>
            <select
              value={assignedTo || ''}
              onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : null)}
              disabled={!isAdmin()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Unassigned</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName || user.username}
                </option>
              ))}
            </select>
            {selectedUser && (
              <div className="mt-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                  {getInitials(selectedUser.fullName || selectedUser.username)}
                </div>
                <span className="text-sm text-gray-600">
                  {selectedUser.fullName || selectedUser.username}
                </span>
              </div>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Due Date
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Card Info */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500 space-y-1">
              {card.creatorName && (
                <p>Created by: <span className="text-gray-900">{card.creatorName}</span></p>
              )}
              {card.lastModifiedByName && (
                <p>Last modified by: <span className="text-gray-900">{card.lastModifiedByName}</span></p>
              )}
              <p>Created: {new Date(card.createdAt).toLocaleDateString()}</p>
              {card.updatedAt && (
                <p>Updated: {new Date(card.updatedAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateCardMutation.isPending || !title.trim()}
          >
            {updateCardMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

