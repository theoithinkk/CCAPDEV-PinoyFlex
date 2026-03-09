# PinoyFlex Backend

PinoyFlex uses a Node.js + Express + MongoDB backend with session auth.

## Core Features

- Auth and profile management with role support (`user`, `admin`)
- Posts, comments, voting, tags, workout logs
- Follows/followers
- Search API
- Trending and explore feeds
- Reports + moderation actions
- Badge catalog + verification requests
- Notifications
- Basic API/auth rate limiting

## Canonical Backend

Use the root backend only:

- Entry point: `server.js`
- Models: `model/`
- Routes: `routes/`

There is an older duplicate backend under `server/`; treat it as legacy.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Make sure MongoDB is running:

```text
mongodb://127.0.0.1:27017/pinoyflex
```

3. Start backend:

```bash
npm run server
```

Optional: seed sample data manually:

```bash
npm run seed
```

Force reset and reseed all collections:

```bash
npm run seed:force
```

4. Start frontend:

```bash
npm run dev
```

5. Open:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

## Seeded Accounts

All seeded users use password `1234`.

- Admin: `theo`
- Users: `marc`, `nathaniel`, `ian`, `arturo`

## Main API Additions

- `GET /api/search?q=...`
- `GET /api/feed/trending`
- `GET /api/feed/explore`
- `POST/DELETE /api/users/:username/follow`
- `GET /api/users/:username/followers`
- `GET /api/users/:username/following`
- `POST /api/reports`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET /api/badges`
- `POST /api/verifications/upload`
- `POST /api/verifications`
- `GET /api/verifications/me`
- `GET/PATCH /api/admin/reports*`
- `GET/PATCH /api/admin/verifications*`
