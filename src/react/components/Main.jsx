import React, { useState, useEffect, useRef } from 'react';
import MainSidebar from './MainSidebar';
import Chat from './Chat';

export default function Main({ user }) {
    const [currentChatId, setCurrentChatId] = useState(null);
    return (
        <div className="chatapp-mainarea" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <aside style={{ borderRight: '1px solid #eee', height: '100%' }}>
                <MainSidebar user={user} currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} />
            </aside>
            <main style={{ flex: 1, minWidth: 0, height: '100%' }}>
                <Chat user={user} currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} />
            </main>
        </div>
    );
}
