import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.sql.DriverManager;
import java.util.Base64;
import java.util.Properties;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** One-time local bootstrap. Never overwrites an existing account or stores a plaintext password. */
public class CreateLocalSuperAdmin {
    public static void main(String[] args) throws Exception {
        Properties config = new Properties();
        try (var input = Files.newInputStream(Path.of("src/main/resources/application.properties"))) {
            config.load(input);
        }
        String url = setting(config, "spring.datasource.url");
        if (!url.matches("jdbc:postgresql://(localhost|127\\.0\\.0\\.1)(:[0-9]+)?/[^?]+(\\?.*)?")) {
            throw new IllegalStateException("This bootstrap is restricted to the local PostgreSQL database.");
        }
        DriverManager.setLoginTimeout(10);
        try (var connection = DriverManager.getConnection(url,
                setting(config, "spring.datasource.username"), setting(config, "spring.datasource.password"))) {
            connection.setAutoCommit(false);
            String email = "superadmin@realestate-guide.local";
            try (var check = connection.prepareStatement("select 1 from users where lower(email) = ?")) {
                check.setString(1, email);
                try (var existing = check.executeQuery()) {
                    if (existing.next()) throw new IllegalStateException("Account already exists; its credentials were not changed.");
                }
            }
            byte[] random = new byte[18];
            new SecureRandom().nextBytes(random);
            String password = "RE!" + Base64.getUrlEncoder().withoutPadding().encodeToString(random) + "9a";
            var encoder = new BCryptPasswordEncoder();
            String hash = encoder.encode(password);
            try (var insert = connection.prepareStatement("""
                    insert into users (name, email, password, role, signup_source, token_version,
                        kyc_status, is_online, created_at, updated_at)
                    values (?, ?, ?, 'SUPER_ADMIN', 'MANUAL', 0, 'PENDING', false, current_timestamp, current_timestamp)
                    returning id
                    """)) {
                insert.setString(1, "Super Admin");
                insert.setString(2, email);
                insert.setString(3, hash);
                try (var created = insert.executeQuery()) {
                    if (!created.next()) throw new IllegalStateException("No account was created.");
                    long id = created.getLong(1);
                    try (var verify = connection.prepareStatement("select role, password from users where id = ?")) {
                        verify.setLong(1, id);
                        try (var saved = verify.executeQuery()) {
                            if (!saved.next() || !"SUPER_ADMIN".equals(saved.getString(1))
                                    || !encoder.matches(password, saved.getString(2))) {
                                throw new IllegalStateException("Account verification failed.");
                            }
                        }
                    }
                    connection.commit();
                    System.out.println("Created and verified local Super Admin account.");
                    System.out.println("Email: " + email);
                    System.out.println("Password: " + password);
                    System.out.println("User ID: " + id);
                }
            }
        }
    }

    private static String setting(Properties config, String key) {
        String value = config.getProperty(key);
        if (value != null && value.startsWith("${") && value.endsWith("}")) {
            int separator = value.indexOf(':');
            String variable = value.substring(2, separator);
            String configured = System.getenv(variable);
            return configured != null ? configured : value.substring(separator + 1, value.length() - 1);
        }
        return value;
    }
}
