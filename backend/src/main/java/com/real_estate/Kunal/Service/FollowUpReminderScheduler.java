package com.real_estate.Kunal.Service;

import com.real_estate.Kunal.Entity.FollowUp;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.FollowUpRepository;
import com.real_estate.Kunal.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job that sends FCM reminders for follow-ups that are due.
 * Runs every 60 seconds, checks for follow-ups due within the last 2 minutes
 * to avoid duplicate sends while handling clock drift.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class FollowUpReminderScheduler {

    private final FollowUpRepository followUpRepository;
    private final UserRepository userRepository;
    private final FcmService fcmService;

    @Scheduled(fixedRate = 60_000)
    public void sendDueReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime twoMinutesAgo = now.minusMinutes(2);

        List<FollowUp> dueFollowUps = followUpRepository
                .findByIsCompletedFalseAndDeletedAtIsNullAndScheduledAtBetween(twoMinutesAgo, now);

        for (FollowUp followUp : dueFollowUps) {
            try {
                User owner = userRepository.findById(followUp.getOwnerUserId()).orElse(null);
                if (owner == null) continue;

                String callingLabel = followUp.getCallingType().name().replace('_', ' ');
                fcmService.sendFollowUpReminder(
                        owner,
                        followUp.getCustomerName(),
                        callingLabel);
            } catch (Exception e) {
                log.error("Failed to send follow-up reminder for id={}: {}",
                        followUp.getId(), e.getMessage());
            }
        }

        if (!dueFollowUps.isEmpty()) {
            log.info("Processed {} due follow-up reminder(s)", dueFollowUps.size());
        }
    }
}
