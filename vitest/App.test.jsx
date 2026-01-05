// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { supabase } from '../src/react/supabase-config';

// App imports these via "./components/..."; mock resolved files to avoid pulling in full UI.
vi.mock('../src/react/components/Login.jsx', () => ({
  default: () => <div>LOGIN_COMPONENT</div>,
}));
vi.mock('../src/react/components/Login', () => ({
  default: () => <div>LOGIN_COMPONENT</div>,
}));
vi.mock('../src/react/components/ChatApp.jsx', () => ({
  default: () => <div>CHATAPP_COMPONENT</div>,
}));
vi.mock('../src/react/components/ChatApp', () => ({
  default: () => <div>CHATAPP_COMPONENT</div>,
}));

import App from '../src/react/App.jsx';

describe('App UI behavior', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('shows loading, then Login when user is null', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    render(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    expect(await screen.findByText('LOGIN_COMPONENT')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  });

  it('shows loading, then ChatApp when user exists', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'u1', email: 'u1@example.com' } },
    });

    render(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    expect(await screen.findByText('CHATAPP_COMPONENT')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  });
});
