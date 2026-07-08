package com.huypt.chat_session_service.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public enum RoleEnum {
    USER("USER"),
    ASSISTANT("ASSISTANT");

    private String role;
}
