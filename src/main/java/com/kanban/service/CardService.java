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
        
        ListEntity list = listRepository.findByIdWithBoard(request.getListId())
                .orElseThrow(() -> new RuntimeException("List not found"));
        
        // Any board member can create cards, but only workspace owners/admins can edit lists
        if (list.getBoard() == null) {
            throw new RuntimeException("List must belong to a board");
        }
        
        if (!permissionService.hasBoardAccess(list.getBoard().getId(), currentUser)) {
            throw new AccessDeniedException("You do not have permission to create cards in this board.");
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
        
        Card.Priority priority = Card.Priority.MEDIUM;
        if (request.getPriority() != null) {
            try {
                priority = Card.Priority.valueOf(request.getPriority().toUpperCase());
            } catch (IllegalArgumentException e) {
                priority = Card.Priority.MEDIUM;
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
                .priority(priority)
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
        
        // Get board ID safely - card should have list loaded via EntityGraph
        // If not, try to access it within transaction
        Long listId = null;
        try {
            listId = card.getList() != null ? card.getList().getId() : null;
        } catch (Exception e) {
            // If lazy loading fails, we'll handle it below
        }
        
        if (listId == null) {
            throw new RuntimeException("List not found for card");
        }
        
        ListEntity list = listRepository.findByIdWithBoard(listId)
                .orElseThrow(() -> new RuntimeException("List not found"));
        
        if (list.getBoard() == null) {
            throw new RuntimeException("Board not found for list");
        }
        
        if (!permissionService.hasBoardAccess(list.getBoard().getId(), currentUser)) {
            throw new AccessDeniedException("You do not have permission to view this card.");
        }
        
        return toDTO(card);
    }
    
    @Transactional(readOnly = true)
    public List<CardDTO> getCardsByListId(Long listId) {
        User currentUser = permissionService.getCurrentUser();
        ListEntity list = listRepository.findByIdWithBoard(listId)
                .orElseThrow(() -> new RuntimeException("List not found"));
        
        if (list.getBoard() == null) {
            throw new RuntimeException("Board not found for list");
        }
        
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
        if (request.getPriority() != null) {
            // Only assigned users or owner can change priority
            boolean canChangePriority = currentUser.getRole() == User.UserRole.ADMIN 
                    || card.getCreatedBy().getId().equals(currentUser.getId())
                    || card.getAssignedUsers().stream().anyMatch(u -> u.getId().equals(currentUser.getId()));
            
            if (canChangePriority) {
                try {
                    card.setPriority(Card.Priority.valueOf(request.getPriority().toUpperCase()));
                } catch (IllegalArgumentException e) {
                    // Invalid priority value, ignore
                }
            }
        }
        
        card.setLastModifiedBy(currentUser);
        card = cardRepository.save(card);
        return toDTO(card);
    }
    
    @Transactional
    public CardDTO moveCard(Long id, MoveCardRequest request) {
        User currentUser = permissionService.getCurrentUser();
        
        // Check if user can edit this card (only creator, assigned users, or admins can move cards)
        if (!permissionService.canEditCard(id, currentUser)) {
            throw new AccessDeniedException("You do not have permission to move this card.");
        }
        
        // Get target list first to verify it exists and get board ID
        ListEntity targetList = listRepository.findByIdWithBoard(request.getTargetListId())
                .orElseThrow(() -> new RuntimeException("Target list not found"));
        
        if (targetList.getBoard() == null) {
            throw new RuntimeException("Target list must belong to a board");
        }
        
        Long boardId = targetList.getBoard().getId();
        
        // Verify user has access to the target board
        if (!permissionService.hasBoardAccess(boardId, currentUser)) {
            throw new AccessDeniedException("You do not have permission to move cards to this board.");
        }
        
        // Get source list ID to verify it's in the same board
        Long sourceListId = cardRepository.findListIdByCardId(id).orElse(null);
        if (sourceListId != null && !sourceListId.equals(request.getTargetListId())) {
            ListEntity sourceList = listRepository.findByIdWithBoard(sourceListId)
                    .orElseThrow(() -> new RuntimeException("Source list not found"));
            
            if (sourceList.getBoard() == null || !sourceList.getBoard().getId().equals(boardId)) {
                throw new RuntimeException("Source and target lists must be in the same board");
            }
        }
        
        // Now fetch the card
        Card card = cardRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        
        // Determine if moving to different list
        boolean isMovingToDifferentList = (sourceListId != null && !sourceListId.equals(request.getTargetListId()));
        
        // Use sourceListId if we have it, otherwise assume same list move
        Long actualSourceListId = sourceListId != null ? sourceListId : request.getTargetListId();
        int newPosition = request.getNewPosition();
        int oldPosition = card.getPosition();
        
        if (isMovingToDifferentList) {
            // Moving to a different list
            // 1. Remove from source list: decrement positions of cards after old position
            List<Card> sourceCards = cardRepository.findByListIdAndIsDeletedFalseOrderByPositionAsc(actualSourceListId);
            for (Card sourceCard : sourceCards) {
                if (sourceCard.getId().equals(id)) {
                    continue; // Skip the card being moved
                }
                if (sourceCard.getPosition() > oldPosition) {
                    sourceCard.setPosition(sourceCard.getPosition() - 1);
                }
            }
            cardRepository.saveAll(sourceCards);
            
            // 2. Add to target list: increment positions of cards at/after new position
            List<Card> targetCards = cardRepository.findByListIdAndIsDeletedFalseOrderByPositionAsc(request.getTargetListId());
            for (Card targetCard : targetCards) {
                // Skip the card being moved if it's somehow in the target list already
                if (targetCard.getId().equals(id)) {
                    continue;
                }
                if (targetCard.getPosition() >= newPosition) {
                    targetCard.setPosition(targetCard.getPosition() + 1);
                }
            }
            cardRepository.saveAll(targetCards);
        } else {
            // Moving within the same list
            List<Card> cards = cardRepository.findByListIdAndIsDeletedFalseOrderByPositionAsc(request.getTargetListId());
            if (oldPosition < newPosition) {
                // Moving forward: shift cards between old and new position backward
                for (Card c : cards) {
                    if (c.getId().equals(id)) {
                        continue; // Skip the card being moved
                    }
                    if (c.getPosition() > oldPosition && c.getPosition() <= newPosition) {
                        c.setPosition(c.getPosition() - 1);
                    }
                }
            } else if (oldPosition > newPosition) {
                // Moving backward: shift cards between new and old position forward
                for (Card c : cards) {
                    if (c.getId().equals(id)) {
                        continue; // Skip the card being moved
                    }
                    if (c.getPosition() >= newPosition && c.getPosition() < oldPosition) {
                        c.setPosition(c.getPosition() + 1);
                    }
                }
            }
            cardRepository.saveAll(cards);
        }
        
        // Update the card itself
        card.setList(targetList);
        card.setPosition(newPosition);
        card.setLastModifiedBy(currentUser);
        
        card = cardRepository.save(card);
        
        // Use toDTOWithListId to avoid lazy loading issues with card.getList()
        return toDTOWithListId(card, targetList.getId());
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
        try {
            // Get assigned user IDs and names
            List<Long> assignedUserIds = card.getAssignedUsers() != null ? card.getAssignedUsers().stream()
                    .map(User::getId)
                    .collect(Collectors.toList()) : List.of();
            List<String> assignedUserNames = card.getAssignedUsers() != null ? card.getAssignedUsers().stream()
                    .map(this::formatUserName)
                    .collect(Collectors.toList()) : List.of();
            
            // Backward compatibility: assignedTo and assigneeName (use first assignee if exists)
            Long assignedTo = assignedUserIds.isEmpty() ? null : assignedUserIds.get(0);
            String assigneeName = assignedUserNames.isEmpty() ? null : assignedUserNames.get(0);
            
            // Safely get list ID - handle lazy loading
            Long listId = null;
            try {
                listId = card.getList() != null ? card.getList().getId() : null;
            } catch (Exception e) {
                // Lazy loading failed, listId will remain null
            }
            
            return CardDTO.builder()
                    .id(card.getId())
                    .title(card.getTitle())
                    .description(card.getDescription())
                    .listId(listId)
                    .position(card.getPosition())
                    .createdBy(card.getCreatedBy() != null ? card.getCreatedBy().getId() : null)
                    .creatorName(card.getCreatedBy() != null ? formatUserName(card.getCreatedBy()) : null)
                    .assignedTo(assignedTo) // Backward compatibility
                    .assigneeName(assigneeName) // Backward compatibility
                    .assignedUserIds(assignedUserIds)
                    .assignedUserNames(assignedUserNames)
                    .lastModifiedBy(card.getLastModifiedBy() != null ? card.getLastModifiedBy().getId() : null)
                    .lastModifiedByName(card.getLastModifiedBy() != null ? formatUserName(card.getLastModifiedBy()) : null)
                    .dueDate(card.getDueDate())
                    .priority(card.getPriority() != null ? card.getPriority().name() : "MEDIUM")
                    .createdAt(card.getCreatedAt())
                    .updatedAt(card.getUpdatedAt())
                    .build();
        } catch (Exception e) {
            // Fallback DTO if something goes wrong
            return CardDTO.builder()
                    .id(card.getId())
                    .title(card.getTitle())
                    .description(card.getDescription())
                    .listId(null)
                    .position(card.getPosition())
                    .createdAt(card.getCreatedAt())
                    .updatedAt(card.getUpdatedAt())
                    .priority("MEDIUM")
                    .build();
        }
    }
    
    // Helper method to create CardDTO with explicit listId to avoid lazy loading issues
    private CardDTO toDTOWithListId(Card card, Long listId) {
        try {
            // Get assigned user IDs and names
            List<Long> assignedUserIds = card.getAssignedUsers() != null ? card.getAssignedUsers().stream()
                    .map(User::getId)
                    .collect(Collectors.toList()) : List.of();
            List<String> assignedUserNames = card.getAssignedUsers() != null ? card.getAssignedUsers().stream()
                    .map(this::formatUserName)
                    .collect(Collectors.toList()) : List.of();
            
            // Backward compatibility: assignedTo and assigneeName (use first assignee if exists)
            Long assignedTo = assignedUserIds.isEmpty() ? null : assignedUserIds.get(0);
            String assigneeName = assignedUserNames.isEmpty() ? null : assignedUserNames.get(0);
            
            return CardDTO.builder()
                    .id(card.getId())
                    .title(card.getTitle())
                    .description(card.getDescription())
                    .listId(listId) // Use provided listId instead of accessing card.getList()
                    .position(card.getPosition())
                    .createdBy(card.getCreatedBy() != null ? card.getCreatedBy().getId() : null)
                    .creatorName(card.getCreatedBy() != null ? formatUserName(card.getCreatedBy()) : null)
                    .assignedTo(assignedTo) // Backward compatibility
                    .assigneeName(assigneeName) // Backward compatibility
                    .assignedUserIds(assignedUserIds)
                    .assignedUserNames(assignedUserNames)
                    .lastModifiedBy(card.getLastModifiedBy() != null ? card.getLastModifiedBy().getId() : null)
                    .lastModifiedByName(card.getLastModifiedBy() != null ? formatUserName(card.getLastModifiedBy()) : null)
                    .dueDate(card.getDueDate())
                    .priority(card.getPriority() != null ? card.getPriority().name() : "MEDIUM")
                    .createdAt(card.getCreatedAt())
                    .updatedAt(card.getUpdatedAt())
                    .build();
        } catch (Exception e) {
            // Fallback DTO if something goes wrong
            return CardDTO.builder()
                    .id(card.getId())
                    .title(card.getTitle())
                    .description(card.getDescription())
                    .listId(listId)
                    .position(card.getPosition())
                    .createdAt(card.getCreatedAt())
                    .updatedAt(card.getUpdatedAt())
                    .priority("MEDIUM")
                    .build();
        }
    }
}

