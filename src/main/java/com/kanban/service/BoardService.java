package com.kanban.service;

import com.kanban.dto.BoardDTO;
import com.kanban.dto.CreateBoardRequest;
import com.kanban.dto.ListDTO;
import com.kanban.model.Board;
import com.kanban.model.ListEntity;
import com.kanban.model.User;
import com.kanban.model.Workspace;
import com.kanban.repository.BoardRepository;
import com.kanban.repository.ListRepository;
import com.kanban.repository.UserRepository;
import com.kanban.repository.WorkspaceRepository;
import com.kanban.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BoardService {
    
    private final BoardRepository boardRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ListRepository listRepository;
    private final PermissionService permissionService;
    
    @Transactional
    public BoardDTO createBoard(CreateBoardRequest request) {
        permissionService.verifyWorkspaceAccess(request.getWorkspaceId()); // Verify user has access to workspace
        
        User user = permissionService.getCurrentUser();
        Workspace workspace = workspaceRepository.findByIdAndIsDeletedFalse(request.getWorkspaceId())
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        
        Board board = Board.builder()
                .name(request.getName())
                .description(request.getDescription())
                .workspace(workspace)
                .createdBy(user)
                .isDeleted(false)
                .build();
        
        board = boardRepository.save(board);
        
        // Create default lists for the new board
        createDefaultLists(board);
        
        return toDTOWithLists(board);
    }
    
    @Transactional(readOnly = true)
    public BoardDTO getBoardById(Long id) {
        permissionService.verifyBoardAccess(id); // Verify user has access to board
        
        Board board = boardRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Board not found"));
        
        return toDTOWithLists(board);
    }
    
    @Transactional(readOnly = true)
    public List<BoardDTO> getBoardsByWorkspaceId(Long workspaceId) {
        permissionService.verifyWorkspaceAccess(workspaceId); // Verify user has access to workspace
        
        List<Board> boards = boardRepository.findByWorkspaceIdAndIsDeletedFalse(workspaceId);
        return boards.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public BoardDTO updateBoard(Long id, CreateBoardRequest request) {
        permissionService.verifyBoardAccess(id);
        
        Board board = boardRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Board not found"));
        
        board.setName(request.getName());
        board.setDescription(request.getDescription());
        
        board = boardRepository.save(board);
        return toDTO(board);
    }
    
    @Transactional
    public void deleteBoard(Long id) {
        permissionService.verifyBoardAccess(id);
        
        Board board = boardRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new RuntimeException("Board not found"));
        
        board.setIsDeleted(true);
        boardRepository.save(board);
    }
    
    private BoardDTO toDTO(Board board) {
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
    
    private BoardDTO toDTOWithLists(Board board) {
        BoardDTO dto = toDTO(board);
        List<ListDTO> lists = board.getLists().stream()
                .filter(list -> !list.getIsDeleted())
                .map(this::listToDTO)
                .collect(Collectors.toList());
        dto.setLists(lists);
        return dto;
    }
    
    private ListDTO listToDTO(ListEntity list) {
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
    
    private com.kanban.dto.CardDTO cardToDTO(com.kanban.model.Card card) {
        return com.kanban.dto.CardDTO.builder()
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
    
    private void createDefaultLists(Board board) {
        List<String> defaultListNames = Arrays.asList("To Do", "In Progress", "Done");
        for (int i = 0; i < defaultListNames.size(); i++) {
            ListEntity list = ListEntity.builder()
                    .name(defaultListNames.get(i))
                    .board(board)
                    .position(i)
                    .isDeleted(false)
                    .build();
            listRepository.save(list);
        }
    }
}

