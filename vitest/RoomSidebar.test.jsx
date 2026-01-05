// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { supabase } from '../src/react/supabase-config';
import RoomSidebar from '../src/react/components/RoomSidebar.jsx';

describe('RoomSidebar UI behavior', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url) === '/rooms') {
          return {
            ok: true,
            json: async () => ({
              rooms: [
                {
                  _id: 'r1',
                  name: 'Room One',
                  public: true,
                  updatedAt: new Date().toISOString(),
                },
                {
                  _id: 'r2',
                  name: 'Private Room',
                  public: false,
                  updatedAt: new Date().toISOString(),
                },
              ],
            }),
          };
        }
        return { ok: true, json: async () => ({ rooms: [] }) };
      })
    );
  });

  it('loads and renders rooms; selecting a room calls setCurrentRoom', async () => {
    const setCurrentRoom = vi.fn();
    const closeSidebar = vi.fn();

    render(
      <RoomSidebar
        user={{ id: 'user-1' }}
        currentRoom={null}
        setCurrentRoom={setCurrentRoom}
        sidebarOpen={true}
        closeSidebar={closeSidebar}
      />
    );

    expect(await screen.findByText('Room One')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /room one/i }));
    expect(setCurrentRoom).toHaveBeenCalledWith(expect.objectContaining({ _id: 'r1' }));
    expect(closeSidebar).toHaveBeenCalled();
  });

  it('Show Public Rooms button sets currentRoom to null', async () => {
    const setCurrentRoom = vi.fn();
    const closeSidebar = vi.fn();

    render(
      <RoomSidebar
        user={{ id: 'user-1' }}
        currentRoom={{ _id: 'r1' }}
        setCurrentRoom={setCurrentRoom}
        sidebarOpen={true}
        closeSidebar={closeSidebar}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /show public rooms/i }));
    expect(setCurrentRoom).toHaveBeenCalledWith(null);
    expect(closeSidebar).toHaveBeenCalled();
  });
});
