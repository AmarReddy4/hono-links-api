# hono-links-api

A link bookmarking API built with [Hono v4](https://hono.dev/) on Cloudflare Workers + D1.

## Features

- Full CRUD for bookmarked links
- Tag-based organization with many-to-many relationships
- Click tracking per link
- API key authentication
- SQLite at the edge via Cloudflare D1

## Setup

```bash
npm install
```

### Database

Create a D1 database and update the `database_id` in `wrangler.toml`:

```bash
wrangler d1 create links-db
```

Run the initial migration:

```bash
# Local development
npm run db:migrate:local

# Production
npm run db:migrate
```

### Environment

Create a `.dev.vars` file for local development:

```
API_KEY=your-secret-key-here
```

For production, set the secret via Wrangler:

```bash
wrangler secret put API_KEY
```

## Development

```bash
npm run dev
```

## API

### Endpoints

| Method | Path              | Description          | Auth     |
|--------|-------------------|----------------------|----------|
| GET    | `/`               | API info             | No       |
| GET    | `/api/links`      | List links           | Required |
| GET    | `/api/links/:id`  | Get link (+ clicks)  | Required |
| POST   | `/api/links`      | Create link          | Required |
| PUT    | `/api/links/:id`  | Update link          | Required |
| DELETE | `/api/links/:id`  | Delete link          | Required |

### Query Parameters

- `tag` - Filter links by tag name
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

### Create Link

```bash
curl -X POST http://localhost:8787/api/links \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key-here" \
  -d '{"url": "https://hono.dev", "title": "Hono", "tags": ["framework", "typescript"]}'
```

## Deploy

```bash
npm run deploy
```

## License

MIT
