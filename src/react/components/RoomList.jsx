import React, { useState } from 'react';

export default function RoomList({ user, rooms = [], loading, onSelectRoom, onCreateRoom, onJoinRoom }) {
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');

  return (
    <div className="room-list">
      <form
        onSubmit={e => {
          e.preventDefault();
          if (newRoomName.trim()) {
            onCreateRoom(newRoomName.trim());
            setNewRoomName('');
          }
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
        style={{ marginTop: 12 }}
        onSubmit={e => {
          e.preventDefault();
          if (joinRoomId.trim()) {
            if (typeof onJoinRoom === 'function') {
              onJoinRoom(joinRoomId.trim());
            }
            setJoinRoomId('');
          }
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
      
      <h2>Rooms</h2>
      {loading ? (
        <div>Loading rooms...</div>
      ) : (
        <ul>
          {rooms.length === 0 ? (
            <li style={{ color: '#888' }}>No rooms found</li>
          ) : (
            rooms.map(room => (
              <li key={room._id || room.id}>
                <button onClick={() => onSelectRoom(room)}>
                  {room.name || 'Untitled'} ({room.participants?.length || 0} users)
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
