import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase-config';

export default function SoloSidebar({ user, currentChatId, setCurrentChatId, sidebarOpen, closeSidebar }) {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChats();
    }, [user]);

    const fetchChats = async () => {
        setLoading(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
            const res = await fetch(`/chats-with-title?userId=${encodeURIComponent(user.id)}`, {
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
            });
            const data = await res.json();
            if (data.chats) setChats(data.chats);
        } catch (e) {
            setChats([]);
        }
        setLoading(false);
    };

    const handleNewChat = () => {
        setCurrentChatId(null);
        if (closeSidebar) closeSidebar();
    };

    const handleChatSelect = (chatId) => {
        setCurrentChatId(chatId);
        if (closeSidebar) closeSidebar();
    };

    return (
        <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
            <div className="sidebar-fixed-top">
                <button className="sidebar-new-chat" onClick={handleNewChat}>
                    <span className="sidebar-new-chat-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', marginRight: '8px' }}>
                            <rect x="9" y="4" width="2" height="12" rx="1" fill="var(--sidebar-newchat-fill, #666)" />
                            <rect x="4" y="9" width="12" height="2" rx="1" fill="var(--sidebar-newchat-fill, #666)" />
                        </svg>
                    </span>
                    New chat
                </button>
            </div>

            <div className="sidebar-chats-header">Chats</div>
            <div className="sidebar-content">
                {loading ? (
                    <div className="sidebar-loading">Loading chats...</div>
                ) : (
                    chats.map(chat => {
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
                    })
                )}
            </div>
        </div>
    );
}
