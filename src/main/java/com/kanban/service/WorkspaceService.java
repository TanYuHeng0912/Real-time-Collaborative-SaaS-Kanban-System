package com.kanban.service;

import com.kanban.model.User;
import com.kanban.model.Workspace;
import com.kanban.model.WorkspaceMember;
import com.kanban.repository.UserRepository;
import com.kanban.repository.WorkspaceMemberRepository;
import com.kanban.repository.WorkspaceRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkspaceService {
    
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final PermissionService permissionService;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateWorkspaceRequest {
        @jakarta.validation.constraints.NotBlank(message = "Workspace name is required")
        private String name;
        private String description;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkspaceDTO {
        private Long id;
        private String name;
        private String description;
        private Long ownerId;
    }
    
    @Transactional
    public WorkspaceDTO createWorkspace(CreateWorkspaceRequest request) {
        permissionService.verifyAdmin(); // Only ADMIN can create workspaces
        
        User user = permissionService.getCurrentUser();
        
        Workspace workspace = Workspace.builder()
                .name(request.getName())
                .description(request.getDescription())
                .owner(user)
                .isDeleted(false)
                .build();
        
        workspace = workspaceRepository.save(workspace);
        
        // Automatically add creator as workspace member with OWNER role
        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(workspace)
                .user(user)
                .role(WorkspaceMember.WorkspaceRole.OWNER)
                .isDeleted(false)
                .build();
        workspaceMemberRepository.save(member);
        
        return new WorkspaceDTO(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.getOwner().getId()
        );
    }
    
    @Transactional(readOnly = true)
    public List<WorkspaceDTO> getMyWorkspaces() {
        User user = permissionService.getCurrentUser();
        
        // Get workspaces where user is a member (not just owner)
        List<WorkspaceMember> memberships = workspaceMemberRepository.findByUserIdAndIsDeletedFalse(user.getId());
        List<Long> workspaceIds = memberships.stream()
                .map(m -> m.getWorkspace().getId())
                .collect(Collectors.toList());
        
        // Admins can see all workspaces
        List<Workspace> workspaces;
        if (user.getRole() == User.UserRole.ADMIN) {
            workspaces = workspaceRepository.findAll().stream()
                    .filter(w -> !w.getIsDeleted())
                    .collect(Collectors.toList());
        } else {
            workspaces = workspaceIds.stream()
                    .map(id -> workspaceRepository.findByIdAndIsDeletedFalse(id))
                    .filter(java.util.Optional::isPresent)
                    .map(java.util.Optional::get)
                    .collect(Collectors.toList());
        }
        
        return workspaces.stream()
                .map(w -> new WorkspaceDTO(w.getId(), w.getName(), w.getDescription(), w.getOwner().getId()))
                .collect(Collectors.toList());
    }
    
    @Transactional
    public void assignUserToWorkspace(Long workspaceId, Long userId, WorkspaceMember.WorkspaceRole role) {
        permissionService.verifyAdmin(); // Only ADMIN can assign users
        
        Workspace workspace = workspaceRepository.findByIdAndIsDeletedFalse(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        
        User user = userRepository.findById(userId)
                .filter(u -> !u.getIsDeleted())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Check if membership already exists
        workspaceMemberRepository.findByWorkspaceIdAndUserIdAndIsDeletedFalse(workspaceId, userId)
                .ifPresentOrElse(
                    existing -> {
                        // Update existing membership
                        existing.setRole(role);
                        existing.setIsDeleted(false);
                        workspaceMemberRepository.save(existing);
                    },
                    () -> {
                        // Create new membership
                        WorkspaceMember member = WorkspaceMember.builder()
                                .workspace(workspace)
                                .user(user)
                                .role(role != null ? role : WorkspaceMember.WorkspaceRole.MEMBER)
                                .isDeleted(false)
                                .build();
                        workspaceMemberRepository.save(member);
                    }
                );
    }
    
    @Transactional
    public void removeUserFromWorkspace(Long workspaceId, Long userId) {
        permissionService.verifyAdmin(); // Only ADMIN can remove users
        
        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserIdAndIsDeletedFalse(workspaceId, userId)
                .orElseThrow(() -> new RuntimeException("User is not a member of this workspace"));
        
        member.setIsDeleted(true);
        workspaceMemberRepository.save(member);
    }
}

