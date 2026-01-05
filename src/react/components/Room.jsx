import React, { useState, useEffect, useRef } from 'react';
import RoomSidebar from './RoomSidebar';
import RoomChat from './RoomChat';

export default function Room({ user, sidebarOpen, closeSidebar, currentRoom, setCurrentRoom }) {
    return (
        <div className="chatapp-mainarea">
            <aside>
                <RoomSidebar user={user} currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} sidebarOpen={sidebarOpen} closeSidebar={closeSidebar} />
            </aside>
            <main className="flex-1">
                <RoomChat user={user} currentRoom={currentRoom} setCurrentRoom={setCurrentRoom} />
            </main>
        </div>
    );
}
