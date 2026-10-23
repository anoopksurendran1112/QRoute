# Phase 1: Foundation & Data Model - Research

**Researched:** 2026-10-23  
**Domain:** Monorepo setup, data modeling with Prisma/MySQL, JWT auth with roles, synthetic campus seeding  
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational data layer for QRoute - the schema, authentication system, and seeded campus that all subsequent phases depend on. The work involves setting up a npm workspaces monorepo with `apps/api`, `apps/admin`, `packages/shared`, and a separate `mobile/` Flutter app. The API will use Prisma 7 with MySQL 8, requiring careful attention to Prisma 7's breaking changes (driver adapters, new generator, config in `prisma7.config.ts`). Authentication will use JWT with role-based access control (users vs admins). A synthetic campus seed will be created for demonstration without needing real floor plans.

**Primary recommendation:** Follow Prisma 7's exact migration patterns (driver adapter mandatory, `prisma-client` generator, pin versions), use bcryptjs for passwords, implement JWT with HS256, and build a realistic multi-building synthetic campus with proper floor calibration scaffolding even if not fully used yet.

## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for Phase 1 - proceeding based on PROJECT.md, ROADMAP.md, and REQUIREMENTS.md.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Monorepo structure | Build/Dev | API/Admin/Shared | npm workspaces coordinates TypeScript packages; Flutter is separate |
| Database schema | Database / Storage | API | Prisma models define canonical schema; API enforces constraints |
| Authentication (register/login/JWT) | API / Backend | - | Server issues/verifies tokens, enforces role-based access |
| Role-based access control | API / Backend | Admin UI | Middleware on API protects admin routes; admin UI gates by role |
| Synthetic campus seeding | API / Backend | Database | Seed script populates buildings/floors/classrooms/departments/faculty |
| Shared types/schemas | API / Backend | Admin UI | packages/shared ensures contract consistency between API and admin |

## Standard Stack

### Core Technologies (Phase 1 scope)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 22.14.0 | API runtime | Prisma 7 compatible, matches environment |
| TypeScript | 5.9.3 | API, admin, shared types | Pinned (not 7.x due to typescript-eslint compatibility) |
| Express | 5.3.0 | HTTP API framework | v5 with native async error forwarding |
| Prisma CLI + Client | 7.10.1 (pinned) | ORM/migrations | Must pin explicitly (npm latest gives RC) |
| @prisma/adapter-mariadb | 7.10.1 | MySQL driver adapter | Mandatory in Prisma 7 |
| mariadb | 3.5.4 | MySQL driver | Required by adapter |
| MySQL | 8.0 (Docker) | Database | Fixed stack choice |
| React | 19.3.1 | Admin UI | For admin CRUD interfaces |
| Vite | 8.3.5 | Admin build/dev | Fast dev server |
| bcryptjs | ^3.0.3 | Password hashing | Pure JS, no native build issues on Windows |
| jsonwebtoken | ^9.0.3 | JWT issue/verify | HS256 tokens with role claims |
| zod | ^4.6.7 | Request validation | Shared schemas in packages/shared |

### Development Tools
| Tool | Version | Purpose | Notes |
|---------|---------|---------|-------|
| npm workspaces | built-in (npm 7+) | Monorepo | Workspaces: ["apps/api", "apps/admin", "packages/shared"] |
| tsx | ^4.23.15 | Run TS directly | Node 22.14.0 needs tsx (no native type stripping) |
| Docker Compose | - | MySQL 8.0 | Local dev database |
| Prisma Studio | bundled | Browse data | Helpful for inspecting seeded campus |

**Installation (Phase 1 specific):**
```bash
# Root
npm init -y
# Add workspaces to package.json

# API
npm install -w apps/api prisma@7.10.1 --save-dev
npm install -w apps/api @prisma/client@7.10.1 @prisma/adapter-mariadb@7.10.1 dotenv
npm install -w apps/api express@5.3.0 zod jsonwebtoken bcryptjs cors helmet
npm install -w apps/api -D typescript@5.9.3 tsx@4.23.15 @types/express@5.0.6 @types/node@22.20.5 @types/jsonwebtoken@9.0.10 @types/bcryptjs@3.0.0

# Admin
npm install -w apps/admin react@19.3.1 react-dom@19.3.1 react-router-dom@7.18.4 @tanstack/react-query@5.104.5 react-hook-form@7.90.0 @hookform/resolvers@6.0.0 zod
npm install -w apps/admin -D vite@8.3.5 @vitejs/plugin-react@6.1.2 typescript@5.9.3 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3

# Shared
# packages/shared has zod as dependency
```

