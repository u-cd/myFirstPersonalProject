import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../supabase-config';
import Chat from './Chat';
import { v4 as uuidv4 } from 'uuid';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);

    // Anonymous chat state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatId] = useState(() => uuidv4());
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mainContent, setMainContent] = useState('chat'); // 'chat' | 'terms' | 'privacy'
    const [termsMarkdown, setTermsMarkdown] = useState('');
    const [privacyMarkdown, setPrivacyMarkdown] = useState('');

    // Dynamic max height for markdown panels based on actual layout
    const docScrollRef = useRef(null);
    const [docMaxHeight, setDocMaxHeight] = useState(undefined);

    useEffect(() => {
        const updateMaxHeight = () => {
            if (!docScrollRef.current) return;
            const rect = docScrollRef.current.getBoundingClientRect();
            // Leave a small bottom gap to avoid touching screen edges
            const bottomGap = 12;
            const available = Math.max(0, window.innerHeight - rect.top - bottomGap);
            setDocMaxHeight(available);
        };

        // Run on mount and when content/view changes
        const raf = requestAnimationFrame(updateMaxHeight);
        window.addEventListener('resize', updateMaxHeight);
        window.addEventListener('orientationchange', updateMaxHeight);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', updateMaxHeight);
            window.removeEventListener('orientationchange', updateMaxHeight);
        };
    }, [mainContent, termsMarkdown, privacyMarkdown]);

    const showTerms = async (e) => {
        e.preventDefault();
        if (!termsMarkdown) {
            const res = await fetch('/terms-of-use.md');
            setTermsMarkdown(await res.text());
        }
        setMainContent('terms');
    };
    const showPrivacy = async (e) => {
        e.preventDefault();
        if (!privacyMarkdown) {
            const res = await fetch('/privacy-policy.md');
            setPrivacyMarkdown(await res.text());
        }
        setMainContent('privacy');
    };
    const showChat = (e) => {
        if (e) e.preventDefault();
        setMainContent('chat');
    };

    const signInWithGoogle = async () => {
        if (!agreed) {
            setMessage('You must agree to the Terms of Use and Privacy Policy before logging in.<br>ログインする前に利用規約とプライバシーポリシーに同意してください。');
            return;
        }
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
        if (!agreed) {
            setMessage('You must agree to the Terms of Use and Privacy Policy before logging in.<br>ログインする前に利用規約とプライバシーポリシーに同意してください。');
            return;
        }

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

        // Use EC2 public IP for backend API when running in emulator or on device
        // 問題の部分 API がモバイルアプリ側からどうなるのかよくわからない
        const API_BASE = 'http://52.194.251.155:3000';

        try {
            const res = await fetch(`${API_BASE}/`, {
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
                        <div
                            className="login-message"
                            dangerouslySetInnerHTML={{ __html: message }}
                        />

                        <h2>Log in or Sign up</h2>

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

                        <div style={{ margin: '12px 0 8px 0', fontSize: '0.95em' }}>
                            <input
                                type="checkbox"
                                id="agreePolicies"
                                checked={agreed}
                                onChange={e => setAgreed(e.target.checked)}
                                required
                                style={{ marginRight: '6px' }}
                            />
                            <label htmlFor="agreePolicies">
                                I agree to the
                                <a href="#terms" onClick={showTerms} style={{ margin: '0 4px', cursor: 'pointer', textDecoration: 'underline' }}>Terms of Use</a>
                                and
                                <a href="#privacy" onClick={showPrivacy} style={{ margin: '0 4px', cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</a>
                                .<br />
                                <span style={{ fontSize: '0.92em', color: '#555' }}>
                                    （利用規約およびプライバシーポリシーに同意します）
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content area: chat or policy docs */}
            <div className="main-content">
                {/* Mobile menu button */}
                <button
                    className="login-menu-btn"
                    onClick={toggleSidebar}
                    aria-label="Open menu"
                >
                    <div>Log in</div>
                </button>

                {mainContent === 'chat' && (
                    <Chat
                        messages={chatMessages}
                        onSendMessage={sendAnonymousMessage}
                        currentChatId={chatId}
                    />
                )}
                {mainContent === 'terms' && (
                    <div className="doc-container">
                        <button onClick={showChat} className="doc-close">Close</button>
                        <div
                            style={{ maxHeight: docMaxHeight ? `${docMaxHeight}px` : undefined }}
                            className="doc-scroll"
                            ref={docScrollRef}
                        >
                            <ReactMarkdown>{termsMarkdown}</ReactMarkdown>
                        </div>
                    </div>
                )}
                {mainContent === 'privacy' && (
                    <div className="doc-container">
                        <button onClick={showChat} className="doc-close">Close</button>
                        <div
                            style={{ maxHeight: docMaxHeight ? `${docMaxHeight}px` : undefined }}
                            className="doc-scroll"
                            ref={docScrollRef}
                        >
                            <ReactMarkdown>{privacyMarkdown}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
