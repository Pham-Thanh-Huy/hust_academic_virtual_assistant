package com.huypt.chat_session_service.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@AllArgsConstructor
@ConfigurationProperties(ignoreInvalidFields = true, prefix = "application")
public class ApplicationProperties {
    private Service service;

    @Data
    @AllArgsConstructor
    public static class Service{
        private ChatService chatService;

        @Data
        @AllArgsConstructor
        public static class ChatService {
            private String url;
        }
    }
}
