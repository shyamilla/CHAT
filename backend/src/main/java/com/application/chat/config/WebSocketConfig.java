package com.application.chat.config;

import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;

import com.application.chat.repositories.UserRepository;
import com.application.chat.models.User;

import java.util.Map;
import java.util.Optional;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    /**
     * ✅ Custom handshake interceptor that extracts JWT from query param
     */
    public static class JwtHandshakeInterceptor implements HandshakeInterceptor {

        @Override
        public boolean beforeHandshake(
                ServerHttpRequest request,
                ServerHttpResponse response,
                WebSocketHandler wsHandler,
                Map<String, Object> attributes) {

            String query = request.getURI().getQuery();
            if (query != null && query.contains("token=")) {
                String token = query.split("token=")[1].split("&")[0];
                attributes.put("jwtToken", token);
                System.out.println("🟢 JWT token found in handshake: "
                        + token.substring(0, Math.min(10, token.length())) + "...");
            } else {
                System.out.println("⚠️ No JWT token found in WebSocket handshake");
            }
            return true;
        }

        @Override
        public void afterHandshake(
                ServerHttpRequest request,
                ServerHttpResponse response,
                WebSocketHandler wsHandler,
                Exception exception) {
            // nothing
        }
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(new JwtHandshakeInterceptor())
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String token = (String) accessor.getSessionAttributes().get("jwtToken");

                    if (token != null) {
                        try {
                            Claims claims = jwtUtils.getClaimsFromJwtToken(token);
                            String identifier = claims.getSubject(); // could be email or username

                            // ✅ Resolve actual username (not email)
                            String username = userRepository.findByEmail(identifier)
                                    .map(User::getUsername)
                                    .orElse(identifier); // fallback if token already holds username

                            accessor.setUser(() -> username);
                            SecurityContextHolder.clearContext();

                            System.out.println("✅ WebSocket authenticated as username: " + username);
                        } catch (Exception e) {
                            System.out.println("❌ Invalid WebSocket JWT: " + e.getMessage());
                        }
                    } else {
                        System.out.println("❌ No JWT found in WebSocket handshake!");
                    }
                }
                return message;
            }
        });
    }
}
