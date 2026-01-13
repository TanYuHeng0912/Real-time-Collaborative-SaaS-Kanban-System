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
        
        User assignedTo = null;
        if (request.getAssignedTo() != null) {
            assignedTo = userRepository.findById(request.getAssignedTo())
                    .orElse(null);
        }
        
        Card card = Card.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .list(list)
                .position(position)
                .createdBy(currentUser)
                .assignedTo(assignedTo)
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
        if (request.getAssignedTo() != null) {
            // Only admins can assign cards
            if (currentUser.getRole() != User.UserRole.ADMIN) {
                throw new AccessDeniedException("Only administrators can assign cards.");
            }
            User assignedTo = userRepository.findById(request.getAssignedTo())
                    .orElse(null);
            card.setAssignedTo(assignedTo);
        }
        if (request.getDueDate() != null) {
            card.setDueDate(request.getDueDate());
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
    
    private CardDTO toDTO(Card card) {
        return CardDTO.builder()
                .id(card.getId())
                .title(card.getTitle())
                .description(card.getDescription())
                .listId(card.getList().getId())
                .position(card.getPosition())
                .createdBy(card.getCreatedBy().getId())
                .creatorName(card.getCreatedBy().getFullName() != null ? card.getCreatedBy().getFullName() : card.getCreatedBy().getUsername())
                .assignedTo(card.getAssignedTo() != null ? card.getAssignedTo().getId() : null)
                .assigneeName(card.getAssignedTo() != null ? (card.getAssignedTo().getFullName() != null ? card.getAssignedTo().getFullName() : card.getAssignedTo().getUsername()) : null)
                .lastModifiedBy(card.getLastModifiedBy() != null ? card.getLastModifiedBy().getId() : null)
                .lastModifiedByName(card.getLastModifiedBy() != null ? (card.getLastModifiedBy().getFullName() != null ? card.getLastModifiedBy().getFullName() : card.getLastModifiedBy().getUsername()) : null)
                .dueDate(card.getDueDate())
                .createdAt(card.getCreatedAt())
                .updatedAt(card.getUpdatedAt())
                .build();
    }
}

