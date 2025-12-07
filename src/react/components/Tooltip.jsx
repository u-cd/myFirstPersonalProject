import React, { useState } from 'react';
import './Tooltip.css';

export default function Tooltip({ children, text, position = 'top' }) {
    const [visible, setVisible] = useState(false);
    return (
        <span
            className="custom-tooltip-wrapper"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
            tabIndex={0}
            style={{ display: 'inline-flex', position: 'relative' }}
        >
            {children}
            {visible && (
                <span className={`custom-tooltip custom-tooltip-${position}`}>{text}</span>
            )}
        </span>
    );
}
