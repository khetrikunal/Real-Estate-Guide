package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.*;
import com.real_estate.Kunal.util.JwtUtil;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.messaging.converter.StringMessageConverter;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.springframework.transaction.support.TransactionTemplate;
import java.lang.reflect.Type;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

/** Uses a real HTTP/WebSocket server with the isolated test H2 database. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ChatRealtimeIntegrationTest {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired ChatService chat;
    @Autowired ConversationRepository conversations;
    @Autowired MessageRepository messages;
    @Autowired MessageReadRepository reads;
    @Autowired JwtUtil jwt;
    @Autowired TransactionTemplate tx;
    private final List<WebSocketStompClient> clients = new ArrayList<>();
    private final List<StompSession> sessions = new ArrayList<>();
    private final List<Long> userIds = new ArrayList<>();
    private final List<UUID> conversationIds = new ArrayList<>();

    User member(Role role, Long parent) {
        User user = users.save(User.builder().name("Chat test " + role).email(UUID.randomUUID() + "@chat.test")
                .role(role).addedBy(parent).build());
        userIds.add(user.getId());
        return user;
    }

    StompSession connect(User user) throws Exception {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new StringMessageConverter() {
            @Override protected boolean supportsMimeType(org.springframework.messaging.MessageHeaders headers) { return true; }
        });
        clients.add(client);
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer " + jwt.generateToken(user.getEmail(), user.getRole().name(), user.getId(), 0L));
        StompSession session = client.connectAsync("ws://127.0.0.1:" + port + "/ws", new WebSocketHttpHeaders(), headers,
                new StompSessionHandlerAdapter() {}).get(15, TimeUnit.SECONDS);
        sessions.add(session);
        return session;
    }

    BlockingQueue<String> subscribe(StompSession session, String destination) {
        BlockingQueue<String> queue = new LinkedBlockingQueue<>();
        session.subscribe(destination, new StompFrameHandler() {
            public Type getPayloadType(StompHeaders headers) { return String.class; }
            public void handleFrame(StompHeaders headers, Object payload) { queue.add((String) payload); }
        });
        return queue;
    }

    void send(StompSession session, String destination, String body) {
        StompHeaders headers = new StompHeaders();
        headers.setDestination(destination);
        headers.setContentType(MediaType.APPLICATION_JSON);
        session.send(headers, body);
    }

    String event(BlockingQueue<String> queue, String expected) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (System.nanoTime() < deadline) {
            String value = queue.poll(1, TimeUnit.SECONDS);
            if (value != null && value.contains(expected)) return value;
        }
        throw new AssertionError("Missing real-time event: " + expected);
    }

    @Test void privateInboxDeliversNewThreadsMessagesRepliesAndReadReceipts() throws Exception {
        User sub = member(Role.SUB_ADMIN, null);
        User admin = member(Role.ADMIN, sub.getId());
        User employee = member(Role.EMPLOYEE, admin.getId());
        StompSession sender = connect(sub);
        StompSession recipient = connect(employee);
        var senderInbox = subscribe(sender, "/user/queue/chat");
        var recipientInbox = subscribe(recipient, "/user/queue/chat");
        var presence = subscribe(recipient, "/topic/user.status");
        send(recipient, "/app/chat.join", "{}");
        event(presence, employee.getId().toString());

        UUID id = chat.getOrCreateDirectConversation(sub.getId(), employee.getId()).getId();
        conversationIds.add(id);
        assertThat(event(recipientInbox, "conversation.created")).contains(id.toString());
        assertThat(event(senderInbox, "conversation.created")).contains(id.toString());
        // Recipient has no open conversation topic: inbox must still notify them.
        send(sender, "/app/chat.send", "{\"conversationId\":\"" + id + "\",\"content\":\"Site visit confirmed\",\"type\":\"text\"}");
        assertThat(event(recipientInbox, "message.created")).contains(id.toString());
        tx.executeWithoutResult(status -> assertThat(chat.getMessages(id, 0, 30, employee.getId()).getContent())
                .extracting(Message::getContent).contains("Site visit confirmed"));

        var thread = subscribe(sender, "/topic/conversation." + id);
        var read = subscribe(sender, "/topic/conversation." + id + ".read");
        // A round trip through join confirms the receiving session remains live.
        send(sender, "/app/chat.join", "{}");
        event(presence, sub.getId().toString());
        send(recipient, "/app/chat.send", "{\"conversationId\":\"" + id + "\",\"content\":\"Thank you\",\"type\":\"text\"}");
        assertThat(event(thread, "Thank you")).contains(employee.getId().toString());
        send(recipient, "/app/chat.read", "{\"conversationId\":\"" + id + "\",\"messageIds\":[]}");
        assertThat(event(read, "readAt")).contains(employee.getId().toString());
        tx.executeWithoutResult(status -> {
            var history = chat.getMessages(id, 0, 30, sub.getId()).getContent();
            Message first = history.stream().filter(m -> m.getContent().equals("Site visit confirmed")).findFirst().orElseThrow();
            assertThat(chat.readBy(first)).contains(employee.getId().toString());
        });
        User outsider = member(Role.SUB_ADMIN, null);
        assertThatThrownBy(() -> chat.getOrCreateDirectConversation(employee.getId(), outsider.getId()))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    @AfterEach void cleanup() {
        sessions.forEach(session -> { if (session.isConnected()) session.disconnect(); });
        clients.forEach(WebSocketStompClient::stop);
        tx.executeWithoutResult(status -> {
            for (UUID id : conversationIds) {
                for (Message message : messages.findByConversationIdOrderByCreatedAtDesc(id, org.springframework.data.domain.PageRequest.of(0, 100))) {
                    reads.deleteAll(reads.findByMessageId(message.getId()));
                    messages.delete(message);
                }
                messages.flush();
                conversations.deleteById(id);
            }
            conversations.flush();
            userIds.forEach(users::deleteById);
        });
    }
}
