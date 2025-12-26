import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase-config';

export default function RoomSidebar({ user, currentRoom, setCurrentRoom, sidebarOpen, closeSidebar }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line
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

  const handleCreateRoom = async (roomName) => {
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
        body: JSON.stringify({ name: roomName })
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

  const handleJoinRoom = async (roomId) => {
    if (!roomId.trim()) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
      const res = await fetch(`/rooms/${roomId}/join`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
      const data = await res.json();
      if (res.ok && data.room) {
        setRooms(prev => {
          const exists = prev.find(r => r._id === data.room._id);
          if (exists) {
            return prev.map(r => r._id === data.room._id ? data.room : r);
          } else {
            return [...prev, data.room];
          }
        });
        setCurrentRoom(data.room);
        if (closeSidebar) closeSidebar();
      }
    } catch (e) {}
    setJoinRoomId('');
    fetchRooms();
  };

  const handleSelectRoom = (room) => {
    setCurrentRoom(room);
    if (closeSidebar) closeSidebar();
  };

  return (
    <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-fixed-top">
            <form
                onSubmit={e => {
                e.preventDefault();
                handleCreateRoom(newRoomName);
                }}
            >
                <input
                type="text"
                placeholder="New room name"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                />
                <button type="submit">Create Room</button>
            </form>

            <form
                onSubmit={e => {
                e.preventDefault();
                handleJoinRoom(joinRoomId);
                }}
            >
                <input
                type="text"
                placeholder="Join room by ID"
                value={joinRoomId}
                onChange={e => setJoinRoomId(e.target.value)}
                />
                <button type="submit">Join Room</button>
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
                        </button>
                    ))
                )
            )}
        </div>
    </div>
  );
}
