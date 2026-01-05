// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../src/react/components/RoomSidebar.jsx', () => ({
  default: () => <div data-testid="room-sidebar">ROOM_SIDEBAR</div>,
}));
vi.mock('../src/react/components/RoomSidebar', () => ({
  default: () => <div data-testid="room-sidebar">ROOM_SIDEBAR</div>,
}));
vi.mock('../src/react/components/RoomChat.jsx', () => ({
  default: () => <div data-testid="room-chat">ROOM_CHAT</div>,
}));
vi.mock('../src/react/components/RoomChat', () => ({
  default: () => <div data-testid="room-chat">ROOM_CHAT</div>,
}));

import Room from '../src/react/components/Room.jsx';

describe('Room wrapper', () => {
  it('renders RoomSidebar and RoomChat', () => {
    render(
      <Room
        user={{ id: 'u1' }}
        sidebarOpen={false}
        closeSidebar={() => {}}
        currentRoom={null}
        setCurrentRoom={() => {}}
      />
    );

    expect(screen.getByTestId('room-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('room-chat')).toBeInTheDocument();
  });
});
