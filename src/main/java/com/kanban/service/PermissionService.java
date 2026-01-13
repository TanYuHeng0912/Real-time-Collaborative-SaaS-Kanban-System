package com.kanban.service;

import com.kanban.model.Card;
import com.kanban.model.ListEntity;
import com.kanban.model.User;
import com.kanban.model.Workspace;
import com.kanban.model.WorkspaceMember;
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

@Service
@RequiredArgsConstructor
public class PermissionService {
    
    private final WorkspaceMemberRepository workspaceMemberRepository;
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
        
        return boardRepository.findByIdAndIsDeletedFalse(boardId)
                .map(board -> hasWorkspaceAccess(board.getWorkspace().getId()))
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
        
        return boardRepository.findByIdAndIsDeletedFalse(boardId)
                .map(board -> hasWorkspaceAccess(board.getWorkspace().getId(), user))
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
            return true; // Admins can edit any card
        }
        
        Card card = cardRepository.findByIdAndIsDeletedFalse(cardId)
                .orElse(null);
        if (card == null) {
            return false;
        }
        
        // User can edit if they have access to the board
        return hasBoardAccess(card.getList().getBoard().getId(), user);
    }
    
    @Transactional(readOnly = true)
    public boolean canDeleteCard(Long cardId, User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // Admins can delete any card
        }
        
        Card card = cardRepository.findByIdAndIsDeletedFalse(cardId)
                .orElse(null);
        if (card == null) {
            return false;
        }
        
        // User can delete if they created the card OR have access to the board
        return card.getCreatedBy().getId().equals(user.getId()) || 
               hasBoardAccess(card.getList().getBoard().getId(), user);
    }
    
    @Transactional(readOnly = true)
    public boolean canEditList(Long listId, User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // Admins can edit any list
        }
        
        ListEntity list = listRepository.findByIdAndIsDeletedFalse(listId)
                .orElse(null);
        if (list == null) {
            return false;
        }
        
        // User can edit if they have access to the board
        return hasBoardAccess(list.getBoard().getId(), user);
    }
    
    @Transactional(readOnly = true)
    public boolean canDeleteList(Long listId, User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return true; // Admins can delete any list
        }
        
        ListEntity list = listRepository.findByIdAndIsDeletedFalse(listId)
                .orElse(null);
        if (list == null) {
            return false;
        }
        
        // User can delete if they have access to the board
        return hasBoardAccess(list.getBoard().getId(), user);
    }
}

