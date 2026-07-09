package com.huypt.chat_session_service.dtos.requests;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.huypt.chat_session_service.exception.custom.NotNullOrEmptyString;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessageRequest {
    @NotNullOrEmptyString(field = "message")
    private String message;
    @NotNullOrEmptyString(field = "answer")
    private String answer;
    @NotNullOrEmptyString(field = "model")
    private String model;

}
