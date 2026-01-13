import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { workspaceService } from '@/services/workspaceService';
import { boardService } from '@/services/boardService';
import { useGlobalBoardUpdates } from '@/hooks/useGlobalBoardUpdates';
import { BoardUpdateMessage } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ChevronDown, FolderKanban } from 'lucide-react';

export default function BoardSelector() {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId?: string }>();
  const queryClient = useQueryClient();

  const { data: workspaces, isLoading: workspacesLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceService.getMyWorkspaces,
    retry: false,
  });

  // Fetch all boards for all workspaces in parallel
  const boardQueries = useQuery({
    queryKey: ['all-boards'],
    queryFn: async () => {
      if (!workspaces) return [];
      const allBoardsPromises = workspaces.map(async (workspace) => {
        try {
          const boards = await boardService.getBoardsByWorkspaceId(workspace.id);
          return { workspace, boards };
        } catch (error) {
          console.error(`Error fetching boards for workspace ${workspace.id}:`, error);
          return { workspace, boards: [] };
        }
      });
      return Promise.all(allBoardsPromises);
    },
    enabled: !!workspaces && workspaces.length > 0,
    retry: false,
  });

  // Listen for global board updates (create/update/delete)
  useGlobalBoardUpdates({
    onBoardUpdate: (message: BoardUpdateMessage) => {
      if (message.type === 'BOARD_CREATED' || message.type === 'BOARD_UPDATED' || message.type === 'BOARD_DELETED') {
        // Invalidate queries to refresh board list
        queryClient.invalidateQueries({ queryKey: ['all-boards'] });
        queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      }
    },
  });

  // Find current board name
  const currentBoardName = useMemo(() => {
    if (!boardQueries.data || !boardId) return 'Select Board';
    for (const { boards } of boardQueries.data) {
      const board = boards.find((b) => b.id === Number(boardId));
      if (board) return board.name;
    }
    return 'Select Board';
  }, [boardQueries.data, boardId]);

  const handleBoardSelect = (selectedBoardId: number) => {
    navigate(`/dashboard/${selectedBoardId}`);
  };

  if (workspacesLoading || boardQueries.isLoading) {
    return (
      <Button variant="outline" className="gap-2" disabled>
        <LayoutDashboard className="h-4 w-4" />
        Loading...
      </Button>
    );
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <Button variant="outline" className="gap-2" disabled>
        <LayoutDashboard className="h-4 w-4" />
        No Boards
      </Button>
    );
  }

  const hasAnyBoards = boardQueries.data?.some(({ boards }) => boards.length > 0) || false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[180px] justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="truncate">{currentBoardName}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-[400px] overflow-y-auto">
        {boardQueries.data?.map(({ workspace, boards }, index) => {
          if (boards.length === 0) return null;

          return (
            <div key={workspace.id}>
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-gray-500 font-normal px-2 py-1.5">
                <FolderKanban className="h-3 w-3" />
                {workspace.name}
              </DropdownMenuLabel>
              {boards.map((board) => (
                <DropdownMenuItem
                  key={board.id}
                  onClick={() => handleBoardSelect(board.id)}
                  className={`pl-6 ${board.id === Number(boardId) ? 'bg-blue-50 text-blue-600 font-medium' : ''}`}
                >
                  <LayoutDashboard className="h-3 w-3 mr-2" />
                  {board.name}
                </DropdownMenuItem>
              ))}
              {index < (boardQueries.data?.length || 0) - 1 && <DropdownMenuSeparator />}
            </div>
          );
        })}
        {!hasAnyBoards && (
          <DropdownMenuItem disabled>No boards available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

