package com.huypt.cloud_gateway.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.huypt.cloud_gateway.security.AuthorizationCustom;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class GlobalFallBackFilter implements GlobalFilter, Ordered {
    private final AuthorizationCustom authorizationCustom;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().toString();
        String method = exchange.getRequest().getMethod().toString();
        String token = extractToken(exchange);

        log.info("[GATEWAY] Incoming request: {} {}", method, path);
        log.info("[GATEWAY] Calling auth-service for: {}", path);
        return authorizationCustom.authenRequestService(path, method, token)
                .flatMap(response -> handleAuthResponse(response, exchange, chain))
                .onErrorResume(e -> handleAuthError(e, exchange));
    }


    private Mono<Void> handleAuthResponse(JsonNode response, ServerWebExchange exchange, GatewayFilterChain chain) {
        int statusResponse = response.get("message").get("status").asInt();

        if (statusResponse != 200) {
            String responseErr = String.format("{\"message\": %s, \"status\": %d}",
                    response.get("message").get("message").toString(), statusResponse);

            exchange.getResponse().setRawStatusCode(statusResponse);
            exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);

            return exchange.getResponse().writeWith(Mono.just(
                    exchange.getResponse().bufferFactory().wrap(responseErr.getBytes(StandardCharsets.UTF_8))
            ));
        }

        return chain.filter(exchange);
    }

    private Mono<Void> handleAuthError(Throwable e, ServerWebExchange exchange) {
        log.error("[ERROR-IN-CLOUD-GATEWAY-FILTER]", e);
        String responseErr = "{\"message\": \"Internal Server Error!\", \"status\": 500}";
        exchange.getResponse().setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        return exchange.getResponse().writeWith(Mono.just(
                exchange.getResponse().bufferFactory().wrap(responseErr.getBytes(StandardCharsets.UTF_8))
        ));
    }

    private String extractToken(ServerWebExchange exchange) {
        List<String> authHeader = exchange.getRequest().getHeaders().get("Authorization");
        return authHeader == null ? null : authHeader.getFirst();
    }


    @Override
    public int getOrder() {
        return -1;
    }
}
