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
public class BoardMemberDTO {
    private Long id;
    private Long boardId;
    private Long userId;
    private String username;
    private String email;
    private String fullName;
    private LocalDateTime createdAt;
}

