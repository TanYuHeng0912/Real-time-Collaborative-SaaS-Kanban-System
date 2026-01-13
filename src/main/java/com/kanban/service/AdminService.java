package com.kanban.service;

import com.kanban.dto.*;
import com.kanban.model.Board;
import com.kanban.model.User;
import com.kanban.model.Workspace;
import com.kanban.repository.BoardRepository;
import com.kanban.repository.CardRepository;
import com.kanban.repository.UserRepository;
import com.kanban.repository.WorkspaceRepository;
import com.kanban.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {
    
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final BoardRepository boardRepository;
    private final CardRepository cardRepository;
    private final PermissionService permissionService;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    
    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        permissionService.verifyAdmin();
        
        return userRepository.findAll().stream()
                .map(this::userToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public UserDTO updateUserRole(Long userId, UpdateUserRoleRequest request) {
        permissionService.verifyAdmin();
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setRole(User.UserRole.valueOf(request.getRole()));
        user = userRepository.save(user);
        
        return userToDTO(user);
    }
    
    @Transactional
    public UserDTO toggleUserStatus(Long userId) {
        permissionService.verifyAdmin();
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setIsDeleted(!user.getIsDeleted());
        user = userRepository.save(user);
        
        return userToDTO(user);
    }
    
    @Transactional(readOnly = true)
    public List<WorkspaceWithBoardsDTO> getAllWorkspacesWithBoards() {
        permissionService.verifyAdmin();
        
        return workspaceRepository.findAll().stream()
                .filter(w -> !w.getIsDeleted())
                .map(this::workspaceToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public WorkspaceWithBoardsDTO updateWorkspace(Long workspaceId, com.kanban.service.WorkspaceService.CreateWorkspaceRequest request) {
        permissionService.verifyAdmin();
        
        Workspace workspace = workspaceRepository.findByIdAndIsDeletedFalse(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        
        workspace.setName(request.getName());
        workspace.setDescription(request.getDescription());
        workspace = workspaceRepository.save(workspace);
        
        return workspaceToDTO(workspace);
    }
    
    @Transactional
    public void deleteWorkspace(Long workspaceId) {
        permissionService.verifyAdmin();
        
        Workspace workspace = workspaceRepository.findByIdAndIsDeletedFalse(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        
        // Soft delete all boards in this workspace
        List<Board> boards = boardRepository.findByWorkspaceIdAndIsDeletedFalse(workspaceId);
        for (Board board : boards) {
            board.setIsDeleted(true);
            boardRepository.save(board);
        }
        
        workspace.setIsDeleted(true);
        workspaceRepository.save(workspace);
    }
    
    @Transactional(readOnly = true)
    public SystemStatisticsDTO getSystemStatistics() {
        permissionService.verifyAdmin();
        
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.findAll().stream()
                .filter(u -> !u.getIsDeleted())
                .count();
        long totalWorkspaces = workspaceRepository.findAll().stream()
                .filter(w -> !w.getIsDeleted())
                .count();
        long totalBoards = boardRepository.findAll().stream()
                .filter(b -> !b.getIsDeleted())
                .count();
        long totalCards = cardRepository.findAll().stream()
                .filter(c -> !c.getIsDeleted())
                .count();
        
        return SystemStatisticsDTO.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .totalWorkspaces(totalWorkspaces)
                .totalBoards(totalBoards)
                .totalCards(totalCards)
                .build();
    }
    
    private UserDTO userToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .isDeleted(user.getIsDeleted())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
    
    private WorkspaceWithBoardsDTO workspaceToDTO(Workspace workspace) {
        List<BoardDTO> boards = boardRepository.findByWorkspaceIdAndIsDeletedFalse(workspace.getId()).stream()
                .map(this::boardToDTO)
                .collect(Collectors.toList());

        String ownerName = workspace.getOwner().getFullName() != null 
                ? workspace.getOwner().getFullName() 
                : workspace.getOwner().getUsername();

        List<WorkspaceMemberDTO> members = workspaceMemberRepository.findByWorkspaceIdAndIsDeletedFalse(workspace.getId()).stream()
                .map(this::workspaceMemberToDTO)
                .collect(Collectors.toList());

        return WorkspaceWithBoardsDTO.builder()
                .id(workspace.getId())
                .name(workspace.getName())
                .description(workspace.getDescription())
                .ownerId(workspace.getOwner().getId())
                .ownerName(ownerName)
                .createdAt(workspace.getCreatedAt())
                .updatedAt(workspace.getUpdatedAt())
                .boards(boards)
                .members(members)
                .build();
    }
    
    private WorkspaceMemberDTO workspaceMemberToDTO(com.kanban.model.WorkspaceMember member) {
        String userName = member.getUser().getFullName() != null 
                ? member.getUser().getFullName() 
                : member.getUser().getUsername();
        
        return WorkspaceMemberDTO.builder()
                .id(member.getId())
                .userId(member.getUser().getId())
                .userName(userName)
                .userEmail(member.getUser().getEmail())
                .role(member.getRole().name())
                .joinedAt(member.getCreatedAt())
                .build();
    }
    
    private BoardDTO boardToDTO(Board board) {
        return BoardDTO.builder()
                .id(board.getId())
                .name(board.getName())
                .description(board.getDescription())
                .workspaceId(board.getWorkspace().getId())
                .createdBy(board.getCreatedBy().getId())
                .createdAt(board.getCreatedAt())
                .updatedAt(board.getUpdatedAt())
                .build();
    }
}

