package com.kanban.controller;

import com.kanban.model.WorkspaceMember;
import com.kanban.service.WorkspaceService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {
    
    private final WorkspaceService workspaceService;
    
    @PostMapping
    public ResponseEntity<WorkspaceService.WorkspaceDTO> createWorkspace(
            @Valid @RequestBody WorkspaceService.CreateWorkspaceRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workspaceService.createWorkspace(request));
    }
    
    @GetMapping("/my")
    public ResponseEntity<List<WorkspaceService.WorkspaceDTO>> getMyWorkspaces() {
        return ResponseEntity.ok(workspaceService.getMyWorkspaces());
    }
    
    @PostMapping("/{workspaceId}/assign")
    public ResponseEntity<Void> assignUserToWorkspace(
            @PathVariable Long workspaceId,
            @RequestBody AssignUserRequest request
    ) {
        workspaceService.assignUserToWorkspace(workspaceId, request.getUserId(), 
                request.getRole() != null ? WorkspaceMember.WorkspaceRole.valueOf(request.getRole()) : WorkspaceMember.WorkspaceRole.MEMBER);
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping("/{workspaceId}/members/{userId}")
    public ResponseEntity<Void> removeUserFromWorkspace(
            @PathVariable Long workspaceId,
            @PathVariable Long userId
    ) {
        workspaceService.removeUserFromWorkspace(workspaceId, userId);
        return ResponseEntity.noContent().build();
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignUserRequest {
        private Long userId;
        private String role; // "OWNER", "ADMIN", "MEMBER"
    }
}

