package com.huypt.chat_session_service.entities.mysql;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Profile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false)
    private int age;

    @Column(name = "birth_of_date")
    private LocalDate birthOfDate;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    @JsonIgnore
    private User user;
}
