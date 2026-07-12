package com.huypt.user_service.repositories;

import com.huypt.user_service.models.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);


    @Query("SELECT r FROM Role r WHERE r.name IN :names")
    List<Role> findByListName(@Param("names") List<String> names);
}
