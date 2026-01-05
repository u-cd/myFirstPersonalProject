// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { supabase } from '../src/react/supabase-config';
import SoloSidebar from '../src/react/components/SoloSidebar.jsx';

describe('SoloSidebar UI behavior', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
  });

  it('fetches chats and clicking a chat calls setCurrentChatId', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        if (u.startsWith('/chats-with-title?userId=')) {
          return {
            ok: true,
            json: async () => ({ chats: [{ _id: 'c1', title: 'My Chat' }] }),
          };
        }
        return { ok: true, json: async () => ({}) };
      })
    );

    const setCurrentChatId = vi.fn();
    const closeSidebar = vi.fn();

    render(
      <SoloSidebar
        user={{ id: 'user-1' }}
        currentChatId={null}
        setCurrentChatId={setCurrentChatId}
        sidebarOpen={false}
        closeSidebar={closeSidebar}
      />
    );

    expect(await screen.findByText('My Chat')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'My Chat' }));
    expect(setCurrentChatId).toHaveBeenCalledWith('c1');
    expect(closeSidebar).toHaveBeenCalled();
  });

  it('New chat button resets currentChatId to null', () => {
    const setCurrentChatId = vi.fn();

    render(
      <SoloSidebar
        user={{ id: 'user-1' }}
        currentChatId={'c1'}
        setCurrentChatId={setCurrentChatId}
        sidebarOpen={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /new chat/i }));
    expect(setCurrentChatId).toHaveBeenCalledWith(null);
  });
});
