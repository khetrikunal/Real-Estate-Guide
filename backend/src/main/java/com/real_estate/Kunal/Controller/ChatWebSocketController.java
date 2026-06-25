package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.ChatMessageDTO;
import com.real_estate.Kunal.DTO.ReadDTO;
import com.real_estate.Kunal.DTO.TypingDTO;
import com.real_estate.Kunal.Entity.Message;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Security.ChatRateLimiter;
import com.real_estate.Kunal.Security.SignedMediaUrlService;
import com.real_estate.Kunal.Service.ChatService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final SignedMediaUrlService signedMediaUrlService;
    private final ChatRateLimiter chatRateLimiter;

    @MessageMapping("/chat.join")
    public void joinConversations(Principal principal) {
        if (principal == null) return;

        chatService.setUserOnline(principal.getName(), true);
        broadcastUserStatus(principal.getName(), true);
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageDTO dto, Principal principal) {
        if (principal == null) {
            log.warn("Dropped unauthenticated chat.send STOMP message");
            return;
        }
        if (!chatRateLimiter.allowUserAction(principal.getName(), "stomp-chat-send", 90, Duration.ofMinutes(1))) {
            log.warn("Dropped rate-limited chat.send STOMP message");
            return;
        }

        try {
            User sender = chatService.getUserByEmail(principal.getName());
            UUID conversationId = UUID.fromString(dto.getConversationId());
            UUID replyToId = dto.getReplyToId() != null ? UUID.fromString(dto.getReplyToId()) : null;
            chatService.ensureConversationParticipant(conversationId, sender.getId());

            // Null-guard content — never save empty content without a file
            String content = dto.getContent() != null ? dto.getContent().trim() : "";
            String messageType = dto.getType() != null ? dto.getType() : "text";
            String fileUrl = dto.getFileUrl();
            if ((fileUrl == null || fileUrl.isBlank())
                    && !"text".equalsIgnoreCase(messageType)
                    && looksLikeAttachmentUrl(content)) {
                fileUrl = content;
            }
            if (content.isEmpty() && fileUrl == null) return;

            Message saved = chatService.saveMessage(
                    conversationId,
                    sender.getId(),
                    messageType,
                    content,
                    fileUrl,
                    dto.getFileName(),
                    dto.getFileSize(),
                    dto.getFileMimeType(),
                    replyToId
            );

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("messageId", saved.getId().toString());
            payload.put("conversationId", dto.getConversationId());
            payload.put("senderId", sender.getId().toString());
            payload.put("senderName", sender.getName());
            payload.put("senderRole", sender.getRole() != null ? sender.getRole().name() : "");
            payload.put("type", saved.getType());
            payload.put("content", saved.getContent() != null ? saved.getContent() : "");
            payload.put("text", saved.getContent() != null ? saved.getContent() : "");  // Flutter reads 'text'
            payload.put("fileUrl", signedMediaUrlService.signPath(saved.getFileUrl()));
            payload.put("fileName", saved.getFileName());
            payload.put("fileSize", saved.getFileSize());
            payload.put("fileMimeType", saved.getFileMimeType());
            payload.put("replyToId", saved.getReplyToId() != null ? saved.getReplyToId().toString() : null);

            if (saved.getReplyToId() != null) {
                try {
                    Message parent = chatService.getMessageById(saved.getReplyToId());
                    if (parent != null) {
                        Map<String, Object> replyObj = new LinkedHashMap<>();
                        replyObj.put("messageId", parent.getId().toString());
                        replyObj.put("senderName", parent.getSender().getName());
                        replyObj.put("text", parent.getContent() != null ? parent.getContent() : parent.getFileName());
                        payload.put("replyTo", replyObj);
                    }
                } catch (Exception e) {
                    log.debug("Reply parent was unavailable for chat.send payload");
                }
            }

            payload.put("isDeleted", false);
            payload.put("timestamp", saved.getCreatedAt().toString());
            payload.put("editedAt", saved.getEditedAt() != null ? saved.getEditedAt().toString() : null);
            payload.put("status", "sent");
            payload.put("readBy", List.of(sender.getId().toString()));

            messagingTemplate.convertAndSend(
                    "/topic/conversation." + dto.getConversationId(),
                    (Object) payload
            );
        } catch (Exception e) {
            log.warn("Dropped chat.send STOMP message after validation failure: {}", e.getClass().getSimpleName());
        }
    }

    private boolean looksLikeAttachmentUrl(String value) {
        return value != null
                && (value.startsWith("http://")
                || value.startsWith("https://")
                || value.startsWith("/api/chat/files/")
                || value.startsWith("chat/"));
    }

    @MessageMapping("/chat.typing")
    public void typingIndicator(@Payload TypingDTO dto, Principal principal) {
        if (principal == null) return;

        User user = chatService.getUserByEmail(principal.getName());
        chatService.ensureConversationParticipant(UUID.fromString(dto.getConversationId()), user.getId());
        Object typingPayload = Map.of(
                "userId", user.getId().toString(),
                "userName", user.getName() != null ? user.getName() : "",
                "isTyping", dto.isTyping()
        );
        messagingTemplate.convertAndSend(
                "/topic/conversation." + dto.getConversationId() + ".typing",
                typingPayload
        );
    }

    @MessageMapping("/chat.read")
    public void markRead(@Payload ReadDTO dto, Principal principal) {
        if (principal == null) return;

        User user = chatService.getUserByEmail(principal.getName());
        UUID conversationId = UUID.fromString(dto.getConversationId());
        chatService.ensureConversationParticipant(conversationId, user.getId());
        chatService.markMessagesRead(conversationId, user.getId());

        Map<String, Object> readPayload = new LinkedHashMap<>();
        readPayload.put("conversationId", dto.getConversationId());
        readPayload.put("userId", user.getId().toString());
        readPayload.put("readAt", LocalDateTime.now().toString());
        readPayload.put(
                "messageIds",
                dto.getMessageIds() != null ? dto.getMessageIds() : List.of()
        );
        messagingTemplate.convertAndSend(
                "/topic/conversation." + dto.getConversationId() + ".read",
                (Object) readPayload
        );
    }

    @MessageMapping("/chat.call")
    public void callSignal(@Payload Map<String, Object> dto, Principal principal) {
        if (principal == null || dto == null) return;
        if (!chatRateLimiter.allowUserAction(principal.getName(), "stomp-chat-call", 30, Duration.ofMinutes(1))) {
            log.warn("Dropped rate-limited chat.call STOMP message");
            return;
        }

        Object rawConversationId = dto.get("conversationId");
        if (rawConversationId == null) return;

        User user = chatService.getUserByEmail(principal.getName());
        UUID conversationId = UUID.fromString(rawConversationId.toString());
        chatService.ensureConversationParticipant(conversationId, user.getId());

        Map<String, Object> signalPayload = new LinkedHashMap<>(dto);
        signalPayload.put("conversationId", conversationId.toString());
        signalPayload.put("senderId", user.getId().toString());
        signalPayload.put("senderName", user.getName() != null ? user.getName() : "");
        signalPayload.putIfAbsent("sentAt", LocalDateTime.now().toString());

        messagingTemplate.convertAndSend(
                "/topic/conversation." + conversationId + ".call",
                (Object) signalPayload
        );
    }

    @EventListener
    public void handleWebSocketDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = accessor.getUser() != null ? accessor.getUser().getName() : null;
        if (username != null) {
            chatService.setUserOnline(username, false);
            broadcastUserStatus(username, false);
        }
    }

    private void broadcastUserStatus(String email, boolean isOnline) {
        User user = chatService.getUserByEmail(email);
        Object statusPayload = Map.of(
                "userId", user.getId().toString(),
                "isOnline", isOnline,
                "lastSeen", LocalDateTime.now().toString()
        );
        messagingTemplate.convertAndSend(
                "/topic/user.status",
                statusPayload
        );
    }
}
