package com.huypt.chat_session_service.entities.mongo;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "ChatMessage")
public class ChatMessage {
    @Id
    private String id;

    private String sessionId;

    private String message;

    private String answer;

    private String model;

    private Integer sequence;

    @JsonFormat(pattern = "dd/MM/yyyy HH:mm:ss")
    private LocalDateTime chatAt;
}
