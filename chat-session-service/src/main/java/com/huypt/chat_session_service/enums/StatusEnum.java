package com.huypt.chat_session_service.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public enum StatusEnum {
    SUCCESS("Success!", 200),
    BAD_REQUEST("Bad request!", 400),
    NOT_FOUND("Not found!", 400),
    INTERNAL_SERVER_ERROR("Internal Server Error!", 500);

    private String message;
    private Integer status;
}
