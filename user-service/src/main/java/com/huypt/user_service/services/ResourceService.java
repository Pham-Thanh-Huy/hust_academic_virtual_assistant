package com.huypt.user_service.services;

import com.huypt.user_service.dtos.CommonResponse;
import com.huypt.user_service.dtos.response.ResourceResponse;
import com.huypt.user_service.models.Resource;
import com.huypt.user_service.repositories.ResourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResourceService {
    private final ResourceRepository resourceRepository;

    public CommonResponse<List<ResourceResponse>> getListResourceByUserId(Long userId) {
        try {
            List<Resource> resources = resourceRepository.findAllByUserId(userId);
            if (ObjectUtils.isEmpty(resources)) {
                return CommonResponse.notFound(null, String.format("Not have any resource by user_id = %d", userId));
            }

            List<ResourceResponse> resourceResponses = resources.stream().map(resource -> ResourceResponse.builder()
                    .id(resource.getId())
                    .name(resource.getName())
                    .method(resource.getMethod().toString())
                    .uri(resource.getUri())
                    .build()).collect(Collectors.toList());

            return CommonResponse.success(resourceResponses, null);
        } catch (Exception e) {
            log.error("[ERROR-TO-GET-LIST-RESOURCE-BY-USER-ID] {}", e.getMessage());
            return CommonResponse.internalServerError(null, null);
        }
    }

    public CommonResponse<List<ResourceResponse>> getAllResource() {
        try {
            List<Resource> resources = resourceRepository.findAll();
            if (ObjectUtils.isEmpty(resources)) {
                return CommonResponse.notFound(null, String.format("Not have any resource in system"));
            }

            List<ResourceResponse> resourceResponses = resources.stream().map(resource -> ResourceResponse.builder()
                    .id(resource.getId())
                    .name(resource.getName())
                    .uri(resource.getUri())
                    .build()).collect(Collectors.toList());

            return CommonResponse.success(resourceResponses, null);
        } catch (Exception e) {
            log.error("[ERROR-TO-GET-LIST-RESOURCE] {}", e.getMessage());
            return CommonResponse.internalServerError(null, null);
        }
    }



}
