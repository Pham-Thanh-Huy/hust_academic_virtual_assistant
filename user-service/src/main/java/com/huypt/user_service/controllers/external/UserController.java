package com.huypt.user_service.controllers.external;

import com.huypt.user_service.controllers.BaseController;
import com.huypt.user_service.dtos.CommonResponse;
import com.huypt.user_service.dtos.response.UserResponse;
import com.huypt.user_service.services.UserService;
import com.huypt.user_service.utils.Constant;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping(Constant.API_UTIL.API_V1)
public class UserController extends BaseController {
    private final UserService userService;

    @Operation(summary = "API lấy người dùng theo ID")
    @ApiResponse(description = "Trả ra người dùng")
    @GetMapping("/get-user/{userId}")
    public ResponseEntity<CommonResponse<UserResponse>> getUser(@PathVariable Long userId){
        CommonResponse<UserResponse> response = userService.getUser(userId);
        return baseControllerResponse(response);
    }

    @Operation(summary = "Lấy người dùng theo username")
    @GetMapping("/get-user-by-username")
    public ResponseEntity<CommonResponse<UserResponse>> getUserbyUsername(@RequestParam(name = "username", required = false)
                                                                          String username){
        CommonResponse<UserResponse> response = userService.getUserByUsername(username);
        return baseControllerResponse(response);
    }
}
