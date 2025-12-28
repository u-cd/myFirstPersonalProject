import React, { useState } from 'react';
import { supabase } from '../supabase-config';

import Solo from './Solo';
import Room from './Room';

export default function ChatApp({ user }) {
    const [mode, setMode] = useState('main'); // 'main' or 'rooms'
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Store last selected chat and room
    const [currentChatId, setCurrentChatId] = useState(null);
    const [currentRoom, setCurrentRoom] = useState(null);

    // User account block (can be expanded later)
    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {}
    };

    // Mobile menu button handler
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="chatapp-root">
            {/* Sidebar overlay for mobile */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={closeSidebar}
            />
            
            {/* Top bar: mode switcher + user account */}
            <div className="chatapp-topbar">
                {/* Mobile menu button */}
                <button
                    className="mobile-menu-btn"
                    onClick={toggleSidebar}
                    aria-label="Open menu"
                >
                    ☰
                </button>
                <div className="mode-switcher">
                    <button
                        onClick={() => setMode('main')}
                        className={mode === 'main' ? 'active' : ''}
                    >Solo Chat</button>
                    <button
                        onClick={() => setMode('rooms')}
                        className={mode === 'rooms' ? 'active' : ''}
                    >Rooms</button>
                </div>
                <div className="something-flexible-space">
                    <span className="rainbow-text">konbanwa</span>
                </div>
                <div className="user-account">
                    <span className="user-account-email">
                        {user.email || 'No email'}
                    </span>
                    <button onClick={handleSignOut}>Log out</button>
                </div>
            </div>
            {/* Solo or Room wrapper */}
            {mode === 'main' ? (
                <Solo
                    user={user}
                    sidebarOpen={sidebarOpen}
                    closeSidebar={closeSidebar}
                    currentChatId={currentChatId}
                    setCurrentChatId={setCurrentChatId}
                />
            ) : (
                <Room
                    user={user}
                    sidebarOpen={sidebarOpen}
                    closeSidebar={closeSidebar}
                    currentRoom={currentRoom}
                    setCurrentRoom={setCurrentRoom}
                />
            )}
        </div>
    );
}
