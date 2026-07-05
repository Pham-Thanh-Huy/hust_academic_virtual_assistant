package com.huypt.cloud_gateway.config;

import com.huypt.cloud_gateway.logging.CurlLoggingFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient() {
        return WebClient.builder().filter(CurlLoggingFilter.curlAuthenLogging()).build();
    }
}
