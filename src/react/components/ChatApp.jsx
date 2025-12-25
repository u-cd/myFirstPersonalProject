
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase-config';


import Solo from './Solo';
import Room from './Room';

export default function ChatApp({ user }) {
    const [mode, setMode] = useState('main'); // 'main' or 'rooms'
    // Sidebar open/close for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // User account block (can be expanded later)
    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {}
    };

    // Layout: topbar + mode-dependent main area
    return (
        <div className="chatapp-root">
            {/* Top bar: mode switcher + user account */}
            <div className="chatapp-topbar">
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
                    <span className="rainbow-text">rainbow</span>

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
                <Solo user={user} />
            ) : (
                <Room user={user} />
            )}
        </div>
    );
}

