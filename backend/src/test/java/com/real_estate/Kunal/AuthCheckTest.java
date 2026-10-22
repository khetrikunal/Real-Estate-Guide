package com.real_estate.Kunal;

import com.real_estate.Kunal.Controller.AuthController;
import com.real_estate.Kunal.DTO.LoginRequest;
import com.real_estate.Kunal.Entity.Role;
import com.real_estate.Kunal.Entity.User;
import com.real_estate.Kunal.Repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootTest
public class AuthCheckTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void testDirectLoginWithUser() {
        if (userRepository.findByEmail("super@sherry.com").isEmpty()) {
            User user = User.builder()
                    .name("Super Admin")
                    .email("super@sherry.com")
                    .password(passwordEncoder.encode("sherry"))
                    .role(Role.SUPER_ADMIN)
                    .build();
            userRepository.save(user);
        }

        LoginRequest req = new LoginRequest();
        req.setEmail("super@sherry.com");
        req.setPassword("sherry");
        req.setRole("SUPER_ADMIN");
        try {
            ResponseEntity<?> response = authController.login(req);
            System.out.println("LOGIN SUCCESS: " + response.getStatusCode() + " " + response.getBody());
        } catch (Exception ex) {
            System.err.println("LOGIN FAILED: " + ex.getClass().getName() + " -> " + ex.getMessage());
            ex.printStackTrace();
        }
    }
}
