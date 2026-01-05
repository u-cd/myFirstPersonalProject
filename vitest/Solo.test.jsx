// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../src/react/components/SoloSidebar.jsx', () => ({
  default: () => <div data-testid="solo-sidebar">SOLO_SIDEBAR</div>,
}));
vi.mock('../src/react/components/SoloSidebar', () => ({
  default: () => <div data-testid="solo-sidebar">SOLO_SIDEBAR</div>,
}));
vi.mock('../src/react/components/SoloChat.jsx', () => ({
  default: () => <div data-testid="solo-chat">SOLO_CHAT</div>,
}));
vi.mock('../src/react/components/SoloChat', () => ({
  default: () => <div data-testid="solo-chat">SOLO_CHAT</div>,
}));

import Solo from '../src/react/components/Solo.jsx';

describe('Solo wrapper', () => {
  it('renders SoloSidebar and SoloChat', () => {
    render(
      <Solo
        user={{ id: 'u1' }}
        sidebarOpen={false}
        closeSidebar={() => {}}
        currentChatId={null}
        setCurrentChatId={() => {}}
      />
    );

    expect(screen.getByTestId('solo-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('solo-chat')).toBeInTheDocument();
  });
});
