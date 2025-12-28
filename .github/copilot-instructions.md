# Copilot Instructions: ai語 MERN Project

## Overview
- Purpose: AI English-learning assistant with chatbot.
- Architecture: Express backend + MongoDB + OpenAI; React (Vite) frontend built to `public/dist`; SPA served by Express with static assets.
- Auth: Supabase client-side; protected endpoints validate `Bearer` token server-side.

## Key Files
- Backend: [src/app.js](../src/app.js), [src/index.js](../src/index.js), [models/Chat.js](../models/Chat.js), [models/ChatMessage.js](../models/ChatMessage.js)
- Frontend: [src/react/App.jsx](../src/react/App.jsx), [src\react\components\ChatApp.jsx](../src/react/components/ChatApp.jsx), [src\react\components\Solo.jsx](../src/react/components/Solo.jsx), [src\react\components\SoloChat.jsx](../src/react/components/SoloChat.jsx), [src\react\components\SoloSidebar.jsx](../src/react/components/SoloSidebar.jsx), [src\react\components\Room.jsx](../src/react/components/Room.jsx), [src\react\components\RoomChat.jsx](../src/react/components/RoomChat.jsx), [src\react\components\RoomSidebar.jsx](../src/react/components/RoomSidebar.jsx), [src\react\components\Login.jsx](../src/react/components/Login.jsx)
- Config: [vite.config.mjs](../vite.config.mjs), [playwright.config.js](../playwright.config.js), [vitest.config.js](../vitest.config.js), [docker-compose.yml](../docker-compose.yml), [Dockerfile](../Dockerfile), [eslint.config.mjs](../eslint.config.mjs), [README.md](../README.md)

## Backend API (Express)
- `POST /`: create or continue a chat; returns `{ reply, chatId }`. Accepts `{ message, chatId?, userId? }`. Stores messages in Mongo; uses OpenAI `gpt-5-chat-latest`.
- `GET /chat-history`: returns `{ messages }` for `chatId`+`userId`. Requires Supabase auth; tokens checked via `supabase.auth.getUser()`.
- `GET /chats-with-title`: returns `{ chats }` for `userId`. Requires Supabase auth.
- `POST /writing-suggestions`: returns `{ suggestions }` (3 next-words/phrases) based on last assistant message and current input.

- `GET /rooms`: List all rooms the user has joined. Requires Supabase auth.
- `POST /rooms`: Create a new room. Accepts `{ name, settings? }`. Returns `{ room }`. Requires Supabase auth.
- `POST /rooms/:roomId/join`: Join an existing room by ID. Returns `{ room }`. Requires Supabase auth.
- `GET /rooms/:roomId/messages`: Get all messages for a room. Returns `{ messages }`. Requires Supabase auth and membership in the room.
- `POST /rooms/:roomId/messages`: Send a message to a room. Accepts `{ content }`. Returns `{ message }` (AI-enhanced/translated). Requires Supabase auth and membership in the room.

- Validation: see small guards in [src/app.js](../src/app.js) (`isObjectId`, `isUUID`, `isNonEmptyString`). Error bodies intentionally minimal (`{ error: '' }`).

## Data Models (Mongo/Mongoose)
- [models/Chat.js](../models/Chat.js): `userId?`, `title?`, `timestamp` (+ index on `{ userId, timestamp }`).
- [models/ChatMessage.js](../models/ChatMessage.js): `chatId`, `userId?`, `role` (`user|assistant`), `content` (≤2000), `timestamp` (+ compound index on `{ chatId, userId, timestamp }`).
- [models/Room.js](../models/Room.js): `name`, `participants` (array of Supabase userIds), `createdAt`, `updatedAt`, `ownerId` (Supabase userId), `settings?` (object, for future config). Index on `{ participants, createdAt }`.
## Frontend Patterns

- **[src/react/App.jsx](../src/react/App.jsx)**: Main entry point. Checks Supabase auth state, shows loading screen, and conditionally renders [ChatApp](../src/react/components/ChatApp.jsx) (for logged-in users) or [Login](../src/react/components/Login.jsx) (for guests).

