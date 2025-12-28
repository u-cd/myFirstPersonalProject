import React, { useState } from 'react';
import SoloSidebar from './SoloSidebar';
import SoloChat from './SoloChat';

export default function Solo({ user, sidebarOpen, closeSidebar, currentChatId, setCurrentChatId }) {
    return (
        <div className="chatapp-mainarea">
            <aside>
                <SoloSidebar user={user} currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} sidebarOpen={sidebarOpen} closeSidebar={closeSidebar} />
            </aside>
            <main className="flex-1">
                <SoloChat user={user} currentChatId={currentChatId} setCurrentChatId={setCurrentChatId} />
            </main>
        </div>
    );
}
