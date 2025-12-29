import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Chat from '../src/react/components/Chat';

// ↓ this is not a comment, just to set the environment
// @vitest-environment jsdom

describe('Chat component', () => {
  it('renders chat input', () => {
    render(<Chat messages={[]} onSendMessage={() => {}} />);
    const input = screen.getByPlaceholderText(/type your english/i);
    expect(input).not.toBeNull();
    expect(input).toBeInstanceOf(HTMLElement);
  });
});
