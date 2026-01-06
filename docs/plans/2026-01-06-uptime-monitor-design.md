# IsItUp - Uptime Monitor Design

## Overview

A self-hosted website monitoring tool that checks if sites are up and working properly. Provides a dashboard to manage monitored sites, view response time graphs, uptime history, and receive Discord notifications when sites go down.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS 4, Recharts
- **Backend**: Next.js Server Actions, node-cron for scheduling
- **Database**: SQLite with Drizzle ORM
- **Auth**: Multi-user authentication (next-auth or lucia)
- **Deployment**: Docker for Dokploy on VPS

## Architecture

```
┌─────────────────────────────────────────────┐
│              Next.js App                     │
├──────────────────┬──────────────────────────┤
│   Frontend       │   Backend                 │
│   - Dashboard    │   - Server Actions (CRUD) │
│   - Auth pages   │   - API routes (checks)   │
│   - Graphs       │   - Cron scheduler        │
├──────────────────┴──────────────────────────┤
│              Drizzle ORM                     │
├─────────────────────────────────────────────┤
│              SQLite (file)                   │
└─────────────────────────────────────────────┘
```

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key, UUID |
| email | text | Unique |
| passwordHash | text | |
| discordWebhookUrl | text | Nullable |
| createdAt | timestamp | |

### sites
| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key, UUID |
| userId | text | Foreign key → users |
| name | text | Friendly name |
| url | text | Full URL to check |
| checkSsl | boolean | Default true |
| checkContent | text | Nullable, text to find on page |
| enabled | boolean | Default true |
| createdAt | timestamp | |

### checks
| Column | Type | Notes |
|--------|------|-------|
| id | text | Primary key, UUID |
| siteId | text | Foreign key → sites |
| timestamp | timestamp | |
| status | text | "up" / "down" / "degraded" |
| httpStatus | integer | Nullable, 200/404/500 etc |
| responseTimeMs | integer | Nullable |
| sslValid | boolean | Nullable |
| sslExpiresAt | timestamp | Nullable |
| dnsResolved | boolean | |
| contentFound | boolean | Nullable |
| errorMessage | text | Nullable |

## Health Checks

Each check performs (in order):

1. **DNS Resolution** - Resolve hostname via `dns.promises.lookup`
2. **HTTP Request** - Fetch URL, measure response time
3. **HTTP Status** - Check for 2xx/3xx success codes
4. **SSL Certificate** - Validate cert, get expiration date
5. **Content Check** - If configured, verify expected text appears

### Status Logic

- **up**: DNS resolves, HTTP 2xx/3xx, SSL valid (if checked), content found (if configured)
- **degraded**: Site responds but slow (>3s), SSL expiring (<14 days), or content missing
- **down**: DNS fails, connection refused, HTTP 5xx, SSL invalid/expired

## Scheduling

- **Check interval**: Every 5 minutes via node-cron
- **Cleanup job**: Daily, deletes checks older than 30 days
- Runs alongside Next.js in the same container

## Notifications

Discord webhook triggered when:
- Site transitions from `up` → `down` or `up` → `degraded`
- Site recovers from `down` → `up`
- No duplicate notifications for consecutive same-status checks

## Pages

| Route | Purpose |
|-------|---------|
| `/login` | Email/password login |
| `/register` | Create account |
| `/dashboard` | Main view: site list with status |
| `/sites/new` | Add new site form |
| `/sites/[id]` | Site detail: graphs, history, settings |
| `/settings` | User settings (Discord webhook, password) |

## Dashboard UI

- Site cards: name, URL, status badge, uptime %, last checked
- Click site → detail page with:
  - Response time line chart (24h/7d/30d toggle)
  - Uptime percentage bar
  - Recent checks table
  - "Check Now" button
  - Edit/Delete actions

## Docker Deployment

### Dockerfile
- Multi-stage build (deps → build → production)
- Node 20 Alpine base
- SQLite in `/app/data` volume

### docker-compose.yml
```yaml
services:
  isitup:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=file:/app/data/isitup.db
```

### Environment Variables
- `DATABASE_URL` - SQLite file path
- `AUTH_SECRET` - Session signing secret

## Implementation Notes

- Use `frontend-design` skill for UI components
- Use Context7 for latest Tailwind 4 patterns
