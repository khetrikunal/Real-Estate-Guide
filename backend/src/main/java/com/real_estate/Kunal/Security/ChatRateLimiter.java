package com.real_estate.Kunal.Security;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
public class ChatRateLimiter {

    private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Long>> buckets = new ConcurrentHashMap<>();

    public boolean allowUserAction(String username, String action, int maxRequests, Duration window) {
        if (username == null || username.isBlank()) {
            return false;
        }
        return allow(action + ":" + username, maxRequests, window);
    }

    boolean allow(String bucketKey, int maxRequests, Duration window) {
        long now = System.currentTimeMillis();
        long windowStart = now - window.toMillis();
        ConcurrentLinkedDeque<Long> bucket = buckets.computeIfAbsent(bucketKey, ignored -> new ConcurrentLinkedDeque<>());

        synchronized (bucket) {
            while (!bucket.isEmpty() && bucket.peekFirst() != null && bucket.peekFirst() < windowStart) {
                bucket.pollFirst();
            }
            if (bucket.size() >= maxRequests) {
                return false;
            }
            bucket.addLast(now);
            return true;
        }
    }
}
