// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Avoid rendering the full SoloChat here (it does fetch + timers).
vi.mock('../src/react/components/SoloChat', () => ({
  default: () => <div data-testid="solo-chat" />,
}));
vi.mock('../src/react/components/SoloChat.jsx', () => ({
  default: () => <div data-testid="solo-chat" />,
}));

import { supabase } from '../src/react/supabase-config';
import Login from '../src/react/components/Login.jsx';

describe('Login UI behavior', () => {
  beforeEach(() => {
    supabase.auth.signInWithOAuth.mockResolvedValue({ error: null });
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabase.auth.signUp.mockResolvedValue({ error: null });
    supabase.auth.signInWithOtp.mockResolvedValue({ error: null });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/terms-of-use.md')) {
          return { ok: true, text: async () => '# Terms' };
        }
        if (String(url).includes('/privacy-policy.md')) {
          return { ok: true, text: async () => '# Privacy' };
        }
        return { ok: true, text: async () => '', json: async () => ({}) };
      })
    );
  });

  it('requires policy agreement for Google sign-up', async () => {
    render(<Login />);

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    expect(screen.getByRole('heading', { name: 'Sign up' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(screen.getByText(/you must agree/i)).toBeInTheDocument();
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('opens Terms of Use doc view and can close back to chat', async () => {
    render(<Login />);

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    fireEvent.click(screen.getByRole('link', { name: /terms of use/i }));

    // ReactMarkdown renders # Terms as an h1 "Terms".
    expect(await screen.findByRole('heading', { name: 'Terms' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.getByTestId('solo-chat')).toBeInTheDocument();
  });

  it('shows magic link form when clicking forgot-password link', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'invalid' } });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'a@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: 'badpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    // The link is injected via innerHTML; it should still be clickable.
    fireEvent.click(await screen.findByText('パスワードを覚えてないですか？'));

    expect(await screen.findByRole('button', { name: /send magic link/i })).toBeInTheDocument();
  });
});
