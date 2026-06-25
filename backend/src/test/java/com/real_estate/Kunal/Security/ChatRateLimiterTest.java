package com.real_estate.Kunal.Security;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class ChatRateLimiterTest {

    @Test
    void blocksUserActionAfterWindowLimit() {
        ChatRateLimiter limiter = new ChatRateLimiter();

        assertThat(limiter.allowUserAction("admin@example.com", "stomp-chat-call", 2, Duration.ofMinutes(1)))
                .isTrue();
        assertThat(limiter.allowUserAction("admin@example.com", "stomp-chat-call", 2, Duration.ofMinutes(1)))
                .isTrue();
        assertThat(limiter.allowUserAction("admin@example.com", "stomp-chat-call", 2, Duration.ofMinutes(1)))
                .isFalse();
    }

    @Test
    void keepsActionsAndUsersInSeparateBuckets() {
        ChatRateLimiter limiter = new ChatRateLimiter();

        assertThat(limiter.allowUserAction("admin@example.com", "stomp-chat-send", 1, Duration.ofMinutes(1)))
                .isTrue();
        assertThat(limiter.allowUserAction("admin@example.com", "stomp-chat-call", 1, Duration.ofMinutes(1)))
                .isTrue();
        assertThat(limiter.allowUserAction("other@example.com", "stomp-chat-send", 1, Duration.ofMinutes(1)))
                .isTrue();
        assertThat(limiter.allowUserAction("admin@example.com", "stomp-chat-send", 1, Duration.ofMinutes(1)))
                .isFalse();
    }
}
