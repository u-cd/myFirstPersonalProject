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
                    placeholder="Type your message..."
                    disabled={!currentChatId}
                />
                <button
                    type="submit"
                    className="send-btn"
                    disabled={!input.trim() || !currentChatId}
                >
                    ➤
                </button>
            </form>

            <div className="disclaimer">
                AI can make mistakes. Check important info.
            </div>
        </>
    );
}
