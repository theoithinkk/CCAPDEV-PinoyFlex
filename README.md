# PinoyFlex

PinoyFlex is a full-stack fitness community app built with React, Vite, Node.js, Express, and MongoDB.

The project uses:

- MongoDB Atlas for the database
- Render for deployment
- Express sessions for authentication

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB Atlas + Mongoose
- Auth: `express-session`
- File uploads/assets: local `uploads/` plus Cloudinary-hosted badge assets

## Project Structure

- Main backend entry: `server.js`
- Frontend source: `src/`
- Database models: `model/`
- API and page routes: `routes/`

There is also an older duplicate backend inside `server/`. Treat that folder as legacy and use the root `server.js` backend.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create environment variables for local development.

Required:

```env
MONGODB_URI=your-mongodb-atlas-connection-string
SESSION_SECRET=your-session-secret
```

Optional:

```env
PORT=3000
NODE_ENV=development
```

3. Start the backend:

```bash
npm run server
```

4. In a separate terminal, start the frontend:

```bash
npm run dev
```

5. Open the app:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

## Production Deployment

The app is deployed on Render and connects to MongoDB Atlas.

Because `server.js` serves the built Vite frontend from `dist/`, the typical Render setup is:

- Build command: `npm install && npm run build`
- Start command: `node server.js`

Render environment variables:

- `MONGODB_URI`
- `SESSION_SECRET`
- `NODE_ENV=production`
- `PORT` is provided by Render

## Database

This project does not rely on a local MongoDB instance in production. Use a MongoDB Atlas connection string in `MONGODB_URI`.

Example format:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
```

## Seeding

The app seeds default data on startup when the database is empty or incomplete.

You can also run the seed script manually:

```bash
npm run seed
```

Force reset and reseed all collections:

```bash
npm run seed:force
```

## Seeded Accounts

All seeded users use password `1234`.

- Admin: `theo`
- Users: `marc`, `nathaniel`, `ian`, `arturo`
- Editorial: `pinoyflex_editorial`

## Main Features

- Auth and profile management with role support
- Posts, comments, voting, and tags
- Workout logs
- Follow and follower system
- Search API
- Trending and explore feeds
- Reports and moderation tools
- Badge catalog and verification requests
- Notifications
- Basic API and auth rate limiting

## Main API Additions

- `GET /api/search?q=...`
- `GET /api/feed/trending`
- `GET /api/feed/explore`
- `POST /api/users/:username/follow`
- `DELETE /api/users/:username/follow`
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
- `GET /api/admin/reports`
- `PATCH /api/admin/reports/:id`
- `GET /api/admin/verifications`
- `PATCH /api/admin/verifications/:id`
