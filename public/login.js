import { signInWithGoogle, signInWithEmail } from './auth.js';

export function initializeLoginPage() {
    const loginForm = document.getElementById('login-form');
    const messageDiv = document.getElementById('message');
    const googleLoginBtn = document.getElementById('google-login');

    // Google login handler
    googleLoginBtn.onclick = async () => {
        const result = await signInWithGoogle();
        if (!result.success) {
            messageDiv.innerHTML = 'Google login failed.<br>Googleログインに失敗しました。';
            console.log('Google login error:', result.error);
        }
    };

    // Email login handler
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;

        const result = await signInWithEmail(email);
        if (!result.success) {
            messageDiv.innerHTML = 'Failed to send sign-in link.<br>サインインリンクの送信に失敗しました。';
            console.log('Supabase sign-in error:', result.error);
        } else {
            messageDiv.innerHTML = 'Sign-in link sent! Check your email. If you do not see it, it may be in your spam folder.<br>サインインリンクを送信しました。メールが届かない場合は、迷惑フォルダもご確認ください。';
        }
    };

    // Setup mobile menu functionality
    setupMobileMenu();

    // Initialize anonymous chat for login page
    initializeAnonymousChat();
}

function initializeAnonymousChat() {
    const chat = document.getElementById('chat');
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    let chatId = crypto.randomUUID();

    form.onsubmit = async (e) => {
        e.preventDefault();
        const userMsg = input.value.trim();
        if (!userMsg || !chatId) return;

        chat.innerHTML += `<div class='bubble user'>${userMsg.replace(/\n/g, '<br>')}</div>`;
        input.value = '';
        chat.scrollTop = chat.scrollHeight;

        const res = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg, chatId })
        });

        const data = await res.json();
        chat.innerHTML += `<div class='bubble llm'>${marked.parse(data.reply || data.error)}</div>`;
        chat.scrollTop = chat.scrollHeight;
    };
}

function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarWrapper = document.getElementById('sidebar-content-wrapper');

    if (!mobileMenuBtn || !sidebarOverlay || !sidebarWrapper) return;

    // Mobile menu button click
    mobileMenuBtn.addEventListener('click', () => {
        openMobileSidebar();
    });

    // Overlay click to close sidebar
    sidebarOverlay.addEventListener('click', () => {
        closeMobileSidebar();
    });

    // Close sidebar on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileSidebar();
        }
    });
}

function openMobileSidebar() {
    const sidebarWrapper = document.getElementById('sidebar-content-wrapper');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (sidebarWrapper && sidebarOverlay) {
        sidebarWrapper.classList.add('sidebar-open');
        sidebarOverlay.classList.add('active');
    }
}

function closeMobileSidebar() {
    const sidebarWrapper = document.getElementById('sidebar-content-wrapper');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (sidebarWrapper && sidebarOverlay) {
        sidebarWrapper.classList.remove('sidebar-open');
        sidebarOverlay.classList.remove('active');
    }
}