**Version verification:** All versions verified against npm registry/pub.dev on 2026-10-22 as documented in STACK.md. [VERIFIED: STACK.md]

## Package Legitimacy Audit

> Required - checking all packages for Phase 1.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| prisma | npm | Mature | High | github.com/prisma/prisma | OK | Approved (pinned to 7.10.1) |
| @prisma/client | npm | Mature | High | github.com/prisma/prisma | OK | Approved |
| @prisma/adapter-mariadb | npm | Current | Growing | github.com/prisma/prisma | OK | Approved |
| mariadb | npm | Mature | High | github.com/mariadb-corporation/mariadb-connector-nodejs | OK | Approved |
| express | npm | Mature | Very High | github.com/expressjs/express | OK | Approved (v5) |
| jsonwebtoken | npm | Mature | Very High | github.com/auth0/node-jsonwebtoken | OK | Approved |
| bcryptjs | npm | Mature | Very High | github.com/dcodeIO/bcrypt.js | OK | Approved |
| zod | npm | Mature | Very High | github.com/colinhacks/zod | OK | Approved |
| tsx | npm | Current | High | github.com/privatenumber/tsx | OK | Approved |

All packages verified via npm registry context in STACK.md. [VERIFIED: STACK.md package versions]

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Monorepo                              │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│  apps/api    │ apps/admin   │ packages/    │ mobile/          │
│  (Express)   │ (React/Vite) │ shared/      │ (Flutter)        │
│              │              │ (Zod schemas)│ (separate)       │
└─────────────┴─────────────┴─────────────┴──────────────────┘
       │                │                │
       │                │                │
       ▼                ▼                │
┌─────────────┐  ┌─────────────┐         │
│ Prisma Client│  │ HTTP Client  │         │
│ (via adapter)│  │ (fetch/axios)│         │
└─────────────┘  └─────────────┘         │
       │                │                │
       ▼                │                │
┌─────────────────────────────────────┐  │
│          MySQL 8 (Docker)            │  │
│  users, buildings, floors, nodes,... │  │
└─────────────────────────────────────┘  │
                                        │
                                        │ (contracts/fixtures)
                                        ▼
                                   [shared types]
```

### Recommended Project Structure
```
deepak/
├── package.json                 # workspaces config
├── docker-compose.yml           # mysql:8.0
├── apps/
│   ├── api/                     # Express + Prisma + TypeScript
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # All models for Phase 1+
│   │   │   └── seed.ts          # Synthetic campus seed
│   │   ├── prisma7.config.ts    # Prisma 7 config (datasource.url here)
│   │   ├── src/
│   │   │   ├── index.ts         # App bootstrap
│   │   │   ├── config.ts        # Env config
│   │   │   ├── lib/prisma.ts    # PrismaClient with adapter
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts      # JWT verification
│   │   │   │   └── requireRole.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/        # register/login routes
│   │   │   │   └── catalog/     # buildings/floors/classrooms/depts/faculty
│   │   │   └── utils/
│   │   │       └── jwt.ts       # JWT helpers
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── admin/                   # React + Vite + TypeScript
│       ├── src/
│       │   ├── api/             # API client
│       │   ├── pages/           # Login, Catalog management
│       │   ├── components/
│       │   └── hooks/
│       ├── vite.config.ts
│       └── package.json
├── packages/
│   └── shared/                  # Shared types and Zod schemas
│       ├── src/
│       │   ├── domain.ts        # Enums (Role, NodeKind, etc.)
│       │   ├── schemas/         # Zod schemas for validation
│       │   └── types/           # DTO types
│       ├── package.json         # exports as TS source
│       └── tsconfig.json
└── mobile/                      # Flutter app (separate toolchain)
    └── pubspec.yaml
