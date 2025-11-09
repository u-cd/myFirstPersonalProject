import { getCurrentUser } from './auth.js';
import { loadSidebar } from './sidebar.js';

export async function initializeAuthenticatedApp() {
    const user = await getCurrentUser();
    if (!user) return;

    // Load sidebar
    await loadSidebar(user);

    // Initialize authenticated chat
    initializeAuthenticatedChat(user);
}

function initializeAuthenticatedChat(user) {
    const chat = document.getElementById('chat');
    const form = document.getElementById('form');
    const input = document.getElementById('input');

    // Initialize with new chat ID if none exists
    if (!window.currentChatId) {
        window.currentChatId = crypto.randomUUID();
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const userMsg = input.value.trim();
        if (!userMsg || !window.currentChatId) return;

        chat.innerHTML += `<div class='bubble user'>${userMsg.replace(/\n/g, '<br>')}</div>`;
        input.value = '';
        chat.scrollTop = chat.scrollHeight;

        try {
            const res = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    chatId: window.currentChatId,
                    userId: user.id
                })
            });

            const data = await res.json();
            chat.innerHTML += `<div class='bubble llm'>${marked.parse(data.reply || data.error)}</div>`;
            chat.scrollTop = chat.scrollHeight;
        } catch (error) {
            console.error('Error sending message:', error);
            chat.innerHTML += `<div class='bubble llm'>Error: Failed to send message</div>`;
        }
    };
}
