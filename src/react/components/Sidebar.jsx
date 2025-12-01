import React, { useState, useRef, useEffect } from 'react';

export default function Sidebar({
    user,
    chats,
    currentChatId,
    onNewChat,
    onChatSelect,
    onSignOut,
    isOpen,
    onClose
}) {
    // Dark mode state and persistence
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('darkMode');
            if (stored !== null) return stored === 'true';
            return document.body.getAttribute('data-theme') === 'dark';
        }
        return false;
    });

    useEffect(() => {
        document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    const toggleDarkMode = () => setDarkMode(v => !v);
    const [showAccountActions, setShowAccountActions] = useState(false);
    const userAccountRef = useRef(null);
    const accountActionsRef = useRef(null);

    const handleNewChat = () => {
        onNewChat();
        onClose(); // Close mobile sidebar after starting new chat
    };

    const handleChatSelect = (chatId) => {
        onChatSelect(chatId);
    };

    const handleUserAccountClick = (e) => {
        e.stopPropagation();
        setShowAccountActions((prev) => !prev);
    };

    // Hide account actions when clicking outside
    useEffect(() => {
        if (!showAccountActions) return;
        const handleClickOutside = (event) => {
            const userAccount = userAccountRef.current;
            const accountActions = accountActionsRef.current;
            if (
                userAccount && !userAccount.contains(event.target) &&
                accountActions && !accountActions.contains(event.target)
            ) {
                setShowAccountActions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAccountActions]);

    const handleSignOut = async () => {
        await onSignOut();
        setShowAccountActions(false);
    };

    return (
        <div className={`sidebar-content-wrapper ${isOpen ? 'sidebar-open' : ''}`}>
            <div className="sidebar-fixed-top">
                <button className="sidebar-new-chat" onClick={handleNewChat}>
                    <span className="sidebar-new-chat-icon" aria-hidden="true">
                        <svg
                            width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
                            style={{ verticalAlign: 'middle', marginRight: '8px' }}
                        >
                            <rect x="9" y="4" width="2" height="12" rx="1" fill="var(--sidebar-newchat-fill, #666)" />
                            <rect x="4" y="9" width="12" height="2" rx="1" fill="var(--sidebar-newchat-fill, #666)" />
                        </svg>
                    </span>
                    New chat
                </button>
                <div className="sidebar-chats-header">Chats</div>
            </div>

            <div className="sidebar-content">
                {chats.map(chat => {
                    const linkText = chat.title && chat.title.trim() ? chat.title.trim() : 'Untitled chat';
                    return (
                        <button
                            key={chat._id}
                            className="sidebar-chat-link"
                            onClick={() => handleChatSelect(chat._id)}
                        >
                            {linkText}
                        </button>
                    );
                })}
            </div>

            {showAccountActions && (
                <div className="sidebar-account-actions" ref={accountActionsRef}>
                    <button
                        className="sidebar-darkmode-toggle"
                        onClick={toggleDarkMode}
                        aria-label="Toggle dark mode"
                    >
                        {darkMode ? (
                            <>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                                    <path d="M15.5 13.5A7 7 0 0 1 6.5 4.5a6.5 6.5 0 1 0 9 9z" fill="#ffffffff" />
                                </svg>
                                Dark mode
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                                    <circle cx="10" cy="10" r="5" fill="#444" />
                                    <g stroke="#444" strokeWidth="2">
                                        <line x1="10" y1="1" x2="10" y2="4" />
                                        <line x1="10" y1="16" x2="10" y2="19" />
                                        <line x1="1" y1="10" x2="4" y2="10" />
                                        <line x1="16" y1="10" x2="19" y2="10" />
                                        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
                                        <line x1="13.66" y1="13.66" x2="15.78" y2="15.78" />
                                        <line x1="4.22" y1="15.78" x2="6.34" y2="13.66" />
                                        <line x1="13.66" y1="6.34" x2="15.78" y2="4.22" />
                                    </g>
                                </svg>
                                Light mode
                            </>
                        )}
                    </button>
                    <button
                        className="sidebar-logout-btn"
                        onClick={handleSignOut}
                    >
                        Log out
                    </button>
                </div>
            )}

            <div
                className="sidebar-user-account"
                onClick={handleUserAccountClick}
                ref={userAccountRef}
            >
                {user.email || 'No email'}
            </div>
        </div>
    );
}
