import React, { useState } from 'react';
import SoloSidebar from './SoloSidebar';
import SoloChat from './SoloChat';

export default function Solo({ user }) {
    const [currentChatId, setCurrentChatId] = useState(null);
    return (
        <div className="chatapp-mainarea">
            <aside>
                <SoloSidebar user={user} currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} />
            </aside>
            <main style={{ flex: 1 }}>
                <SoloChat user={user} currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} />
            </main>
        </div>
    );
}
