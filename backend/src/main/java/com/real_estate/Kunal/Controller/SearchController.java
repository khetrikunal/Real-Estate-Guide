package com.real_estate.Kunal.Controller;

import com.real_estate.Kunal.DTO.ConversationDTO;
import com.real_estate.Kunal.DTO.GlobalSearchResultDTO;
import com.real_estate.Kunal.DTO.MessageSearchResultDTO;
import com.real_estate.Kunal.Entity.Conversation;
import com.real_estate.Kunal.Entity.Message;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.ConversationRepository;
import com.real_estate.Kunal.Repository.MessageRepository;
import com.real_estate.Kunal.Service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/chat/search")
@RequiredArgsConstructor
public class SearchController {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ChatService chatService;

    @GetMapping("/messages")
    public ResponseEntity<List<MessageSearchResultDTO>> searchMessages(
            @RequestParam("q") String query,
            @RequestParam(value = "convId", required = false) UUID convId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            Principal principal) {

        User user = chatService.getUserByEmail(principal.getName());
        List<Message> results = messageRepository.searchMessages(
                user.getId(), convId, query, 20, page * 20);

        List<MessageSearchResultDTO> dtos = results.stream()
                .map(m -> messageToDto(m, user, query))
                .toList();

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/global")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<GlobalSearchResultDTO> globalSearch(
            @RequestParam("q") String query,
            Principal principal) {

        User user = chatService.getUserByEmail(principal.getName());

        List<Message> msgs = messageRepository.searchMessages(user.getId(), null, query, 5, 0);
        List<Conversation> convs = conversationRepository.searchConversations(user.getId(), query, 5);
        List<User> users = chatService.searchUsers(query, user).stream()
                .filter(u -> !Objects.equals(u.getId(), user.getId()))
                .limit(20)
                .toList();

        List<MessageSearchResultDTO> messageDtos = msgs.stream()
                .map(m -> messageToDto(m, user, query))
                .toList();

        List<ConversationDTO> allConvs = chatService.getUserConversationsWithDetails(user.getId());
        List<ConversationDTO> convDtos = convs.stream()
                .map(c -> {
                    ConversationDTO found = allConvs.stream()
                        .filter(dto -> dto.getConversationId().equals(c.getId().toString()))
                        .findFirst().orElse(null);
                    return found;
                })
                .filter(Objects::nonNull)
                .toList();

        List<Map<String, Object>> contactMaps = users.stream()
                .map(u -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("userId", u.getId() != null ? u.getId().toString() : "");
                    map.put("name", u.getName());
                    map.put("email", u.getEmail());
                    map.put("role", u.getRole() != null ? u.getRole().name() : "");
                    map.put("photoUrl", u.getProfilePhotoUrl());
                    return map;
                })
                .toList();

        GlobalSearchResultDTO result = GlobalSearchResultDTO.builder()
                .messages(messageDtos)
                .conversations(convDtos)
                .contacts(contactMaps)
                .build();

        return ResponseEntity.ok(result);
    }

    private MessageSearchResultDTO messageToDto(Message m, User currentUser, String query) {
        String convTitle = m.getConversation().getName();
        if ("direct".equals(m.getConversation().getType())) {
            User otherUser = m.getConversation().getParticipants().stream()
                    .filter(p -> !p.getUserId().equals(currentUser.getId()))
                    .map(p -> p.getUser())
                    .findFirst().orElse(null);
            if (otherUser != null) {
                convTitle = otherUser.getName();
            }
        }

        String preview = m.getContent();
        if (m.getContent() == null || m.getContent().isEmpty()) {
            preview = m.getType() != null ? "📎 " + m.getType() : "Message";
        } else if (preview.length() > 80) {
            preview = preview.substring(0, 80) + "...";
        }

        return MessageSearchResultDTO.builder()
                .messageId(m.getId().toString())
                .conversationId(m.getConversation().getId().toString())
                .conversationTitle(convTitle)
                .bodyPreview(preview)
                .query(query)
                .senderName(m.getSender().getName())
                .senderAvatar(m.getSender().getProfilePhotoUrl())
                .sentAt(m.getCreatedAt())
                .build();
    }
}
