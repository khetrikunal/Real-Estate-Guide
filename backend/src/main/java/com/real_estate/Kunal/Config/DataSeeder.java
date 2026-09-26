package com.real_estate.Kunal.Config;

import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds a minimal set of role-based demo accounts on first run.
 * <p>
 * This bean is only active under the {@code dev} Spring profile.
 * It will never run in {@code prod} or any other environment,
 * so no test credentials can leak into production databases.
 * <p>
 * To activate locally: set {@code SPRING_PROFILES_ACTIVE=dev}
 * (or add {@code spring.profiles.active=dev} to your local .env).
 */
@Component
@Profile("dev")
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // Only seed if the table is completely empty (first-run bootstrap only).
        if (userRepository.count() == 0) {
            System.out.println("DataSeeder: seeding demo accounts (dev profile)...");

            String testPassword = passwordEncoder.encode("sherry");

            // Four generic role accounts – credentials are dev-only, never production.
            User superAdmin = User.builder().name("Super Admin").email("super@sherry.com").password(testPassword).role(Role.SUPER_ADMIN).build();
            User admin      = User.builder().name("Admin User") .email("admin@sherry.com").password(testPassword).role(Role.ADMIN)      .build();
            User subAdmin   = User.builder().name("Sub Admin")  .email("sub@sherry.com")  .password(testPassword).role(Role.SUB_ADMIN)  .build();
            User employee   = User.builder().name("Employee")   .email("employee@sherry.com").password(testPassword).role(Role.EMPLOYEE) .build();

            userRepository.saveAll(List.of(superAdmin, admin, subAdmin, employee));

            System.out.println("DataSeeder: done.");
        }
    }
}
