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
public class CardDTO {
    private Long id;
    private String title;
    private String description;
    private Long listId;
    private Integer position;
    private Long createdBy;
    private String creatorName;
    private Long assignedTo;
    private String assigneeName;
    private Long lastModifiedBy;
    private String lastModifiedByName;
    private LocalDateTime dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

