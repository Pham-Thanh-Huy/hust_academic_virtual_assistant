package com.huypt.chat_session_service.exception.custom;


import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class NotNullOrEmptyStringValidator implements ConstraintValidator<NotNullOrEmptyString, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if ("null".equals(value)) {
            return false;
        }
        return value != null && !value.trim().isEmpty();
    }
}
