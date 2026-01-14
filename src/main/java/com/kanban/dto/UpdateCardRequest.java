package com.kanban.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCardRequest {
    private String title;
    private String description;
    private Long listId;
    private Integer position;
    private Long assignedTo; // Deprecated, use assignedUserIds instead
    private List<Long> assignedUserIds; // New: multiple assignees
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dueDate;
}

