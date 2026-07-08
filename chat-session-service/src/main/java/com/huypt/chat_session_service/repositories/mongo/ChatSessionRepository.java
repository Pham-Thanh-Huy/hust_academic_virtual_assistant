package com.huypt.chat_session_service.repositories.mongo;

import com.huypt.chat_session_service.entities.mongo.ChatSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatSessionRepository extends MongoRepository<ChatSession, String> {

}
