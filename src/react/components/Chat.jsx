import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Tooltip from './Tooltip';

// Debounce hook
function useDebouncedEffect(effect, deps, delay) {
    useEffect(() => {
        const handler = setTimeout(() => effect(), delay);
        return () => clearTimeout(handler);
    }, [...(deps || []), delay]);
}

export default function Chat({ messages, onSendMessage, isThinking }) {
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
    const [suggestionsEnabled, setSuggestionsEnabled] = useState(() => {
        // Persist toggle in localStorage
        const saved = localStorage.getItem('writingSuggestionsEnabled');
        return saved === null ? true : saved === 'true';
    });
    const inputRef = useRef(null);
    const chatRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    // Debounced writing suggestions API call
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
        // Client-side input length guard (match backend ~2000)
        if (input.length > 2000) {
            setSuggestions([]);
            setShowSuggestions(false);
            setSelectedSuggestion(-1);
            return;
        }
        // Get last LLM message for context (as plain string, no role)
        let context = '';
        if (messages && messages.length > 0) {
            // Find last message from LLM/assistant
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === 'llm' || messages[i].role === 'assistant') {
                    context = messages[i].content;
                    break;
                }
            }
        }
        let ignore = false;
        setIsLoadingSuggestions(true);
        // Abort if taking too long
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

    const handleSubmit = (e) => {
        e.preventDefault();
        const messageText = input.trim();
        if (!messageText) return;
        // Client-side message length check
        if (messageText.length > 2000) {
            return;
        }

        onSendMessage(messageText);
        setInput('');
    };

    // select suggestions, send message by enter
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

    // Toggle handler
    const handleToggleSuggestions = () => {
        setSuggestionsEnabled(prev => {
            localStorage.setItem('writingSuggestionsEnabled', !prev);
            return !prev;
        });
    };

    return (
        <>
            <div ref={chatRef} className="chat">
                {(() => {
                    const helloMsg = {
                        role: 'llm',
                        content: [
                            '# Welcome to ai語!',
                            'This is an **AI English conversation tutor**.',
                            '',
                            'Originally, this app was created by the developer for my own English learning.',
                            'The goal is to help you study real, natural English easily and comfortably.',
                            '',
                            'このアプリは **AI英会話シミュレーター** です。🤖🇬🇧',
                            '',
                            '### I will help you improve your English!',
                            '',
                            '- 下の入力欄にメッセージを入力して、英語学習を始めましょう！👇💬✍️',
                            '- 英語で書いてみましょう！📝（日本語まじりでもOKです😊）例: "Hello! 今日の天気はどうですか？"🌤️',
                            '- 分からないことがあれば、いつでも質問してください！❓🙋‍♂️🙋‍♀️',
                            '',
                            '---',
                            '',
                            "**Let's get started!** 🌟 楽しく学びましょう！🚀✨🎓🦉📝🎤💡💬",
                            '',
                            '⚠️🤖 AIはまちがえることがあります。大事な内容は必ずご自身でご確認ください！🔍📢🧐💡🙇‍♂️🙇‍♀️',
                            '',
                        ].join('\n')
                    };
                    if (messages.length === 0) return [helloMsg];
                    if (!(messages[0].role === 'llm' && messages[0].content && messages[0].content.includes('Type your message to start chatting'))) {
                        return [helloMsg, ...messages];
                    }
                    return messages;
                })().map((message, index) => {
                    if (message.role === 'user') {
                        return (
                            <div
                                key={index}
                                className="bubble user"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.content.replace(/\n/g, '<br>')) }}
                            />
                        );
                    }
                    // For llm messages, detect code blocks and render specially
                    const rawHtml = marked.parse(message.content);
                    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
                    // Simple code block detection: look for <pre><code> in the HTML
                    if (sanitizedHtml.includes('<pre><code')) {
                        // Split HTML into code blocks and normal text
                        // Use DOMParser for robust parsing
                        const parser = new window.DOMParser();
                        const doc = parser.parseFromString(`<div>${sanitizedHtml}</div>`, 'text/html');
                        const children = Array.from(doc.body.firstChild.childNodes);
                        return (
                            <div key={index} className="bubble llm">
                                {children.map((node, i) => {
                                    if (node.nodeName === 'PRE') {
                                        // Code block
                                        return (
                                            <pre key={i} className="chat-code-block">
                                                <code>{node.textContent}</code>
                                            </pre>
                                        );
                                    } else {
                                        // Other HTML
                                        return (
                                            <span key={i} dangerouslySetInnerHTML={{ __html: node.outerHTML || node.textContent }} />
                                        );
                                    }
                                })}
                            </div>
                        );
                    }
                    // Otherwise, normal markdown
                    return (
                        <div
                            key={index}
                            className="bubble llm"
                            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                        />
                    );
                })}
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
                {/* Suggestions toggle button inside chat form */}
                {/* Suggestions toggle button inside chat form with custom tooltip */}
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
        </>
    );
}
