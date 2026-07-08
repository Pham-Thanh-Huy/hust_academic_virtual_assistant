package com.huypt.chat_session_service.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.huypt.chat_session_service.config.ApplicationProperties;
import com.huypt.chat_session_service.dtos.BaseResponse;
import com.huypt.chat_session_service.dtos.requests.ChatSessionRequest;
import com.huypt.chat_session_service.entities.mongo.ChatMessage;
import com.huypt.chat_session_service.entities.mongo.ChatSession;
import com.huypt.chat_session_service.entities.mysql.User;
import com.huypt.chat_session_service.repositories.mongo.ChatMessageRepository;
import com.huypt.chat_session_service.repositories.mongo.ChatSessionRepository;
import com.huypt.chat_session_service.repositories.mysql.UserRepository;
import com.huypt.chat_session_service.utils.APIUtils;
import com.huypt.chat_session_service.utils.Constants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.Response;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.ObjectUtils;

import java.time.LocalDateTime;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatProcessService {
    private final ChatMessageRepository chatMessageRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final UserRepository userRepository;
    private final ApplicationProperties config;
    private final ObjectMapper mapper;

    @Transactional
    public BaseResponse<ChatSession> initSession(ChatSessionRequest request){
        try{
            User user = userRepository.findByUsername(request.getUsername());
            if(ObjectUtils.isEmpty(user)){
                return BaseResponse.makeBadRequestResponse("Không tồn tại user với username này!");
            }

            String body = String.format("{\"message\": \"%s\"}", request.getFirstMessage());
            String title = "Đoạn hội thoại mới";
            try (Response response = APIUtils.callAPI(config.getService().getChatService().getUrl(), "POST", body)) {
                if(response.isSuccessful()){
                    JsonNode node = mapper.readTree(Objects.requireNonNull(response.body()).string());
                    title = String.valueOf(node.get("data"));
                }
            }

            ChatSession chatSession = ChatSession.builder()
                    .title(title)
                    .totalMessage(1)
                    .status(Constants.STATUS_ACTIVE)
                    .lastMessageAt(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .build();
            chatSession = chatSessionRepository.save(chatSession);

            ChatMessage chatMessage = ChatMessage.builder()
                    .sessionId(chatSession.getId())
                    .message(request.getFirstMessage())
                    .sequence(1)
                    .chatAt(LocalDateTime.now())
                    .build();
             chatMessageRepository.save(chatMessage);

            return BaseResponse.makeSuccessResponse(chatSession);
        }catch (Exception e){
            log.error("[ERROR-WHEN-INIT-CHAT] {}", e.getMessage());
            return BaseResponse.makeInternalServerError(e.getMessage());
        }
    }
}
