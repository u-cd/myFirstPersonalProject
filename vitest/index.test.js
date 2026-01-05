import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

// Mock OpenAI and mongoose before importing the app
vi.mock('mongoose', async () => {
  const actual = await vi.importActual('mongoose');
  return {
    ...actual,
    connect: vi.fn().mockResolvedValue({}),
  };
});
vi.mock('openai', () => {
  return {
    OpenAI: vi.fn().mockImplementation(() => ({
      responses: {
        create: vi.fn().mockResolvedValue({ output_text: 'one, two, three' }),
      },
    })),
  };
});

let app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  vi.resetModules();
  const imported = await import('../src/app');
  app = imported.default ?? imported;
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Express API', () => {
  it('should return 200 for unknown route (SPA fallback)', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(200);
  });

  describe('Chat routes', () => {
    it('POST / creates a new chat when no chatId', async () => {
      const res = await request(app).post('/').send({ message: 'Hello' });
      expect(res.status).toBe(200);
      expect(typeof res.body.chatId).toBe('string');
      expect(typeof res.body.reply).toBe('string');
    });

    it('POST / continues an existing chat when chatId is provided', async () => {
      const res = await request(app)
        .post('/')
        .send({ message: 'Hi again', chatId: 'chat-1' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('chatId', 'chat-1');
    });

    it('POST / rejects empty message', async () => {
      const res = await request(app).post('/').send({ message: '' });
      expect(res.status).toBe(400);
    });

    it('GET /chat-history requires auth + matching userId', async () => {
      const missingAuth = await request(app).get('/chat-history?chatId=chat-1&userId=user-1');
      expect(missingAuth.status).toBe(400);

      const wrongUser = await request(app)
        .get('/chat-history?chatId=chat-1&userId=user-1')
        .set('Authorization', 'Bearer user-2');
      expect(wrongUser.status).toBe(400);
    });

    it('GET /chat-history returns messages array (contract)', async () => {
      const res = await request(app)
        .get('/chat-history?chatId=chat-1&userId=user-1')
        .set('Authorization', 'Bearer user-1');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    it('GET /chats-with-title returns chats array (contract)', async () => {
      const res = await request(app)
        .get('/chats-with-title?userId=user-1')
        .set('Authorization', 'Bearer user-1');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.chats)).toBe(true);
    });

    it('POST /writing-suggestions returns suggestions array', async () => {
      const res = await request(app)
        .post('/writing-suggestions')
        .send({ context: 'Hello', input: 'I think' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.suggestions)).toBe(true);
      expect(res.body.suggestions.length).toBeGreaterThan(0);
    });

    it('POST /writing-suggestions invalid input -> 400', async () => {
      const res = await request(app)
        .post('/writing-suggestions')
        .send({ context: 'Hello', input: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('Room routes', () => {
    it('GET /rooms requires auth', async () => {
      const res = await request(app).get('/rooms');
      expect(res.status).toBe(400);
    });

    it('GET /rooms returns rooms list for authed user', async () => {
      const res = await request(app)
        .get('/rooms')
        .set('Authorization', 'Bearer user-1');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.rooms)).toBe(true);
    });

    it('GET /rooms/public-rooms returns public rooms', async () => {
      const res = await request(app)
        .get('/rooms/public-rooms')
        .set('Authorization', 'Bearer user-1');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.rooms)).toBe(true);
    });

    it('POST /rooms creates a room and sanitizes name/description', async () => {
      const res = await request(app)
        .post('/rooms')
        .set('Authorization', 'Bearer user-1')
        .send({ name: '<b>My Room</b>', description: '<script>bad</script> ok', public: true });

      expect(res.status).toBe(201);
      expect(res.body.room).toBeTruthy();
      expect(res.body.room.name).toBe('My Room');
      expect(String(res.body.room.description || '')).not.toMatch(/[<>]/);
    });

    it('GET /rooms/:roomId/messages returns messages array (contract)', async () => {
      const res = await request(app)
        .get('/rooms/room-1/messages')
        .set('Authorization', 'Bearer user-1');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    it('POST /rooms/:roomId/messages auto-joins public room and returns AI message', async () => {
      const res = await request(app)
        .post('/rooms/room-1/messages')
        .set('Authorization', 'Bearer user-1')
        .send({ content: 'こんにちは' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBeTruthy();
      expect(res.body.message.content).toBe('one, two, three');
    });

    it('PATCH /rooms/:roomId updates description (contract + sanitize)', async () => {
      const res = await request(app)
        .patch('/rooms/room-1')
        .set('Authorization', 'Bearer user-1')
        .send({ description: '<b>Hello</b> <script>bad</script>' });

      expect(res.status).toBe(200);
      expect(res.body.room).toBeTruthy();
      expect(String(res.body.room.description || '')).not.toMatch(/[<>]/);
    });

    it('DELETE /rooms/messages/:messageId deletes message (contract)', async () => {
      const res = await request(app)
        .delete('/rooms/messages/msg-1')
        .set('Authorization', 'Bearer user-1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok', true);
    });

    it('POST /rooms/translate-message returns translation (contract)', async () => {
      const res = await request(app)
        .post('/rooms/translate-message')
        .set('Authorization', 'Bearer user-1')
        .send({ text: 'Hello' });

      expect(res.status).toBe(200);
      expect(typeof res.body.translation).toBe('string');
      expect(res.body.translation.length).toBeGreaterThan(0);
    });
  });
});
