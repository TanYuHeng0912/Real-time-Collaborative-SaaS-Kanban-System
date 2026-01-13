package com.kanban.repository;

import com.kanban.model.WorkspaceMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, Long> {
    Optional<WorkspaceMember> findByWorkspaceIdAndUserIdAndIsDeletedFalse(Long workspaceId, Long userId);
    
    @EntityGraph(attributePaths = {"user"})
    List<WorkspaceMember> findByWorkspaceIdAndIsDeletedFalse(Long workspaceId);
    
    List<WorkspaceMember> findByUserIdAndIsDeletedFalse(Long userId);
    boolean existsByWorkspaceIdAndUserIdAndIsDeletedFalse(Long workspaceId, Long userId);
}

