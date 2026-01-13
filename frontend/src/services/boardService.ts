import api from '@/lib/api';
import { BoardDTO, ListDTO, CardDTO, CreateCardRequest, CreateListRequest, MoveCardRequest } from '@/types';

export interface CreateBoardRequest {
  name: string;
  description?: string;
  workspaceId: number;
}

export const boardService = {
  createBoard: async (data: CreateBoardRequest): Promise<BoardDTO> => {
    const response = await api.post<BoardDTO>('/boards', data);
    return response.data;
  },
  
  getBoardById: async (id: number): Promise<BoardDTO> => {
    const response = await api.get<BoardDTO>(`/boards/${id}`);
    return response.data;
  },
  
  getListsByBoardId: async (boardId: number): Promise<ListDTO[]> => {
    const response = await api.get<ListDTO[]>(`/lists/board/${boardId}`);
    return response.data;
  },
  
  createList: async (data: CreateListRequest): Promise<ListDTO> => {
    const response = await api.post<ListDTO>('/lists', data);
    return response.data;
  },
  
  createCard: async (data: CreateCardRequest): Promise<CardDTO> => {
    const response = await api.post<CardDTO>('/cards', data);
    return response.data;
  },
  
  moveCard: async (cardId: number, data: MoveCardRequest): Promise<CardDTO> => {
    const response = await api.post<CardDTO>(`/cards/${cardId}/move`, data);
    return response.data;
  },
  
  updateCard: async (cardId: number, data: Partial<CreateCardRequest>): Promise<CardDTO> => {
    const response = await api.put<CardDTO>(`/cards/${cardId}`, data);
    return response.data;
  },
  
  deleteCard: async (cardId: number): Promise<void> => {
    await api.delete(`/cards/${cardId}`);
  },
  
  updateList: async (listId: number, data: CreateListRequest): Promise<ListDTO> => {
    const response = await api.put<ListDTO>(`/lists/${listId}`, data);
    return response.data;
  },
  
  deleteList: async (listId: number): Promise<void> => {
    await api.delete(`/lists/${listId}`);
  },
};

