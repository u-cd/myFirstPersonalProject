import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase-config';

export default function RoomChat({ room, user }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const chatRef = useRef(null);

  useEffect(() => {
    if (!room || !room._id) return;
    let ignore = false;
    async function fetchMessages() {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
        const res = await fetch(`/rooms/${room._id}/messages`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
        });
        const data = await res.json();
        if (!ignore && data.messages) {
          setMessages(data.messages);
        }
      } catch (e) {
        if (!ignore) setMessages([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchMessages();
    return () => { ignore = true; };
  }, [room]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !room || !room._id || !user) return;
    const messageText = input.trim();
    setInput('');
    // Optimistically add message to UI
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
      const res = await fetch(`/rooms/${room._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ content: messageText })
      });
      // Optionally, refetch messages to get latest from server
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages(prev => prev.filter(m => !String(m._id).startsWith('temp-')).concat([data.message]));
        }
      }
    } catch (e) {
      // Optionally show error or revert optimistic update
    }
  };

  return (
    <div className="room-chat">
      <h2>{room.name}</h2>
      <div className="participants">
        Participants: {room.participants?.join(', ')}
      </div>
      <div className="chat-messages" ref={chatRef}>
        {loading ? (
          <div>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#888' }}>No messages yet</div>
        ) : (
          messages.map(msg => (
            <div key={msg._id || msg.id} className={msg.userId === user?.id ? 'my-message' : 'other-message'}>
              <strong>{msg.userId}:</strong> {msg.content}
            </div>
          ))
        )}
      </div>
      <form className="room-chat-form" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your English..."
          className="room-chat-input"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
