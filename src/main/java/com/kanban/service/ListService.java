package com.kanban.service;

import com.kanban.dto.CreateListRequest;
import com.kanban.dto.ListDTO;
import com.kanban.model.Board;
import com.kanban.model.Card;
import com.kanban.model.ListEntity;
import com.kanban.repository.BoardRepository;
import com.kanban.repository.ListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ListService {
    
    private final ListRepository listRepository;
    private final BoardRepository boardRepository;
    private final PermissionService permissionService;
    
    @Transactional
    public ListDTO createList(CreateListRequest request) {
        permissionService.verifyBoardAccess(request.getBoardId());
        
        Board board = boardRepository.findByIdAndIsDeletedFalse(request.getBoardId())
                .orElseThrow(() -> new RuntimeException("Board not found"));
        
        Integer position = request.getPosition();
        if (position == null) {
            List<ListEntity> existingLists = listRepository.findByBoardIdAndIsDeletedFalseOrderByPositionAsc(request.getBoardId());
            position = existingLists.isEmpty() ? 0 : existingLists.get(existingLists.size() - 1).getPosition() + 1;
        }
        
        ListEntity list = ListEntity.builder()
                .name(request.getName())
                .board(board)
                .position(position)
                .isDeleted(false)
                .build();
        
        list = listRepository.save(list);
        return toDTO(list);
    }
    
    @Transactional(readOnly = true)
    public ListDTO getListById(Long id) {
        ListEntity list = listRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("List not found"));
        return toDTO(list);
    }
    
    @Transactional(readOnly = true)
    public List<ListDTO> getListsByBoardId(Long boardId) {
        List<ListEntity> lists = listRepository.findByBoardIdAndIsDeletedFalseOrderByPositionAsc(boardId);
        return lists.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public ListDTO updateList(Long id, CreateListRequest request) {
        permissionService.verifyBoardAccess(
            listRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("List not found"))
                .getBoard().getId()
        );
        
        ListEntity list = listRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("List not found"));
        
        list.setName(request.getName());
        if (request.getPosition() != null) {
            list.setPosition(request.getPosition());
        }
        
        list = listRepository.save(list);
        return toDTO(list);
    }
    
    @Transactional
    public void deleteList(Long id) {
        ListEntity list = listRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("List not found"));
        
        permissionService.verifyBoardAccess(list.getBoard().getId());
        
        list.setIsDeleted(true);
        listRepository.save(list);
    }
    
    private ListDTO toDTO(ListEntity list) {
        return ListDTO.builder()
                .id(list.getId())
                .name(list.getName())
                .boardId(list.getBoard().getId())
                .position(list.getPosition())
                .createdAt(list.getCreatedAt())
                .updatedAt(list.getUpdatedAt())
                .cards(list.getCards().stream()
                        .filter(card -> !card.getIsDeleted())
                        .map(this::cardToDTO)
                        .collect(Collectors.toList()))
                .build();
    }
    
    private com.kanban.dto.CardDTO cardToDTO(Card card) {
        return com.kanban.dto.CardDTO.builder()
                .id(card.getId())
                .title(card.getTitle())
                .description(card.getDescription())
                .listId(card.getList().getId())
                .position(card.getPosition())
                .createdBy(card.getCreatedBy().getId())
                .assignedTo(card.getAssignedTo() != null ? card.getAssignedTo().getId() : null)
                .dueDate(card.getDueDate())
                .createdAt(card.getCreatedAt())
                .updatedAt(card.getUpdatedAt())
                .build();
    }
}

