import { signOut } from './auth.js';

export async function loadSidebar(user) {
    try {
        const res = await fetch('/sidebar.html');
        const html = await res.text();
        document.getElementById('sidebar').innerHTML = html;

        // Load user's chats
        await loadChats(user);

        // Setup user account section
        setupUserAccount(user);

        // Setup mobile menu functionality
        setupMobileMenu();
    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

async function loadChats(user) {
    const sidebarContent = document.getElementById('sidebar-content');
    if (!sidebarContent) return;

    try {
        const res = await fetch(`/chats-with-last-date-and-title?userId=${encodeURIComponent(user.id)}`);
        const data = await res.json();

        if (data.chats && data.chats.length) {
            data.chats.forEach(chat => {
                let linkText = chat.title && chat.title.trim() ? chat.title.trim() : 'Untitled chat';
                const chatLink = document.createElement('button');
                chatLink.textContent = linkText;
                chatLink.className = 'sidebar-chat-link';
                chatLink.addEventListener('click', async (e) => {
                    await loadChatHistory(chat.chatId, user.id);
                });
                sidebarContent.appendChild(chatLink);
            });
        }
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

async function loadChatHistory(chatId, userId) {
    const chatArea = document.getElementById('chat');
    chatArea.innerHTML = '';

    try {
        const res = await fetch(`/chat-history?chatId=${chatId}&userId=${encodeURIComponent(userId)}`);
        const data = await res.json();

        if (data.messages && data.messages.length) {
            data.messages.forEach(msg => {
                if (msg.role === 'user') {
                    chatArea.innerHTML += `<div class='bubble user'>${msg.content.replace(/\n/g, '<br>')}</div>`;
                } else {
                    chatArea.innerHTML += `<div class='bubble llm'>${marked.parse(msg.content)}</div>`;
                }
            });
            chatArea.scrollTop = chatArea.scrollHeight;
        }

        // Update current chatId for new messages
        window.currentChatId = chatId;

        // Close mobile sidebar after selecting a chat
        closeMobileSidebar();
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

function setupUserAccount(user) {
    const sidebarUserAccount = document.getElementById('sidebar-user-account');
    if (!sidebarUserAccount) return;

    sidebarUserAccount.textContent = user.email || 'No email';
    sidebarUserAccount.style.cursor = 'pointer';

    // Remove any previous logout button
    let logoutBtn = document.getElementById('sidebar-logout-btn');
    if (logoutBtn) logoutBtn.remove();

    sidebarUserAccount.onclick = function () {
        // If already shown, do nothing
        if (document.getElementById('sidebar-logout-btn')) return;

        logoutBtn = document.createElement('button');
        logoutBtn.id = 'sidebar-logout-btn';
        logoutBtn.textContent = 'Log out';
        logoutBtn.style.position = 'absolute';
        logoutBtn.style.left = `${sidebarUserAccount.getBoundingClientRect().left}px`;
        logoutBtn.style.width = `${sidebarUserAccount.offsetWidth}px`;

        // Position so bottom edge of logoutBtn is at top edge of sidebarUserAccount
        document.body.appendChild(logoutBtn);

        // Wait for button to render and get its height
        requestAnimationFrame(() => {
            logoutBtn.style.top = `${sidebarUserAccount.getBoundingClientRect().top - logoutBtn.offsetHeight + window.scrollY}px`;
        });

        logoutBtn.onclick = async function (e) {
            e.stopPropagation();
            logoutBtn.remove();
            await signOut();
            // App will re-render due to auth state change
        };

        // Remove button if user clicks elsewhere
        function removeBtnOnClick(e) {
            if (e.target !== logoutBtn && e.target !== sidebarUserAccount) {
                logoutBtn.remove();
                document.removeEventListener('mousedown', removeBtnOnClick);
            }
        }
        setTimeout(() => {
            document.addEventListener('mousedown', removeBtnOnClick);
        }, 0);
    };
}

function setupMobileMenu() {
    console.log('I am set up mobile menu');
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
    console.log('I am open mobile sidebar');
    const sidebarWrapper = document.getElementById('sidebar-content-wrapper');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (sidebarWrapper && sidebarOverlay) {
        sidebarWrapper.classList.add('sidebar-open');
        sidebarOverlay.classList.add('active');
    }
}

function closeMobileSidebar() {
    console.log('I am close mobile sidebar');
    const sidebarWrapper = document.getElementById('sidebar-content-wrapper');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (sidebarWrapper && sidebarOverlay) {
        sidebarWrapper.classList.remove('sidebar-open');
        sidebarOverlay.classList.remove('active');
    }
}
