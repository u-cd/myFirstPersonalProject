import React, { useState, useEffect, useRef } from 'react';
import RoomSidebar from './RoomSidebar';
import RoomChat from './RoomChat';

export default function Room({ user }) {
    const [currentRoom, setCurrentRoom] = useState(null);
    return (
        <div className="chatapp-mainarea" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <aside style={{ borderRight: '1px solid #eee', height: '100%' }}>
                <RoomSidebar user={user} currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} />
            </aside>
            <main style={{ flex: 1, minWidth: 0, height: '100%' }}>
                <RoomChat user={user} currentRoom={currentRoom} />
            </main>
        </div>
    );
}
