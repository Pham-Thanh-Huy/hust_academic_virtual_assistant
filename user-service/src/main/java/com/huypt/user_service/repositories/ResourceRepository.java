package com.huypt.user_service.repositories;

import com.huypt.user_service.models.Resource;
import com.huypt.user_service.models.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {

    @Query(
            value = "SELECT DISTINCT rs.* FROM resource as rs " +
                    "JOIN role_resource as rr ON rs.id = rr.resource_id " +
                    "JOIN role as r ON r.id = rr.role_id " +
                    "WHERE r.name IN (:roles)",
            nativeQuery = true
    )
    List<Resource> findAllByRoles(@Param("roles") List<String> roles);


    @Query(
            value = "SELECT rs.* FROM resource as rs " +
                    "JOIN role_resource as rr ON rr.resource_id = rs.id " +
                    "JOIN role as r ON r.id = rr.role_id " +
                    "JOIN user_role as ur ON ur.role_id = r.id " +
                    "JOIN user as u ON u.id = ur.user_id " +
                    "WHERE u.id = :userId",
            nativeQuery = true
    )
    List<Resource> findAllByUserId(@Param("userId") Long userId);

    @Query(
            value = "SELECT DISTINCT rs.* FROM resource as rs " +
                    "JOIN role_resource as rr ON rs.id = rr.resource_id " +
                    "JOIN role as r ON r.id = rr.role_id " +
                    "WHERE r.name = 'PERMIT_ALL'",
            nativeQuery = true
    )
    List<Resource> findPermitAllResource();


    boolean existsByName(String name);

    Resource findByUri(String uri);
}
