package com.real_estate.Kunal.Security;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    @Test
    void rateLimitsChatUploadEndpoint() throws ServletException, IOException {
        RateLimitFilter filter = new RateLimitFilter();

        for (int i = 0; i < 20; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(chatRequest("POST", "/api/chat/upload"), response, new MockFilterChain());
            assertThat(response.getStatus()).isNotEqualTo(429);
        }

        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilter(chatRequest("POST", "/api/chat/upload"), blocked, new MockFilterChain());

        assertThat(blocked.getStatus()).isEqualTo(429);
        assertThat(blocked.getContentAsString()).contains("Rate limit exceeded");
    }

    @Test
    void rateLimitsChatReactionEndpoint() throws ServletException, IOException {
        RateLimitFilter filter = new RateLimitFilter();

        for (int i = 0; i < 90; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(chatRequest("POST", "/api/chat/messages/11111111-1111-1111-1111-111111111111/react"), response, new MockFilterChain());
            assertThat(response.getStatus()).isNotEqualTo(429);
        }

        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilter(chatRequest("POST", "/api/chat/messages/11111111-1111-1111-1111-111111111111/react"), blocked, new MockFilterChain());

        assertThat(blocked.getStatus()).isEqualTo(429);
    }

    private MockHttpServletRequest chatRequest(String method, String path) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setServletPath(path);
        request.setRemoteAddr("203.0.113.10");
        return request;
    }
}
