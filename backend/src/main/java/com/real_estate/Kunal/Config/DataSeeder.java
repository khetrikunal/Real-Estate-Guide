package com.real_estate.Kunal.Config;

import com.real_estate.Kunal.Entity.*;
import com.real_estate.Kunal.Repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // Only seed if empty
        // This is a bootstrap helper for local/dev environments.
        if (userRepository.count() == 0) {
            System.out.println("Seeding Database...");

            String testPassword = passwordEncoder.encode("sherry");
            String avinashPassword = passwordEncoder.encode("Avinash@4242");

            // Create Users mapped to different roles using 'sherry' combination 
            // In the frontend you intercept sherry/sherry, but here we provide actual valid backend logins too!
            User superAdmin = User.builder().name("Super Admin").email("super@sherry.com").password(testPassword).role(Role.SUPER_ADMIN).build();
            User admin = User.builder().name("Admin User").email("admin@sherry.com").password(testPassword).role(Role.ADMIN).build();
            User subAdmin = User.builder().name("Sub Admin").email("sub@sherry.com").password(testPassword).role(Role.SUB_ADMIN).build();
            User employee = User.builder().name("Employee").email("employee@sherry.com").password(testPassword).role(Role.EMPLOYEE).build();
            User defaultSherry = User.builder().name("Sherry User").email("sherry").password(testPassword).role(Role.SUPER_ADMIN).build();
            User avinashAdmin = User.builder().name("Avinash Satav").email("avinashsatav25.bmt@gmail.com").password(avinashPassword).role(Role.SUPER_ADMIN).build();

            userRepository.saveAll(List.of(superAdmin, admin, subAdmin, employee, defaultSherry, avinashAdmin));

            

            System.out.println("Database Seeding Completed.");
        }
    }
}

