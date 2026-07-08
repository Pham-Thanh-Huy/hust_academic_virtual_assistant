package com.huypt.chat_session_service.dtos;

import com.huypt.chat_session_service.enums.StatusEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BaseResponse<T> {
    private T data;
    private Message message;


    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Message{
        private String message;
        private Integer status;

        public static Message initMessageByEnum(StatusEnum statusEnum){
            return new Message(statusEnum.getMessage(), statusEnum.getStatus());
        }

        public static Message initMessageByEnum(StatusEnum statusEnum, String message){
            return new Message(message, statusEnum.getStatus());
        }
    }


    public static <T> BaseResponse<T> makeSuccessResponse(T data){
        return new BaseResponse<>(data, Message.initMessageByEnum(StatusEnum.SUCCESS));
    }

    public static <T> BaseResponse<T> makeSuccessResponse(T data, String message){
        return new BaseResponse<>(data, Message.initMessageByEnum(StatusEnum.SUCCESS, message));
    }


    public static <T> BaseResponse<T> makeBadRequestResponse(T data, String message){
        return new BaseResponse<>(data, Message.initMessageByEnum(StatusEnum.BAD_REQUEST, message));
    }

    public static <T> BaseResponse<T> makeBadRequestResponse(String message){
        return new BaseResponse<>(null, Message.initMessageByEnum(StatusEnum.BAD_REQUEST, message));
    }

    public static <T> BaseResponse<T> makeNotFoundResponse(T data){
        return new BaseResponse<>(data, Message.initMessageByEnum(StatusEnum.NOT_FOUND));
    }

    public static <T> BaseResponse<T> makeNotFoundResponse(T data, String message){
        return new BaseResponse<>(data, Message.initMessageByEnum(StatusEnum.NOT_FOUND, message));
    }


    public static <T> BaseResponse<T> makeInternalServerError(String message){
        return new BaseResponse<>(null, Message.initMessageByEnum(StatusEnum.INTERNAL_SERVER_ERROR, message));
    }


}
