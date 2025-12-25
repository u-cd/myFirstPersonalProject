import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase-config';

export default function RoomChat({ user, currentRoom }) {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const chatRef = useRef(null);
  const inputRef = useRef(null);


  // Fetch messages when currentRoomId changes
  useEffect(() => {
    if (currentRoom && currentRoom._id) {
      fetchMessages(currentRoom._id);
    } else {
      setMessages([]);
    }
  }, [currentRoom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async (roomId) => {
    setLoadingMessages(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
      const res = await fetch(`/rooms/${roomId}/messages`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
      else setMessages([]);
    } catch (e) {
      setMessages([]);
    }
    setLoadingMessages(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentRoom || !currentRoom._id || !user) return;
    const messageText = input.trim();
    setInput('');
    setMessages(prev => [
      ...prev,
      {
        _id: 'temp-' + Date.now(),
        userId: user.id,
        content: messageText,
        role: 'user',
      }
    ]);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
      const res = await fetch(`/rooms/${currentRoom._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ content: messageText })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => prev.filter(m => !String(m._id).startsWith('temp-')).concat([data.message]));
        }
      }
    } catch (e) {}
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
};

const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend(e);
    }
};

  return (
    <div className="chat">
      {!currentRoom ? (
        <div>Select a room to start chatting.</div>
      ) : (
        <>
          <h2>{currentRoom.name}</h2>
          <div className="participants">
            Participants: {currentRoom.participants?.join(', ')}
          </div>
          <div className="chat-messages" ref={chatRef}>
            {loadingMessages ? (
              <div>Loading messages...</div>
            ) : messages.length === 0 ? (
              <div>No messages yet</div>
            ) : (
              messages.map(msg => (
                <div key={msg._id || msg.id} className={msg.userId === user?.id ? 'my-message' : 'other-message'}>
                  {/* <strong>{msg.userId}:</strong> {msg.content} */}
                  {msg.content}
                </div>
              ))
            )}
          </div>
          <form className="chat-form" onSubmit={handleSend}>
            <textarea
                className="chat-input"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your English..."
                rows={1}
                ref={inputRef}
                autoComplete="off"
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
        </>
      )}
    </div>
  );
}
