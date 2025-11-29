import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase-config';
import Sidebar from './Sidebar';
import Chat from './Chat';
import { v4 as uuidv4 } from 'uuid';

export default function ChatApp({ user }) {
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.body.getAttribute('data-theme') === 'dark';
        }
        return false;
    });

    useEffect(() => {
        document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const toggleDarkMode = () => setDarkMode((v) => !v);

    useEffect(() => {
        initializeApp();
    }, [user]);

    const initializeApp = async () => {
        await loadChats();
        // Start with a new chat
        startNewChat();
        setLoading(false);
    };

    const loadChats = async () => {
        try {
            const res = await fetch(`/chats-with-last-date-and-title?userId=${encodeURIComponent(user.id)}`);
            const data = await res.json();

            if (data.chats) {
                setChats(data.chats);
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    };

    const startNewChat = () => {
        const newChatId = uuidv4();
        setCurrentChatId(newChatId);
        setMessages([]);
    };

    const loadChatHistory = async (chatId) => {
        try {
            const res = await fetch(`/chat-history?chatId=${chatId}&userId=${encodeURIComponent(user.id)}`);
            const data = await res.json();

            if (data.messages) {
                setMessages(data.messages);
                setCurrentChatId(chatId);
                setSidebarOpen(false); // Close mobile sidebar after selecting a chat
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    };

    const sendMessage = async (messageText) => {
        if (!messageText.trim() || !currentChatId) return;

        // Add user message to state immediately
        const userMessage = { role: 'user', content: messageText };
        setMessages(prev => [...prev, userMessage]);
        setIsThinking(true);

        try {
            const res = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    chatId: currentChatId,
                    userId: user.id
                })
            });

            const data = await res.json();

            // Add AI response to state
            const aiMessage = { role: 'assistant', content: data.reply || data.error };
            setMessages(prev => [...prev, aiMessage]);
            setIsThinking(false);

            // Refresh chats list to update with new chat if this was the first message
            await loadChats();
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = { role: 'assistant', content: 'Error: Failed to send message' };
            setMessages(prev => [...prev, errorMessage]);
            setIsThinking(false);
        }
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
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
            <div className="main-content" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <>
            <Sidebar
                user={user}
                chats={chats}
                currentChatId={currentChatId}
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
                {/* Dark mode toggle button */}
                <button
                    style={{ position: 'fixed', top: 12, right: 12, zIndex: 1001, background: '#222', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 16px', cursor: 'pointer', fontSize: '1em', opacity: 0.85 }}
                    onClick={toggleDarkMode}
                    aria-label="Toggle dark mode"
                >
                    {darkMode ? '🌙 Dark' : '☀️ Light'}
                </button>

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
                    currentChatId={currentChatId}
                    isThinking={isThinking}
                />
            </div>
        </>
    );
}
