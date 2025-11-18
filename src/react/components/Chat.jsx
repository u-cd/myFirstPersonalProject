import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';

export default function Chat({ messages, onSendMessage, currentChatId }) {
    const [input, setInput] = useState('');
    const chatRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const messageText = input.trim();
        if (!messageText || !currentChatId) return;

        onSendMessage(messageText);
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <>
            <div ref={chatRef} className="chat">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`bubble ${message.role === 'user' ? 'user' : 'llm'}`}
                        dangerouslySetInnerHTML={{
                            __html: message.role === 'user'
                                ? message.content.replace(/\n/g, '<br>')
                                : marked.parse(message.content)
                        }}
                    />
                ))}
            </div>

            <form className="chat-form" onSubmit={handleSubmit}>
                <input
                    className="chat-input"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your English..."
                    disabled={!currentChatId}
                />
                <button
                    type="submit"
                    className="send-btn"
                    disabled={!input.trim() || !currentChatId}
                    aria-label="Send"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>

            <div className="disclaimer">
                AI can make mistakes. Check important info.
            </div>
        </>
    );
}
