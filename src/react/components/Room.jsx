import React, { useState, useEffect, useRef } from 'react';
import RoomSidebar from './RoomSidebar';
import RoomChat from './RoomChat';

export default function Room({ user, sidebarOpen, closeSidebar }) {
    const [currentRoom, setCurrentRoom] = useState(null);
    return (
        <div className="chatapp-mainarea">
            <aside>
                <RoomSidebar user={user} currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} sidebarOpen={sidebarOpen} closeSidebar={closeSidebar} />
            </aside>
            <main style={{ flex: 1 }}>
                <RoomChat user={user} currentRoom={currentRoom} />
            </main>
        </div>
    );
}
