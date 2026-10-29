package com.real_estate.Kunal.Security;

import com.real_estate.Kunal.Repository.ConversationParticipantRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import com.real_estate.Kunal.Repository.MessageRepository;
import com.real_estate.Kunal.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Pattern CONVERSATION_TOPIC_PATTERN =
            Pattern.compile("^/topic/conversation\\.([0-9a-fA-F\\-]{36})(?:\\..+)?$");

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final ConversationParticipantRepository conversationParticipantRepository;
    private final MessageRepository messages;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor
                .getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new IllegalArgumentException("Missing Authorization header");
            }

            String jwt = authHeader.substring(7);
            try {
                String username = jwtUtil.extractEmail(jwt);
                String role = jwtUtil.extractRole(jwt);
                if (username == null || !jwtUtil.validateAccessToken(jwt, userRepository.findByEmail(username).orElse(null))) {
                    throw new IllegalArgumentException("Invalid token");
                }
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                username, jwt,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );
                accessor.setUser(auth);
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid token", e);
            }
        }

        if ((StompCommand.SUBSCRIBE.equals(accessor.getCommand())
                || StompCommand.SEND.equals(accessor.getCommand()))
                && accessor.getUser() == null) {
            throw new IllegalArgumentException("Unauthenticated WebSocket command");
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand()) || StompCommand.SEND.equals(accessor.getCommand())) {
            String token = accessor.getUser() instanceof org.springframework.security.core.Authentication auth
                    ? (String) auth.getCredentials() : null;
            if (!jwtUtil.validateAccessToken(token, userRepository.findByEmail(accessor.getUser().getName()).orElse(null))) {
                throw new IllegalArgumentException("Session token expired or revoked");
            }
        }

        if (StompCommand.SEND.equals(accessor.getCommand())
                && (accessor.getDestination() == null || !accessor.getDestination().startsWith("/app/"))) {
            throw new IllegalArgumentException("Clients must send messages through application handlers");
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if ("/user/queue/chat".equals(destination) || "/topic/user.status".equals(destination)) return message;
            Matcher matcher = destination != null ? CONVERSATION_TOPIC_PATTERN.matcher(destination) : null;
            if (matcher != null && matcher.matches()) {
                UUID conversationId = UUID.fromString(matcher.group(1));
                String email = accessor.getUser().getName();
                Long userId = userRepository.findByEmail(email)
                        .orElseThrow(() -> new IllegalArgumentException("User not found"))
                        .getId();
                if (!conversationParticipantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
                    throw new IllegalArgumentException("Conversation access denied");
                }
            } else if (destination != null && destination.matches("/topic/reaction\\.[0-9a-fA-F-]{36}")) {
                UUID messageId = UUID.fromString(destination.substring("/topic/reaction.".length()));
                var chatMessage = messages.findById(messageId).orElseThrow(() -> new IllegalArgumentException("Message not found"));
                Long userId = userRepository.findByEmail(accessor.getUser().getName()).orElseThrow().getId();
                if (!conversationParticipantRepository.existsByConversationIdAndUserId(chatMessage.getConversation().getId(), userId)) {
                    throw new IllegalArgumentException("Conversation access denied");
                }
            } else {
                throw new IllegalArgumentException("Unsupported chat subscription");
            }
        }
        return message;
    }
}
