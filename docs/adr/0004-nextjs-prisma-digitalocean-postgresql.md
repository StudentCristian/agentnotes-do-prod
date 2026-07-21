# ADR 0004: Prisma DigitalOcean PostgreSQL Connection Strategy

- Status: proposed
- Date: 2026-07-18
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

- `DATABASE_URL`: pooled connection used by the running Next.js application.
- `DIRECT_URL`: direct connection used by Prisma CLI workflows.

The Prisma datasource should use both values:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Operationally:
- Next.js runtime uses `DATABASE_URL`.
- `prisma migrate dev`, `prisma migrate deploy`, Prisma Studio, and similar workflows use `DIRECT_URL`.

## Possible Improvements

- Add GitHub Actions for automated migrations later.
- Add a dedicated readonly role for reporting or diagnostics.
- Add stronger TLS validation with the CA certificate when needed.
- Add seed scripts and schema documentation once the first domain models are defined.

## Related Decisions

- ADR for initial Prisma schema design.
- ADR for deployment and environment variable strategy in DigitalOcean App Platform.

## References

- DigitalOcean PostgreSQL managed database documentation.
- DigitalOcean App Platform environment variable documentation.
- Prisma PgBouncer documentation.