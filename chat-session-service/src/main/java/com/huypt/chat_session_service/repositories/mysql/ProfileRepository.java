package com.huypt.chat_session_service.repositories.mysql;

import com.huypt.chat_session_service.entities.mysql.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, Long> {
}
