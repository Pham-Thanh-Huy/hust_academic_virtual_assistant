package com.huypt.user_service.controllers.internal;

import com.huypt.user_service.dtos.CommonResponse;
import com.huypt.user_service.dtos.request.RoleResourceRequest;
import com.huypt.user_service.models.Resource;
import com.huypt.user_service.services.AssigmentRoleResourceUserService;
import com.huypt.user_service.utils.Constant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 12/07/2026
 * Controller xử lý lưu role cho resource
 */
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class AssignmentRoleResourceController {
    private final AssigmentRoleResourceUserService assigmentRoleResourceUserService;

    @PostMapping("/resource-role/create-or-update")
    public ResponseEntity<CommonResponse<Resource>> createOrUpdateResourceWithRole(@RequestBody RoleResourceRequest request){
        CommonResponse<Resource> response = assigmentRoleResourceUserService.createOrUpdateResourceWithRole(request);
        return new ResponseEntity<>(response, HttpStatus.valueOf(response.getMessage().getStatus()));
    }
}
