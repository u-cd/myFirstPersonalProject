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
            (event, session) => {
                setUser(session?.user || null);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="app-layout">
                <div className="main-content" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div>Loading...</div>
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
