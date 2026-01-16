import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { boardService } from '@/services/boardService';
import { workspaceService } from '@/services/workspaceService';
import { useKanbanStore } from '@/store/kanbanStore';
import { useAuthStore } from '@/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { CardUpdateMessage } from '@/types';
import KanbanBoard from '@/components/KanbanBoard';
import CreateBoardDialog from '@/components/CreateBoardDialog';
import NoBoardsMessage from '@/components/NoBoardsMessage';
import Navigation from '@/components/Navigation';
import { Info, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function DashboardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCurrentBoard, currentBoard, updateCardOptimistic, moveCardOptimistic, deleteCardOptimistic, addCardOptimistic } = useKanbanStore();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const [showPriorityLegend, setShowPriorityLegend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch workspaces and boards to check if user has any boards
  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceService.getMyWorkspaces,
    retry: false,
  });
  
  // Fetch all boards for all workspaces (only when no boardId to check if user has boards)
  const { data: allBoardsData } = useQuery({
    queryKey: ['all-boards-flat'],
    queryFn: async () => {
      if (!workspaces) return [];
      const allBoardsPromises = workspaces.map(async (workspace) => {
        try {
          const boards = await boardService.getBoardsByWorkspaceId(workspace.id);
          return boards;
        } catch (error) {
          return [];
        }
      });
      const results = await Promise.all(allBoardsPromises);
      return results.flat();
    },
    enabled: !boardId && !!workspaces && workspaces.length > 0,
    retry: false,
  });
  
  const hasBoards = (allBoardsData && allBoardsData.length > 0) || false;
  
  // Auto-redirect to first board if user has boards
  useEffect(() => {
    if (!boardId && hasBoards && allBoardsData && allBoardsData.length > 0) {
      navigate(`/dashboard/${allBoardsData[0].id}`, { replace: true });
    }
  }, [boardId, hasBoards, allBoardsData, navigate]);
  
  const { data: board, isLoading, error } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoardById(Number(boardId)),
    enabled: !!boardId,
    retry: false,
  });

  useEffect(() => {
    if (board) {
      setCurrentBoard(board);
    }
  }, [board, setCurrentBoard]);

  const handleCardUpdate = (message: CardUpdateMessage | any) => {
    if (!boardId || !message.boardId || Number(message.boardId) !== Number(boardId)) return;

    // Handle BoardUpdateMessage (for lists) - refetch board data
    if (message.type?.startsWith('LIST_')) {
      const userName = message.lastModifiedByName || 'Someone';
      const listName = message.list?.name || 'a list';
      
      switch (message.type) {
        case 'LIST_CREATED':
          toast.success(`${userName} created list "${listName}"`);
          break;
        case 'LIST_UPDATED':
          toast.success(`${userName} updated list "${listName}"`);
          break;
        case 'LIST_DELETED':
          toast.success(`${userName} deleted a list`);
          break;
        case 'LIST_MOVED':
          toast.success(`${userName} moved list "${listName}"`, {
            id: `list-moved-${message.list?.id}-${Date.now()}`,
            duration: 3000,
          });
          break;
      }
      
      // Refetch board data to get updated lists
      queryClient.refetchQueries({ queryKey: ['board', boardId] });
      return;
    }

    // Handle CardUpdateMessage (for cards)
    if (!currentBoard || message.boardId !== currentBoard.id) return;

    const userName = message.lastModifiedByName || 'Someone';
    const cardTitle = message.card?.title || 'a card';

    switch (message.type) {
      case 'CREATED':
        if (message.card) {
          addCardOptimistic(message.card);
          toast.success(`${userName} created "${cardTitle}"`);
        }
        break;
      case 'UPDATED':
        if (message.card) {
          updateCardOptimistic(message.card);
          toast.success(`${userName} updated "${cardTitle}"`);
        }
        break;
      case 'MOVED':
        if (message.card) {
          moveCardOptimistic(message.card.id, message.card.listId, message.card.position);
          const listName = currentBoard.lists.find(l => l.id === message.card?.listId)?.name || 'another list';
          toast.success(`${userName} moved "${cardTitle}" to ${listName}`, {
            id: `card-moved-${message.card?.id}-${Date.now()}`,
            duration: 3000,
          });
        }
        break;
      case 'DELETED':
        if (message.cardId) {
          deleteCardOptimistic(message.cardId);
          toast.success(`${userName} deleted a card`);
        }
        break;
    }
  };

  const handleBoardCreated = (newBoardId: number) => {
    navigate(`/dashboard/${newBoardId}`);
  };

  useWebSocket({
    boardId: boardId ? Number(boardId) : null,
    onCardUpdate: handleCardUpdate,
  });

  // If no boardId, handle based on user type and available boards
  if (!boardId) {
    // Show loading while checking for boards
    if (allBoardsData === undefined && workspaces !== undefined) {
      return (
        <div className="h-screen bg-gray-50 flex flex-col">
          <Navigation />
          <div className="flex-1 flex items-center justify-center">Loading...</div>
        </div>
      );
    }
    
    // If user has boards, the useEffect will redirect, so show loading
    if (hasBoards) {
      return (
        <div className="h-screen bg-gray-50 flex flex-col">
          <Navigation />
          <div className="flex-1 flex items-center justify-center">Loading...</div>
        </div>
      );
    }
    
    // Admin can create boards, regular users see message
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          {isAdmin() ? (
            <CreateBoardDialog onBoardCreated={handleBoardCreated} />
          ) : (
            <NoBoardsMessage />
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">Loading...</div>
      </div>
    );
  }

  if ((!board && !isLoading) || error) {
    // If board not found, show appropriate message
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          {isAdmin() ? (
            <CreateBoardDialog onBoardCreated={handleBoardCreated} />
          ) : (
            <NoBoardsMessage />
          )}
        </div>
      </div>
    );
  }

  if (!currentBoard) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{currentBoard.name}</h1>
              {currentBoard.description && (
                <p className="text-gray-600 mt-1 text-sm">{currentBoard.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-9 w-64 border-gray-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Priority Guide */}
              <div className="relative">
                <button
                  onMouseEnter={() => setShowPriorityLegend(true)}
                  onMouseLeave={() => setShowPriorityLegend(false)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Info className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 font-medium">Priority Guide</span>
                </button>
                
                {showPriorityLegend && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50"
                    onMouseEnter={() => setShowPriorityLegend(true)}
                    onMouseLeave={() => setShowPriorityLegend(false)}
                  >
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Card Priority Colors</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-1 bg-red-500 rounded"></div>
                        <span className="text-sm text-gray-700">High Priority</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-1 bg-yellow-500 rounded"></div>
                        <span className="text-sm text-gray-700">Medium Priority</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-1 bg-blue-500 rounded"></div>
                        <span className="text-sm text-gray-700">Low Priority</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-1 bg-green-500 rounded"></div>
                        <span className="text-sm text-gray-700">Done</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <KanbanBoard board={currentBoard} searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  );
}

