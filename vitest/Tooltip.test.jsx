// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import Tooltip from '../src/react/components/Tooltip.jsx';

describe('Tooltip UI behavior', () => {
  it('shows tooltip text on hover and hides on mouse leave', () => {
    render(
      <Tooltip text="Hello tooltip">
        <button>Target</button>
      </Tooltip>
    );

    expect(screen.queryByText('Hello tooltip')).not.toBeInTheDocument();

    const wrapper = screen.getByText('Target').closest('.custom-tooltip-wrapper');
    expect(wrapper).toBeTruthy();

    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText('Hello tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText('Hello tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on focus and hides on blur', () => {
    render(
      <Tooltip text="Focus tooltip">
        <button>Target</button>
      </Tooltip>
    );

    const wrapper = screen.getByText('Target').closest('.custom-tooltip-wrapper');
    expect(wrapper).toBeTruthy();

    fireEvent.focus(wrapper);
    expect(screen.getByText('Focus tooltip')).toBeInTheDocument();

    fireEvent.blur(wrapper);
    expect(screen.queryByText('Focus tooltip')).not.toBeInTheDocument();
  });
});