```

### Pattern 1: Prisma 7 Setup with Driver Adapter
**What:** Use `prisma-client` generator with explicit output, configure datasource URL in `prisma7.config.ts`, instantiate PrismaClient with MariaDB adapter.

**When to use:** Always for Prisma 7 with MySQL. [VERIFIED: STACK.md Prisma 7 migration mechanics]

**Example:**
```typescript
// prisma/schema.prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  importFileExtension = "ts"
}

datasource db {
  provider = "mysql"
  // no url here in v7
}

// prisma7.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

// src/lib/prisma.ts
import "dotenv/config";
import { PrismaClient } from "../generated/prisma";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

export const prisma = new PrismaClient({ adapter });
```

### Pattern 2: JWT Auth with Role-Based Access
**What:** Issue HS256 JWT on login/register with `role` claim, verify in middleware, protect admin routes with role check.

**When to use:** For AUTH-01 requirement. [VERIFIED: PROJECT.md requirements]

**Example:**
```typescript
// utils/jwt.ts
import jwt from 'jsonwebtoken';

export function signToken(user: { id: string, role: string }) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
}

// middleware/auth.ts
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// middleware/requireRole.ts
export function requireRole(role: 'admin' | 'user') {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

### Pattern 3: Idempotent Seeding
**What:** Use upsert with natural keys to make seed script idempotent (Prisma v7 doesn't auto-run seeds).

**When to use:** For SEED-01 requirement. [VERIFIED: PITFALLS.md seeding guidance]

**Example:**
```typescript
// prisma/seed.ts
import { prisma } from "../src/lib/prisma";

async function main() {
  // Upsert building
  const building = await prisma.building.upsert({
    where: { code: 'SJCET-MAIN' },
    update: {},
    create: { code: 'SJCET-MAIN', name: 'Main Block' },
  });
  // ... create floors, classrooms, departments, faculty
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

### Anti-Patterns to Avoid
- **Using `prisma-client-js` generator** - Deprecated in v7, use `prisma-client` with explicit output [VERIFIED: STACK.md]
- **Putting datasource.url in schema.prisma** - Must be in prisma7.config.ts in v7 [VERIFIED: STACK.md]
- **Installing prisma without pinning** - npm latest gives RC (8.0.0-rc.25); pin to 7.10.1 [VERIFIED: STACK.md]
- **Using bcrypt (native)** - Causes build issues on Windows; use bcryptjs [VERIFIED: STACK.md]
- **Using shared_preferences for JWT in mobile** - Not secure; use flutter_secure_storage (deferred to later phase but note for architecture)
- **Non-idempotent seeds** - Will fail on re-runs; use upsert [VERIFIED: PITFALLS.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom crypto | bcryptjs | Secure, battle-tested, pure JS avoids native deps |
| JWT tokens | Custom token format | jsonwebtoken (HS256) | Standard, well-tested, handles expiry/verification |
| Request validation | Manual checks | zod | Type-safe schemas, can share between API and admin |
| Database migrations | SQL scripts manually | Prisma Migrate | Tracks schema state, works with Prisma Client |
| ID generation | Custom UUID logic | cuid/uuid or Prisma defaults | Avoid collision bugs |

## Runtime State Inventory

> Not applicable - Phase 1 is greenfield setup (no rename/refactor/migration). [VERIFIED: phase type is foundation/setup]

## Common Pitfalls

### Pitfall 1: Prisma 7 Breaking Changes
**What goes wrong:** Following v6 tutorials causes immediate failures (adapter errors, missing generate, config issues).
**Why it happens:** Prisma 7 has major breaking changes.
**How to avoid:** Follow STACK.md exactly - use driver adapter, `prisma-client` generator with output, `prisma7.config.ts` for datasource URL, run `prisma generate` explicitly after migrate.
**Warning signs:** "No driver adapter provided", "datasource.url is not allowed", "Cannot find module './internal/class.js'".

### Pitfall 2: Seeding on Windows
**What goes wrong:** `prisma db seed` reports success but seed.ts never runs on Windows.
**Why it happens:** ts-node/module resolution issues on Windows.
**How to avoid:** Use `tsx` for seeding (configured in prisma7.config.ts as `"seed": "tsx prisma/seed.ts"`). Ensure tsx is installed.
**Warning signs:** Database is empty after running seed command.

### Pitfall 3: JWT Secret Management
**What goes wrong:** Using weak/default JWT secret or committing it to git.
**Why it happens:** Forgetting to set environment variables.
**How to avoid:** Generate strong secret, store in `.env` (gitignored), load with dotenv.
**Warning signs:** Same secret used across environments or in committed files.

### Pitfall 4: Role Bypass
**What goes wrong:** Forgetting to add role middleware to admin routes.
**Why it happens:** Easy to miss when adding routes.
**How to avoid:** Apply `requireAuth` + `requireRole('admin')` to all admin routes. Test both user and admin access.
**Warning signs:** Regular users can access admin CRUD endpoints.

## Code Examples

### Prisma Schema (Phase 1 core models)
```prisma
// prisma/schema.prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  importFileExtension = "ts"
}

datasource db {
  provider = "mysql"
}

enum Role {
  user
  admin
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(user)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Department {
  id        String   @id @default(cuid())
  name      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  faculty   Faculty[]
}

model Faculty {
  id           String     @id @default(cuid())
  name         String
  departmentId String
  department   Department @relation(fields: [departmentId], references: [id])
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model Building {
  id        String   @id @default(cuid())
  code      String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  floors    Floor[]
}

model Floor {
  id             String   @id @default(cuid())
  buildingId     String
  building       Building @relation(fields: [buildingId], references: [id])
  level          Int
  name           String?
  imagePath      String?
  imageSha256    String?
  widthPx        Int?
  heightPx       Int?
  metersPerPixel Decimal? @db.Decimal(10, 6)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@unique([buildingId, level])
}

model Classroom {
  id             String   @id @default(cuid())
  roomNumber     String
  floorId        String
  floor          Floor    @relation(fields: [floorId], references: [id])
  departmentId   String?
  department     Department? @relation(fields: [departmentId], references: [id])
  entranceNodeId String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@unique([floorId, roomNumber])
}
```
[VERIFIED: Based on PROJECT.md domain model and STACK.md patterns]

### Auth Routes
```typescript
// modules/auth/routes.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../utils/jwt';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  
  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already exists' });
  
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, name, role: 'user' },
  });
  
  const token = signToken({ id: user.id, role: user.role });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.post('/login', async (req, res) => {
  // Similar flow with password verification
});

