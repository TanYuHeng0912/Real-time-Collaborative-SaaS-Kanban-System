package com.kanban.controller;

import com.kanban.dto.BoardDTO;
import com.kanban.dto.BoardUpdateMessage;
import com.kanban.dto.CreateBoardRequest;
import com.kanban.model.User;
import com.kanban.repository.BoardRepository;
import com.kanban.service.BoardService;
import com.kanban.service.PermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/boards")
@RequiredArgsConstructor
public class BoardController {
    
    private final BoardService boardService;
    private final SimpMessagingTemplate messagingTemplate;
    private final PermissionService permissionService;
    private final BoardRepository boardRepository;
    
    @PostMapping
    public ResponseEntity<BoardDTO> createBoard(@Valid @RequestBody CreateBoardRequest request) {
        BoardDTO board = boardService.createBoard(request);
        
        // Broadcast board creation for real-time updates
        User currentUser = permissionService.getCurrentUser();
        String userName = currentUser.getFullName() != null ? currentUser.getFullName() : currentUser.getUsername();
        
        BoardUpdateMessage message = new BoardUpdateMessage("BOARD_CREATED", null, null, board, board.getId(), 
                null, null, null, currentUser.getId(), userName);
        messagingTemplate.convertAndSend("/topic/boards", message);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(board);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<BoardDTO> getBoardById(@PathVariable Long id) {
        return ResponseEntity.ok(boardService.getBoardById(id));
    }
    
    @GetMapping("/workspace/{workspaceId}")
    public ResponseEntity<List<BoardDTO>> getBoardsByWorkspaceId(@PathVariable Long workspaceId) {
        return ResponseEntity.ok(boardService.getBoardsByWorkspaceId(workspaceId));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<BoardDTO> updateBoard(
            @PathVariable Long id,
            @Valid @RequestBody CreateBoardRequest request
    ) {
        BoardDTO board = boardService.updateBoard(id, request);
        
        // Broadcast board update for real-time updates
        User currentUser = permissionService.getCurrentUser();
        String userName = currentUser.getFullName() != null ? currentUser.getFullName() : currentUser.getUsername();
        
        BoardUpdateMessage message = new BoardUpdateMessage("BOARD_UPDATED", null, null, board, board.getId(), 
                null, null, null, currentUser.getId(), userName);
        messagingTemplate.convertAndSend("/topic/boards", message);
        
        return ResponseEntity.ok(board);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBoard(@PathVariable Long id) {
        // Get board info before deletion for WebSocket broadcast
        BoardDTO boardDTO = boardService.getBoardById(id);
        Long workspaceId = boardDTO.getWorkspaceId();
        
        boardService.deleteBoard(id);
        
        // Broadcast board deletion - use a global topic so all users get notified
        User currentUser = permissionService.getCurrentUser();
        String userName = currentUser.getFullName() != null ? currentUser.getFullName() : currentUser.getUsername();
        
        BoardUpdateMessage message = new BoardUpdateMessage("BOARD_DELETED", null, null, null, id, 
                null, null, null, currentUser.getId(), userName);
        // Broadcast to global boards topic for real-time updates
        messagingTemplate.convertAndSend("/topic/boards", message);
        
        return ResponseEntity.noContent().build();
    }
}

