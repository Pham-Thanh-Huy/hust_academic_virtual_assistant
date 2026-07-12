package com.huypt.authen_service.domain;

import com.huypt.authen_service.dtos.response.Resource;
import com.huypt.authen_service.dtos.response.UserAuthen;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@AllArgsConstructor
@Getter
public class CustomUserDetail implements UserDetails {
    private UserAuthen userAuthen;
    private List<Resource> resources;

    @Override
    public String getUsername() {
        return userAuthen.getUsername();
    }

    @Override
    public String getPassword() {
        return userAuthen.getPassword();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return resources.stream().map(
                resource -> new SimpleGrantedAuthority(resource.getUri())
        ).collect(Collectors.toList());
    }

    @Override
    public boolean isEnabled() {
        return UserDetails.super.isEnabled();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return UserDetails.super.isCredentialsNonExpired();
    }

    @Override
    public boolean isAccountNonLocked() {
        return UserDetails.super.isAccountNonLocked();
    }

    @Override
    public boolean isAccountNonExpired() {
        return UserDetails.super.isAccountNonExpired();
    }
}
