import React, { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../supabase-config';
import SoloChat from './SoloChat';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false); // Toggle between login and sign-up

    // Anonymous solo chat state
    const [chatMessages, setChatMessages] = useState([]);

    const [currentChatId, setCurrentChatId] = useState(null); // For SoloChat

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mainContent, setMainContent] = useState('chat'); // 'chat' | 'terms' | 'privacy'
    const [termsMarkdown, setTermsMarkdown] = useState('');
    const [privacyMarkdown, setPrivacyMarkdown] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    // Dynamic max height for markdown panels based on actual layout
    const docScrollRef = useRef(null);

    const showTerms = async (e) => {
        e.preventDefault();
        if (!termsMarkdown) {
            const res = await fetch('/terms-of-use.md');
            setTermsMarkdown(await res.text());
        }
        setMainContent('terms');
        closeSidebar();
    };
    const showPrivacy = async (e) => {
        e.preventDefault();
        if (!privacyMarkdown) {
            const res = await fetch('/privacy-policy.md');
            setPrivacyMarkdown(await res.text());
        }
        setMainContent('privacy');
        closeSidebar();
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

    // Anonymous solo chat functions
    const sendAnonymousMessage = async (messageText) => {
        if (!messageText.trim()) return;
        if (messageText.length > 2000) return; // client-side guard

        // Add user message to state immediately
        const userMessage = { role: 'user', content: messageText };
        setChatMessages(prev => [...prev, userMessage]);
        setIsThinking(true);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const res = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    chatId: chatId // null for first message, then set
                    // No userId for anonymous users
                }),
                signal: controller.signal
            });

            const data = await res.json();

            // If this was the first message, set the new chatId from backend
            if (!chatId && data.chatId) {
                setChatId(data.chatId);
            }

            // Add AI response to state (avoid rendering backend error text)
            const aiMessage = {
                role: 'assistant',
                content: typeof data.reply === 'string' ? data.reply : ''
            };
            setChatMessages(prev => [...prev, aiMessage]);
            clearTimeout(timeoutId);
            setIsThinking(false);
        } catch (error) {
            const errorMessage = { role: 'assistant', content: 'Error: Failed to send message. メッセージが送信できませんでした🤦‍♂️' };
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
        <div className="chatapp-root">
            {/* Sidebar overlay for mobile */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={closeSidebar}
            />
            <div className="login-topbar">
                <div className="you-can-log-in-here">🤗 You can log in here →</div>
                {/* Login menu button */}
                <button
                    className="login-menu-btn"
                    onClick={toggleSidebar}
                    aria-label="Open menu"
                >
                    <div>Log in</div>
                </button>
            </div>

            <div className="chatapp-mainarea">
                {/* Sidebar with login */}
                <div>
                    <div className={`login-container${sidebarOpen ? ' open' : ''}`}>
                        <div
                            className="login-message"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message) }}
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

                {/* Main content area: solo chat or policy docs */}
                <div className="flex-1">
                    {mainContent === 'chat' && (
                        <SoloChat currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} />
                    )}
                    {mainContent === 'terms' && (
                        <div className="doc-container">
                            <button onClick={showChat} className="doc-close">Close</button>
                            <div
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
                                className="doc-scroll"
                                ref={docScrollRef}
                            >
                                <ReactMarkdown>{privacyMarkdown}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
