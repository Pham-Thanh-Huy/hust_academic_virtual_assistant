package com.huypt.authen_service.security.dynamic;

import com.huypt.authen_service.domain.CustomUserDetail;
import com.huypt.authen_service.dtos.response.Resource;
import com.huypt.authen_service.dtos.status.ResponseStatus;
import com.huypt.authen_service.security.utils.HttpServletResponseCustom;
import com.huypt.authen_service.security.utils.ValidateEndpointSkipAuthen;
import com.huypt.authen_service.security.utils.ValidateEndpoints;
import com.huypt.authen_service.utils.Constant;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.ObjectUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
public class DynamicSecurityFilter extends OncePerRequestFilter {
    private final HttpServletResponseCustom httpServletResponseCustom;
    private final ValidateEndpointSkipAuthen validateEndpointSkipAuthen;
    private final HttpServletResponseCustom servletResponseCustom;

    @Override
    protected void doFilterInternal(HttpServletRequest request, @NotNull HttpServletResponse response, @NotNull FilterChain filterChain)
            throws ServletException, IOException {
        AntPathMatcher antPathMatcher = new AntPathMatcher();
        String urlAuthen = request.getHeader(Constant.X_AUTHEN_URL);
        String methodAuthen =  request.getHeader(Constant.X_AUTHEN_METHOD);
        // -----> CHECK IF PERMIT ALL ENDPOINT OR IGNORE ENDPOINT OR METHOD OPTIONS ----> SKIP AUTHEN
        Map<String, String> endpointSkipAuthen = validateEndpointSkipAuthen.validatePermitAllEnpointds(request);
        for(Map.Entry<String, String> entry : endpointSkipAuthen.entrySet()){
            String key = entry.getKey();
            if(key.equals(ValidateEndpoints.REQUEST_NOT_ENOUGH.getMessage())){
                servletResponseCustom.custom(response, entry.getValue(), ResponseStatus.UNAUTHORIZED.getStatus());
                return;
            }

            if(key.equals(ValidateEndpoints.HAS_PERMIT_ALL_ENPOINT.getMessage())){
                filterChain.doFilter(request, response);
                return;
            }

        }

        UsernamePasswordAuthenticationToken usernamePasswordAuthenticationToken = (UsernamePasswordAuthenticationToken)
                SecurityContextHolder.getContext().getAuthentication();
        Collection<GrantedAuthority> grantedAuthorities = usernamePasswordAuthenticationToken.getAuthorities();
        CustomUserDetail userDetail = (CustomUserDetail) usernamePasswordAuthenticationToken.getPrincipal();
        List<Resource> resources = userDetail.getResources();

        for (GrantedAuthority grantedAuthority : grantedAuthorities) {
            if(antPathMatcher.match(grantedAuthority.getAuthority(), urlAuthen)){
                Resource resource = resources.stream()
                        .filter(r -> r.getUri().equals(urlAuthen))
                        .findFirst()
                        .orElse(null);
                if(!ObjectUtils.isEmpty(resource) && resource.getMethod().equals(methodAuthen.toUpperCase().trim())){
                    filterChain.doFilter(request, response);
                    return;
                }
            }
        }

        httpServletResponseCustom.custom(response, "You not have permission to access this endpoint!", ResponseStatus.UNAUTHORIZED.getStatus());
    }
}