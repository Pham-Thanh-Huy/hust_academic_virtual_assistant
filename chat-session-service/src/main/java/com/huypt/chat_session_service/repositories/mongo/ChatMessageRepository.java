package com.huypt.chat_session_service.repositories.mongo;

import com.huypt.chat_session_service.entities.mongo.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    ChatMessage findFirstBySessionIdOrderByChatAtAsc(String sessionId);

    ChatMessage findFirstBySessionIdOrderByChatAtDesc(String sessionId);

    Page<ChatMessage> findBySessionId(String sessionId, Pageable pageable);
}
