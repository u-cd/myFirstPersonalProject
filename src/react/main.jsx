import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import RoomChatApp from './components/RoomChatApp.jsx'
import './global.css'
import './components/Login.css'
import './components/Chat.css'
import './components/Sidebar.css'
import './components/ChatApp.css'
import './components/RoomChatApp.css'

// To test RoomChatApp, swap <App /> with <RoomChatApp /> below:
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
