package com.huypt.user_service.dtos.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleResourceRequest {
    private String name;
    private String resource;
    private String method;
    private List<String> role;
}
