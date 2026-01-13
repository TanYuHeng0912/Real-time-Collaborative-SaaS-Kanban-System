package com.kanban.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardUpdateMessage {
    private String type; // "CARD_CREATED", "CARD_UPDATED", "CARD_MOVED", "CARD_DELETED", "LIST_CREATED", "LIST_UPDATED", "LIST_DELETED"
    private CardDTO card;
    private ListDTO list;
    private Long boardId;
    private Long previousListId; // For card move operations
    private Long cardId; // For card DELETE operations
    private Long listId; // For list DELETE operations
    private Long lastModifiedBy; // User ID who performed the action
    private String lastModifiedByName; // User name who performed the action
}

