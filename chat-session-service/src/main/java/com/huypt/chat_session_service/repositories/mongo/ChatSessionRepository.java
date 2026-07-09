package com.huypt.chat_session_service.repositories.mongo;

import com.huypt.chat_session_service.entities.mongo.ChatSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionRepository extends MongoRepository<ChatSession, String> {

    List<ChatSession> findByUsernameOrderByLastMessageAtDesc(String username);
}
