import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase-config';
import DOMPurify from 'dompurify';

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

// Helper: check if user is near the bottom (within 80px)
function isUserNearBottom(ref) {
  if (!ref.current) return true;
  const { scrollTop, scrollHeight, clientHeight } = ref.current;
  return scrollHeight - scrollTop - clientHeight < 80;
}

export default function RoomChat({ user, currentRoom, setCurrentRoom }) {

  // Store temporary translations for each message in session
  const [messageTranslations, setMessageTranslations] = useState({}); // { [msgId]: translation }
  const [translatingId, setTranslatingId] = useState(null);

  // Function to fetch translation for a message
  const handleShowTranslation = async (msg) => {
    const msgId = msg._id || msg.id;
    if (messageTranslations[msgId]) return; // Already translated
    setTranslatingId(msgId);
    try {
      const res = await fetch('/translate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.content })
      });
      const data = await res.json();
      setMessageTranslations(prev => ({ ...prev, [msgId]: data.translation }));
    } catch (e) {
      setMessageTranslations(prev => ({ ...prev, [msgId]: '翻訳に失敗しました' }));
    }
    setTranslatingId(null);
  };



  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomMessageCounts, setRoomMessageCounts] = useState({});
  const [isThinking, setIsThinking] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  // Store a color for each userId in a ref (so it persists during the session)
  const userColorsRef = useRef({});

  const [thinkingDots, setThinkingDots] = useState('');
  useEffect(() => {
    if (!isThinking) {
      setThinkingDots('');
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      setThinkingDots('.'.repeat((i % 3) + 1));
      i++;
    }, 400);
    return () => clearInterval(interval);
  }, [isThinking]);

  function getUserColor(userId) {
    if (!userColorsRef.current[userId]) {
      userColorsRef.current[userId] = getRandomColor();
    }
    return userColorsRef.current[userId];
  }

  // Poll for new messages every 3 seconds when a room is open
  useEffect(() => {
    let intervalId;
    if (currentRoom && currentRoom._id) {
      // Fetch immediately
      fetchMessages(currentRoom._id);
      // Poll every 3 seconds
      intervalId = setInterval(() => {
        fetchMessages(currentRoom._id);
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
    // Only re-run if currentRoom changes
  }, [currentRoom]);

  // Fetch public rooms when currentRoom is null
  useEffect(() => {
    if (!currentRoom) {
      fetchPublicRooms();
    }
  }, [currentRoom]);

  const fetchMessages = async (roomId) => {
    try {
      const wasNearBottom = isUserNearBottom(chatRef);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
      const res = await fetch(`/rooms/${roomId}/messages`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
      else setMessages([]);
      // After messages update, scroll only if user was near bottom
      setTimeout(() => {
        if (wasNearBottom && chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      }, 0);
    } catch (e) {
      setMessages([]);
    }
  };

// Scroll to bottom when opening a new room (show latest message)
useEffect(() => {
  if (currentRoom && chatRef.current) {
    // Wait for messages to render
    setTimeout(() => {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, 0);
  }
}, [currentRoom, messages.length]);

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
    setIsThinking(true);
    // Do not add a temporary user message; only show the fetched response
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
    setIsThinking(false);
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

const [newRoomName, setNewRoomName] = useState('');
const [newRoomDescription, setNewRoomDescription] = useState('');

const handleCreateRoom = async (roomName, isPrivate = false, description = '') => {
  if (!roomName.trim()) return;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
    const res = await fetch('/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({ name: roomName, public: !isPrivate, description })
    });
    const data = await res.json();
    if (res.ok && data.room) {
      setPublicRooms(prev => [data.room, ...prev]);
      setNewRoomName('');
      setNewRoomDescription('');
    }
  } catch (e) {}
};

// Persist welcomeOpen state per user in localStorage
const getWelcomeOpenInitial = () => {
  try {
    const userId = user?.id || 'guest';
    const saved = localStorage.getItem('roomWelcomeOpen_' + userId);
    if (saved === 'false') return false;
    if (saved === 'true') return true;
    return true; // default open
  } catch {
    return true;
  }
};
const [welcomeOpen, setWelcomeOpen] = useState(getWelcomeOpenInitial);

// Update localStorage when user or welcomeOpen changes
useEffect(() => {
  const userId = user?.id || 'guest';
  localStorage.setItem('roomWelcomeOpen_' + userId, String(welcomeOpen));
}, [user, welcomeOpen]);

  return (
    <div className="room-chat-wrapper">
      {!currentRoom ? (
            <div className="public-room-list-col">
              <div className="public-room-list-header-row">
                <h2>Public Rooms</h2>
                <button
                  className="fab-create-room-inside"
                  onClick={() => setShowCreateRoomModal(true)}
                  aria-label="Create Room"
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="14" cy="14" r="14" fill="#222"/>
                    <rect x="7" y="13" width="14" height="2" rx="1" fill="#fff"/>
                    <rect x="13" y="7" width="2" height="14" rx="1" fill="#fff"/>
                  </svg>
                  <span className="fab-create-room-label">Create Room</span>
                </button>
              </div>

              {/* Modal for Create Room */}
              {showCreateRoomModal && (
                <div className="modal-create-room-overlay" onClick={() => setShowCreateRoomModal(false)}>
                  <div className="modal-create-room" onClick={e => e.stopPropagation()}>
                    <div className="modal-create-room-header">
                      <span>Create Room</span>
                      <button className="modal-create-room-close" onClick={() => setShowCreateRoomModal(false)} aria-label="Close">×</button>
                    </div>
                    <form
                      className="sidebar-create-room-form"
                      onSubmit={e => {
                        e.preventDefault();
                        handleCreateRoom(newRoomName, false, newRoomDescription);
                        setShowCreateRoomModal(false);
                      }}
                    >
                      <input
                        type="text"
                        className="sidebar-create-room-input"
                        placeholder="New room name"
                        value={newRoomName}
                        onChange={e => setNewRoomName(e.target.value)}
                        autoFocus
                      />
                      <textarea
                        className="sidebar-create-room-textarea"
                        placeholder="Room description (optional)"
                        value={newRoomDescription}
                        onChange={e => setNewRoomDescription(e.target.value)}
                      />
                      {/* Temporarily uncomment the private checkbox */}
                      {/* <label style={{ marginLeft: 8, fontSize: '0.95em' }}>
                        <input
                          type="checkbox"
                          checked={createPrivate}
                          onChange={e => setCreatePrivate(e.target.checked)}
                          style={{ marginRight: 4 }}
                        />
                        Private
                      </label> */}
                      <button type="submit" className="sidebar-create-room-submit">Create Room</button>
                    </form>
                  </div>
                </div>
              )}
              
              {publicRooms.length === 0 ? (
                <div></div>
              ) : (
                <div className="public-room-list-scrollable">
                  {[...publicRooms]
                    .sort((a, b) => {
                      const PINNED_ID = "69535eedd90e2cc65d019270";
                      if ((a._id || a.id) === PINNED_ID) return -1;
                      if ((b._id || b.id) === PINNED_ID) return 1;
                      return 0;
                    })
                    .map(room => (
                      <div
                        key={room._id || room.id}
                        className="public-room-entry"
                        onClick={() => {
                          if (typeof setCurrentRoom === 'function') setCurrentRoom(room);
                        }}
                      >
                        <div className="room-created-by">
                          <span>Created by: {room.ownerId ? room.ownerId.slice(0, 6) + '...' : 'unknown'}</span>
                        </div>
                        <div className="room-title-wrap">
                          <strong>{room.name || 'Untitled'}</strong>
                        </div>
                        {room.description && (
                          <div
                            className="room-description-wrap"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize((room.description || '').replace(/\n/g, '<br>'))
                            }}
                          />
                        )}
                        <div className="room-meta-row">
                          <span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18" height="18" viewBox="0 0 24 24" fill="none"
                              stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              style={{ verticalAlign: 'middle', marginRight: '3px' }}
                            >
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            {roomMessageCounts[room._id || room.id] ?? '...'}
                          </span>
                          <span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18" height="18" viewBox="0 0 24 24" fill="none"
                              style={{ verticalAlign: 'middle', marginRight: '3px' }}
                            >
                              <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C17.16 14.1 19 15.03 19 16.5V19h5v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="#555"/>
                            </svg>
                            {room.participants?.length ?? 0}
                          </span>
                          <span>{room.updatedAt ? timeAgo(room.updatedAt) : 'unknown'}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
      ) : (
        <div className="room-chat">
          <div className="room-header">
            <div className="room-title">{currentRoom.name}</div>
            {currentRoom.description && (
              <div
                className="room-description"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize((currentRoom.description || '').replace(/\n/g, '<br>'))
                }}
              />
            )}
          </div>
          <div className="chat-messages" ref={chatRef}>
            {messages.length === 0 ? (
              <div>No messages yet</div>
            ) : (
              messages.map(msg => {
                const msgId = msg._id || msg.id;
                return (
                  <div key={msgId} className={msg.userId === user?.id ? 'my-message' : 'other-message'}>
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
                        <span className="room-message-content">{msg.content}</span>
                        <br />
                        {!messageTranslations[msgId] && (
                          <button
                            className="show-translation-btn"
                            onClick={() => handleShowTranslation(msg)}
                            disabled={translatingId === msgId}
                          >
                            {translatingId === msgId ? 'Translating...' : 'Show Translation'}
                          </button>
                        )}
                        {messageTranslations[msgId] && (
                          <div className="room-message-translation-ja">
                            {messageTranslations[msgId]}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="message-timestamp" style={{ color: '#888', fontSize: '0.92em', float: 'right' }}>
                          {msg.timestamp ? timeAgo(msg.timestamp) : ''}
                        </span>
                        <br />
                        <span
                          className={"room-message-content " + "my-message-content"}
                        >
                          {msg.content}
                        </span>
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
                );
              })
            )}
            {isThinking && (
              <div className="my-message">
                <span className="thinking-dots" style={{ color: '#000', fontSize: '1.2em', letterSpacing: 2 }}>
                  <br />
                  {thinkingDots}
                  <br />
                </span>
              </div>
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
        </div>
      )}

      {/* Always show the welcome message */}
        <button
          className="room-welcome-toggle-btn"
          onClick={() => setWelcomeOpen(open => !open)}
          aria-expanded={welcomeOpen}
          aria-label={welcomeOpen ? "Hide welcome/info" : "Show welcome/info"}
        >
          {welcomeOpen ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle' }}>
              <line x1="6" y1="11" x2="16" y2="11" stroke="#222" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="12,7 16,11 12,15" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle' }}>
              <line x1="16" y1="11" x2="6" y2="11" stroke="#222" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="10,7 6,11 10,15" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      
        {welcomeOpen && (
          <div className="room-welcome">
            {!currentRoom && (
              <div className="room-welcome-create">
                <b>Create Room</b> lets you create your own chat room.
              </div>
            )}
            <div className="room-welcome-important">
              <div className="room-welcome-highlight">
                🤖 Rooms では AI が自動でメッセージを英語に変換してくれます<br />
                気軽に英語でのチャットを楽しみましょう！
              </div>
              <div className="room-welcome-caution">
                <span>
                  ⚠️ Please never write personal or confidential information.
                </span>
                個人情報や機密情報は絶対に書き込まないでください
                <span>
                  🚫 Content that makes others uncomfortable or disruptive behavior is also prohibited.
                </span>
                他人が不快になる内容や迷惑行為も禁止です
              </div>
            </div>
            {currentRoom && (
              <div className="room-welcome-input-hint">
                英語でも日本語でも、AIが自動で変換します🌏🤖思ったことを書き込みましょう📝
              </div>
            )}
          </div>
        )}
    </div>
  );
}
