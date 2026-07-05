package com.huypt.authen_service.controllers;

import com.huypt.authen_service.dtos.CommonResponse;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class AuthenController {

    @Operation(summary = "API authen cho hệ thống")
    @PostMapping("/auth")
    public ResponseEntity<CommonResponse<String>> auth(){
        System.out.println("[AUTH-SERVICE] HIT /auth");
        return ResponseEntity.ok(CommonResponse.success("Authen success!", null));
    }
}
