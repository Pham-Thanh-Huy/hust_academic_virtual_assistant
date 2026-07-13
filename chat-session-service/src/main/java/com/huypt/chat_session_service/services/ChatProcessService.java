package com.huypt.chat_session_service.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.huypt.chat_session_service.config.ApplicationProperties;
import com.huypt.chat_session_service.dtos.BaseResponse;
import com.huypt.chat_session_service.dtos.requests.ChatMessageRequest;
import com.huypt.chat_session_service.dtos.requests.ChatSessionRequest;
import com.huypt.chat_session_service.entities.mongo.ChatMessage;
import com.huypt.chat_session_service.entities.mongo.ChatSession;
import com.huypt.chat_session_service.entities.mysql.User;
import com.huypt.chat_session_service.repositories.mongo.ChatMessageRepository;
import com.huypt.chat_session_service.repositories.mongo.ChatSessionRepository;
import com.huypt.chat_session_service.repositories.mysql.UserRepository;
import com.huypt.chat_session_service.utils.APIUtils;
import com.huypt.chat_session_service.utils.Constants;
import com.huypt.chat_session_service.utils.Function;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.Response;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.ObjectUtils;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
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
    private final MongoTemplate mongoTemplate;

    @Transactional
    public BaseResponse<ChatSession> initSession(ChatSessionRequest request) {
        try {
            User user = userRepository.findByUsername(request.getUsername());
            if (ObjectUtils.isEmpty(user)) {
                return BaseResponse.makeBadRequestResponse("Không tồn tại user với username này!");
            }

            String now = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss").format(LocalDateTime.now());
            String title = String.format("%s Đoạn hội thoại mới", now);


            ChatSession chatSession = ChatSession.builder()
                    .title(title)
                    .username(user.getUsername())
                    .totalMessage(1)
                    .status(Constants.STATUS_ACTIVE)
                    .lastMessageAt(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .build();
            chatSession = chatSessionRepository.save(chatSession);

            return BaseResponse.makeSuccessResponse(chatSession);
        } catch (Exception e) {
            log.error("[ERROR-WHEN-INIT-CHAT] {}", e.getMessage());
            return BaseResponse.makeInternalServerError(e.getMessage());
        }
    }


    @Transactional
    public BaseResponse<ChatMessage> addChatMessage(String sessionId, ChatMessageRequest request) {
        try {
            ChatSession chatSession = chatSessionRepository.findById(sessionId).orElse(null);
            if (ObjectUtils.isEmpty(chatSession)) {
                return BaseResponse.makeBadRequestResponse("Không tồn tại session nào với id này");
            }

            int sequence = 0;
            ChatMessage lastMessage = chatMessageRepository.findFirstBySessionIdOrderByChatAtDesc(sessionId);
            if (!ObjectUtils.isEmpty(lastMessage)) {
                sequence = lastMessage.getSequence();
            }

            ChatMessage chatMessage = ChatMessage.builder()
                    .sessionId(sessionId)
                    .message(request.getMessage())
                    .answer(request.getAnswer())
                    .voiceAnswer(Function.convertMarkdownToVoice(request.getAnswer()))
                    .model(request.getModel())
                    .sequence(sequence + 1)
                    .chatAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")))
                    .build();
            chatMessage = chatMessageRepository.save(chatMessage);

            chatSession.setTotalMessage(chatMessage.getSequence());
            chatSessionRepository.save(chatSession);

            return BaseResponse.makeSuccessResponse(chatMessage);
        } catch (Exception e) {
            log.error("[ERROR-WHEN-ADD-CHAT-MESSAGE] {}", e.getMessage());
            return BaseResponse.makeInternalServerError(e.getMessage());
        }
    }

    public BaseResponse<List<ChatSession>> listSession(String username, String word){
        try{
            User user = userRepository.findByUsername(username);
            if (ObjectUtils.isEmpty(user)) {
                return BaseResponse.makeBadRequestResponse("Không tồn tại user với username này!");
            }

            Query query = new Query();
            if(!ObjectUtils.isEmpty(word)){
                query.addCriteria(Criteria.where("title").regex(word, "i"));
            }
            query.addCriteria(Criteria.where("username").regex(username, "i"));
            query.addCriteria(Criteria.where("status").is(Constants.STATUS_ACTIVE));

            query.with(Sort.by(Sort.Direction.DESC, "lastMessageAt"));
            List<ChatSession> chatSessions = mongoTemplate.find(query, ChatSession.class);

            return BaseResponse.makeSuccessResponse(chatSessions);
        }catch (Exception e){
            return BaseResponse.makeInternalServerError(e.getMessage());
        }
    }

    public BaseResponse<ChatMessage> queryMessageById(String id){
        try{
            ChatMessage chatMessage = chatMessageRepository.findById(id).orElse(null);
            if(ObjectUtils.isEmpty(chatMessage)){
                return BaseResponse.makeBadRequestResponse("Không tồn tại message với id này");
            }

            return BaseResponse.makeSuccessResponse(chatMessage);

        }catch (Exception e){
            log.error("[ERROR-WHEN-QUERY-MESSAGE-BY-ID");
            return BaseResponse.makeInternalServerError(e.getMessage());
        }
    }

    public BaseResponse<Page<ChatMessage>> listMessageBySessionId(String sessionId, Pageable pageable){
        try{
            Page<ChatMessage> messages = chatMessageRepository.findBySessionId(sessionId, pageable);
            return BaseResponse.makeSuccessResponse(messages);
        } catch (Exception e) {
            log.error("[ERROR-WHEN-LIST-CHAT-MESSAGE] {}", e.getMessage());
            return BaseResponse.makeInternalServerError(e.getMessage());
        }
    }

    public BaseResponse<String> deleteSession(String sessionId, String username){
        try{
            User user = userRepository.findByUsername(username);
            if (ObjectUtils.isEmpty(user)) {
                return BaseResponse.makeBadRequestResponse("Không tồn tại user với username này!");
            }

            ChatSession chatSession = chatSessionRepository.findByIdAndUsername(sessionId, username);
            if(ObjectUtils.isEmpty(chatSession)){
                return BaseResponse.makeBadRequestResponse("Không tồn tại phiên chat nào với id và username này");
            }

            chatSession.setStatus(Constants.STATUS_DELETE);
            chatSessionRepository.save(chatSession);
            return BaseResponse.makeSuccessResponse("Xóa phiên chat thành công");
        } catch (Exception e) {
            log.error("[ERROR-WHEN-DELETE-SESSION] {}", e.getMessage());
            return BaseResponse.makeInternalServerError(e.getMessage());
        }
    }
}
