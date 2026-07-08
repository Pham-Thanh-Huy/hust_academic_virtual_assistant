package com.huypt.chat_session_service.controllers;

import com.huypt.chat_session_service.dtos.BaseResponse;
import com.huypt.chat_session_service.dtos.requests.ChatSessionRequest;
import com.huypt.chat_session_service.entities.mongo.ChatSession;
import com.huypt.chat_session_service.services.ChatProcessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class ChatProcessController {
    private final ChatProcessService chatProcessService;

    @PostMapping("/init-session")
    public ResponseEntity<BaseResponse<ChatSession>> initChat(@Valid @RequestBody ChatSessionRequest request){
        BaseResponse<ChatSession> response = chatProcessService.initSession(request);
        return new ResponseEntity<>(response, HttpStatus.valueOf(response.getMessage().getStatus()));
    }
}
