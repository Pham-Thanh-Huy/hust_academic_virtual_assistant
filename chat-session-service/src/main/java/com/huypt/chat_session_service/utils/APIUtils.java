package com.huypt.chat_session_service.utils;


import okhttp3.*;
import org.springframework.util.ObjectUtils;

import java.util.concurrent.TimeUnit;

public class APIUtils {

    private static final OkHttpClient client = new
            OkHttpClient().newBuilder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(5, TimeUnit.MINUTES)
            .readTimeout(5, TimeUnit.MINUTES)
            .callTimeout(10, TimeUnit.MINUTES)
            .build();

    public static Response callAPI(String url, String method, String body) throws Exception{
        RequestBody requestBody = null;

        if(!ObjectUtils.isEmpty(body)){
            requestBody = RequestBody.create(body, MediaType.parse("application/json; charset=utf-8"));
        }

        Request request = new Request.Builder()
                .url(url)
                .method(method, requestBody)
                .build();

        return client.newCall(request).execute();
    }
}
