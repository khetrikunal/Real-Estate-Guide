package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.DTO.ConversationDTO;
import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.*;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageReadRepository messageReadRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final UserRepository userRepository;
    private final FcmService fcmService;
    private final ChatAccessPolicy chatAccess;
    private final ChatEvents chatEvents;

    // ── Conversations ────────────────────────────────────────

    @Transactional
    public Conversation getOrCreateDirectConversation(Long userId1, Long userId2) {
        User actor = userRepository.findById(userId1).orElseThrow(() -> new IllegalArgumentException("User not found"));
        User recipient = userRepository.findById(userId2).orElseThrow(() -> new IllegalArgumentException("Teammate not found"));
        if (!chatAccess.canContact(actor, recipient)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This person is outside your workspace");
        }
        return conversationRepository.findDirectConversation(userId1, userId2)
                .orElseGet(() -> createConversation("direct", null, List.of(userId1, userId2)));
    }

    @Transactional
    public Conversation createConversation(String type, String name, List<Long> participantIds) {
        Conversation conversation = Conversation.builder()
                .type(type)
                .name(name)
                .build();
        conversation = conversationRepository.save(conversation);

        for (Long userId : participantIds) {
            ConversationParticipant p = ConversationParticipant.builder()
                    .conversationId(conversation.getId())
                    .userId(userId)
                    .build();
            p = participantRepository.save(p);
            conversation.getParticipants().add(p);
        }

        chatEvents.publish(conversation.getId(), "conversation.created");
        return conversationRepository.findById(conversation.getId()).orElse(conversation);
    }

    public void validateParticipants(User actor, List<Long> ids) {
        if (ids == null || ids.isEmpty() || ids.size() > 50) throw new IllegalArgumentException("Choose 1 to 50 teammates");
        for (Long id : ids) {
            if (Objects.equals(id, actor.getId())) continue;
            User recipient = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Teammate not found"));
            if (!chatAccess.canContact(actor, recipient)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This person is outside your workspace");
        }
    }

    public List<String> readBy(Message message) {
        var readers = new LinkedHashSet<String>();
        readers.add(message.getSender().getId().toString());
        messageReadRepository.findByMessageId(message.getId()).forEach(read -> readers.add(read.getUserId().toString()));
        return List.copyOf(readers);
    }

    public List<ConversationDTO> getUserConversationsWithDetails(Long userId) {
        List<Conversation> conversations = conversationRepository.findByParticipantUserId(userId);
        List<ConversationDTO> dtos = new ArrayList<>();

        for (Conversation c : conversations) {
            List<ConversationDTO.ParticipantDTO> participantDTOs = new ArrayList<>();
            for (ConversationParticipant p : c.getParticipants()) {
                Optional<User> user = userRepository.findById(p.getUserId());
                user.ifPresent(u -> participantDTOs.add(toParticipantDTO(u)));
            }

            // Get last message
            Page<Message> lastPage = messageRepository
                    .findByConversationIdOrderByCreatedAtDesc(c.getId(), PageRequest.of(0, 1));
            Message lastMsg = lastPage.hasContent() ? lastPage.getContent().get(0) : null;

            Map<String, Object> lastMessageMap = null;
            if (lastMsg != null) {
                lastMessageMap = new LinkedHashMap<>();
                lastMessageMap.put("text", lastMsg.getContent() != null ? lastMsg.getContent() : "");
                lastMessageMap.put("type", lastMsg.getType() != null ? lastMsg.getType() : "text");
                lastMessageMap.put("senderId", lastMsg.getSender() != null ? lastMsg.getSender().getId().toString() : "");
                lastMessageMap.put("senderName", lastMsg.getSender() != null ? lastMsg.getSender().getName() : "");
                lastMessageMap.put("timestamp", lastMsg.getCreatedAt() != null ? lastMsg.getCreatedAt().toString() : null);
                lastMessageMap.put("fileUrl", lastMsg.getFileUrl());
                lastMessageMap.put("fileName", lastMsg.getFileName());
            }

            // Compute unread count: messages after user's lastReadAt, not sent by user
            ConversationParticipant.ConversationParticipantId cpId =
                    new ConversationParticipant.ConversationParticipantId(c.getId(), userId);
            LocalDateTime lastReadAt = participantRepository.findById(cpId)
                    .map(ConversationParticipant::getLastReadAt)
                    .orElse(null);

            int unreadCount = 0;
            if (lastReadAt == null) {
                // Never read: count all messages not sent by this user
                unreadCount = (int) messageRepository
                        .findByConversationIdOrderByCreatedAtDesc(c.getId(), PageRequest.of(0, 200))
                        .getContent()
                        .stream()
                        .filter(m -> !m.getSender().getId().equals(userId))
                        .count();
            } else {
                final LocalDateTime since = lastReadAt;
                unreadCount = (int) messageRepository
                        .findByConversationIdOrderByCreatedAtDesc(c.getId(), PageRequest.of(0, 200))
                        .getContent()
                        .stream()
                        .filter(m -> !m.getSender().getId().equals(userId)
                                && m.getCreatedAt() != null
                                && m.getCreatedAt().isAfter(since))
                        .count();
            }

            dtos.add(ConversationDTO.builder()
                    .conversationId(c.getId().toString())
                    .type(c.getType())
                    .name(c.getName())
                    .participants(participantDTOs)
                    .lastMessage(lastMessageMap != null ? lastMessageMap : Map.of())
                    .lastMessageAt(lastMsg != null ? lastMsg.getCreatedAt() : c.getUpdatedAt())
                    .createdAt(c.getCreatedAt())
                    .unreadCount(unreadCount)
                    .build());
        }

        // Sort: unread conversations first, then by lastMessageAt desc
        dtos.sort(Comparator
                .comparingInt((ConversationDTO d) -> d.getUnreadCount() > 0 ? 0 : 1)
                .thenComparing(Comparator.comparing(
                        d -> d.getLastMessageAt() != null ? d.getLastMessageAt() : d.getCreatedAt(),
                        Comparator.reverseOrder())));

        return dtos;
    }

    public List<UUID> getUserConversationIds(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return conversationRepository.findByParticipantUserId(user.getId())
                .stream()
                .map(Conversation::getId)
                .collect(Collectors.toList());
    }

    // ── Messages ─────────────────────────────────────────────

    @Transactional
    public Message saveMessage(UUID conversationId, Long senderId, String type,
                                String content, String fileUrl, String fileName,
                                Long fileSize, String fileMimeType, UUID replyToId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        ensureConversationParticipant(conversationId, senderId);
        if (replyToId != null) {
            Message parent = getAccessibleMessage(replyToId, senderId);
            if (!parent.getConversation().getId().equals(conversationId)) {
                throw new RuntimeException("Reply message is not in this conversation");
            }
        }

        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .type(type != null ? type : "text")
                .content(content)
                .fileUrl(normalizeStoredFileUrl(fileUrl))
                .fileName(fileName)
                .fileSize(fileSize)
                .fileMimeType(fileMimeType)
                .replyToId(replyToId)
                .build();

        message = messageRepository.save(message);

        // Update conversation timestamp
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        chatEvents.publish(conversationId, "message.created");

        // Send FCM to offline participants (non-critical — don't let FCM errors roll back the save)
        try {
            for (ConversationParticipant p : conversation.getParticipants()) {
                if (!p.getUserId().equals(senderId)) {
                    userRepository.findById(p.getUserId()).ifPresent(recipient -> {
                        if (recipient.getFcmToken() != null && !Boolean.TRUE.equals(recipient.getIsOnline())) {
                            String preview = "text".equals(type) ? content : "\uD83D\uDCCE Attachment";
                            fcmService.sendNewMessageNotification(recipient, sender.getName(), preview, conversation.getId().toString());
                        }
                    });
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ [ChatService] FCM push failed (message still saved): " + e.getMessage());
        }

        return message;
    }

    private String normalizeStoredFileUrl(String rawFileUrl) {
        if (rawFileUrl == null || rawFileUrl.isBlank()) {
            return rawFileUrl;
        }
        String fileName = extractAttachmentFileName(rawFileUrl);
        if (fileName == null || fileName.isBlank()) {
            String trimmed = rawFileUrl.trim();
            int queryIndex = trimmed.indexOf('?');
            return queryIndex >= 0 ? trimmed.substring(0, queryIndex) : trimmed;
        }
        return "/api/chat/files/" + fileName;
    }

    public Page<Message> getMessages(UUID conversationId, int page, int size, Long userId) {
        ensureConversationParticipant(conversationId, userId);
        return messageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversationId, PageRequest.of(page, size));
    }

    @Transactional
    public Message editMessage(UUID messageId, String newContent, Long userId) {
        Message msg = getAccessibleMessage(messageId, userId);
        if (!msg.getSender().getId().equals(userId)) {
            throw new RuntimeException("Not authorized to edit this message");
        }
        msg.setContent(newContent);
        msg.setEditedAt(LocalDateTime.now());
        chatEvents.publish(msg.getConversation().getId(), "message.updated");
        return messageRepository.save(msg);
    }

    @Transactional
    public Message deleteMessage(UUID messageId, Long userId) {
        Message msg = getAccessibleMessage(messageId, userId);
        if (!msg.getSender().getId().equals(userId)) {
            throw new RuntimeException("Not authorized to delete this message");
        }
        messageRepository.delete(msg);
        chatEvents.publish(msg.getConversation().getId(), "message.deleted");
        return msg;
    }

    // ── Read Receipts ────────────────────────────────────────

    @Transactional
    public void markMessagesRead(UUID conversationId, Long userId) {
        ensureConversationParticipant(conversationId, userId);
        Page<Message> unread = messageRepository
                .findByConversationIdOrderByCreatedAtDesc(conversationId, PageRequest.of(0, 100));

        for (Message msg : unread.getContent()) {
            if (!msg.getSender().getId().equals(userId)) {
                MessageRead read = MessageRead.builder()
                        .messageId(msg.getId())
                        .userId(userId)
                        .build();
                try {
                    messageReadRepository.save(read);
                } catch (Exception ignored) {
                    // Already read
                }
            }
        }

        // Update participant lastReadAt
        ConversationParticipant.ConversationParticipantId cpId =
                new ConversationParticipant.ConversationParticipantId(conversationId, userId);
        participantRepository.findById(cpId).ifPresent(cp -> {
            cp.setLastReadAt(LocalDateTime.now());
            participantRepository.save(cp);
        });
    }

    // ── Reactions ─────────────────────────────────────────────

    @Transactional
    public MessageReaction reactToMessage(UUID messageId, Long userId, String emoji) {
        getAccessibleMessage(messageId, userId);
        // Delete existing reaction first (upsert pattern)
        MessageReaction.MessageReactionId id = new MessageReaction.MessageReactionId(messageId, userId);
        messageReactionRepository.findById(id).ifPresent(messageReactionRepository::delete);

        MessageReaction reaction = MessageReaction.builder()
                .messageId(messageId)
                .userId(userId)
                .emoji(emoji)
                .build();
        return messageReactionRepository.save(reaction);
    }

    @Transactional
    public void saveFcmToken(String email, String fcmToken) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setFcmToken(fcmToken);
            userRepository.save(user);
        });
    }

    @Transactional
    public void removeReaction(UUID messageId, Long userId) {
        getAccessibleMessage(messageId, userId);
        messageReactionRepository.deleteByMessageIdAndUserId(messageId, userId);
    }

    public List<MessageReaction> getReactions(UUID messageId, Long userId) {
        getAccessibleMessage(messageId, userId);
        return messageReactionRepository.findByMessageId(messageId);
    }

    // ── Presence ─────────────────────────────────────────────

    @Transactional
    public void setUserOnline(String email, boolean online) {
        userRepository.findByEmail(email).ifPresent(user -> {
            user.setIsOnline(online);
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);
        });
    }

    // ── User Search ──────────────────────────────────────────

    public List<User> searchUsers(String query, User actor) {
        String term = query == null ? "" : query.trim();
        if (term.length() < 2) return List.of();
        return userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(term, term).stream()
                .filter(user -> chatAccess.canContact(actor, user)).limit(30).toList();
    }

    // ── Delete conversation ──────────────────────────────────

    @Transactional
    public void deleteConversation(UUID conversationId, Long userId) {
        ensureConversationParticipant(conversationId, userId);
        conversationRepository.deleteById(conversationId);
    }

    public Message getMessageById(UUID messageId) {
        if (messageId == null) return null;
        return messageRepository.findById(messageId).orElse(null);
    }

    // ── Helpers ──────────────────────────────────────────────

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    public void ensureConversationParticipant(UUID conversationId, Long userId) {
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Conversation access denied");
        }
    }

    public void ensureAttachmentAccessible(String fileUrl, Long userId) {
        String normalizedFileUrl = normalizeStoredFileUrl(fileUrl);
        Optional<Message> messageOptional = messageRepository.findFirstByFileUrl(normalizedFileUrl);
        if (messageOptional.isEmpty()) {
            String fileName = extractAttachmentFileName(normalizedFileUrl);
            if (fileName != null && !fileName.isBlank()) {
                messageOptional = messageRepository.findFirstByFileUrlEndingWith(fileName);
            }
        }
        Message message = messageOptional
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found"));
        ensureConversationParticipant(message.getConversation().getId(), userId);
    }

    private String extractAttachmentFileName(String rawFileUrl) {
        if (rawFileUrl == null || rawFileUrl.isBlank()) {
            return null;
        }
        String candidate = rawFileUrl.trim();
        try {
            URI uri = URI.create(candidate);
            if (uri.getPath() != null && !uri.getPath().isBlank()) {
                candidate = uri.getPath();
            }
        } catch (IllegalArgumentException ignored) {
            // Fall back to the raw candidate below.
        }
        int queryIndex = candidate.indexOf('?');
        if (queryIndex >= 0) {
            candidate = candidate.substring(0, queryIndex);
        }
        int lastSlash = candidate.lastIndexOf('/');
        if (lastSlash >= 0 && lastSlash < candidate.length() - 1) {
            return candidate.substring(lastSlash + 1);
        }
        return candidate.isBlank() ? null : candidate;
    }

    private Message getAccessibleMessage(UUID messageId, Long userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        ensureConversationParticipant(message.getConversation().getId(), userId);
        return message;
    }

    private ConversationDTO.ParticipantDTO toParticipantDTO(User user) {
        return ConversationDTO.ParticipantDTO.builder()
                .userId(user.getId().toString())
                .name(user.getName() != null ? user.getName() : "")
                .email(user.getEmail() != null ? user.getEmail() : "")
                .role(user.getRole() != null ? user.getRole().name() : "")
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .isOnline(Boolean.TRUE.equals(user.getIsOnline()))
                .build();
    }
}
