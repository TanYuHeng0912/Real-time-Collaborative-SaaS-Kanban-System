import api from '@/lib/api';

export interface WorkspaceDTO {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

export const workspaceService = {
  createWorkspace: async (data: CreateWorkspaceRequest): Promise<WorkspaceDTO> => {
    const response = await api.post<WorkspaceDTO>('/workspaces', data);
    return response.data;
  },
  
  getMyWorkspaces: async (): Promise<WorkspaceDTO[]> => {
    const response = await api.get<WorkspaceDTO[]>('/workspaces/my');
    return response.data;
  },
  
  assignUserToWorkspace: async (workspaceId: number, userId: number, role: 'OWNER' | 'ADMIN' | 'MEMBER'): Promise<void> => {
    await api.post(`/workspaces/${workspaceId}/assign`, { userId, role });
  },
  
  removeUserFromWorkspace: async (workspaceId: number, userId: number): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },
};

