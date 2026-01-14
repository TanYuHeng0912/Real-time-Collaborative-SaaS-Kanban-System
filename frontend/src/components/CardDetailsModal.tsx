import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CardDTO } from '@/types';
import { boardService } from '@/services/boardService';
import { userService } from '@/services/userService';
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
  // Helper function to extract date part from ISO string without timezone conversion
  const extractDatePart = (dateString: string): string => {
    if (!dateString) return '';
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    // Otherwise, extract the date part before 'T' or space
    return dateString.split('T')[0].split(' ')[0];
  };

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>(card.assignedUserIds || (card.assignedTo ? [card.assignedTo] : []));
  const [dueDate, setDueDate] = useState(card.dueDate ? extractDatePart(card.dueDate) : '');

  const { data: users } = useQuery({
    queryKey: ['users', 'board', boardId],
    queryFn: () => userService.getUsersByBoard(boardId),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setTitle(card.title);
      setDescription(card.description || '');
      setAssignedUserIds(card.assignedUserIds || (card.assignedTo ? [card.assignedTo] : []));
      setDueDate(card.dueDate ? extractDatePart(card.dueDate) : '');
    }
  }, [card, isOpen]);

  const updateCardMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      assignedUserIds?: number[];
      dueDate?: string;
    }) => {
      // Build update payload - only include assignedUserIds if user is admin
      const updateData: any = {
        title: data.title,
        listId: card.listId,
      };
      
      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      
      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate;
      }
      
      // Only include assignedUserIds if user is admin (they can change it)
      // Non-admins shouldn't send this field at all
      if (isAdmin() && data.assignedUserIds !== undefined) {
        updateData.assignedUserIds = data.assignedUserIds.length > 0 ? data.assignedUserIds : [];
      }
      
      return boardService.updateCard(card.id, updateData);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['board', boardId] });
      toast.success('Card updated successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update card';
      toast.error(errorMessage);
      console.error('Failed to update card:', error);
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
      assignedUserIds: isAdmin() ? assignedUserIds : undefined, // Always send assignedUserIds for admins (even if empty array)
      dueDate: dueDate || undefined,
    });
  };

  const handleAssigneeChange = (userId: number, checked: boolean) => {
    if (checked) {
      setAssignedUserIds([...assignedUserIds, userId]);
    } else {
      setAssignedUserIds(assignedUserIds.filter(id => id !== userId));
    }
  };

  const selectedUsers = users?.filter(u => assignedUserIds.includes(u.id)) || [];

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

          {/* Assignees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Assignees {!isAdmin() && <span className="text-xs text-gray-500">(Admin only)</span>}
            </label>
            {isAdmin() ? (
              <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                {users && users.length > 0 ? (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={assignedUserIds.includes(user.id)}
                          onChange={(e) => handleAssigneeChange(user.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                            {getInitials(user.fullName || user.username)}
                          </div>
                          <span className="text-sm text-gray-700">
                            {user.fullName || user.username}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No users available</p>
                )}
              </div>
            ) : (
              <div className="border border-gray-300 rounded-md p-3 bg-gray-100">
                <p className="text-sm text-gray-500">Only administrators can assign users</p>
              </div>
            )}
            {selectedUsers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-full">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                      {getInitials(user.fullName || user.username)}
                    </div>
                    <span className="text-sm text-gray-700">
                      {user.fullName || user.username}
                    </span>
                  </div>
                ))}
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

