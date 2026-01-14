package com.kanban.service;

import com.kanban.dto.CardDTO;
import com.kanban.dto.CreateCardRequest;
import com.kanban.dto.MoveCardRequest;
import com.kanban.dto.UpdateCardRequest;
import com.kanban.model.Card;
import com.kanban.model.ListEntity;
import com.kanban.model.User;
import com.kanban.repository.CardRepository;
import com.kanban.repository.ListRepository;
import com.kanban.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CardService {
    
    private final CardRepository cardRepository;
    private final ListRepository listRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    
    @Transactional
    public CardDTO createCard(CreateCardRequest request) {
        User currentUser = permissionService.getCurrentUser();
        
        ListEntity list = listRepository.findByIdAndIsDeletedFalse(request.getListId())
                .orElseThrow(() -> new RuntimeException("List not found"));
        
        if (!permissionService.canEditList(list.getId(), currentUser)) {
            throw new AccessDeniedException("You do not have permission to create cards in this list.");
        }
        
        Integer position = request.getPosition();
        if (position == null) {
            Integer maxPosition = cardRepository.findMaxPositionByListId(request.getListId());
            position = maxPosition == null ? 0 : maxPosition + 1;
        }
        
        // Handle multiple assignees
        List<User> assignedUsers = new ArrayList<>();
        if (request.getAssignedUserIds() != null && !request.getAssignedUserIds().isEmpty()) {
            assignedUsers = request.getAssignedUserIds().stream()
                    .map(userId -> userRepository.findById(userId).orElse(null))
                    .filter(user -> user != null)
                    .collect(Collectors.toList());
        }
        
        // Backward compatibility: also support single assignedTo
        User assignedTo = null;
        if (request.getAssignedTo() != null && assignedUsers.isEmpty()) {
            assignedTo = userRepository.findById(request.getAssignedTo()).orElse(null);
            if (assignedTo != null) {
                assignedUsers.add(assignedTo);
            }
        }
        
        Card card = Card.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .list(list)
                .position(position)
                .createdBy(currentUser)
                .assignedTo(assignedTo) // Keep for backward compatibility
                .assignedUsers(assignedUsers)
                .lastModifiedBy(currentUser)
                .dueDate(request.getDueDate())
                .isDeleted(false)
                .build();
        
        card = cardRepository.save(card);
        return toDTO(card);
    }
    
    @Transactional(readOnly = true)
    public CardDTO getCardById(Long id) {
        User currentUser = permissionService.getCurrentUser();
        Card card = cardRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        
        if (!permissionService.hasBoardAccess(card.getList().getBoard().getId(), currentUser)) {
            throw new AccessDeniedException("You do not have permission to view this card.");
        }
        
        return toDTO(card);
    }
    
    @Transactional(readOnly = true)
    public List<CardDTO> getCardsByListId(Long listId) {
        User currentUser = permissionService.getCurrentUser();
        ListEntity list = listRepository.findByIdAndIsDeletedFalse(listId)
                .orElseThrow(() -> new RuntimeException("List not found"));
        
        if (!permissionService.hasBoardAccess(list.getBoard().getId(), currentUser)) {
            throw new AccessDeniedException("You do not have permission to view cards in this list.");
        }
        
        List<Card> cards = cardRepository.findByListIdAndIsDeletedFalseOrderByPositionAsc(listId);
        return cards.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public CardDTO updateCard(Long id, UpdateCardRequest request) {
        User currentUser = permissionService.getCurrentUser();
        
        if (!permissionService.canEditCard(id, currentUser)) {
            throw new AccessDeniedException("You do not have permission to update this card.");
        }
        
        Card card = cardRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        
        if (request.getTitle() != null) {
            card.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            card.setDescription(request.getDescription());
        }
        if (request.getPosition() != null) {
            card.setPosition(request.getPosition());
        }
        // Handle multiple assignees (only admins can assign)
        if (request.getAssignedUserIds() != null) {
            if (currentUser.getRole() != User.UserRole.ADMIN) {
                throw new AccessDeniedException("Only administrators can assign cards.");
            }
            
            List<User> newAssignedUsers = request.getAssignedUserIds().stream()
                    .map(userId -> userRepository.findById(userId).orElse(null))
                    .filter(user -> user != null)
                    .collect(Collectors.toList());
            
            // Clear existing assignees and add new ones (properly manage ManyToMany collection)
            card.getAssignedUsers().clear();
            card.getAssignedUsers().addAll(newAssignedUsers);
            
            // Update deprecated assignedTo for backward compatibility (use first assignee)
            card.setAssignedTo(newAssignedUsers.isEmpty() ? null : newAssignedUsers.get(0));
        } else if (request.getAssignedTo() != null) {
            // Backward compatibility: handle single assignedTo
            if (currentUser.getRole() != User.UserRole.ADMIN) {
                throw new AccessDeniedException("Only administrators can assign cards.");
            }
            
            User assignedTo = userRepository.findById(request.getAssignedTo()).orElse(null);
            card.setAssignedTo(assignedTo);
            
            // Clear existing assignees and add new one (properly manage ManyToMany collection)
            card.getAssignedUsers().clear();
            if (assignedTo != null) {
                card.getAssignedUsers().add(assignedTo);
            }
        }
        if (request.getDueDate() != null) {
            // Convert LocalDate to LocalDateTime at start of day (00:00:00)
            card.setDueDate(request.getDueDate().atStartOfDay());
        }
        
        card.setLastModifiedBy(currentUser);
        card = cardRepository.save(card);
        return toDTO(card);
    }
    
    @Transactional
    public CardDTO moveCard(Long id, MoveCardRequest request) {
        User currentUser = permissionService.getCurrentUser();
        
        if (!permissionService.canEditCard(id, currentUser)) {
            throw new AccessDeniedException("You do not have permission to move this card.");
        }
        
        Card card = cardRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        
        ListEntity targetList = listRepository.findByIdAndIsDeletedFalse(request.getTargetListId())
                .orElseThrow(() -> new RuntimeException("Target list not found"));
        
        card.setList(targetList);
        card.setPosition(request.getNewPosition());
        card.setLastModifiedBy(currentUser);
        
        card = cardRepository.save(card);
        return toDTO(card);
    }
    
    @Transactional
    public void deleteCard(Long id) {
        User currentUser = permissionService.getCurrentUser();
        
        if (!permissionService.canDeleteCard(id, currentUser)) {
            throw new AccessDeniedException("You do not have permission to delete this card.");
        }
        
        Card card = cardRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        
        card.setIsDeleted(true);
        card.setLastModifiedBy(currentUser);
        cardRepository.save(card);
    }
    
    private String formatUserName(User user) {
        if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
            return user.getFullName();
        }
        // Format username for better display
        String username = user.getUsername();
        if (username.contains("@")) {
            // If username is an email, extract the local part
            username = username.substring(0, username.indexOf("@"));
        }
        // Capitalize first letter
        if (!username.isEmpty()) {
            username = username.substring(0, 1).toUpperCase() + username.substring(1);
        }
        return username;
    }
    
    private CardDTO toDTO(Card card) {
        // Get assigned user IDs and names
        List<Long> assignedUserIds = card.getAssignedUsers().stream()
                .map(User::getId)
                .collect(Collectors.toList());
        List<String> assignedUserNames = card.getAssignedUsers().stream()
                .map(this::formatUserName)
                .collect(Collectors.toList());
        
        // Backward compatibility: assignedTo and assigneeName (use first assignee if exists)
        Long assignedTo = assignedUserIds.isEmpty() ? null : assignedUserIds.get(0);
        String assigneeName = assignedUserNames.isEmpty() ? null : assignedUserNames.get(0);
        
        return CardDTO.builder()
                .id(card.getId())
                .title(card.getTitle())
                .description(card.getDescription())
                .listId(card.getList().getId())
                .position(card.getPosition())
                .createdBy(card.getCreatedBy().getId())
                .creatorName(formatUserName(card.getCreatedBy()))
                .assignedTo(assignedTo) // Backward compatibility
                .assigneeName(assigneeName) // Backward compatibility
                .assignedUserIds(assignedUserIds)
                .assignedUserNames(assignedUserNames)
                .lastModifiedBy(card.getLastModifiedBy() != null ? card.getLastModifiedBy().getId() : null)
                .lastModifiedByName(card.getLastModifiedBy() != null ? formatUserName(card.getLastModifiedBy()) : null)
                .dueDate(card.getDueDate())
                .createdAt(card.getCreatedAt())
                .updatedAt(card.getUpdatedAt())
                .build();
    }
}

