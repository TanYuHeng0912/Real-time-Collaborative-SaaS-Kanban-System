import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { adminService, UserDTO, WorkspaceWithBoardsDTO, SystemStatisticsDTO } from '@/services/adminService';
import { boardService, CreateBoardRequest } from '@/services/boardService';
import { workspaceService } from '@/services/workspaceService';
import { BoardDTO } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navigation from '@/components/Navigation';
import { Trash2, Edit2, Users, FolderKanban, BarChart3, ChevronDown, ChevronRight, Plus, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'users' | 'workspaces' | 'statistics';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isAdmin, token } = useAuthStore();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!isAdmin()) {
      navigate('/dashboard');
      return;
    }
  }, [token, isAdmin, navigate]);

  // Show access denied if not admin (after useEffect runs)
  if (!token || !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You must be an administrator to access this page.</p>
        </div>
      </div>
    );
  }

  const toggleWorkspace = (workspaceId: number) => {
    setExpandedWorkspaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId);
      } else {
        newSet.add(workspaceId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage users, workspaces, and view system statistics</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="inline mr-2 h-4 w-4" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'workspaces'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FolderKanban className="inline mr-2 h-4 w-4" />
            Workspace Management
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'statistics'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="inline mr-2 h-4 w-4" />
            Statistics
          </button>
        </div>

        {/* Content */}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'workspaces' && <WorkspaceManagement expandedWorkspaces={expandedWorkspaces} toggleWorkspace={toggleWorkspace} />}
        {activeTab === 'statistics' && <SystemStatistics />}
      </div>
    </div>
  );
}

