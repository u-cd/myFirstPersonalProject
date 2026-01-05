// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { supabase } from '../src/react/supabase-config';

vi.mock('../src/react/components/Solo.jsx', () => ({
  default: () => <div data-testid="solo-view">SOLO_VIEW</div>,
}));
vi.mock('../src/react/components/Solo', () => ({
  default: () => <div data-testid="solo-view">SOLO_VIEW</div>,
}));
vi.mock('../src/react/components/Room.jsx', () => ({
  default: () => <div data-testid="room-view">ROOM_VIEW</div>,
}));
vi.mock('../src/react/components/Room', () => ({
  default: () => <div data-testid="room-view">ROOM_VIEW</div>,
}));

import ChatApp from '../src/react/components/ChatApp.jsx';

describe('ChatApp UI behavior', () => {
  it('defaults to Solo mode and can switch to Rooms mode', async () => {
    localStorage.clear();

    render(<ChatApp user={{ id: 'u1', email: 'u1@example.com' }} />);

    expect(screen.getByTestId('solo-view')).toBeInTheDocument();
    expect(screen.queryByTestId('room-view')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));

    expect(await screen.findByTestId('room-view')).toBeInTheDocument();

    await waitFor(() => {
      expect(localStorage.getItem('chatAppMode_u1')).toBe('rooms');
    });
  });

  it('opens/closes mobile sidebar overlay', () => {
    render(<ChatApp user={{ id: 'u1', email: 'u1@example.com' }} />);

    const overlay = document.querySelector('.sidebar-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.className).not.toMatch(/\bactive\b/);

    fireEvent.click(screen.getByLabelText('Open menu'));
    expect(overlay.className).toMatch(/\bactive\b/);

    fireEvent.click(overlay);
    expect(overlay.className).not.toMatch(/\bactive\b/);
  });

  it('clicking Log out calls supabase.auth.signOut()', async () => {
    render(<ChatApp user={{ id: 'u1', email: 'u1@example.com' }} />);

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
