package com.kanban.repository;

import com.kanban.model.ListEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ListRepository extends JpaRepository<ListEntity, Long> {
    Optional<ListEntity> findByIdAndIsDeletedFalse(Long id);
    List<ListEntity> findByBoardIdAndIsDeletedFalseOrderByPositionAsc(Long boardId);

    @Query("SELECT DISTINCT l FROM ListEntity l " +
           "LEFT JOIN FETCH l.cards c " +
           "WHERE l.board.id = :boardId AND l.isDeleted = false " +
           "ORDER BY l.position")
    List<ListEntity> findByBoardIdWithCards(@Param("boardId") Long boardId);
    
    @Query("SELECT l FROM ListEntity l " +
           "LEFT JOIN FETCH l.cards c " +
           "WHERE l.id = :id AND l.isDeleted = false " +
           "AND (c IS NULL OR c.isDeleted = false)")
    Optional<ListEntity> findByIdWithCards(@Param("id") Long id);
    
    @Query("SELECT l FROM ListEntity l " +
           "LEFT JOIN FETCH l.board b " +
           "WHERE l.id = :id AND l.isDeleted = false")
    Optional<ListEntity> findByIdWithBoard(@Param("id") Long id);
}

