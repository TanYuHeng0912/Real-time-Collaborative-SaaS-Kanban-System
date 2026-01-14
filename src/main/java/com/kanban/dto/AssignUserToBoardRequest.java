package com.kanban.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignUserToBoardRequest {
    @NotNull(message = "User ID is required")
    private Long userId;
}

