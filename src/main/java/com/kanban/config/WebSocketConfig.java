package com.kanban.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    // WebSocket allowed origins from environment variable (comma-separated)
    // Default: localhost for development
    @Value("${websocket.allowed.origins:http://localhost:5173,http://localhost:3000}")
    private String allowedOrigins;
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Parse allowed origins from environment variable (comma-separated)
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        registry.addEndpoint("/ws")
                .setAllowedOrigins(origins.stream()
                        .map(String::trim)
                        .toArray(String[]::new))
                .withSockJS();
    }
}

