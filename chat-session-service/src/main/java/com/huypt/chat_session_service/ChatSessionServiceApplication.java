package com.huypt.chat_session_service;

import com.huypt.chat_session_service.config.ApplicationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(ApplicationProperties.class)
public class ChatSessionServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ChatSessionServiceApplication.class, args);
	}

}
