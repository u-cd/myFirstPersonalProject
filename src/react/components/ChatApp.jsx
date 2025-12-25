
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
        <div className="chatapp-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Top bar: mode switcher + user account */}
            <div className="chatapp-topbar" style={{ display: 'flex', width: '100vw', borderBottom: '1px solid #eee' }}>
                <div className="sidebar-mode-switcher" style={{ display: 'flex' }}>
                    <button
                        onClick={() => setMode('main')}
                        className={mode === 'main' ? 'active' : ''}
                        style={{ fontWeight: mode === 'main' ? 'bold' : 'normal' }}
                    >Main Chat</button>
                    <button
                        onClick={() => setMode('rooms')}
                        className={mode === 'rooms' ? 'active' : ''}
                        style={{ fontWeight: mode === 'rooms' ? 'bold' : 'normal' }}
                    >Rooms</button>
                </div>
                <div className="sidebar-user-account" style={{ cursor: 'pointer' }}>
                    {user.email || 'No email'}
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

