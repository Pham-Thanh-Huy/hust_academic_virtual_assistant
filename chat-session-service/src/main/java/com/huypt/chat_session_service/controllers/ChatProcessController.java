package com.huypt.chat_session_service.controllers;

import com.huypt.chat_session_service.dtos.BaseResponse;
import com.huypt.chat_session_service.dtos.requests.ChatMessageRequest;
import com.huypt.chat_session_service.dtos.requests.ChatSessionRequest;
import com.huypt.chat_session_service.entities.mongo.ChatMessage;
import com.huypt.chat_session_service.entities.mongo.ChatSession;
import com.huypt.chat_session_service.services.ChatProcessService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping("/list-session")
    public ResponseEntity<BaseResponse<List<ChatSession>>> listSession(@RequestParam String username, @RequestParam(required = false) String word){
        BaseResponse<List<ChatSession>> response = chatProcessService.listSession(username, word);
        return new ResponseEntity<>(response, HttpStatus.valueOf(response.getMessage().getStatus()));
    }

    @DeleteMapping("/delete-session")
    public ResponseEntity<BaseResponse<String>> deleteSession(@RequestParam String sessionId, @RequestParam String username){
        BaseResponse<String> response = chatProcessService.deleteSession(sessionId, username);
        return new ResponseEntity<>(response, HttpStatus.valueOf(response.getMessage().getStatus()));
    }

    @PostMapping("/add-message")
    public ResponseEntity<BaseResponse<ChatMessage>> addChatMessage(@RequestParam String sessionId, @Valid @RequestBody ChatMessageRequest request){
        BaseResponse<ChatMessage> response = chatProcessService.addChatMessage(sessionId, request);
        return new ResponseEntity<>(response, HttpStatusCode.valueOf(response.getMessage().getStatus()));
    }


    @GetMapping("/list-message")
    public ResponseEntity<BaseResponse<Page<ChatMessage>>> listSession(@RequestParam String sessionId, Pageable pageable){
        BaseResponse<Page<ChatMessage>> response = chatProcessService.listMessageBySessionId(sessionId, pageable);
        return new ResponseEntity<>(response, HttpStatus.valueOf(response.getMessage().getStatus()));
    }

    @GetMapping("/query-message-by-id")
    public ResponseEntity<BaseResponse<ChatMessage>> queryChatMessageById(@RequestParam String id){
        BaseResponse<ChatMessage> response = chatProcessService.queryMessageById(id);
        return new ResponseEntity<>(response, HttpStatus.valueOf(response.getMessage().getStatus()));
    }



}
