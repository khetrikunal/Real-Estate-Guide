package com.real_estate.Kunal;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.sql.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

/** Opt-in real PostgreSQL checks. Each test creates and drops its own isolated database. */
@EnabledIfEnvironmentVariable(named = "ESTATE_TEST_POSTGRES_URL", matches = "jdbc:postgresql://.*")
class PostgresMigrationIntegrationTest {
    private final String adminUrl = System.getenv("ESTATE_TEST_POSTGRES_URL");
    private final String username = System.getenv().getOrDefault("ESTATE_TEST_POSTGRES_USER", "postgres");
    private final String password = System.getenv("ESTATE_TEST_POSTGRES_PASSWORD");

    @Test
    void emptyDatabaseUsesCompleteBaselineAndValidates() throws Exception {
        withDatabase(url -> {
            Flyway flyway = Flyway.configure().dataSource(url, username, password).load();
            flyway.migrate();
            flyway.validate();
            assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("20");
            try (Connection connection = DriverManager.getConnection(url, username, password);
                 Statement statement = connection.createStatement()) {
                for (String table : new String[]{"users", "projects", "leads", "follow_ups", "payments",
                        "property_units", "unit_documents", "messages", "user_kyc_documents"}) {
                    statement.executeQuery("SELECT * FROM " + table + " LIMIT 0").close();
                }
                try (ResultSet rows = statement.executeQuery("SELECT type FROM flyway_schema_history WHERE version='20'")) {
                    assertThat(rows.next()).isTrue();
                    assertThat(rows.getString(1)).isEqualTo("SQL_BASELINE");
                }
            }
        });
    }

    @Test
    void existingVersion19DatabaseAppliesOnlyUpgradeAndConsumesLegacyRenewals() throws Exception {
        withDatabase(url -> {
            String schema = Files.readString(Path.of("src/main/resources/db/migration/B20__initial_schema.sql"))
                    .replace("    renewal_applied_at timestamp(6),\n", "");
            try (Connection connection = DriverManager.getConnection(url, username, password);
                 Statement statement = connection.createStatement()) {
                statement.execute(schema);
                statement.execute("INSERT INTO payments (created_at, sub_admin_id, status) VALUES (CURRENT_TIMESTAMP, 1, 'paid'), (CURRENT_TIMESTAMP, 1, 'created')");
            }
            Flyway flyway = Flyway.configure().dataSource(url, username, password).baselineVersion("19").load();
            flyway.baseline();
            assertThat(flyway.migrate().migrationsExecuted).isEqualTo(1);
            flyway.validate();
            try (Connection connection = DriverManager.getConnection(url, username, password);
                 Statement statement = connection.createStatement();
                 ResultSet rows = statement.executeQuery("SELECT status, renewal_applied_at FROM payments ORDER BY id")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getTimestamp("renewal_applied_at")).isNotNull();
                assertThat(rows.next()).isTrue();
                assertThat(rows.getTimestamp("renewal_applied_at")).isNull();
            }
        });
    }

    private void withDatabase(DatabaseCheck check) throws Exception {
        String database = "estate_test_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection admin = DriverManager.getConnection(adminUrl, username, password);
             Statement statement = admin.createStatement()) {
            statement.execute("CREATE DATABASE " + database);
            String url = adminUrl.substring(0, adminUrl.lastIndexOf('/') + 1) + database;
            try {
                check.run(url);
            } finally {
                statement.execute("DROP DATABASE " + database + " WITH (FORCE)");
            }
        }
    }

    @Test
    void applicationValidatesFreshSchemaAndConcurrentRenewalAppliesOnce() throws Exception {
        withDatabase(url -> {
            new org.springframework.boot.test.context.runner.WebApplicationContextRunner()
                    .withInitializer(new org.springframework.boot.test.context.ConfigDataApplicationContextInitializer())
                    .withInitializer(context -> context.getBeanFactory().setConversionService(
                            new org.springframework.boot.convert.ApplicationConversionService()))
                    .withUserConfiguration(KunalApplication.class)
                    .withPropertyValues("spring.datasource.url=" + url,
                            "spring.datasource.username=" + username, "spring.datasource.password=" + password,
                            "spring.datasource.driver-class-name=org.postgresql.Driver",
                            "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
                            "spring.jpa.hibernate.ddl-auto=validate", "spring.flyway.enabled=true",
                            "razorpay.key.secret=migration-test-secret")
                    .run(context -> {
                assertThat(context).hasNotFailed();
                var users = context.getBean(com.real_estate.Kunal.Repository.UserRepository.class);
                var payments = context.getBean(com.real_estate.Kunal.Repository.PaymentRepository.class);
                var service = context.getBean(com.real_estate.Kunal.Service.PaymentService.class);
                java.time.LocalDate today = java.time.LocalDate.now();
                var user = users.saveAndFlush(com.real_estate.Kunal.Entity.User.builder()
                        .email("renewal@example.com").role(com.real_estate.Kunal.Entity.Role.SUB_ADMIN)
                        .subscriptionExpiresAt(today).build());
                payments.saveAndFlush(com.real_estate.Kunal.Entity.Payment.builder()
                        .razorpayOrderId("order_concurrent").subAdminId(user.getId())
                        .planType("full").subscriptionRate(20000.0).status("created").build());
                var request = new com.real_estate.Kunal.DTO.VerifyPaymentRequest();
                request.setRazorpayOrderId("order_concurrent");
                request.setRazorpayPaymentId("pay_concurrent");
                var mac = javax.crypto.Mac.getInstance("HmacSHA256");
                mac.init(new javax.crypto.spec.SecretKeySpec("migration-test-secret".getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
                request.setRazorpaySignature(java.util.HexFormat.of().formatHex(mac.doFinal(
                        "order_concurrent|pay_concurrent".getBytes(java.nio.charset.StandardCharsets.UTF_8))));
                var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
                try {
                    var results = executor.invokeAll(java.util.List.<java.util.concurrent.Callable<Boolean>>of(
                            () -> service.verifyRenewalPayment(request).isSuccess(),
                            () -> service.verifyRenewalPayment(request).isSuccess()));
                    for (var result : results) assertThat(result.get()).isTrue();
                    assertThat(users.findById(user.getId()).orElseThrow().getSubscriptionExpiresAt())
                            .isEqualTo(today.plusMonths(1));
                } finally {
                    executor.shutdownNow();
                }
            });
        });
    }

    @FunctionalInterface private interface DatabaseCheck { void run(String url) throws Exception; }
}
