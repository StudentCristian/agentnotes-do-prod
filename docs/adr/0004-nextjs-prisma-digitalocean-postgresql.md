# ADR 0004: Prisma DigitalOcean PostgreSQL Connection Strategy

- Status: accepted
- Date: 2026-07-18
- Implemented: 2026-07-22
- Related documents:
  - DigitalOcean Managed PostgreSQL cluster `agentnotes-db-cluster`
  - Next.js app `agentnotes-do-prod`

## Context and Problem Statement

AgentNotes is a Next.js application deployed on DigitalOcean App Platform and backed by a managed PostgreSQL cluster in DigitalOcean.

The database has already been prepared with:
- a dedicated application database: `agentnotes`
- a least-privilege application user: `agentnotes_app`
- a connection pool: `agentnotes_app_pool`
- restricted network access for the developer IP
- a downloaded CA certificate for future TLS hardening

The project is starting Prisma integration from scratch and needs a clear production-safe connection strategy.

## Decision Drivers

- Security: avoid using the admin user for the application runtime.
- Stability: keep Prisma migrations off the pooled connection.
- Scalability: use PgBouncer connection pooling for App Platform runtime.
- Maintainability: keep a clean separation between runtime and schema-management connections.
- Operational clarity: make local development, Prisma Studio, and production deployment predictable.

## Decision

We will use Prisma with two database connection URLs:

- `DATABASE_URL` will point to the pooled PostgreSQL connection for the Next.js runtime in production.
- `DIRECT_URL` will point to the direct PostgreSQL connection for Prisma migrations, Prisma Studio, introspection, and administrative tasks.

We will use Prisma Migrate as the primary schema evolution workflow.

We will not use `prisma db push` as the main production workflow.

## Considered Options

1. Use only a direct connection for everything.
2. Use only a pooled connection for everything.
3. Use direct connection for Prisma CLI workflows and pooled connection for runtime.
4. Use `prisma db push` instead of migrations.

## Decision Outcome

Chosen option: 3.

This option matches the operational needs of a Next.js application deployed on DigitalOcean App Platform and aligns with Prisma's support for using a direct URL for migration workflows while keeping runtime traffic behind PgBouncer.

## Consequences

### Positive consequences

- The application runtime uses a safer and more scalable pooled connection.
- Prisma migrations and Studio can rely on a stable direct connection.
- The database user for the application can remain least-privileged.
- The deployment architecture is easier to reason about in development and production.
- Connection pressure on the PostgreSQL cluster is reduced.

### Negative consequences

- Two environment variables must be managed correctly.
- Misconfiguring pooled versus direct URLs can break migrations or runtime.
- The setup introduces one more operational detail to remember.

### Neutral consequences

- Local development, Prisma Studio, and production deployment may use different connection targets depending on the task.
- The team must remember that the pooled URL is not the right choice for every Prisma command.

## Implementation Notes

The expected environment variables are:

- `DATABASE_URL`: pooled connection (PgBouncer, port 25061) used by the running Next.js application.
- `DIRECT_URL`: direct connection (port 25060, base `agentnotes`, user `agentnotes_app`) used by Prisma CLI workflows.

The Prisma datasource uses both values:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas   = ["agentnotes"]
}
```

Operationally:
- Next.js runtime uses `DATABASE_URL` → pool `agentnotes_app_pool` on port 25061.
- `prisma migrate dev`, `prisma migrate deploy`, Prisma Studio, and similar workflows use `DIRECT_URL` → direct on port 25060, base `agentnotes`, user `agentnotes_app`.

### Initial schema setup note

`db-setup.sql` must be executed once with `doadmin` on base `agentnotes` (port 25060) to create the schema, extensions, tables, and grant privileges to `agentnotes_app`. This is a one-time infrastructure bootstrap step, not a runtime operation. After setup, `doadmin` is not used by any application or CLI workflow.

### Verified connection map

| Variable | User | Port | Base | Purpose |
|---|---|---|---|---|
| `DATABASE_URL` | `agentnotes_app` | 25061 | `agentnotes_app_pool` | Next.js runtime |
| `DIRECT_URL` | `agentnotes_app` | 25060 | `agentnotes` | Prisma CLI / migrations |

### Smoke test result (2026-07-22)

```json
{
  "status": "ok",
  "database": "postgresql",
  "schema": "agentnotes",
  "patientsCount": 0,
  "latencyMs": 2202,
  "timestamp": "2026-07-22T21:13:30.720Z"
}
```

## Possible Improvements

- Add GitHub Actions for automated migrations later.
- Add a dedicated readonly role for reporting or diagnostics.
- Add stronger TLS validation with the CA certificate when needed.
- Add seed scripts and schema documentation once the first domain models are defined.
- Rotate `agentnotes_app` password after any local development session that exposed the credential.

## Related Decisions

- ADR for initial Prisma schema design.
- ADR for deployment and environment variable strategy in DigitalOcean App Platform.

## References

- DigitalOcean PostgreSQL managed database documentation.
- DigitalOcean App Platform environment variable documentation.
- Prisma PgBouncer documentation.
