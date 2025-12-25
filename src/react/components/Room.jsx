import React, { useState, useEffect, useRef } from 'react';
import RoomSidebar from './RoomSidebar';
import RoomChat from './RoomChat';

export default function Room({ user }) {
    const [currentRoom, setCurrentRoom] = useState(null);
    return (
        <div className="chatapp-mainarea">
            <aside>
                <RoomSidebar user={user} currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} />
            </aside>
            <main style={{ flex: 1 }}>
                <RoomChat user={user} currentRoom={currentRoom} />
            </main>
        </div>
    );
}
