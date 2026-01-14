package com.kanban.controller;

import com.kanban.dto.*;
import com.kanban.service.AdminService;
import com.kanban.service.WorkspaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    
    private final AdminService adminService;
    
    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }
    
    @PutMapping("/users/{userId}/role")
    public ResponseEntity<UserDTO> updateUserRole(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        return ResponseEntity.ok(adminService.updateUserRole(userId, request));
    }
    
    @PutMapping("/users/{userId}/toggle-status")
    public ResponseEntity<UserDTO> toggleUserStatus(@PathVariable Long userId) {
        return ResponseEntity.ok(adminService.toggleUserStatus(userId));
    }
    
    @GetMapping("/workspaces")
    public ResponseEntity<List<WorkspaceWithBoardsDTO>> getAllWorkspacesWithBoards() {
        return ResponseEntity.ok(adminService.getAllWorkspacesWithBoards());
    }
    
    @PutMapping("/workspaces/{workspaceId}")
    public ResponseEntity<WorkspaceWithBoardsDTO> updateWorkspace(
            @PathVariable Long workspaceId,
            @Valid @RequestBody WorkspaceService.CreateWorkspaceRequest request
    ) {
        return ResponseEntity.ok(adminService.updateWorkspace(workspaceId, request));
    }
    
    @DeleteMapping("/workspaces/{workspaceId}")
    public ResponseEntity<Void> deleteWorkspace(@PathVariable Long workspaceId) {
        adminService.deleteWorkspace(workspaceId);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/statistics")
    public ResponseEntity<SystemStatisticsDTO> getSystemStatistics() {
        return ResponseEntity.ok(adminService.getSystemStatistics());
    }
    
    // Board Member Management
    @PostMapping("/boards/{boardId}/members")
    public ResponseEntity<BoardMemberDTO> assignUserToBoard(
            @PathVariable Long boardId,
            @Valid @RequestBody AssignUserToBoardRequest request
    ) {
        return ResponseEntity.ok(adminService.assignUserToBoard(boardId, request.getUserId()));
    }
    
    @DeleteMapping("/boards/{boardId}/members/{userId}")
    public ResponseEntity<Void> removeUserFromBoard(
            @PathVariable Long boardId,
            @PathVariable Long userId
    ) {
        adminService.removeUserFromBoard(boardId, userId);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/boards/{boardId}/members")
    public ResponseEntity<List<BoardMemberDTO>> getBoardMembers(@PathVariable Long boardId) {
        return ResponseEntity.ok(adminService.getBoardMembers(boardId));
    }
}

