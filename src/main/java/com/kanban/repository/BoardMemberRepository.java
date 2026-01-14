package com.kanban.repository;

import com.kanban.model.BoardMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BoardMemberRepository extends JpaRepository<BoardMember, Long> {
    Optional<BoardMember> findByBoardIdAndUserIdAndIsDeletedFalse(Long boardId, Long userId);
    List<BoardMember> findByBoardIdAndIsDeletedFalse(Long boardId);
    List<BoardMember> findByUserIdAndIsDeletedFalse(Long userId);
    boolean existsByBoardIdAndUserIdAndIsDeletedFalse(Long boardId, Long userId);
}

