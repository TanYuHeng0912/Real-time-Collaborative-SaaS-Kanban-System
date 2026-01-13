import api from '@/lib/api';
import { BoardDTO } from '@/types';

export interface UserDTO {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: 'ADMIN' | 'USER';
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberDTO {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
}

export interface WorkspaceWithBoardsDTO {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  boards: BoardDTO[];
  members?: WorkspaceMemberDTO[];
}

export interface SystemStatisticsDTO {
  totalUsers: number;
  activeUsers: number;
  totalWorkspaces: number;
  totalBoards: number;
  totalCards: number;
}

export interface UpdateUserRoleRequest {
  role: 'ADMIN' | 'USER';
}

export interface UpdateWorkspaceRequest {
  name: string;
  description?: string;
}

export const adminService = {
  getAllUsers: async (): Promise<UserDTO[]> => {
    const response = await api.get<UserDTO[]>('/admin/users');
    return response.data;
  },
  
  updateUserRole: async (userId: number, data: UpdateUserRoleRequest): Promise<UserDTO> => {
    const response = await api.put<UserDTO>(`/admin/users/${userId}/role`, data);
    return response.data;
  },
  
  toggleUserStatus: async (userId: number): Promise<UserDTO> => {
    const response = await api.put<UserDTO>(`/admin/users/${userId}/toggle-status`);
    return response.data;
  },
  
  getAllWorkspacesWithBoards: async (): Promise<WorkspaceWithBoardsDTO[]> => {
    const response = await api.get<WorkspaceWithBoardsDTO[]>('/admin/workspaces');
    return response.data;
  },
  
  updateWorkspace: async (workspaceId: number, data: UpdateWorkspaceRequest): Promise<WorkspaceWithBoardsDTO> => {
    const response = await api.put<WorkspaceWithBoardsDTO>(`/admin/workspaces/${workspaceId}`, data);
    return response.data;
  },
  
  deleteWorkspace: async (workspaceId: number): Promise<void> => {
    await api.delete(`/admin/workspaces/${workspaceId}`);
  },
  
  getSystemStatistics: async (): Promise<SystemStatisticsDTO> => {
    const response = await api.get<SystemStatisticsDTO>('/admin/statistics');
    return response.data;
  },
  
};

export interface AssignUserToWorkspaceRequest {
  userId: number;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

