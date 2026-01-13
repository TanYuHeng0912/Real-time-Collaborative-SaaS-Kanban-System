export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
}

export interface CardDTO {
  id: number;
  title: string;
  description?: string;
  listId: number;
  position: number;
  createdBy: number;
  creatorName?: string;
  assignedTo?: number;
  assigneeName?: string;
  lastModifiedBy?: number;
  lastModifiedByName?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListDTO {
  id: number;
  name: string;
  boardId: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  cards: CardDTO[];
}

export interface BoardDTO {
  id: number;
  name: string;
  description?: string;
  workspaceId: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  lists: ListDTO[];
}

export interface CardUpdateMessage {
  type: 'CREATED' | 'UPDATED' | 'MOVED' | 'DELETED';
  card?: CardDTO;
  boardId: number;
  previousListId?: number;
  cardId?: number;
  lastModifiedBy?: number;
  lastModifiedByName?: string;
}

export interface BoardUpdateMessage {
  type: 'LIST_CREATED' | 'LIST_UPDATED' | 'LIST_DELETED' | 'BOARD_CREATED' | 'BOARD_UPDATED' | 'BOARD_DELETED';
  card?: CardDTO;
  list?: ListDTO;
  board?: BoardDTO;
  boardId: number;
  previousListId?: number;
  cardId?: number;
  listId?: number;
  lastModifiedBy?: number;
  lastModifiedByName?: string;
}

export interface CreateListRequest {
  name: string;
  boardId: number;
  position?: number;
}

export interface CreateCardRequest {
  title: string;
  description?: string;
  listId: number;
  position?: number;
  assignedTo?: number;
  dueDate?: string;
}

export interface MoveCardRequest {
  targetListId: number;
  newPosition: number;
}

export interface WorkspaceDTO {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
}

