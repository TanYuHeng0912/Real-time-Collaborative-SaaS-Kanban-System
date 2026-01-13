package com.kanban.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceMemberDTO {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private String role; // "OWNER", "ADMIN", "MEMBER"
    private LocalDateTime joinedAt;
}

