package com.real_estate.Kunal.Security;

import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.*;
import com.real_estate.Kunal.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class WebSocketTokenSecurityTest {
    private final JwtUtil jwt = new JwtUtil();
    private final UserRepository users = mock(UserRepository.class);
    private final ConversationParticipantRepository participants = mock(ConversationParticipantRepository.class);
    private final WebSocketAuthInterceptor interceptor = new WebSocketAuthInterceptor(jwt, users, participants, mock(MessageRepository.class));
    private final User user = User.builder().id(1L).email("ws@example.com").role(Role.EMPLOYEE).build();

    @BeforeEach
    void configure() {
        ReflectionTestUtils.setField(jwt, "secretKey", "websocket-test-secret-with-thirty-two-characters");
        ReflectionTestUtils.setField(jwt, "expiration", 60000L);
        ReflectionTestUtils.setField(jwt, "issuer", "test");
        ReflectionTestUtils.setField(jwt, "audience", "test");
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    }

    @Test
    void resetTokenCannotConnect() {
        String reset = jwt.generateTokenWithClaims(user.getEmail(), Map.of("purpose", "reset_password"), 60000);
        var headers = StompHeaderAccessor.create(StompCommand.CONNECT);
        headers.setNativeHeader("Authorization", "Bearer " + reset);
        assertThatThrownBy(() -> send(headers)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void accessTokenIsRecheckedAfterPasswordChange() {
        var headers = authenticated(StompCommand.SEND, "/app/chat.join");
        user.setTokenVersion(1L);
        assertThatThrownBy(() -> send(headers)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void clientsCannotPublishDirectlyToBrokerTopics() {
        assertThatThrownBy(() -> send(authenticated(StompCommand.SEND, "/topic/conversation." + UUID.randomUUID())))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void conversationSubscriptionRequiresMembership() {
        UUID conversation = UUID.randomUUID();
        assertThatThrownBy(() -> send(authenticated(StompCommand.SUBSCRIBE, "/topic/conversation." + conversation)))
                .isInstanceOf(IllegalArgumentException.class);
        when(participants.existsByConversationIdAndUserId(conversation, user.getId())).thenReturn(true);
        assertThatCode(() -> send(authenticated(StompCommand.SUBSCRIBE, "/topic/conversation." + conversation)))
                .doesNotThrowAnyException();
    }

    @Test
    void inboxSubscriptionIsPrivateAndCannotBeAddressedAsAnotherUser() {
        assertThatCode(() -> send(authenticated(StompCommand.SUBSCRIBE, "/user/queue/chat"))).doesNotThrowAnyException();
        for (String destination : List.of("/queue/chat", "/user/other@example.com/queue/chat", "/topic/chat")) {
            assertThatThrownBy(() -> send(authenticated(StompCommand.SUBSCRIBE, destination)))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    private StompHeaderAccessor authenticated(StompCommand command, String destination) {
        var headers = StompHeaderAccessor.create(command);
        headers.setDestination(destination);
        String token = jwt.generateToken(user.getEmail(), user.getRole().name(), user.getId(), 0L);
        headers.setUser(new UsernamePasswordAuthenticationToken(user.getEmail(), token, List.of()));
        return headers;
    }

    private void send(StompHeaderAccessor headers) {
        headers.setLeaveMutable(true);
        interceptor.preSend(MessageBuilder.createMessage(new byte[0], headers.getMessageHeaders()), null);
    }
}
