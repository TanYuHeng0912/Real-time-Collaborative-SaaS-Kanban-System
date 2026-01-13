package com.kanban.controller;

import com.kanban.dto.BoardUpdateMessage;
import com.kanban.dto.CreateListRequest;
import com.kanban.dto.ListDTO;
import com.kanban.model.User;
import com.kanban.repository.BoardRepository;
import com.kanban.service.ListService;
import com.kanban.service.PermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/lists")
@RequiredArgsConstructor
public class ListController {
    
    private final ListService listService;
    private final SimpMessagingTemplate messagingTemplate;
    private final PermissionService permissionService;
    private final BoardRepository boardRepository;
    
    @PostMapping
    public ResponseEntity<ListDTO> createList(@Valid @RequestBody CreateListRequest request) {
        ListDTO list = listService.createList(request);
        
        // Broadcast list creation to board subscribers
        User currentUser = permissionService.getCurrentUser();
        String userName = currentUser.getFullName() != null ? currentUser.getFullName() : currentUser.getUsername();
        
        BoardUpdateMessage message = new BoardUpdateMessage("LIST_CREATED", null, list, null, request.getBoardId(), 
                null, null, null, currentUser.getId(), userName);
        messagingTemplate.convertAndSend("/topic/board/" + request.getBoardId(), message);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(list);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ListDTO> getListById(@PathVariable Long id) {
        return ResponseEntity.ok(listService.getListById(id));
    }
    
    @GetMapping("/board/{boardId}")
    public ResponseEntity<List<ListDTO>> getListsByBoardId(@PathVariable Long boardId) {
        return ResponseEntity.ok(listService.getListsByBoardId(boardId));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<ListDTO> updateList(
            @PathVariable Long id,
            @Valid @RequestBody CreateListRequest request
    ) {
        ListDTO list = listService.updateList(id, request);
        
        // Broadcast list update to board subscribers
        User currentUser = permissionService.getCurrentUser();
        String userName = currentUser.getFullName() != null ? currentUser.getFullName() : currentUser.getUsername();
        
        BoardUpdateMessage message = new BoardUpdateMessage("LIST_UPDATED", null, list, null, list.getBoardId(), 
                null, null, null, currentUser.getId(), userName);
        messagingTemplate.convertAndSend("/topic/board/" + list.getBoardId(), message);
        
        return ResponseEntity.ok(list);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteList(@PathVariable Long id) {
        ListDTO list = listService.getListById(id);
        Long boardId = list.getBoardId();
        Long listId = list.getId();
        
        User currentUser = permissionService.getCurrentUser();
        String userName = currentUser.getFullName() != null ? currentUser.getFullName() : currentUser.getUsername();
        
        listService.deleteList(id);
        
        // Broadcast list deletion to board subscribers
        BoardUpdateMessage message = new BoardUpdateMessage("LIST_DELETED", null, null, null, boardId, 
                null, null, listId, currentUser.getId(), userName);
        messagingTemplate.convertAndSend("/topic/board/" + boardId, message);
        
        return ResponseEntity.noContent().build();
    }
}

