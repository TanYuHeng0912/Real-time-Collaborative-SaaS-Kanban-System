import api from '@/lib/api';

export interface SimpleUserDTO {
  id: number;
  username: string;
  email: string;
  fullName?: string;
}

export const userService = {
  getUsersByBoard: async (boardId: number): Promise<SimpleUserDTO[]> => {
    const response = await api.get<SimpleUserDTO[]>(`/users/board/${boardId}`);
    return response.data;
  },
};

