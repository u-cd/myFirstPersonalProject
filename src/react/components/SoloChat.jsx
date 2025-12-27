import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase-config';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Tooltip from './Tooltip';

function useDebouncedEffect(effect, deps, delay) {
    useEffect(() => {
        const handler = setTimeout(() => effect(), delay);
        return () => clearTimeout(handler);
    }, [...(deps || []), delay]);
}

export default function SoloChat({ user, currentChatId, setCurrentChatId }) {
    const [messages, setMessages] = useState([]);

    const [welcomeMessage, setWelcomeMessage] = useState('');
    // Load welcome message markdown from public folder
    useEffect(() => {
        if (messages.length === 0) {
            fetch('/welcom-message.md')
                .then(res => res.ok ? res.text() : '')
                .then(md => setWelcomeMessage(md))
                .catch(() => setWelcomeMessage(''));
        }
    }, [messages.length]);

    const [loading, setLoading] = useState(true);
    const [isThinking, setIsThinking] = useState(false);
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
    const [suggestionsEnabled, setSuggestionsEnabled] = useState(() => {
        const saved = localStorage.getItem('writingSuggestionsEnabled');
        return saved === null ? true : saved === 'true';
    });
    const inputRef = useRef(null);
    const chatRef = useRef(null);

    // Only fetch history if user is defined
    useEffect(() => {
        if (user && currentChatId) {
            fetchMessages(currentChatId);
        } else {
            setMessages([]);
        }
    }, [user, currentChatId]);

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async (chatId) => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
            const res = await fetch(`/chat-history?chatId=${chatId}&userId=${encodeURIComponent(user.id)}`, {
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
            });
            const data = await res.json();
            if (data.messages) setMessages(data.messages);
            else setMessages([]);
        } catch (e) {
            setMessages([]);
        }
        setLoading(false);
    };

    useDebouncedEffect(() => {
        if (!suggestionsEnabled) {
            setSuggestions([]);
            setShowSuggestions(false);
            setSelectedSuggestion(-1);
            return;
        }
        if (!input.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            setSelectedSuggestion(-1);
            return;
        }
        if (input.length > 2000) {
            setSuggestions([]);
            setShowSuggestions(false);
            setSelectedSuggestion(-1);
            return;
        }
        let context = '';
        if (messages && messages.length > 0) {
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'llm' || messages[i].role === 'assistant') {
                    context = messages[i].content;
                    break;
                }
            }
        }
        let ignore = false;
        setIsLoadingSuggestions(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        fetch('/writing-suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ context, input }),
            signal: controller.signal,
        })
            .then(res => res.json())
            .then(data => {
                if (!ignore) {
                    setSuggestions(data.suggestions || []);
                    setShowSuggestions(true);
                    setSelectedSuggestion(-1);
                }
            })
            .catch(() => {
                if (!ignore) setSuggestions([]);
            })
            .finally(() => {
                clearTimeout(timeoutId);
                if (!ignore) setIsLoadingSuggestions(false);
            });
        return () => { ignore = true; clearTimeout(timeoutId); controller.abort(); };
    }, [input, messages, suggestionsEnabled], 1500);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const messageText = input.trim();
        if (!messageText) return;
        if (messageText.length > 2000) return;
        setMessages(prev => [...prev, { role: 'user', content: messageText }]);
        setIsThinking(true);
        setInput('');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const body = user
                ? { message: messageText, currentChatId, userId: user.id }
                : { message: messageText, currentChatId };
            const res = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            const data = await res.json();
            if (!currentChatId && data.chatId) {
                setCurrentChatId(data.chatId);
            }
            const aiMessage = {
                role: 'assistant',
                content: typeof data.reply === 'string' ? data.reply : ''
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsThinking(false);
            clearTimeout(timeoutId);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to send message🤦‍♂️' }]);
            setIsThinking(false);
        }
    };

    const handleKeyDown = (e) => {
        if (showSuggestions && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestion(s => Math.min(suggestions.length - 1, s + 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestion(s => Math.max(0, s - 1));
            } else if (e.key === 'Tab') {
                if (selectedSuggestion >= 0 && selectedSuggestion < suggestions.length) {
                    e.preventDefault();
                    const needsSpace = input && !input.endsWith(' ');
                    const suggestionText = (needsSpace ? ' ' : '') + suggestions[selectedSuggestion].replace(input, '');
                    setInput(input + suggestionText);
                    setShowSuggestions(false);
                    setSuggestions([]);
                    setSelectedSuggestion(-1);
                }
            } else if (e.key === 'Enter' && !e.shiftKey) {
                if (selectedSuggestion >= 0 && selectedSuggestion < suggestions.length) {
                    e.preventDefault();
                    const needsSpace = input && !input.endsWith(' ');
                    const suggestionText = (needsSpace ? ' ' : '') + suggestions[selectedSuggestion].replace(input, '');
                    setInput(input + suggestionText);
                    setShowSuggestions(false);
                    setSuggestions([]);
                    setSelectedSuggestion(-1);
                } else {
                    e.preventDefault();
                    handleSubmit(e);
                }
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleToggleSuggestions = () => {
        setSuggestionsEnabled(prev => {
            localStorage.setItem('writingSuggestionsEnabled', !prev);
            return !prev;
        });
    };

    return (
        <div className="chat" ref={chatRef}>
            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="welcome-message">
                        {welcomeMessage && (
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(welcomeMessage)) }} />
                        )}
                    </div>
                ) : (
                    messages.map((message, index) => {
                        if (message.role === 'user') {
                            return (
                                <div
                                    key={index}
                                    className="bubble user"
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.content.replace(/\n/g, '<br>')) }}
                                />
                            );
                        }
                        const rawHtml = marked.parse(message.content);
                        const sanitizedHtml = DOMPurify.sanitize(rawHtml);
                        if (sanitizedHtml.includes('<pre><code')) {
                            const parser = new window.DOMParser();
                            const doc = parser.parseFromString(`<div>${sanitizedHtml}</div>`, 'text/html');
                            const children = Array.from(doc.body.firstChild.childNodes);
                            return (
                                <div key={index} className="bubble llm">
                                    {children.map((node, i) => {
                                        if (node.nodeName === 'PRE') {
                                            return (
                                                <pre key={i} className="chat-code-block">
                                                    <code>{node.textContent}</code>
                                                </pre>
                                            );
                                        } else {
                                            return (
                                                <span key={i} dangerouslySetInnerHTML={{ __html: node.outerHTML || node.textContent }} />
                                            );
                                        }
                                    })}
                                </div>
                            );
                        }
                        return (
                            <div
                                key={index}
                                className="bubble llm"
                                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                            />
                        );
                    })
                )}
                {isThinking && (
                    <div className="bubble llm thinking">
                        <span className="thinking-emoji" role="img" aria-label="thinking">🤔</span>
                    </div>
                )}
            </div>
            <form className="chat-form" onSubmit={handleSubmit}>
                <textarea
                    className="chat-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your English..."
                    rows={1}
                    style={{ resize: 'none', overflow: 'hidden' }}
                    ref={el => {
                        if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                        }
                        inputRef.current = el;
                    }}
                    autoComplete="off"
                />
                <Tooltip text={suggestionsEnabled ? 'Turn off writing suggestions' : 'Turn on writing suggestions'} position="top">
                    <button
                        type="button"
                        onClick={handleToggleSuggestions}
                        className={`suggestions-toggle-btn${suggestionsEnabled ? ' enabled' : ' disabled'}`}
                        aria-pressed={suggestionsEnabled}
                        aria-label={suggestionsEnabled ? 'Disable writing suggestions' : 'Enable writing suggestions'}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="22" height="22" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                            <path d="M9 18h6" />
                            <path d="M10 22h4" />
                            <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.5 4.5-3.5 5.5a2 2 0 0 1-1.5 1.5v2h-4v-2a2 2 0 0 1-1.5-1.5C6.5 13.5 5 11.5 5 9a7 7 0 0 1 7-7z" />
                        </svg>
                    </button>
                </Tooltip>
                {showSuggestions && suggestions.length > 0 && (
                    <ul className="chat-suggestions">
                        {isLoadingSuggestions ? (
                            <li className="suggestion loading">Thinking next phrase...</li>
                        ) : (
                            suggestions.map((s, i) => (
                                <li
                                    key={i}
                                    className={`suggestion${selectedSuggestion === i ? ' selected' : ''}`}
                                    onMouseDown={e => {
                                        e.preventDefault();
                                        const needsSpace = input && !input.endsWith(' ');
                                        const suggestionText = (needsSpace ? ' ' : '') + s.replace(input, '');
                                        setInput(input + suggestionText);
                                        setShowSuggestions(false);
                                        setSuggestions([]);
                                        setSelectedSuggestion(-1);
                                        if (inputRef.current) inputRef.current.focus();
                                    }}
                                >{s}</li>
                            ))
                        )}
                    </ul>
                )}
                <button
                    type="submit"
                    className="send-btn"
                    disabled={!input.trim()}
                    aria-label="Send"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="var(--send-btn-stroke, #222)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        </div>
    );
}
