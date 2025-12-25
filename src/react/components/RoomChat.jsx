import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase-config';

export default function RoomChat({ user, currentRoom }) {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const chatRef = useRef(null);


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

  return (
    <div className="roomchat-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!currentRoom ? (
        <div>Select a room to start chatting.</div>
      ) : (
        <>
          <h2>{currentRoom.name}</h2>
          <div className="participants">
            Participants: {currentRoom.participants?.join(', ')}
          </div>
          <div className="chat-messages" ref={chatRef} style={{ flex: 1, overflowY: 'auto' }}>
            {loadingMessages ? (
              <div>Loading messages...</div>
            ) : messages.length === 0 ? (
              <div>No messages yet</div>
            ) : (
              messages.map(msg => (
                <div key={msg._id || msg.id} className={msg.userId === user?.id ? 'my-message' : 'other-message'}>
                  <strong>{msg.userId}:</strong> {msg.content}
                </div>
              ))
            )}
          </div>
          <form className="room-chat-form" onSubmit={handleSend} style={{ display: 'flex' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your English..."
              className="room-chat-input"
              style={{ flex: 1 }}
            />
            <button type="submit">Send</button>
          </form>
        </>
      )}
    </div>
  );
}
