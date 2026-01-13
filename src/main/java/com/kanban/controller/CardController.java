package com.kanban.controller;

import com.kanban.dto.CardDTO;
import com.kanban.dto.CardUpdateMessage;
import com.kanban.dto.CreateCardRequest;
import com.kanban.dto.MoveCardRequest;
import com.kanban.dto.UpdateCardRequest;
import com.kanban.model.User;
import com.kanban.repository.ListRepository;
import com.kanban.service.CardService;
import com.kanban.service.PermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/cards")
@RequiredArgsConstructor
public class CardController {
    
    private final CardService cardService;
    private final ListRepository listRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final PermissionService permissionService;
    
    @PostMapping
    public ResponseEntity<CardDTO> createCard(@Valid @RequestBody CreateCardRequest request) {
        CardDTO card = cardService.createCard(request);
        
        // Get board ID from list and broadcast card creation
        Long boardId = listRepository.findById(request.getListId())
                .map(list -> list.getBoard().getId())
                .orElse(null);
        
        if (boardId != null) {
            CardUpdateMessage message = new CardUpdateMessage("CREATED", card, boardId, null, null, 
                    card.getLastModifiedBy(), card.getLastModifiedByName());
            messagingTemplate.convertAndSend("/topic/board/" + boardId, message);
        }
        
        return ResponseEntity.status(HttpStatus.CREATED).body(card);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<CardDTO> getCardById(@PathVariable Long id) {
        return ResponseEntity.ok(cardService.getCardById(id));
    }
    
    @GetMapping("/list/{listId}")
    public ResponseEntity<List<CardDTO>> getCardsByListId(@PathVariable Long listId) {
        return ResponseEntity.ok(cardService.getCardsByListId(listId));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<CardDTO> updateCard(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCardRequest request
    ) {
        CardDTO card = cardService.updateCard(id, request);
        
        // Get board ID and broadcast card update
        Long boardId = listRepository.findById(card.getListId())
                .map(list -> list.getBoard().getId())
                .orElse(null);
        
        if (boardId != null) {
            CardUpdateMessage message = new CardUpdateMessage("UPDATED", card, boardId, null, null,
                    card.getLastModifiedBy(), card.getLastModifiedByName());
            messagingTemplate.convertAndSend("/topic/board/" + boardId, message);
        }
        
        return ResponseEntity.ok(card);
    }
    
    @PostMapping("/{id}/move")
    public ResponseEntity<CardDTO> moveCard(
            @PathVariable Long id,
            @Valid @RequestBody MoveCardRequest request
    ) {
        CardDTO oldCard = cardService.getCardById(id);
        Long previousListId = oldCard.getListId();
        
        CardDTO card = cardService.moveCard(id, request);
        
        // Get board ID from target list and broadcast card movement
        Long boardId = listRepository.findById(request.getTargetListId())
                .map(list -> list.getBoard().getId())
                .orElse(null);
        
        if (boardId != null) {
            CardUpdateMessage message = new CardUpdateMessage("MOVED", card, boardId, previousListId, null,
                    card.getLastModifiedBy(), card.getLastModifiedByName());
            messagingTemplate.convertAndSend("/topic/board/" + boardId, message);
        }
        
        return ResponseEntity.ok(card);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCard(@PathVariable Long id) {
        CardDTO card = cardService.getCardById(id);
        Long boardId = listRepository.findById(card.getListId())
                .map(list -> list.getBoard().getId())
                .orElse(null);
        
        User currentUser = permissionService.getCurrentUser();
        String userName = currentUser.getFullName() != null ? currentUser.getFullName() : currentUser.getUsername();
        
        cardService.deleteCard(id);
        
        // Broadcast card deletion to board subscribers
        if (boardId != null) {
            CardUpdateMessage message = new CardUpdateMessage("DELETED", null, boardId, card.getListId(), id,
                    currentUser.getId(), userName);
            messagingTemplate.convertAndSend("/topic/board/" + boardId, message);
        }
        
        return ResponseEntity.noContent().build();
    }
}

