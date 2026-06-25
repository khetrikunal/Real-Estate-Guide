package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.ConversationDTO;
import com.real_estate.Kunal.Entity.Conversation;
import com.real_estate.Kunal.Entity.Message;
import com.real_estate.Kunal.Entity.MessageReaction;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Security.SignedMediaUrlService;
import com.real_estate.Kunal.Service.ChatService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final SignedMediaUrlService signedMediaUrlService;

    // GET /api/chat/conversations — all conversations for current user
    @GetMapping("/conversations")
    public List<ConversationDTO> getConversations(Principal principal) {
        User user = chatService.getUserByEmail(principal.getName());
        return chatService.getUserConversationsWithDetails(user.getId()).stream()
                .map(this::withSignedMedia)
                .toList();
    }

    // POST /api/chat/conversations — create or get direct conversation
    @PostMapping("/conversations")
    public ResponseEntity<Map<String, Object>> createConversation(
            @RequestBody Map<String, Object> body,
            Principal principal) {

        User currentUser = chatService.getUserByEmail(principal.getName());
        String type = (String) body.getOrDefault("type", "direct");

        if ("direct".equals(type)) {
            Long participantId = Long.valueOf(body.get("participantId").toString());
            Conversation conv = chatService.getOrCreateDirectConversation(
                    currentUser.getId(), participantId);
            return ResponseEntity.ok(Map.of(
                    "conversationId", conv.getId().toString(),
                    "type", conv.getType()));
        } else {
            // Group conversation
            String groupName = (String) body.get("name");
            @SuppressWarnings("unchecked")
            List<String> participantIds = (List<String>) body.get("participantIds");
            List<Long> ids = participantIds.stream()
                    .map(Long::valueOf)
                    .toList();
            if (!ids.contains(currentUser.getId())) {
                ids = new ArrayList<>(ids);
                ids.add(currentUser.getId());
            }
            Conversation conv = chatService.createConversation(type, groupName, ids);
            return ResponseEntity.ok(Map.of(
                    "conversationId", conv.getId().toString(),
                    "type", conv.getType()));
        }
    }

    // GET /api/chat/conversations/{id}/messages?page=0&size=30
    @GetMapping("/conversations/{id}/messages")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<Map<String, Object>> getMessages(
            @PathVariable("id") UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            Principal principal) {

        User user = chatService.getUserByEmail(principal.getName());
        Page<Message> messages = chatService.getMessages(conversationId, page, size, user.getId());
        List<Message> chronological = new ArrayList<>(messages.getContent());
        Collections.reverse(chronological);
        return chronological.stream()
                .map(message -> messageToMap(message, user.getId()))
                .toList();
    }

    // POST /api/chat/conversations/{id}/read
    @PostMapping("/conversations/{id}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable("id") UUID conversationId,
            Principal principal) {

        User user = chatService.getUserByEmail(principal.getName());
        chatService.markMessagesRead(conversationId, user.getId());
        return ResponseEntity.ok().build();
    }

    // GET /api/chat/users/search?q=query
    @GetMapping("/users/search")
    public List<Map<String, Object>> searchUsers(@RequestParam("q") String query) {
        return chatService.searchUsers(query).stream()
                .map(u -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("userId", u.getId().toString());
                    map.put("name", u.getName());
                    map.put("email", u.getEmail());
                    map.put("role", u.getRole() != null ? u.getRole().name() : "");
                    map.put("isOnline", Boolean.TRUE.equals(u.getIsOnline()));
                    map.put("profilePhotoUrl", u.getProfilePhotoUrl());
                    return map;
                })
                .toList();
    }

    // DELETE /api/chat/conversations/{id}
    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable("id") UUID conversationId,
                                                   Principal principal) {
        User user = chatService.getUserByEmail(principal.getName());
        chatService.deleteConversation(conversationId, user.getId());
        return ResponseEntity.ok().build();
    }

    // POST /api/chat/users/upsert — no-op in consolidated backend (users already in main table)
    @PostMapping("/users/upsert")
    public ResponseEntity<Map<String, Object>> upsertUser(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    // POST /api/chat/presence — update user online status
    @PostMapping("/presence")
    public ResponseEntity<Map<String, Object>> updatePresence(@RequestBody Map<String, Object> body, Principal principal) {
        if (principal != null) {
            boolean isOnline = Boolean.TRUE.equals(body.get("isOnline"));
            chatService.setUserOnline(principal.getName(), isOnline);
        }
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    // POST /api/chat/fcm-token
    @PostMapping("/fcm-token")
    public ResponseEntity<Map<String, Object>> updateFcmToken(@RequestBody Map<String, Object> body, Principal principal) {
        if (principal != null) {
            String token = (String) body.get("token");
            if (token != null && !token.isBlank()) {
                chatService.saveFcmToken(principal.getName(), token);
            }
        }
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    // GET /api/chat/calls/ice-config — WebRTC ICE servers for authenticated chat clients
    @GetMapping("/calls/ice-config")
    public ResponseEntity<Map<String, Object>> getIceConfig(Principal principal) {
        if (principal != null) {
            chatService.getUserByEmail(principal.getName());
        }

        List<Map<String, Object>> servers = new ArrayList<>();
        servers.add(Map.of("urls", List.of("stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478")));

        String turnUrls = System.getenv("CHAT_TURN_URLS");
        String turnUsername = System.getenv("CHAT_TURN_USERNAME");
        String turnCredential = System.getenv("CHAT_TURN_CREDENTIAL");
        if (turnUrls != null && !turnUrls.isBlank()) {
            Map<String, Object> turn = new LinkedHashMap<>();
            turn.put("urls", Arrays.stream(turnUrls.split(",")).map(String::trim).filter(value -> !value.isBlank()).toList());
            if (turnUsername != null && !turnUsername.isBlank()) {
                turn.put("username", turnUsername);
            }
            if (turnCredential != null && !turnCredential.isBlank()) {
                turn.put("credential", turnCredential);
            }
            servers.add(turn);
        }

        return ResponseEntity.ok(Map.of("iceServers", servers));
    }

    // ── Reactions ────────────────────────────────────────────

    @PostMapping("/messages/{messageId}/react")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Map<String, Object>> addReaction(
            @PathVariable UUID messageId,
            @RequestBody Map<String, String> body,
            Principal principal) {
        String emoji = body.getOrDefault("emoji", "");
        if (emoji.isBlank()) return ResponseEntity.badRequest().build();
        User user = chatService.getUserByEmail(principal.getName());
        MessageReaction reaction = chatService.reactToMessage(messageId, user.getId(), emoji);

        // Fetch all reactions and broadcast
        List<Map<String, Object>> reactions = buildReactionsPayload(reaction.getMessageId(), user.getId());
        Map<String, Object> broadcastPayload = new LinkedHashMap<>();
        broadcastPayload.put("messageId", messageId.toString());
        broadcastPayload.put("reactions", reactions);
        messagingTemplate.convertAndSend("/topic/reaction." + messageId, (Object) broadcastPayload);

        return ResponseEntity.ok(Map.of("status", "ok", "emoji", emoji));
    }

    @DeleteMapping("/messages/{messageId}/react")
    public ResponseEntity<Void> removeReaction(
            @PathVariable UUID messageId,
            Principal principal) {
        User user = chatService.getUserByEmail(principal.getName());
        chatService.removeReaction(messageId, user.getId());

        List<Map<String, Object>> reactions = buildReactionsPayload(messageId, user.getId());
        Map<String, Object> broadcastPayload = new LinkedHashMap<>();
        broadcastPayload.put("messageId", messageId.toString());
        broadcastPayload.put("reactions", reactions);
        messagingTemplate.convertAndSend("/topic/reaction." + messageId, (Object) broadcastPayload);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/messages/{messageId}/reactions")
    public List<Map<String, Object>> getReactions(@PathVariable UUID messageId,
                                                  Principal principal) {
        User user = chatService.getUserByEmail(principal.getName());
        return buildReactionsPayload(messageId, user.getId());
    }

    private List<Map<String, Object>> buildReactionsPayload(UUID messageId, Long userId) {
        return chatService.getReactions(messageId, userId).stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("userId", r.getUserId().toString());
            m.put("emoji", r.getEmoji());
            return m;
        }).collect(java.util.stream.Collectors.toList());
    }

    // ── Edit & Delete ────────────────────────────────────────

    @PatchMapping("/messages/{messageId}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Map<String, Object>> editMessage(
            @PathVariable UUID messageId,
            @RequestBody Map<String, String> body,
            Principal principal) {
        String newContent = body.get("content");
        if (newContent == null || newContent.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        User user = chatService.getUserByEmail(principal.getName());
        Message msg = chatService.editMessage(messageId, newContent, user.getId());

        Map<String, Object> payload = messageToMap(msg, user.getId());
        messagingTemplate.convertAndSend(
                "/topic/conversation." + msg.getConversation().getId() + ".edit",
                (Object) payload
        );
        return ResponseEntity.ok(payload);
    }

    @DeleteMapping("/messages/{messageId}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> deleteMessage(
            @PathVariable UUID messageId,
            Principal principal) {
        User user = chatService.getUserByEmail(principal.getName());
        Message msg = chatService.deleteMessage(messageId, user.getId());

        Map<String, Object> payload = messageToMap(msg, user.getId());
        messagingTemplate.convertAndSend(
                "/topic/conversation." + msg.getConversation().getId() + ".delete",
                (Object) payload
        );
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> messageToMap(Message msg, Long currentUserId) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("messageId", msg.getId().toString());
        map.put("conversationId", msg.getConversation().getId().toString());
        map.put("senderId", msg.getSender().getId().toString());
        map.put("senderName", msg.getSender().getName());
        map.put("senderRole", msg.getSender().getRole() != null
                ? msg.getSender().getRole().name() : "");
        map.put("type", msg.getType());
        map.put("content", msg.getContent());
        map.put("text", msg.getContent()); // Flutter reads 'text'
        map.put("fileUrl", signedMediaUrlService.signPath(msg.getFileUrl()));
        map.put("fileName", msg.getFileName());
        map.put("fileSize", msg.getFileSize());
        map.put("fileMimeType", msg.getFileMimeType());
        map.put("replyToId", msg.getReplyToId() != null ? msg.getReplyToId().toString() : null);

        if (msg.getReplyToId() != null) {
            Message parent = chatService.getMessageById(msg.getReplyToId());
            if (parent != null) {
                Map<String, Object> replyObj = new LinkedHashMap<>();
                replyObj.put("messageId", parent.getId().toString());
                replyObj.put("senderName", parent.getSender().getName());
                replyObj.put("text", parent.getContent() != null ? parent.getContent() : parent.getFileName());
                map.put("replyTo", replyObj);
            }
        }

        // Include current reactions so bubble chips render on page load
        List<Map<String, Object>> reactionList;
        try {
            reactionList = chatService.getReactions(msg.getId(), currentUserId)
                    .stream()
                    .map(r -> {
                        Map<String, Object> rm = new LinkedHashMap<>();
                        rm.put("userId", r.getUserId().toString());
                        rm.put("emoji", r.getEmoji());
                        return rm;
                    })
                    .collect(java.util.stream.Collectors.toList());
        } catch (RuntimeException ex) {
            reactionList = List.of();
        }
        map.put("reactions", reactionList);

        map.put("isDeleted", false);
        map.put("timestamp", msg.getCreatedAt() != null ? msg.getCreatedAt().toString() : null);
        map.put("editedAt", msg.getEditedAt() != null ? msg.getEditedAt().toString() : null);
        map.put("status", "sent");
        map.put("readBy", List.of(msg.getSender().getId().toString()));
        return map;
    }

    private ConversationDTO withSignedMedia(ConversationDTO dto) {
        if (dto.getLastMessage() == null) {
            return dto;
        }
        Object fileUrl = dto.getLastMessage().get("fileUrl");
        if (fileUrl instanceof String rawFileUrl && !rawFileUrl.isBlank()) {
            dto.getLastMessage().put("fileUrl", signedMediaUrlService.signPath(rawFileUrl));
        }
        return dto;
    }
}


