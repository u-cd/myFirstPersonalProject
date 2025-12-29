import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase-config';

export default function RoomSidebar({ user, currentRoom, setCurrentRoom, sidebarOpen, closeSidebar }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState('');
  const [createPrivate, setCreatePrivate] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [user]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
      const res = await fetch('/rooms', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
      const data = await res.json();
      if (data.rooms) setRooms(data.rooms);
      else setRooms([]);
    } catch (e) {
      setRooms([]);
    }
    setLoading(false);
  };

  const handleCreateRoom = async (roomName, isPrivate = false) => {
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
        body: JSON.stringify({ name: roomName, public: !isPrivate })
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRooms(prev => [...prev, data.room]);
        setCurrentRoom(data.room);
        if (closeSidebar) closeSidebar();
      }
    } catch (e) {}
    setNewRoomName('');
    fetchRooms();
  };

  const handleSelectRoom = (room) => {
    setCurrentRoom(room);
    if (closeSidebar) closeSidebar();
  };

  return (
    <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
      <div className="sidebar-fixed-top">
        <div>
          <button
            type="button"
            onClick={() => setCurrentRoom(null)}
          >
            Show Public Rooms
          </button>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            handleCreateRoom(newRoomName, createPrivate);
          }}
        >
          <input
            type="text"
            placeholder="New room name"
            value={newRoomName}
            onChange={e => setNewRoomName(e.target.value)}
          />
          {/* <label style={{ marginLeft: 8, fontSize: '0.95em' }}>
            <input
              type="checkbox"
              checked={createPrivate}
              onChange={e => setCreatePrivate(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            Private
          </label> */}
          <button type="submit">Create Room</button>
        </form>

      </div>
      
        <div className="sidebar-chats-header">Rooms</div>
        <div className="sidebar-content">
          {loading ? (
            <div className="sidebar-loading">Loading rooms...</div>
          ) : (
            rooms.length === 0 ? (
              <div>No rooms found</div>
            ) : (
              rooms.map(room => (
                <button
                  key={room._id || room.id}
                  className="sidebar-chat-link"
                  onClick={() => handleSelectRoom(room)}
                >
                  {room.name || 'Untitled'} ({room.participants?.length || 0} users)
                  {!room.public ? <span style={{marginLeft: 6, fontSize: '0.9em'}}>🗝️</span> : null}
                </button>
              ))
            )
          )}
        </div>
    </div>
  );
}
