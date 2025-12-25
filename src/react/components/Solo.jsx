import React, { useState } from 'react';
import SoloSidebar from './SoloSidebar';
import SoloChat from './SoloChat';

export default function Solo({ user }) {
    const [currentChatId, setCurrentChatId] = useState(null);
    return (
        <div className="chatapp-mainarea" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <aside style={{ borderRight: '1px solid #eee', height: '100%' }}>
                <SoloSidebar user={user} currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} />
            </aside>
            <main style={{ flex: 1, minWidth: 0, height: '100%' }}>
                <SoloChat user={user} currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} />
            </main>
        </div>
    );
}