function UserManagement() {
  const queryClient = useQueryClient();
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<'ADMIN' | 'USER'>('USER');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminService.getAllUsers,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'ADMIN' | 'USER' }) =>
      adminService.updateUserRole(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setEditingUserId(null);
      toast.success('User role updated successfully');
    },
    onError: () => {
      toast.error('Failed to update user role');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: adminService.toggleUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update user status');
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Users</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users?.map((user) => (
              <tr key={user.id} className={user.isDeleted ? 'opacity-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.fullName || user.username}</div>
                  <div className="text-sm text-gray-500">@{user.username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingUserId === user.id ? (
                    <div className="flex gap-2">
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'USER')}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <Button
                        size="sm"
                        onClick={() => updateRoleMutation.mutate({ userId: user.id, role: newRole })}
                        disabled={updateRoleMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingUserId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{user.role}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingUserId(user.id);
                          setNewRole(user.role);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.isDeleted ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {user.isDeleted ? 'Inactive' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleStatusMutation.mutate(user.id)}
                    disabled={toggleStatusMutation.isPending}
                    className={user.isDeleted ? 'text-green-600' : 'text-red-600'}
                  >
                    {user.isDeleted ? 'Activate' : 'Deactivate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WorkspaceManagement({ expandedWorkspaces, toggleWorkspace }: { expandedWorkspaces: Set<number>; toggleWorkspace: (id: number) => void }) {
  const queryClient = useQueryClient();
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [creatingBoardWorkspaceId, setCreatingBoardWorkspaceId] = useState<number | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [editBoardName, setEditBoardName] = useState('');
  const [editBoardDescription, setEditBoardDescription] = useState('');
  const [assigningUserWorkspaceId, setAssigningUserWorkspaceId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER'>('MEMBER');

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['admin', 'workspaces'],
    queryFn: adminService.getAllWorkspacesWithBoards,
  });

  const { data: allUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminService.getAllUsers,
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: workspaceService.createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
      setCreatingWorkspace(false);
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
      toast.success('Workspace created successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create workspace';
      toast.error(errorMessage);
      console.error('Workspace creation error:', error);
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: ({ workspaceId, name, description }: { workspaceId: number; name: string; description?: string }) =>
      adminService.updateWorkspace(workspaceId, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
      setEditingWorkspaceId(null);
      toast.success('Workspace updated successfully');
    },
    onError: () => {
      toast.error('Failed to update workspace');
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: adminService.deleteWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
      toast.success('Workspace deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete workspace');
    },
  });

  const createBoardMutation = useMutation({
    mutationFn: (data: CreateBoardRequest) => boardService.createBoard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
      setCreatingBoardWorkspaceId(null);
      setNewBoardName('');
      setNewBoardDescription('');
      toast.success('Board created successfully');
    },
    onError: () => {
      toast.error('Failed to create board');
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: ({ boardId, data }: { boardId: number; data: CreateBoardRequest }) =>
      boardService.updateBoard(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
      setEditingBoardId(null);
      toast.success('Board updated successfully');
    },
    onError: () => {
      toast.error('Failed to update board');
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: boardService.deleteBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
      toast.success('Board deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete board');
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: ({ workspaceId, userId, role }: { workspaceId: number; userId: number; role: 'OWNER' | 'ADMIN' | 'MEMBER' }) =>
      workspaceService.assignUserToWorkspace(workspaceId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
      setAssigningUserWorkspaceId(null);
      setSelectedUserId(null);
      setSelectedRole('MEMBER');
      toast.success('User assigned successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to assign user';
      toast.error(errorMessage);
      console.error('Failed to assign user:', error);
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: number; userId: number }) =>
      workspaceService.removeUserFromWorkspace(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workspaces'] });
      toast.success('User removed successfully');
    },
    onError: () => {
      toast.error('Failed to remove user');
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading workspaces...</div>;
  }

  const handleCreateWorkspace = () => {
    if (newWorkspaceName.trim()) {
      createWorkspaceMutation.mutate({
        name: newWorkspaceName.trim(),
        description: newWorkspaceDescription.trim() || undefined,
      });
    }
  };

  const handleCreateBoard = (workspaceId: number) => {
    if (newBoardName.trim()) {
      createBoardMutation.mutate({
        name: newBoardName.trim(),
        description: newBoardDescription.trim() || undefined,
        workspaceId,
      });
    }
  };

  const handleUpdateBoard = (board: BoardDTO) => {
    const workspace = workspaces?.find(w => w.boards.some(b => b.id === board.id));
    if (workspace && editBoardName.trim()) {
      updateBoardMutation.mutate({
        boardId: board.id,
        data: {
          name: editBoardName.trim(),
          description: editBoardDescription.trim() || undefined,
          workspaceId: workspace.id,
        },
      });
    }
  };

  const handleAssignUser = (workspaceId: number) => {
    if (selectedUserId) {
      assignUserMutation.mutate({
        workspaceId,
        userId: selectedUserId,
        role: selectedRole,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Workspaces</h2>
        <Button
          onClick={() => setCreatingWorkspace(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Workspace
        </Button>
      </div>

      {creatingWorkspace && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Create New Workspace</h3>
          <div className="space-y-3">
            <Input
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name"
            />
            <Input
              value={newWorkspaceDescription}
              onChange={(e) => setNewWorkspaceDescription(e.target.value)}
              placeholder="Description (optional)"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreateWorkspace}
                disabled={createWorkspaceMutation.isPending || !newWorkspaceName.trim()}
              >
                Create
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCreatingWorkspace(false);
                  setNewWorkspaceName('');
                  setNewWorkspaceDescription('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {workspaces?.map((workspace) => (
        <div key={workspace.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => toggleWorkspace(workspace.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {expandedWorkspaces.has(workspace.id) ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
                {editingWorkspaceId === workspace.id ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Workspace name"
                      className="flex-1"
                    />
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        updateWorkspaceMutation.mutate({
                          workspaceId: workspace.id,
                          name: editName,
                          description: editDescription || undefined,
                        })
                      }
                      disabled={updateWorkspaceMutation.isPending}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingWorkspaceId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{workspace.name}</h3>
                      {workspace.description && (
                        <p className="text-sm text-gray-500 mt-1">{workspace.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Owner: {workspace.ownerName}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingWorkspaceId(workspace.id);
                          setEditName(workspace.name);
                          setEditDescription(workspace.description || '');
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm(`Delete workspace "${workspace.name}"?`)) {
                            deleteWorkspaceMutation.mutate(workspace.id);
                          }
                        }}
                        disabled={deleteWorkspaceMutation.isPending}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {expandedWorkspaces.has(workspace.id) && (
            <div className="p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Boards ({workspace.boards.length})</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCreatingBoardWorkspaceId(workspace.id);
                      setNewBoardName('');
                      setNewBoardDescription('');
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Board
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAssigningUserWorkspaceId(workspace.id);
                      setSelectedUserId(null);
                      setSelectedRole('MEMBER');
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Assign User
                  </Button>
                </div>
              </div>

              {creatingBoardWorkspaceId === workspace.id && (
                <div className="bg-white rounded border border-gray-200 p-3 mb-3">
                  <h5 className="font-medium text-gray-900 mb-2">Create New Board</h5>
                  <div className="space-y-2">
                    <Input
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      placeholder="Board name"
                    />
                    <Input
                      value={newBoardDescription}
                      onChange={(e) => setNewBoardDescription(e.target.value)}
                      placeholder="Description (optional)"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCreateBoard(workspace.id)}
                        disabled={createBoardMutation.isPending || !newBoardName.trim()}
                      >
                        Create
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCreatingBoardWorkspaceId(null);
                          setNewBoardName('');
                          setNewBoardDescription('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {assigningUserWorkspaceId === workspace.id && (
                <div className="bg-white rounded border border-gray-200 p-3 mb-3">
                  <h5 className="font-medium text-gray-900 mb-2">Assign User to Workspace</h5>
                  <div className="space-y-2">
                    <select
                      value={selectedUserId || ''}
                      onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select a user</option>
                      {allUsers?.filter(u => !u.isDeleted).map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName || user.username} ({user.email})
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as 'OWNER' | 'ADMIN' | 'MEMBER')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="OWNER">OWNER</option>
                    </select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAssignUser(workspace.id)}
                        disabled={assignUserMutation.isPending || !selectedUserId}
                      >
                        Assign
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAssigningUserWorkspaceId(null);
                          setSelectedUserId(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Members Section */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Members ({workspace.members?.length || 0})
                </h4>
                {workspace.members && workspace.members.length > 0 ? (
                  <div className="space-y-2">
                    {workspace.members.map((member) => (
                      <div key={member.id} className="bg-white rounded border border-gray-200 p-2 flex justify-between items-center">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{member.userName}</div>
                          <div className="text-xs text-gray-500">{member.userEmail}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            Role: {member.role}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm(`Remove ${member.userName} from this workspace?`)) {
                              removeUserMutation.mutate({ workspaceId: workspace.id, userId: member.userId });
                            }
                          }}
                          disabled={removeUserMutation.isPending}
                          className="text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No members in this workspace</p>
                )}
              </div>

              {/* Boards Section */}
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Boards ({workspace.boards.length})</h4>
              </div>
              {workspace.boards.length === 0 ? (
                <p className="text-sm text-gray-500">No boards in this workspace</p>
              ) : (
                <div className="space-y-2">
                  {workspace.boards.map((board) => (
                    <div key={board.id} className="bg-white rounded border border-gray-200 p-3">
                      {editingBoardId === board.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editBoardName}
                            onChange={(e) => setEditBoardName(e.target.value)}
                            placeholder="Board name"
                          />
                          <Input
                            value={editBoardDescription}
                            onChange={(e) => setEditBoardDescription(e.target.value)}
                            placeholder="Description"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateBoard(board)}
                              disabled={updateBoardMutation.isPending || !editBoardName.trim()}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingBoardId(null);
                                setEditBoardName('');
                                setEditBoardDescription('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{board.name}</h5>
                            {board.description && (
                              <p className="text-sm text-gray-500 mt-1">{board.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingBoardId(board.id);
                                setEditBoardName(board.name);
                                setEditBoardDescription(board.description || '');
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (window.confirm(`Delete board "${board.name}"?`)) {
                                  deleteBoardMutation.mutate(board.id);
                                }
                              }}
                              disabled={deleteBoardMutation.isPending}
                              className="text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SystemStatistics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'statistics'],
    queryFn: adminService.getSystemStatistics,
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading statistics...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Users</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalUsers || 0}</p>
            <p className="text-sm text-gray-500 mt-1">{stats?.activeUsers || 0} active</p>
          </div>
          <Users className="h-12 w-12 text-blue-600" />
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Workspaces</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalWorkspaces || 0}</p>
          </div>
          <FolderKanban className="h-12 w-12 text-green-600" />
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Boards</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalBoards || 0}</p>
            <p className="text-sm text-gray-500 mt-1">{stats?.totalCards || 0} cards</p>
          </div>
          <BarChart3 className="h-12 w-12 text-purple-600" />
        </div>
      </div>
    </div>
  );
}

