import React, { useState, useEffect } from 'react';
import { supabase } from './supabase-config';
import Login from './components/Login';
import ChatApp from './components/ChatApp';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                const newUser = session?.user || null;
                // Only update if user actually changed
                setUser(prevUser => {
                    if (
                        (!prevUser && !newUser) ||
                        (prevUser && newUser && prevUser.id === newUser.id)
                    ) {
                        console.log('almond');
                        return prevUser; // No change, skip re-render
                    }
                    return newUser;
                });
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="app-layout">
                <div className="main-content loading-screen">
                    <div className="loading-text">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-layout">
            {user ? (
                <ChatApp user={user} />
            ) : (
                <Login />
            )}
        </div>
    );
}

export default App;
