import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

process.env.NODE_ENV = 'test';

const createSupabaseMock = () => {
  const noop = () => {};
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      getUser: vi.fn(async () => ({ data: { user: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: noop,
          },
        },
      })),
      signOut: vi.fn(async () => ({ error: null })),
      signInWithOAuth: vi.fn(async () => ({ error: null })),
      signInWithPassword: vi.fn(async () => ({ error: null })),
      signUp: vi.fn(async () => ({ error: null })),
      signInWithOtp: vi.fn(async () => ({ error: null })),
    },
  };
};

const supabaseMock = createSupabaseMock();

// Prevent `src/react/supabase-config.js` from throwing in unit tests.
// Components import it via relative paths like "../supabase-config".
vi.mock('../src/react/supabase-config', () => ({ supabase: supabaseMock }));
vi.mock('../src/react/supabase-config.js', () => ({ supabase: supabaseMock }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
