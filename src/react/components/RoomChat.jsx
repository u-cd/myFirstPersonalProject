import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase-config';

function getRandomColor() {
  // Pick a random pastel color
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 70%)`;
}

function timeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now - then) / 1000); // seconds
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default function RoomChat({ user, currentRoom, setCurrentRoom }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomMessageCounts, setRoomMessageCounts] = useState({});
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  // Store a color for each userId in a ref (so it persists during the session)
  const userColorsRef = useRef({});

  function getUserColor(userId) {
    if (!userColorsRef.current[userId]) {
      userColorsRef.current[userId] = getRandomColor();
    }
    return userColorsRef.current[userId];
  }

  // Fetch messages when currentRoomId changes
  useEffect(() => {
    if (currentRoom && currentRoom._id) {
      fetchMessages(currentRoom._id);
    } else {
      setMessages([]);
    }
  }, [currentRoom]);

  // Fetch public rooms when currentRoom is null
  useEffect(() => {
    if (!currentRoom) {
      fetchPublicRooms();
    }
  }, [currentRoom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async (roomId) => {
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
  };

  const fetchPublicRooms = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
      const res = await fetch('/public-rooms', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
      const data = await res.json();
      setPublicRooms(data.rooms || []);
      // Fetch message counts for each room
      if (data.rooms && data.rooms.length > 0) {
        const counts = {};
        await Promise.all(
          data.rooms.map(async (room) => {
            try {
              const res = await fetch(`/rooms/${room._id || room.id}/messages`, {
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
              });
              const msgData = await res.json();
              counts[room._id || room.id] = Array.isArray(msgData.messages) ? msgData.messages.length : 0;
            } catch {
              counts[room._id || room.id] = 0;
            }
          })
        );
        setRoomMessageCounts(counts);
      }
    } catch (e) {
      setPublicRooms([]);
      setRoomMessageCounts({});
    }
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
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32, overflowY: 'auto' }}>
            <div style={{ flex: 2 }}>
              <h2>Public Rooms</h2>
              {publicRooms.length === 0 ? (
                <div>No public rooms found</div>
              ) : (
                <ul>
                  {publicRooms.map(room => (
                    <li key={room._id || room.id}>
                      <div>
                        <strong>{room.name || 'Untitled'}</strong>
                      </div>
                      {room.description && (
                        <div>
                          {room.description}
                        </div>
                      )}
                      <div>
                        Created by: {room.ownerId ? room.ownerId.slice(0, 6) + '...' : 'unknown'}
                      </div>
                      <div>
                        Last updated: {room.updatedAt ? timeAgo(room.updatedAt) : 'unknown'}
                      </div>
                      <div>
                        Participants: {room.participants?.length ?? 0}
                      </div>
                      <div>
                        Messages: {roomMessageCounts[room._id || room.id] ?? '...'}
                      </div>
                      <button
                        onClick={() => {
                          if (typeof setCurrentRoom === 'function') setCurrentRoom(room);
                        }}
                      >Open</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="room-welcome"
              style={{
                padding: '12px',
                background: '#f8f8fa',
                color: '#444',
                maxWidth: 340,
                position: 'sticky',
                top: 0, // or whatever offset you want from the top
                zIndex: 1
              }}>
              <strong>Welcome to Group Chat Rooms!</strong>
              <ul style={{ margin: '8px 0 0 18px', padding: 0, fontSize: '1em' }}>
                <li>Anyone can join and send messages in public rooms.</li>
                <li>Messages are visible to all participants in the room.</li>
                <li>
                  <span style={{ color: '#1976d2' }}>
                    ✨ All messages you send will be automatically translated to natural English by AI.
                  </span>
                </li>
                <li><span style={{ color: '#d32f2f' }}>Do not share personal or sensitive information.</span></li>
                <li>Be respectful and follow good manners.</li>
                <li>To create a new room, use the sidebar form.</li>
              </ul>
            </div>
          </div>
      ) : (
        <>
          <div className="room-header">
            <div className="room-title">{currentRoom.name}</div>
            {currentRoom.description && (
              <div className="room-description">
                {currentRoom.description}
              </div>
            )}
          </div>
          <div className="chat-messages" ref={chatRef}>
            {messages.length === 0 ? (
              <div>No messages yet</div>
            ) : (
              messages.map(msg => (
                <div key={msg._id || msg.id} className={msg.userId === user?.id ? 'my-message' : 'other-message'}>
                  {msg.userId !== user?.id ? (
                    <>
                      <span
                        className="message-user"
                        style={{ color: getUserColor(msg.userId), fontWeight: 600 }}
                      >
                        {msg.userId ? msg.userId.slice(0, 6) + '...' : 'unknown'}
                      </span>
                      <span className="message-timestamp" style={{ marginLeft: 8, color: '#888', fontSize: '0.92em' }}>
                        {msg.timestamp ? timeAgo(msg.timestamp) : ''}
                      </span>
                      <br />
                      {msg.content}
                    </>
                  ) : (
                    <>
                      <span className="message-timestamp" style={{ color: '#888', fontSize: '0.92em', float: 'right' }}>
                        {msg.timestamp ? timeAgo(msg.timestamp) : ''}
                      </span>
                      <br />
                      {msg.content}
                      <br />
                      <button
                        className="delete-message-btn"
                        onClick={async () => {
                          if (window.confirm('Delete this message?')) {
                            const { data: sessionData } = await supabase.auth.getSession();
                            const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
                            const res = await fetch(`/messages/${msg._id}`, {
                              method: 'DELETE',
                              headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
                            });
                            if (res.ok) {
                              setMessages(prev => prev.filter(m => m._id !== msg._id));
                            } else {
                              alert('Failed to delete message.');
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
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
