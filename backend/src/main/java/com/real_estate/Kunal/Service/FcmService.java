package com.real_estate.Kunal.Service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.real_estate.Kunal.Entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class FcmService {

    private final FirebaseCustomTokenService firebaseInitService;

    public void sendFollowUpReminder(User recipient, String customerName, String callingType) {
        if (!firebaseInitService.isInitialized()) {
            log.trace("FCM not initialized, skipping follow-up reminder.");
            return;
        }

        String token = recipient.getFcmToken();
        if (token == null || token.isBlank()) {
            log.trace("User {} has no FCM token, skipping follow-up reminder.", recipient.getId());
            return;
        }

        try {
            Notification notification = Notification.builder()
                    .setTitle("Follow-Up Reminder")
                    .setBody(customerName + " — " + callingType + " scheduled now.")
                    .build();

            Message fcmMessage = Message.builder()
                    .setToken(token)
                    .setNotification(notification)
                    .putAllData(Map.of(
                            "type", "FOLLOW_UP_REMINDER",
                            "customerName", customerName,
                            "callingType", callingType
                    ))
                    .build();

            String response = FirebaseMessaging.getInstance().send(fcmMessage);
            log.info("Sent follow-up reminder to {}: {}", recipient.getEmail(), response);
        } catch (Exception e) {
            log.error("Failed to send follow-up reminder to {}: {}", recipient.getEmail(), e.getMessage());
        }
    }

    public void sendNewMessageNotification(User recipient, String senderName, String messagePreview, String conversationId) {
        if (!firebaseInitService.isInitialized()) {
            log.trace("FCM not initialized, skipping notification.");
            return;
        }
        
        String token = recipient.getFcmToken();
        if (token == null || token.isBlank()) {
            log.trace("User {} has no FCM token, skipping notification.", recipient.getId());
            return;
        }

        try {
            Notification notification = Notification.builder()
                    .setTitle("New message from " + senderName)
                    .setBody(messagePreview)
                    .build();

            Message fcmMessage = Message.builder()
                    .setToken(token)
                    .setNotification(notification)
                    .putAllData(Map.of(
                            "type", "CHAT",
                            "conversationId", conversationId
                    ))
                    .build();

            String response = FirebaseMessaging.getInstance().send(fcmMessage);
            log.info("Successfully sent message notification to {}: {}", recipient.getEmail(), response);
        } catch (Exception e) {
            log.error("Failed to send FCM notification to {}: {}", recipient.getEmail(), e.getMessage());
        }
    }
}
