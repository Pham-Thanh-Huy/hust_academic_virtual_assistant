package com.huypt.user_service.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Resource {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String uri;

    @Enumerated(EnumType.STRING)
    private Method method;

    public enum Method{
        GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD
    }

    @ManyToMany
    @JsonIgnore
    @JoinTable(
            name = "role_resource",
            joinColumns = @JoinColumn(name = "resource_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @ToString.Exclude
    private List<Role> roles;


    public void setRoleRelation(List<Role> roles){
        for(Role role : roles){
            if(!this.roles.contains(role)){
                this.roles.add(role);
                role.getResources().add(this);
            }
        }
    }
}
