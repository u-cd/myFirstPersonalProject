// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SoloChat from '../src/react/components/SoloChat';

describe('SoloChat component', () => {
  beforeEach(() => {
    // SoloChat loads /welcom-message.md when empty.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('welcom-message.md')) {
          return {
            ok: true,
            text: async () => '# Welcome',
          };
        }
        return {
          ok: true,
          json: async () => ({ suggestions: [] }),
          text: async () => '',
        };
      })
    );
  });

  it('renders chat input', () => {
    render(<SoloChat currentChatId={null} setCurrentChatId={() => {}} />);
    expect(screen.getByPlaceholderText(/type your english/i)).toBeInTheDocument();
  });

  it('disables send button until typing', () => {
    render(<SoloChat currentChatId={null} setCurrentChatId={() => {}} />);

    const sendBtn = screen.getByLabelText(/send/i);
    expect(sendBtn).toBeDisabled();

    const input = screen.getByPlaceholderText(/type your english/i);
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(sendBtn).toBeEnabled();
  });
});
