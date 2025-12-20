import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock OpenAI and mongoose before importing the app
vi.mock('mongoose', async () => {
  const actual = await vi.importActual('mongoose');
  return {
    ...actual,
    connect: vi.fn().mockResolvedValue({})
  };
});
vi.mock('openai', () => {
  return {
    OpenAI: vi.fn().mockImplementation(() => ({
      responses: {
        create: vi.fn().mockResolvedValue({ output_text: 'Mocked response' })
      }
    }))
  };
});

import app from '../src/app';

describe('Express API', () => {
  it('should return 200 for unknown route (SPA fallback)', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(200);
  });

  // Add more endpoint tests here, mocking DB and OpenAI as needed
});
