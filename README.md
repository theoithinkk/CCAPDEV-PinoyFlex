# PinoyFlex - Phase 2 Backend

This repository now includes a Node.js + Express + MongoDB backend for the PinoyFlex forum features.

## Tech Stack

- Node.js server (`Express`)
- MongoDB database (`Mongoose` ODM)
- Server-side views (`EJS`)
- Session management (`express-session`)
- Password hashing (`bcryptjs`)

## Database Design

Database models are inside the `model/` folder:

- `model/User.js`
- `model/Post.js`
- `model/Comment.js`

The app auto-seeds at startup (if needed) with:

- 5 sample users
- 5 sample posts
- 5 sample comments

## Routes and Features

Main navigation routes:

- `GET /` - index page with links/stats
- `GET /posts` - list all posts
- `GET /posts/new` - create post form
- `GET /posts/:id` - post detail + comments
- `GET /users` - list users
- `GET /users/me` - current user profile
- `GET /auth/login` and `GET /auth/register`

Form HTTP methods:

- Login/Register use `POST`
- Create post uses `POST`
- Add comment uses `POST`
- Vote actions use `POST`
- Profile update uses `POST`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Ensure MongoDB is running locally on the default URI:

```text
mongodb://127.0.0.1:27017/pinoyflex
```

You can override using environment variables:

- `MONGODB_URI`
- `PORT` (default: `3000`)
- `SESSION_SECRET`

3. Start the backend server:

```bash
npm run server
```

4. Start the React frontend (optional but recommended for SPA development):

```bash
npm run dev
```

`vite.config.js` is configured to proxy `/api` requests to `http://localhost:3000`.

5. Open:

```text
Frontend (SPA): http://localhost:5173
Backend (Node server): http://localhost:3000
```

## Test Credentials (Seeded)

All seeded users use password: `1234`

- `theo`
- `marc`
- `nathaniel`
- `ian`
- `arturo`
