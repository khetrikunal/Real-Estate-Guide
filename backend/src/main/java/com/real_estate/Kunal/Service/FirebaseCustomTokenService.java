package com.real_estate.Kunal.Service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.real_estate.Kunal.Entity.User;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class FirebaseCustomTokenService {

    @Value("${firebase.service-account-path:}")
    private String serviceAccountPath;

    @Value("${firebase.project-id:}")
    private String projectId;

    private FirebaseAuth firebaseAuth;

    @PostConstruct
    public void init() {
        try {
            if (serviceAccountPath == null || serviceAccountPath.isBlank()) {
                log.warn("Firebase custom token disabled: FIREBASE_SERVICE_ACCOUNT_PATH is not configured");
                return;
            }

            try (InputStream serviceAccount = new FileInputStream(serviceAccountPath)) {
                FirebaseOptions.Builder builder = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount));

                if (projectId != null && !projectId.isBlank()) {
                    builder.setProjectId(projectId);
                }

                FirebaseOptions options = builder.build();

                FirebaseApp app;
                if (FirebaseApp.getApps().isEmpty()) {
                    app = FirebaseApp.initializeApp(options);
                } else {
                    app = FirebaseApp.getApps().getFirst();
                }

                firebaseAuth = FirebaseAuth.getInstance(app);
                log.info("Firebase Admin initialized for custom token issuance");
            }
        } catch (Exception ex) {
            firebaseAuth = null;
            log.error("Failed to initialize Firebase Admin: {}", ex.getMessage());
        }
    }

    public String createCustomToken(User user) {
        if (firebaseAuth == null) {
            throw new IllegalStateException("Firebase Admin not initialized");
        }
        try {
            Map<String, Object> claims = new HashMap<>();
            claims.put("role", user.getRole().name());
            claims.put("name", user.getName());
            return firebaseAuth.createCustomToken(user.getId().toString(), claims);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to create Firebase custom token", ex);
        }
    }

    public boolean isInitialized() {
        return firebaseAuth != null;
    }
}