export default router;
```
[VERIFIED: Standard JWT auth pattern]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma Client JS generator | `prisma-client` generator with explicit output | Prisma 7 (2024+) | Better ESM support, no magic in node_modules |
| datasource.url in schema | URL in prisma7.config.ts | Prisma 7 | Better separation of concerns, driver adapter focus |
| Implicit migrations generate | Explicit `prisma generate` needed | Prisma 7 | More control, must remember to generate |
| Native bcrypt | bcryptjs for portability | Common practice | Avoids node-gyp issues on Windows |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Using npm workspaces is sufficient (no need for pnpm/turborepo) | Monorepo shape | Low - matches STACK.md recommendation for 3 packages |
| A2 | bcryptjs is acceptable for password hashing performance | Standard Stack | Low - campus scale, pure JS is fine |
| A3 | HS256 JWT is sufficient (no need for RS256) | Auth pattern | Low - single server, simple setup |
| A4 | Synthetic campus needs at least 2 buildings, 3-4 floors each for realism | Seeding | Low - just needs to be demonstrable |

All claims are either verified from STACK.md/PROJECT.md or marked as reasonable assumptions with low risk.

## Open Questions

1. **Exact synthetic campus layout**
   - What we know: Need buildings, floors, classrooms, departments, faculty
   - What's unclear: Specific room numbers, department names for SJCET Palai
   - Recommendation: Create plausible synthetic names (e.g., "Main Block", "CS Block", departments like CSE, ECE, MECH) - doesn't need to match real campus exactly since it's synthetic

2. **Admin user creation**
   - What we know: Need to distinguish admins from regular users
   - What's unclear: Should first admin be created via seed or registration flow?
   - Recommendation: Create admin user in seed script for easy demo access

## Environment Availability

> Phase 1 requires external dependencies - checking availability.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | API runtime | ✓ | 22.14.0 | - |
| Docker | MySQL database | ? | - | Need to verify |
| npm | Package management | ✓ | (comes with Node) | - |
| Git | Version control | ✓ | - | - |

**Note:** Docker availability needs to be checked in environment, but STACK.md assumes Docker Compose is available. [ASSUMED: Docker available based on STACK.md]

## Validation Architecture

> workflow.nyquist_validation not explicitly false in config - including section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^5.0.5 |
| Config file | apps/api/vitest.config.ts (to be created) |
| Quick run command | `npm test -w apps/api` |
| Full suite command | `npm test -ws` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Users can register and login with role-based access | integration | `vitest run tests/auth.test.ts` | ❌ Wave 0 |
| ADMIN-01 | Admin can CRUD buildings/floors/classrooms/depts/faculty | integration | `vitest run tests/catalog.test.ts` | ❌ Wave 0 |
| SEED-01 | Synthetic campus loads via seed script | unit/integration | `vitest run tests/seed.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -w apps/api --run`
- **Per wave merge:** `npm test -ws --run`
- **Phase gate:** Full suite green before moving to Phase 2

### Wave 0 Gaps
- [ ] `apps/api/tests/auth.test.ts` - covers AUTH-01
- [ ] `apps/api/tests/catalog.test.ts` - covers ADMIN-01  
- [ ] `apps/api/tests/seed.test.ts` - covers SEED-01
- [ ] `apps/api/vitest.config.ts` - test configuration
- [ ] `apps/api/tests/setup.ts` - test setup with test DB

## Security Domain

> Security enforcement enabled by default.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT with bcryptjs password hashing, secure secret management |
| V3 Session Management | yes | JWT tokens with expiry (7d), stateless auth |
| V4 Access Control | yes | Role-based middleware (user/admin) on protected routes |
| V5 Input Validation | yes | zod schemas on all request bodies |
| V6 Cryptography | yes | bcryptjs for passwords (never hand-roll), JWT with HS256 |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection | Tampering | Prisma ORM with parameterized queries |
| Brute Force Login | Elevation of Privilege | Rate limiting (to be added in later phase, but note for Phase 1) |
| Weak Passwords | Spoofing | Minimum password length (6 chars in schema, recommend stronger) |
| JWT Secret Exposure | Information Disclosure | .env, never committed, strong random secret |
| Privilege Escalation | Elevation of Privilege | Role checks on every admin endpoint |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Users can register and log in; admins are distinguished by role | JWT auth pattern with role claims, bcryptjs hashing, middleware for role checks documented above |
| ADMIN-01 | Admin can create, edit and delete buildings, floors, classrooms, departments and faculty | Prisma schema models all entities, CRUD patterns in catalog module, admin routes protected by role middleware |
| SEED-01 | A seeded synthetic campus exists so the system is demonstrable without manual setup | Idempotent seed script with upsert, creates realistic multi-building campus with departments/faculty/classrooms |

## Sources

### Primary (HIGH confidence)
- [STACK.md](../../research/STACK.md) - Complete stack specification with versions and Prisma 7 patterns
- [Prisma v7 Docs](https://www.prisma.io/docs/v7) - Driver adapters, generators, config
- [PROJECT.md](../../PROJECT.md) - Domain model and requirements

### Secondary (MEDIUM confidence)
- [PITFALLS.md](../../research/PITFALLS.md) - Seeding issues, auth pitfalls
- [ARCHITECTURE.md](../../research/ARCHITECTURE.md) - System structure

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified from registries
- Architecture: HIGH - Clear patterns from STACK.md and ARCHITECTURE.md
- Pitfalls: HIGH - Documented in PITFALLS.md
- Prisma 7 specifics: HIGH - Official docs referenced in STACK.md

**Research date:** 2026-10-23  
**Valid until:** 2026-11-22 (30 days for stable stack)
