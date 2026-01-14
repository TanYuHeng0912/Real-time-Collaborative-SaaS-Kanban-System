package com.kanban.repository;

import com.kanban.model.Card;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {
    @EntityGraph(attributePaths = {"createdBy", "assignedTo", "assignedUsers", "lastModifiedBy"})
    Optional<Card> findByIdAndIsDeletedFalse(Long id);
    
    @EntityGraph(attributePaths = {"createdBy", "assignedTo", "assignedUsers", "lastModifiedBy"})
    List<Card> findByListIdAndIsDeletedFalseOrderByPositionAsc(Long listId);
    
    @Query("SELECT MAX(c.position) FROM Card c WHERE c.list.id = :listId AND c.isDeleted = false")
    Integer findMaxPositionByListId(@Param("listId") Long listId);
}

