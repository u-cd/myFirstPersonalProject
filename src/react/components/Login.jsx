import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../supabase-config';
import Chat from './Chat';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false); // Toggle between login and sign-up

    // Anonymous chat state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatId, setChatId] = useState(null); // Start as null, set after first message
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mainContent, setMainContent] = useState('chat'); // 'chat' | 'terms' | 'privacy'
    const [termsMarkdown, setTermsMarkdown] = useState('');
    const [privacyMarkdown, setPrivacyMarkdown] = useState('');
    const [isThinking, setIsThinking] = useState(false);

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
        // Only require agreement for sign up, not login
        if (isSignUp && !agreed) {
            setMessage('You must agree to the Terms of Use and Privacy Policy before signing up.<br>サインアップする前に利用規約とプライバシーポリシーに同意してください。');
            return;
        }
        setLoading(true);
        try {
            const isLocalhost = window.location.hostname === 'localhost';
            const redirectUrl = isLocalhost
                ? 'http://localhost:3000'
                : 'https://aigooooo.com';

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectUrl }
            });

            if (error) {
                setMessage('Google login failed.<br>Googleログインに失敗しました。');
            }
        } catch (error) {
            setMessage('Google login failed.<br>Googleログインに失敗しました。');
        }
        setLoading(false);
    };

    const signInOrSignUpWithEmail = async (e) => {
        e.preventDefault();
        if (!email || !password) return;
        if (isSignUp && !agreed) {
            setMessage('You must agree to the Terms of Use and Privacy Policy before signing up.<br>サインアップする前に利用規約とプライバシーポリシーに同意してください。');
            return;
        }
        if (isSignUp && password.length < 6) {
            setMessage('Password must be at least 6 characters.<br>パスワードは6文字以上である必要があります。');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                // Sign up flow
                const isLocalhost = window.location.hostname === 'localhost';
                const redirectUrl = isLocalhost
                    ? 'http://localhost:3000'
                    : 'https://aigooooo.com';
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: redirectUrl
                    }
                });
                if (error) {
                    setMessage('サインアップに失敗しました。メールアドレスとパスワードを確認してください。メールアドレスをすでに登録済みの場合はログインしてください。');
                } else {
                    setMessage('確認メールを送信しました。メールが見つからない場合は迷惑メールフォルダもあわせてご確認ください。');
                }
            } else {
                // Login flow
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) {
                    setMessage('Login failed. Please check your email and password.<br>ログインに失敗しました。メールアドレスとパスワードを確認してください。<br><span id="forgot-password-link" style="color:#1976d2;cursor:pointer;text-decoration:underline;">パスワードを覚えてないですか？</span>');
                } else {
                    setMessage('Login successful! ログイン成功！');
                }
            }
        } catch (error) {
            setMessage((isSignUp ? 'Sign up' : 'Login') + ' failed. Please try again.<br>' + (isSignUp ? 'サインアップ' : 'ログイン') + 'に失敗しました。');
        }
        setLoading(false);
    };

    // Magic link state
    const [showMagicForm, setShowMagicForm] = useState(false);

    // Listen for forgot password link click
    useEffect(() => {
        const handler = (e) => {
            if (e.target && e.target.id === 'forgot-password-link') {
                setShowMagicForm(true);
                setEmail(email);
                setMessage('メールアドレスを入力して、"Send magic link" をクリックしてください。');
            }
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [email]);

    // Handle password reset request
    const handleSendMagicLink = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!email) {
            setMessage('Please enter your email.');
            return;
        }
        // Send magic link (sign-in link) instead of password reset
        const isLocalhost = window.location.hostname === 'localhost';
        const redirectUrl = isLocalhost
            ? 'http://localhost:3000'
            : 'https://aigooooo.com';
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: redirectUrl
            }
        });
        if (error) {
            setMessage('Failed to send magic link. メールの送信に失敗しました。');
        } else {
            setMessage('Magic link sent!! メールを送信しました。記載されているリンクからログインしてください。');
        }
    };

    // Anonymous chat functions
    const sendAnonymousMessage = async (messageText) => {
        if (!messageText.trim()) return;

        // Add user message to state immediately
        const userMessage = { role: 'user', content: messageText };
        setChatMessages(prev => [...prev, userMessage]);
        setIsThinking(true);

        try {
            const res = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    chatId: chatId // null for first message, then set
                    // No userId for anonymous users
                })
            });

            const data = await res.json();

            // If this was the first message, set the new chatId from backend
            if (!chatId && data.chatId) {
                setChatId(data.chatId);
            }

            // Add AI response to state
            const aiMessage = { role: 'assistant', content: data.reply || data.error };
            setChatMessages(prev => [...prev, aiMessage]);
            setIsThinking(false);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = { role: 'assistant', content: 'Error: Failed to send message' };
            setChatMessages(prev => [...prev, errorMessage]);
            setIsThinking(false);
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

                        <h2>{isSignUp ? 'Sign up' : 'Log in'}</h2>

                        <button
                            className="google-login"
                            onClick={signInWithGoogle}
                            disabled={loading}
                        >
                            <img
                                src="/google-color-svgrepo-com.svg"
                                alt="Google"
                                style={{ width: '20px', verticalAlign: 'middle', marginRight: '8px' }}
                            />
                            {loading ? 'Logging in...' : 'Continue with Google'}
                        </button>

                        <div className="login-or">or</div>

                        {!showMagicForm ? (
                            <form className="login-form" onSubmit={signInOrSignUpWithEmail}>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                                <button type="submit" disabled={loading || !email || !password}>
                                    {loading ? (isSignUp ? 'Signing up...' : 'Logging in...') : (isSignUp ? 'Sign up' : 'Continue')}
                                </button>
                            </form>
                        ) : (
                            <>
                                <form className="login-form" onSubmit={handleSendMagicLink}>
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                    />
                                    <button type="submit">Send magic link</button>
                                </form>
                                <button type="button" className="toggle-auth-mode" onClick={() => { setShowMagicForm(false); setMessage('') }}>Back to login</button>
                            </>
                        )}

                        {isSignUp && (
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
                                    <a href="#terms" onClick={showTerms} className="login-link">Terms of Use</a>
                                    and
                                    <a href="#privacy" onClick={showPrivacy} className="login-link">Privacy Policy</a>
                                    .<br />
                                    <span className="agreement-note">
                                        （利用規約およびプライバシーポリシーに同意します）
                                    </span>
                                </label>
                            </div>
                        )}

                        <div className="toggle-auth-container">
                            {isSignUp ? (
                                <>
                                    Already have an account?（すでにアカウントをお持ちですか？）{' '}
                                    <button
                                        type="button"
                                        className="toggle-auth-mode login-link"
                                        onClick={() => { setIsSignUp(false); setShowMagicForm(false); setMessage(''); }}
                                        disabled={loading}
                                    >
                                        Log in
                                    </button>
                                </>
                            ) : (
                                <>
                                    Don&apos;t have an account?（アカウントをお持ちでないですか？）{' '}
                                    <button
                                        type="button"
                                        className="toggle-auth-mode login-link"
                                        onClick={() => { setIsSignUp(true); setShowMagicForm(false); setMessage(''); }}
                                        disabled={loading}
                                    >
                                        Sign up（新規登録）
                                    </button>
                                </>
                            )}
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
                        isThinking={isThinking}
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