- **[src/react/components/Login.jsx](../src/react/components/Login.jsx)**: Handles login, sign-up, and password reset (magic link) with Supabase. Supports Google OAuth and email/password. Requires agreement to Terms/Privacy for sign-up. Renders anonymous chat UI for guests, and can display Terms/Privacy markdown overlays. Anonymous users can chat with the AI (chat state is local, not saved to user history).

- **[src/react/components/ChatApp.jsx](../src/react/components/ChatApp.jsx)**: Main authenticated chat UI. Lets users switch between Solo and Room chat modes. Loads user chat history and chat list from backend using Supabase token. Handles sending messages, starting new chats, switching chats, and sign-out. Manages sidebar open/close state for mobile. Shows loading state while fetching data.

- **[src/react/components/Solo.jsx](../src/react/components/Solo.jsx)**: Layout wrapper for solo chat mode. Renders [SoloSidebar](../src/react/components/SoloSidebar.jsx) and [SoloChat](../src/react/components/SoloChat.jsx).

- **[src/react/components/SoloSidebar.jsx](../src/react/components/SoloSidebar.jsx)**: Sidebar for solo chat navigation. Lists all user chats (with titles), allows starting a new chat, selecting a chat, and handles sidebar open/close for mobile.

- **[src/react/components/SoloChat.jsx](../src/react/components/SoloChat.jsx)**: Renders the solo chat conversation. Loads and displays chat messages, handles sending messages, shows a welcome message (from markdown) when chat is empty, and provides writing suggestions. Scrolls to the latest message automatically.

- **[src/react/components/Room.jsx](../src/react/components/Room.jsx)**: Layout wrapper for group chat mode. Renders [RoomSidebar](../src/react/components/RoomSidebar.jsx) and [RoomChat](../src/react/components/RoomChat.jsx).

- **[src/react/components/RoomSidebar.jsx](../src/react/components/RoomSidebar.jsx)**: Sidebar for room navigation and management. Lists all rooms the user has joined, allows creating new rooms, joining by ID, and selecting a room. Handles sidebar open/close for mobile.

- **[src/react/components/RoomChat.jsx](../src/react/components/RoomChat.jsx)**: Renders the group chat conversation for the selected room. Loads and displays room messages, handles sending messages, and shows participants. Scrolls to the latest message automatically.

- **Chat rendering**: All chat components use `marked` + `DOMPurify` for markdown rendering; code blocks render in `<pre><code>` style; all HTML is sanitized. Assistant messages are shown as `llm` or `assistant`. A welcome message is shown for empty solo chats.

## Developer Workflows
- Build frontend: generates assets to `public/dist` per [vite.config.mjs](../vite.config.mjs).
```bash
npm run build
```
- Run server in Docker (serves built SPA at port 3000). Ensure `.env` contains `MONGODB_URI`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
```bash
docker-compose up --build
```
- Unit tests (Vitest): UI + API with OpenAI/mongoose mocked; see [__tests__](../__tests__) and [vitest.config.js](../vitest.config.js).
```bash
npm run vitest
```
- E2E tests (Playwright): requires server running at `http://localhost:3000`; single worker; auth setup project.
```bash
npm run playwright
# Optional UI
npm run playwright:ui
```

## Conventions & Notes
- CSP and CORS: configured in [src/app.js](../src/app.js); allow `localhost` and production domain.
- Static serving order: `public/dist` first, then `public`; SPA fallback for `/.*` to `index.html`.
- OpenAI usage: `OpenAI().responses.create({ model: 'gpt-5-chat-latest', input })`; system prompt mixes English/Japanese and suggests improved phrasing.
- Dockerfile expects prebuilt frontend (compose mounts `public/dist` read-only); Node runs `src/index.js`.

## Environment
- Backend: `MONGODB_URI`, `OPENAI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Frontend (Vite): `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
