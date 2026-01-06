# IsItUp - Uptime Monitor

A self-hosted website monitoring tool that checks if your sites are up and working properly.

## Features

- Multi-user authentication
- Monitor multiple websites
- Health checks: HTTP status, response time, SSL certificate, DNS, content verification
- Scheduled checks every 5 minutes
- Discord notifications on status changes
- Response time graphs and uptime history
- 30-day data retention

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Create database
npm run db:push

# Create .env file
cp .env.example .env
# Edit .env and set AUTH_SECRET (generate with: openssl rand -base64 32)

# Run development server
npm run dev
```

Open http://localhost:3000 and create an account.

### Docker Deployment

```bash
# Build and run
docker compose up -d

# Or build manually
docker build -t isitup .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data -e AUTH_SECRET=your-secret isitup
```

### Dokploy Deployment

1. Push this repo to GitHub
2. In Dokploy, create a new application from the repo
3. Set environment variable: `AUTH_SECRET` (generate with `openssl rand -base64 32`)
4. Configure persistent volume: `/app/data`
5. Deploy

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | Secret for session signing. Generate with `openssl rand -base64 32` |
| `DATABASE_URL` | No | SQLite database path. Defaults to `file:./data/isitup.db` |

## Tech Stack

- Next.js 16
- Tailwind CSS 4
- Drizzle ORM + SQLite
- next-auth v5
- Recharts
- node-cron
