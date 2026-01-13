package com.kanban.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemStatisticsDTO {
    private Long totalUsers;
    private Long activeUsers;
    private Long totalWorkspaces;
    private Long totalBoards;
    private Long totalCards;
}

