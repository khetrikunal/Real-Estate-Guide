# Backend

Java 21 and Maven are required. The default server port is 8080; the `prod` profile uses 9090.

For this local checkout, another application occupies port 8080. On Windows, run the real-estate
backend from this directory with `pwsh -File tools/StartLocalBackend.ps1`.
The script uses port 8095 and a short temporary socket path to avoid Java failures with long Windows TEMP paths.
The local `REACT/.env.local` sets
`VITE_BACKEND_TARGET=http://127.0.0.1:8095`; Vite must use the same backend port.

## Configuration

Use `env.example` for the available environment variables. Production requires `DB_PASSWORD` and a `JWT_SECRET` of at least 32 characters. Configure Razorpay, mail, S3, and Firebase credentials for the integrations you use. Demo accounts are seeded only with the `dev` profile.

Production uses Flyway migrations and Hibernate schema validation. `B20__initial_schema.sql` bootstraps an empty PostgreSQL database. Existing databases continue through the versioned migrations; V20 adds the renewal-consumption timestamp and marks existing paid renewals consumed. Previously applied migrations were preserved.

## Security and compatibility

- Generic `/api/auth/register` and manual `/api/subscription/subscribe` require a Super Admin. Public paid signup uses `/api/subadmin/initiate-registration` and `/api/payments/verify-and-complete`.
- Existing sessions must sign in again after this update. Access tokens now carry an explicit purpose and user token version. Password changes revoke previous tokens, including subsequent WebSocket commands.
- Unit-document downloads require project access or a valid, unexpired signature for that exact document URL.
- Payment prices come from server configuration. Renewal verification is transactional and applies a payment once, including concurrent requests.
- Pending signup resumption requires the original password. Payment orders are bound to their registration. Webhooks require a configured secret and signature; only captured-payment events activate signup.
- Session responses omit credentials and raw identity documents. Map URL resolution accepts HTTPS Google Maps hosts and validates each redirect.

## Verification

Run the normal suite from this directory:

```powershell
mvn test
```

The PostgreSQL integration tests are opt-in. Point them at a disposable local PostgreSQL instance with a user allowed to create databases:

```powershell
$env:ESTATE_TEST_POSTGRES_URL = 'jdbc:postgresql://127.0.0.1:55439/postgres'
$env:ESTATE_TEST_POSTGRES_USER = 'postgres'
$env:ESTATE_TEST_POSTGRES_PASSWORD = '<test password>'
mvn test
```

These tests create and drop uniquely named databases. They check empty-database bootstrap, the V19-to-V20 upgrade, Hibernate schema validation, and concurrent renewal processing. Use a test instance, not a production connection.

`deploy.sh` targets Amazon Linux and requires the production secrets in the environment. It was syntax-checked locally; running it provisions and restarts services on its host.
