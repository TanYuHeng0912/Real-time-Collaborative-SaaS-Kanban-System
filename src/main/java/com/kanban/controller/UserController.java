package com.kanban.controller;

import com.kanban.dto.UserDTO;
import com.kanban.model.User;
import com.kanban.repository.BoardRepository;
import com.kanban.repository.UserRepository;
import com.kanban.repository.WorkspaceMemberRepository;
import com.kanban.service.PermissionService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final BoardRepository boardRepository;
    
    @GetMapping("/board/{boardId}")
    public ResponseEntity<List<SimpleUserDTO>> getUsersByBoard(@PathVariable Long boardId) {
        permissionService.verifyBoardAccess(boardId);
        
        // Get workspace ID from board
        Long workspaceId = boardRepository.findByIdAndIsDeletedFalse(boardId)
                .map(board -> board.getWorkspace().getId())
                .orElseThrow(() -> new RuntimeException("Board not found"));
        
        // Get all users who are members of this workspace
        List<Long> userIds = workspaceMemberRepository.findByWorkspaceIdAndIsDeletedFalse(workspaceId)
                .stream()
                .map(member -> member.getUser().getId())
                .collect(Collectors.toList());
        
        List<User> users = userRepository.findAllById(userIds).stream()
                .filter(user -> !user.getIsDeleted())
                .collect(Collectors.toList());
        
        List<SimpleUserDTO> userDTOs = users.stream()
                .map(this::userToDTO)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(userDTOs);
    }
    
    private SimpleUserDTO userToDTO(User user) {
        return SimpleUserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .build();
    }
    
    @Data
    @Builder
    public static class SimpleUserDTO {
        private Long id;
        private String username;
        private String email;
        private String fullName;
    }
}

