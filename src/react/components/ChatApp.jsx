import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase-config';
import Sidebar from './Sidebar';
import Chat from './Chat';
// import { v4 as uuidv4 } from 'uuid'; deleted when chat collection created

export default function ChatApp({ user }) {
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isThinking, setIsThinking] = useState(false);

    useEffect(() => {
        initializeApp();
    }, [user]);

    const initializeApp = async () => {
        await loadChats();
        // Do not set chatId on load; wait for user to send first message
        setCurrentChatId(null);
        setMessages([]);
        setLoading(false);
    };

    const loadChats = async () => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
            const res = await fetch(`/chats-with-title?userId=${encodeURIComponent(user.id)}`, {
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
            });
            const data = await res.json();

            if (data.chats) {
                setChats(data.chats);
            }
        } catch (error) {
        }
    };

    const startNewChat = () => {
        setCurrentChatId(null);
        setMessages([]);
    };

    const loadChatHistory = async (chatId) => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
            const res = await fetch(`/chat-history?chatId=${chatId}&userId=${encodeURIComponent(user.id)}`, {
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
            });
            const data = await res.json();

            if (data.messages) {
                setMessages(data.messages);
                setCurrentChatId(chatId);
                setSidebarOpen(false); // Close mobile sidebar after selecting a chat
            }
        } catch (error) {
        }
    };

    const sendMessage = async (messageText) => {
        if (!messageText.trim()) return;
        if (messageText.length > 2000) return; // client-side guard

        // Add user message to state immediately
        const userMessage = { role: 'user', content: messageText };
        setMessages(prev => [...prev, userMessage]);
        setIsThinking(true);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const res = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    chatId: currentChatId,
                    userId: user.id
                }),
                signal: controller.signal
            });

            const data = await res.json();

            // If this was the first message, set the new chatId from backend
            if (!currentChatId && data.chatId) {
                setCurrentChatId(data.chatId);
            }

            // Add AI response to state (avoid rendering backend error text)
            const aiMessage = {
                role: 'assistant',
                content: typeof data.reply === 'string' ? data.reply : ''
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsThinking(false);

            // Refresh chats list to update with new chat if this was the first message
            await loadChats();
            clearTimeout(timeoutId);
        } catch (error) {
            const errorMessage = { role: 'assistant', content: 'Error: Failed to send message. メッセージが送信できませんでした🤦‍♂️' };
            setMessages(prev => [...prev, errorMessage]);
            setIsThinking(false);
            // ensure timer cleared
            // no-op if not set
        }
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
        }
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    if (loading) {
        return (
            <div className="main-content loading-screen">
                <div className="loading-text">Loading...</div>
            </div>
        );
    }

    return (
        <>
            <Sidebar
                user={user}
                chats={chats}
                onNewChat={startNewChat}
                onChatSelect={loadChatHistory}
                onSignOut={signOut}
                isOpen={sidebarOpen}
                onClose={closeSidebar}
            />

            {/* Mobile sidebar overlay */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={closeSidebar}
            />

            <div className="main-content">
                {/* Mobile menu button */}
                <button
                    className="mobile-menu-btn"
                    onClick={toggleSidebar}
                >
                    <div className="mobile-menu-content">☰</div>
                    {/* <div className="mobile-menu-content">🍔</div> */}
                </button>

                <Chat
                    messages={messages}
                    onSendMessage={sendMessage}
                    isThinking={isThinking}
                />
            </div>
        </>
    );
}
