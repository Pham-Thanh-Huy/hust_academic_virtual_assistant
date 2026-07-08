package com.huypt.chat_session_service.dtos.requests;

import com.huypt.chat_session_service.exception.custom.NotNullOrEmptyString;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChatSessionRequest {
    @NotNullOrEmptyString(field = "username")
    private String username;
    @NotNullOrEmptyString(field = "firstMessage")
    private String firstMessage;
}
