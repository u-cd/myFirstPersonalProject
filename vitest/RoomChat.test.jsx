// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';

import { supabase } from '../src/react/supabase-config';
import RoomChat from '../src/react/components/RoomChat.jsx';

describe('RoomChat UI behavior', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });

    vi.stubGlobal('alert', vi.fn());
  });

  it('shows public rooms list and can open/create room modal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        const u = String(url);

        if (u === '/rooms/public-rooms') {
          return {
            ok: true,
            json: async () => ({
              rooms: [
                {
                  _id: 'r1',
                  name: 'Public Room',
                  description: 'Hello',
                  ownerId: 'owner-1',
                  participants: ['owner-1'],
                  updatedAt: new Date().toISOString(),
                  public: true,
                },
              ],
            }),
          };
        }

        if (u === '/rooms/r1/messages') {
          return {
            ok: true,
            json: async () => ({ messages: [{ _id: 'm1' }, { _id: 'm2' }] }),
          };
        }

        if (u === '/rooms' && init?.method === 'POST') {
          const body = JSON.parse(String(init.body || '{}'));
          return {
            ok: true,
            json: async () => ({
              room: {
                _id: 'new-room-1',
                name: body.name,
                description: body.description || '',
                ownerId: 'user-1',
                participants: ['user-1'],
                updatedAt: new Date().toISOString(),
                public: true,
              },
            }),
          };
        }

        return { ok: true, json: async () => ({}) };
      })
    );

    render(<RoomChat user={{ id: 'user-1' }} currentRoom={null} setCurrentRoom={() => {}} />);

    expect(await screen.findByText('Public Room')).toBeInTheDocument();
    // message count "2" should show for r1
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/create room/i));
    expect(screen.getByPlaceholderText(/new room name/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/new room name/i), {
      target: { value: 'My New Room' },
    });

    const modal = document.querySelector('.modal-create-room');
    expect(modal).toBeTruthy();
    fireEvent.click(within(modal).getByRole('button', { name: /^create room$/i }));

    expect(await screen.findByText('My New Room')).toBeInTheDocument();
  });

  it('owner can edit and save room description', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        const u = String(url);
        if (u === '/rooms/r1' && init?.method === 'PATCH') {
          return {
            ok: true,
            json: async () => ({ room: { description: 'New description' } }),
          };
        }
        return { ok: true, json: async () => ({}) };
      })
    );

    const setCurrentRoom = vi.fn();

    render(
      <RoomChat
        user={{ id: 'user-1' }}
        currentRoom={{ id: 'r1', name: 'Room A', description: 'Old description', ownerId: 'user-1' }}
        setCurrentRoom={setCurrentRoom}
      />
    );

    // RoomChat schedules a 0ms scroll-to-bottom timeout when a room opens.
    // Flush it while mounted to avoid it firing after unmount.
    await new Promise((r) => setTimeout(r, 0));

    fireEvent.click(screen.getByRole('button', { name: /edit description/i }));

    const textarea = screen.getByDisplayValue('Old description');
    fireEvent.change(textarea, { target: { value: 'New description' } });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(setCurrentRoom).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'New description' })
      );
    });
  });
});
