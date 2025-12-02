import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';

export default function Chat({ messages, onSendMessage, isThinking }) {
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
        if (!messageText) return;

        onSendMessage(messageText);
        setInput('');
    };

    // send message by enter key
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
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
                                dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br>') }}
                            />
                        );
                    }
                    // For llm messages, detect code blocks and render specially
                    const rawHtml = marked.parse(message.content);
                    // Simple code block detection: look for <pre><code> in the HTML
                    if (rawHtml.includes('<pre><code')) {
                        // Split HTML into code blocks and normal text
                        // Use DOMParser for robust parsing
                        const parser = new window.DOMParser();
                        const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
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
                            dangerouslySetInnerHTML={{ __html: rawHtml }}
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
                    }}
                />
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

            {/* <div className="disclaimer">
                AI can make mistakes. Check important info.
            </div> */}
        </>
    );
}
