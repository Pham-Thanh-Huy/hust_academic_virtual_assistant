package com.huypt.user_service.services;

import com.huypt.user_service.dtos.CommonResponse;
import com.huypt.user_service.dtos.request.RoleResourceRequest;
import com.huypt.user_service.models.Resource;
import com.huypt.user_service.models.Role;
import com.huypt.user_service.repositories.ResourceRepository;
import com.huypt.user_service.repositories.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.ObjectUtils;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 11/07/2026
 * Service này dùng để add quyền nào vào resource nào, thêm user nào với quyền nào, thêm resource mới vào quyền nào
 */
@Service
@RequiredArgsConstructor
public class AssigmentRoleResourceUserService {
    private final ResourceRepository resourceRepository;
    private final RoleRepository roleRepository;

    @Transactional
    public CommonResponse<Resource> createOrUpdateResourceWithRole(RoleResourceRequest request){
        try{
            if(ObjectUtils.isEmpty(request.getName())){
                return CommonResponse.badRequest(null, "`name` không được để trống");
            }
            if(ObjectUtils.isEmpty(request.getResource())){
                return CommonResponse.badRequest(null, "`resource` không được để trống");
            }

            if(ObjectUtils.isEmpty(request.getMethod())){
                return CommonResponse.badRequest(null, "`method` không được để trống");
            }

            if(ObjectUtils.isEmpty(request.getRole())){
                return CommonResponse.badRequest(null, "`role không được để trống`");
            }

            Resource resource = resourceRepository.findByUri(request.getResource());

            if(ObjectUtils.isEmpty(resource)){
                resource = new Resource();
            }


            Resource.Method method = Resource.Method.valueOf(request.getMethod().toUpperCase().trim());

            List<String> roleRequest = request.getRole().stream().map(v -> v.toUpperCase().trim()).collect(Collectors.toList());
            List<Role> roles = roleRepository.findByListName(roleRequest);

            resource.setName(request.getName());
            resource.setUri(request.getResource());
            resource.setRoles(roles);
            resource.setRoleRelation(roles);
            resource.setMethod(method);
            resource = resourceRepository.save(resource);

            return CommonResponse.success(resource, "Success!");
        } catch (Exception e) {
            return CommonResponse.internalServerError(null, e.getMessage());
        }
    }
}
