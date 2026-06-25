package com.real_estate.Kunal.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

import com.real_estate.Kunal.Security.WebSocketAuthInterceptor;

import java.util.Arrays;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Value("${app.security.allowed-origins:http://localhost:53124,http://127.0.0.1:53124,http://localhost:56518,http://127.0.0.1:56518,http://localhost:[*],http://127.0.0.1:[*],http://[::1]:[*],https://realestate-guide.in,https://www.realestate-guide.in}")
    private String allowedOrigins;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Raw WebSocket for Flutter (stomp_dart_client)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(origin -> !origin.isBlank())
                        .toArray(String[]::new));
        // Compatibility endpoint for stale web bundles that connect to the root path.
        registry.addEndpoint("/")
                .setAllowedOriginPatterns(Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(origin -> !origin.isBlank())
                        .toArray(String[]::new));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(webSocketAuthInterceptor);
    }
}
