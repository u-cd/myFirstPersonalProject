import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase-config';
import RoomList from './RoomList';
import RoomChat from './RoomChat';

export default function RoomChatApp({ user }) {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    async function fetchRooms() {
      setLoadingRooms(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
        const res = await fetch('/rooms', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
        });
        const data = await res.json();
        if (!ignore && data.rooms) {
          setRooms(data.rooms);
        }
      } catch (e) {
        if (!ignore) setRooms([]);
      } finally {
        if (!ignore) setLoadingRooms(false);
      }
    }
    fetchRooms();
    return () => { ignore = true; };
  }, [user]);

  // Join a room if not already a participant, then set as currentRoom
  const handleSelectRoom = async (room) => {
    if (!user || !room || !room._id) return;
    // If user is not a participant, join the room
    if (!room.participants || !room.participants.includes(user.id)) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
        const res = await fetch(`/rooms/${room._id}/join`, {
          method: 'POST',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
        });
        const data = await res.json();
        if (res.ok && data.room) {
          // Update room in list
          setRooms(prev => prev.map(r => r._id === data.room._id ? data.room : r));
          setCurrentRoom(data.room);
          return;
        }
      } catch (e) {
        // Optionally show error
      }
    }
    setCurrentRoom(room);
  };
  // Create a new room via API
  const handleCreateRoom = async (roomName) => {
    if (!user) return;
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
      }
    } catch (e) {
      // Optionally show error
    }
  };

  // Join room by ID (from RoomList form)
  const handleJoinRoom = async (roomId) => {
    if (!user || !roomId) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData && sessionData.session ? sessionData.session.access_token : null;
      const res = await fetch(`/rooms/${roomId}/join`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
      const data = await res.json();
      if (res.ok && data.room) {
        // Add or update room in list
        setRooms(prev => {
          const exists = prev.find(r => r._id === data.room._id);
          if (exists) {
            return prev.map(r => r._id === data.room._id ? data.room : r);
          } else {
            return [...prev, data.room];
          }
        });
        setCurrentRoom(data.room);
      }
    } catch (e) {
      // Optionally show error
    }
  };

  return (
    <div className="room-chat-app-flex">
      <aside className="room-chat-sidebar">
        <RoomList
          user={user}
          rooms={rooms}
          loading={loadingRooms}
          onSelectRoom={handleSelectRoom}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      </aside>
      <main className="room-chat-main">
        {currentRoom ? (
          <RoomChat room={currentRoom} user={user} />
        ) : (
          <div className="room-chat-placeholder">Select a room to start chatting</div>
        )}
      </main>
    </div>
  );
}
