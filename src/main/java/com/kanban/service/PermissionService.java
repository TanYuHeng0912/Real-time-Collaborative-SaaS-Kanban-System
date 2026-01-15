package com.kanban.service;

import com.kanban.model.Board;
import com.kanban.model.Card;
import com.kanban.model.ListEntity;
import com.kanban.model.User;
import com.kanban.model.Workspace;
import com.kanban.model.WorkspaceMember;
import com.kanban.repository.BoardMemberRepository;
import com.kanban.repository.BoardRepository;
import com.kanban.repository.CardRepository;
import com.kanban.repository.ListRepository;
import com.kanban.repository.UserRepository;
import com.kanban.repository.WorkspaceMemberRepository;
import com.kanban.repository.WorkspaceRepository;
import com.kanban.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionService {
    
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final CardRepository cardRepository;
    private final ListRepository listRepository;
    
    @Transactional(readOnly = true)
    public User getCurrentUser() {
        String username = SecurityUtil.getCurrentUsername();
        return userRepository.findByUsernameAndIsDeletedFalse(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    @Transactional(readOnly = true)
    public boolean hasWorkspaceAccess(Long workspaceId) {
        User user = getCurrentUser();
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // Admins have access to all workspaces
        }
        return workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndIsDeletedFalse(workspaceId, user.getId());
    }
    
    @Transactional(readOnly = true)
    public boolean hasBoardAccess(Long boardId) {
        User user = getCurrentUser();
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // Admins have access to all boards
        }
        
        // Check if user is a board member (board-level assignment)
        if (boardMemberRepository.existsByBoardIdAndUserIdAndIsDeletedFalse(boardId, user.getId())) {
            return true;
        }
        
        // Fallback to workspace access - fetch board with workspace to avoid lazy loading
        return boardRepository.findByIdWithWorkspace(boardId)
                .map(board -> board.getWorkspace() != null ? hasWorkspaceAccess(board.getWorkspace().getId()) : false)
                .orElse(false);
    }
    
    @Transactional(readOnly = true)
    public boolean isAdmin() {
        User user = getCurrentUser();
        return user.getRole() == User.UserRole.ADMIN;
    }
    
    @Transactional(readOnly = true)
    public WorkspaceMember getWorkspaceMembership(Long workspaceId, Long userId) {
        return workspaceMemberRepository.findByWorkspaceIdAndUserIdAndIsDeletedFalse(workspaceId, userId)
                .orElse(null);
    }
    
    @Transactional(readOnly = true)
    public void verifyWorkspaceAccess(Long workspaceId) {
        if (!hasWorkspaceAccess(workspaceId)) {
            throw new RuntimeException("Access denied: You don't have access to this workspace");
        }
    }
    
    @Transactional(readOnly = true)
    public void verifyBoardAccess(Long boardId) {
        if (!hasBoardAccess(boardId)) {
            throw new RuntimeException("Access denied: You don't have access to this board");
        }
    }
    
    @Transactional(readOnly = true)
    public void verifyAdmin() {
        if (!isAdmin()) {
            throw new RuntimeException("Access denied: Admin role required");
        }
    }
    
    @Transactional(readOnly = true)
    public boolean hasBoardAccess(Long boardId, User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // Admins have access to all boards
        }
        
        // Check if user is a board member (board-level assignment)
        if (boardMemberRepository.existsByBoardIdAndUserIdAndIsDeletedFalse(boardId, user.getId())) {
            return true;
        }
        
        // Fallback to workspace access - fetch board with workspace to avoid lazy loading
        return boardRepository.findByIdWithWorkspace(boardId)
                .map(board -> board.getWorkspace() != null ? hasWorkspaceAccess(board.getWorkspace().getId(), user) : false)
                .orElse(false);
    }
    
    @Transactional(readOnly = true)
    public boolean hasWorkspaceAccess(Long workspaceId, User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // Admins have access to all workspaces
        }
        return workspaceMemberRepository.existsByWorkspaceIdAndUserIdAndIsDeletedFalse(workspaceId, user.getId());
    }
    
    @Transactional(readOnly = true)
    public boolean canEditCard(Long cardId, User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // System admins can edit any card
        }
        
        Card card = cardRepository.findByIdAndIsDeletedFalse(cardId)
                .orElse(null);
        if (card == null) {
            return false;
        }
        
        // User can edit if:
        // 1. They created the card, OR
        // 2. The card is assigned to them (in assignedUsers list)
        try {
            boolean isCreator = false;
            if (card.getCreatedBy() != null) {
                try {
                    // Ensure createdBy is loaded by accessing it
                    User creator = card.getCreatedBy();
                    if (creator != null && creator.getId() != null) {
                        isCreator = creator.getId().equals(user.getId());
                    }
                } catch (Exception ex) {
                    // Lazy loading exception - createdBy might not be loaded
                    // Fall back to query-based check
                    // For now, deny access if we can't verify
                    isCreator = false;
                }
            }
            
            boolean isAssigned = false;
            if (card.getAssignedUsers() != null && !card.getAssignedUsers().isEmpty()) {
                try {
                    // Trigger lazy loading by accessing the collection
                    List<User> assigned = card.getAssignedUsers();
                    isAssigned = assigned.stream()
                            .anyMatch(u -> u != null && u.getId() != null && u.getId().equals(user.getId()));
                } catch (Exception ex) {
                    // Lazy loading exception - assignedUsers might not be loaded
                    isAssigned = false;
                }
            }
            
            return isCreator || isAssigned;
        } catch (Exception e) {
            // If we can't check permissions due to lazy loading, deny access for safety
            return false;
        }
    }
    
    @Transactional(readOnly = true)
    public boolean canDeleteCard(Long cardId, User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // System admins can delete any card
        }
        
        Card card = cardRepository.findByIdAndIsDeletedFalse(cardId)
                .orElse(null);
        if (card == null) {
            return false;
        }
        
        // User can delete if:
        // 1. They created the card, OR
        // 2. The card is assigned to them (in assignedUsers list)
        try {
            boolean isCreator = false;
            if (card.getCreatedBy() != null) {
                try {
                    // Ensure createdBy is loaded by accessing it
                    User creator = card.getCreatedBy();
                    if (creator != null && creator.getId() != null) {
                        isCreator = creator.getId().equals(user.getId());
                    }
                } catch (Exception ex) {
                    // Lazy loading exception - createdBy might not be loaded
                    isCreator = false;
                }
            }
            
            boolean isAssigned = false;
            if (card.getAssignedUsers() != null && !card.getAssignedUsers().isEmpty()) {
                try {
                    // Trigger lazy loading by accessing the collection
                    List<User> assigned = card.getAssignedUsers();
                    isAssigned = assigned.stream()
                            .anyMatch(u -> u != null && u.getId() != null && u.getId().equals(user.getId()));
                } catch (Exception ex) {
                    // Lazy loading exception - assignedUsers might not be loaded
                    isAssigned = false;
                }
            }
            
            return isCreator || isAssigned;
        } catch (Exception e) {
            // If we can't check permissions due to lazy loading, deny access for safety
            return false;
        }
    }
    
    @Transactional(readOnly = true)
    public boolean canEditList(Long listId, User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // System admins can edit any list
        }
        
        // Use findByIdWithBoard to avoid lazy loading issues
        ListEntity list = listRepository.findByIdWithBoard(listId)
                .orElse(null);
        if (list == null || list.getBoard() == null || list.getBoard().getWorkspace() == null) {
            return false;
        }
        
        // Only workspace owner or admin can edit lists
        return isWorkspaceOwnerOrAdmin(list.getBoard().getWorkspace().getId(), user);
    }
    
    @Transactional(readOnly = true)
    public boolean canDeleteList(Long listId, User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // System admins can delete any list
        }
        
        // Use findByIdWithBoard to avoid lazy loading issues
        ListEntity list = listRepository.findByIdWithBoard(listId)
                .orElse(null);
        if (list == null || list.getBoard() == null || list.getBoard().getWorkspace() == null) {
            return false;
        }
        
        // Only workspace owner or admin can delete lists
        return isWorkspaceOwnerOrAdmin(list.getBoard().getWorkspace().getId(), user);
    }
    
    @Transactional(readOnly = true)
    public boolean isWorkspaceOwnerOrAdmin(Long workspaceId, User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // System admins can do everything
        }
        
        Workspace workspace = workspaceRepository.findByIdAndIsDeletedFalse(workspaceId)
                .orElse(null);
        if (workspace == null) {
            return false;
        }
        
        // Check if user is the workspace owner (with null check)
        if (workspace.getOwner() != null && workspace.getOwner().getId().equals(user.getId())) {
            return true;
        }
        
        // Check if user is a workspace admin
        WorkspaceMember membership = getWorkspaceMembership(workspaceId, user.getId());
        if (membership != null && 
            (membership.getRole() == WorkspaceMember.WorkspaceRole.OWNER || 
             membership.getRole() == WorkspaceMember.WorkspaceRole.ADMIN)) {
            return true;
        }
        
        return false;
    }
    
    @Transactional(readOnly = true)
    public boolean isWorkspaceOwnerOrAdmin(Long boardId) {
        User user = getCurrentUser();
        Board board = boardRepository.findByIdWithWorkspace(boardId)
                .orElse(null);
        if (board == null || board.getWorkspace() == null) {
            return false;
        }
        return isWorkspaceOwnerOrAdmin(board.getWorkspace().getId(), user);
    }
}

