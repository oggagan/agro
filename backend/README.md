# BuchiFin Admin Panel — Backend

Node.js / Express / TypeScript backend with PostgreSQL (Prisma ORM) powering the Admin Panel and Manufacturer module.

## Prerequisites

- **Node.js** >= 20.19
- **PostgreSQL** running locally or remotely
- **npm**

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy .env.example to .env and fill in your DATABASE_URL
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Seed the database (creates SYSTEM user + SuperAdmin)
npx prisma db seed

# 6. Start the dev server
npm run dev
```

The server runs on **http://localhost:5000** by default.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed SYSTEM + SuperAdmin users |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:generate` | Regenerate Prisma client |

## API Documentation

Swagger UI is available at **http://localhost:5000/api-docs** when the server is running.

## API Overview

### Health Check

```
GET /api/v1/health
```

### Auth (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/send-otp` | Public | Send OTP to phone (mock: always 123456) |
| POST | `/verify-otp` | Public | Verify OTP |
| POST | `/register` | Public | Register (phone + password + name) |
| POST | `/login` | Public | Login, returns JWT pair |
| POST | `/refresh` | Public | Refresh access token |
| POST | `/logout` | Authenticated | Revoke refresh token |

### Users (`/api/v1/users`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/me` | Authenticated | Get own profile |
| PATCH | `/me` | Authenticated | Update own profile |
| PATCH | `/me/password` | Authenticated | Change password |
| GET | `/` | SUPER_ADMIN | List users (paginated) |
| GET | `/:id` | SUPER_ADMIN | Get user by ID |
| PATCH | `/:id/status` | SUPER_ADMIN | Update user status |
| DELETE | `/:id` | SUPER_ADMIN | Soft delete user |

### Manufacturers (`/api/v1/manufacturers`)

**Admin (SUPER_ADMIN)**

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | SUPER_ADMIN | Create manufacturer + user |
| GET | `/` | SUPER_ADMIN | List manufacturers |
| GET | `/:id` | SUPER_ADMIN | Get manufacturer details |
| PUT | `/:id` | SUPER_ADMIN | Update manufacturer |
| PATCH | `/:id/status` | SUPER_ADMIN | Change status |
| POST | `/:id/documents` | SUPER_ADMIN | Upload documents |
| DELETE | `/:id/documents/:docId` | SUPER_ADMIN | Delete document |
| POST | `/:id/directors` | SUPER_ADMIN | Add director |
| PUT | `/:id/directors/:dirId` | SUPER_ADMIN | Update director |
| DELETE | `/:id/directors/:dirId` | SUPER_ADMIN | Delete director |
| PUT | `/:id/authorized-person` | SUPER_ADMIN | Set authorized person |
| PUT | `/:id/bank-details` | SUPER_ADMIN | Set bank details |

**Self-Service (MANUFACTURER)**

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/me` | MANUFACTURER | Get own profile |
| PUT | `/me` | MANUFACTURER | Update own details |
| POST | `/me/documents` | MANUFACTURER | Upload own documents |
| PUT | `/me/bank-details` | MANUFACTURER | Update own bank details |
| PUT | `/me/directors/:dirId` | MANUFACTURER | Update own director |
| PUT | `/me/authorized-person` | MANUFACTURER | Update own authorized person |

## Default Credentials

| User | Phone | Password |
| --- | --- | --- |
| SuperAdmin | 9999999999 | SuperAdmin@123 |

Mock OTP is always **123456**.

## Architecture

```
backend/
  prisma/           # Schema, migrations, seed
  src/
    config/         # Env, database, logger
    middleware/     # Auth, validation, upload, error handling
    modules/
      auth/         # Authentication (OTP, JWT, login/register)
      user/         # User CRUD, profile, status management
      manufacturer/ # Manufacturer CRUD, directors, documents, bank details
    types/          # TypeScript types, Express augmentation
    utils/          # JWT, OTP, pagination, audit, soft-delete helpers
    app.ts          # Express app setup
    server.ts       # Entry point
```

## Audit Trail

Every CUD operation is tracked via:
- **AuditLog table** — full before/after snapshots of every change
- **StatusHistory table** — tracks every status transition with reason
- **Field-level** — `createdBy`, `updatedBy`, `deletedAt`, `deletedBy` on all major tables

A special **SYSTEM** user (UUID `00000000-0000-0000-0000-000000000000`) is used for system-initiated actions.
