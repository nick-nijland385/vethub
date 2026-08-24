# VetHub

VetHub is a **pet clinic management demo application** — originally built as an ilionx workshop project (package name `dev.ilionx.workshop`, artifact `ilionx-pet-store`). It models the classic "pet clinic" domain: **owners** who have **pets**, pets that belong to a **pet type**, **vets** with **specialties**, and **visits** that tie a pet to a vet.

It's a full-stack app split into two independently runnable projects:

- **`server/`** — a Java/Spring Boot REST API
- **`client/`** — a SvelteKit single-page app that consumes that API

## Domain model

```
Owner ──< Pet >── PetType
          │
          └──< Visit >── Vet ──< Specialty
```

- **Owner** — a pet owner, has many pets
- **Pet** — belongs to one owner and one pet type, has many visits
- **PetType** — a category of pet (e.g. dog, cat)
- **Vet** — a veterinarian, has one or more specialties
- **Specialty** — an area of expertise (e.g. surgery, dentistry)
- **Visit** — a record of a pet being seen by a vet

Every entity has full CRUD exposed through the REST API (see `server/src/main/java/dev/ilionx/workshop/api/Paths.java` for the exact routes).

## Tech stack

### Backend (`server/`)

| Concern | Choice |
|---|---|
| Language / runtime | Java 25 (via Gradle toolchain) |
| Framework | Spring Boot 4 (web, data-jpa, validation, actuator) |
| Build tool | Gradle (Kotlin DSL) |
| Database | H2, in-memory (`jdbc:h2:mem:demodb`) — no external DB needed |
| Schema migrations | Liquibase (changesets in `server/src/main/resources/db/changelog`) |
| Mapping | MapStruct (entity ↔ request/response DTO mapping) |
| Boilerplate reduction | Lombok |
| API docs | springdoc-openapi — Swagger UI served at `/api/v1/public/docs/openapi.html` |
| Auth | Spring Security, HTTP Basic (demo credentials: `user` / `password`, see `application-dev.yml`) |
| Logging | Logback + Logstash encoder (structured JSON logs) |
| Code quality | Checkstyle, PMD, SpotBugs (via the `ru.vyarus.quality` plugin), Spotless for formatting |
| Testing | JUnit 5, Spring Boot Test, Testcontainers, Spring Security Test |

The app also pulls in `io.github.jframeoss:starter-jpa` — an internal ilionx "JFrame" starter library that provides shared application bootstrap/config conventions (`jframe.*` properties in `application.yml`).

### Frontend (`client/`)

| Concern | Choice |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 |
| Language | TypeScript |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| Component library | shadcn-svelte (bits-ui primitives), Lucide icons |
| API client | `openapi-fetch` — a **fully typed** client generated from the backend's OpenAPI spec |
| Toasts | svelte-sonner |
| Package manager | bun (also compatible with npm — both lockfiles are present) |

The frontend never hand-writes API types: `src/lib/types/api.d.ts` is generated from the backend's live OpenAPI schema, so backend and frontend types stay in sync (see [Keeping the API types in sync](#keeping-the-api-types-in-sync) below).

### Tooling

- **mise** (`mise.toml` at the repo root) pins the toolchain: Java (Temurin 25), Bun 1.3.0, Node 22.20.0.
- **scripts/** contains small bash helpers (`common.sh`, `openapi-sync.sh`) used to boot the backend and regenerate frontend API types.

## Project layout

```
vethub/
├── client/                # SvelteKit frontend
│   └── src/
│       ├── lib/
│       │   ├── api/       # Generated + hand-written API controllers (typed fetch wrappers)
│       │   ├── components/# UI components (owners, pets, vets forms + shadcn ui/ primitives)
│       │   ├── config/     # Runtime constants (API base URL, demo credentials)
│       │   └── types/      # Generated OpenAPI TypeScript types
│       └── routes/         # SvelteKit pages (owners, vets, visits, ...)
├── server/                 # Spring Boot backend
│   └── src/main/java/dev/ilionx/workshop/
│       ├── api/            # owner / pet / vet / visit — controller, service, repository, model
│       └── common/         # cross-cutting config (security, exceptions)
├── scripts/                 # Dev helper scripts
└── mise.toml                # Pinned tool versions
```

Each domain area (`owner`, `pet`, `vet`, `visit`) on the backend follows the same package structure: `controller/`, `service/`, `repository/`, `model/` (with `request/`, `response/`, `mapper/` subpackages) — so once you understand one, you understand them all.

## Running locally

### Prerequisites

Install [mise](https://mise.jdx.dev/) and let it provision the pinned toolchain:

```bash
mise install
```

This gives you Java 25 (Temurin), Bun 1.3.0, and Node 22.20.0.

### 1. Start the backend

```bash
cd server
./gradlew bootRun
```

- API base path: `http://localhost:8080/api`
- Swagger UI: `http://localhost:8080/api/v1/public/docs/openapi.html`
- Health check: `http://localhost:8080/api/v1/public/actuator/health`
- H2 database is created in memory automatically — nothing to configure.
- Default profile is `dev` (`SPRING_PROFILES_ACTIVE=dev`, set in `mise.toml`), which drops/recreates the schema and seeds test data on every startup, and sets Basic Auth credentials to `user` / `password`.

### 2. Start the frontend

```bash
cd client
bun install
bun run dev
```

The dev server runs on `http://localhost:5173` (Vite default) and talks to the backend at `http://localhost:8080/api` (see `client/src/lib/config/constants.ts` — override with the `VITE_SERVER_BASE_URL` env var if needed).

### Keeping the API types in sync

If you change any backend request/response model, regenerate the frontend's typed API client:

```bash
cd client
bun run sync:api
```

This runs `scripts/openapi-sync.sh`, which spins up the backend, downloads the live OpenAPI spec to `server/openapi.json`, generates `client/src/lib/types/api.d.ts` via `openapi-typescript`, and shuts the backend down again. Run `bun run check` afterwards to verify nothing broke.

## Other useful commands

**Backend** (`server/`):
- `./gradlew test` — run the test suite
- `./gradlew check` — run tests + static analysis (Checkstyle/PMD/SpotBugs) + format check
- `./gradlew bootJar` — build a runnable jar

**Frontend** (`client/`):
- `bun run build` — production build
- `bun run check` — type-check (svelte-check)
- `bun run download:api` — just download `openapi.json` from a running backend
- `bun run generate:api` — just regenerate types from an existing `openapi.json`

## Notes for newcomers

- This is a **demo/workshop app**: security is intentionally minimal (HTTP Basic with a hardcoded demo user, `permitAll()` on essentially every route — see `WebSecurityConfig.java`) and the database is in-memory and wiped on each dev restart. Don't take these as production patterns without hardening them first.
- The backend package is still named `dev.ilionx.workshop`, and Gradle's `rootProject.name` is `vethub-server` — a naming leftover from the project's origin as the ilionx pet store workshop, now repurposed as "VetHub".
