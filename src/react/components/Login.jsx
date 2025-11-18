import React, { useState } from 'react';
import { supabase } from '../supabase-config';
import Chat from './Chat';
import { v4 as uuidv4 } from 'uuid';

export default function Login() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Anonymous chat state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatId] = useState(() => uuidv4());
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const signInWithGoogle = async () => {
        setLoading(true);
        try {
            const isLocalhost = window.location.hostname === 'localhost';
            const redirectUrl = isLocalhost
                ? 'http://localhost:3000'
                : 'https://aigooooo.com';
            console.log('redirectUrl: ', redirectUrl);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectUrl }
            });

            if (error) {
                setMessage('Google login failed.<br>Googleログインに失敗しました。');
                console.log('Google login error:', error);
            }
        } catch (error) {
            setMessage('Google login failed.<br>Googleログインに失敗しました。');
            console.log('Google login error:', error);
        }
        setLoading(false);
    };

    const signInWithEmail = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            const isLocalhost = window.location.hostname === 'localhost';
            const redirectUrl = isLocalhost
                ? 'http://localhost:3000'  // Vite dev server port
                : 'https://aigooooo.com';

            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { redirectTo: redirectUrl }
            });

            if (error) {
                setMessage('Failed to send sign-in link.<br>サインインリンクの送信に失敗しました。');
                console.log('Supabase sign-in error:', error);
            } else {
                setMessage('Sign-in link sent! Check your email. If you do not see it, it may be in your spam folder.<br>サインインリンクを送信しました。メールが届かない場合は、迷惑フォルダもご確認ください。');
            }
        } catch (error) {
            setMessage('Failed to send sign-in link.<br>サインインリンクの送信に失敗しました。');
            console.log('Supabase sign-in error:', error);
        }
        setLoading(false);
    };

    // Anonymous chat functions
    const sendAnonymousMessage = async (messageText) => {
        if (!messageText.trim() || !chatId) return;

        // Add user message to state immediately
        const userMessage = { role: 'user', content: messageText };
        setChatMessages(prev => [...prev, userMessage]);

        try {
            const res = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    chatId: chatId
                    // No userId for anonymous users
                })
            });

            const data = await res.json();

            // Add AI response to state
            const aiMessage = { role: 'assistant', content: data.reply || data.error };
            setChatMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = { role: 'assistant', content: 'Error: Failed to send message' };
            setChatMessages(prev => [...prev, errorMessage]);
        }
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <>
            {/* Sidebar overlay for mobile */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={closeSidebar}
            />

            {/* Sidebar with login */}
            <div id="sidebar">
                <div className={`sidebar-content-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
                    <div className="login-container">
                        <h2>Log in or sign up</h2>

                        <button
                            className="google-login"
                            onClick={signInWithGoogle}
                            disabled={loading}
                        >
                            <img
                                src="https://www.svgrepo.com/show/475656/google-color.svg"
                                alt="Google"
                                style={{ width: '20px', verticalAlign: 'middle', marginRight: '8px' }}
                            />
                            {loading ? 'Signing in...' : 'Continue with Google'}
                        </button>

                        <div className="login-or">or</div>

                        <form className="login-form" onSubmit={signInWithEmail}>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                            />
                            <button type="submit" disabled={loading || !email}>
                                {loading ? 'Sending...' : 'Continue with email'}
                            </button>
                        </form>

                        <div
                            className="login-message"
                            dangerouslySetInnerHTML={{ __html: message }}
                        />
                    </div>
                </div>
            </div>

            {/* Main content with anonymous chat */}
            <div className="main-content">
                {/* Mobile menu button */}
                <button
                    className="mobile-menu-btn"
                    onClick={toggleSidebar}
                    aria-label="Open menu"
                >
                    <div>Log in</div>
                </button>

                {/* Anonymous chat using Chat component */}
                <Chat
                    messages={chatMessages}
                    onSendMessage={sendAnonymousMessage}
                    currentChatId={chatId}
                />
            </div>
        </>
    );
}
