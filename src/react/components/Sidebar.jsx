import React, { useState } from 'react';

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
    const [showLogout, setShowLogout] = useState(false);

    const handleNewChat = () => {
        onNewChat();
        onClose(); // Close mobile sidebar after starting new chat
    };

    const handleChatSelect = (chatId) => {
        onChatSelect(chatId);
    };

    const handleUserAccountClick = () => {
        setShowLogout(!showLogout);
    };

    const handleSignOut = async () => {
        await onSignOut();
        setShowLogout(false);
    };

    return (
        <div className={`sidebar-content-wrapper ${isOpen ? 'sidebar-open' : ''}`}>
            <div className="sidebar-fixed-top">
                <button className="sidebar-new-chat" onClick={handleNewChat}>
                    <span className="sidebar-new-chat-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
                            style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                            <rect x="9" y="4" width="2" height="12" rx="1" fill="#666" />
                            <rect x="4" y="9" width="12" height="2" rx="1" fill="#666" />
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
                            key={chat.chatId}
                            className="sidebar-chat-link"
                            onClick={() => handleChatSelect(chat.chatId)}
                        >
                            {linkText}
                        </button>
                    );
                })}
            </div>

            <div className="sidebar-user-account" onClick={handleUserAccountClick}>
                {user.email || 'No email'}
            </div>

            {showLogout && (
                <button
                    className="sidebar-logout-btn"
                    onClick={handleSignOut}
                    style={{
                        position: 'absolute',
                        bottom: '60px',
                        left: '0',
                        right: '0',
                        zIndex: 1001
                    }}
                >
                    Log out
                </button>
            )}
        </div>
    );
}
