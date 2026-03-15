// DOM Elements
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const mainApp = document.getElementById('mainApp');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messagesContainer');
const typingIndicator = document.getElementById('typingIndicator');
const welcomeScreen = document.getElementById('welcomeScreen');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const chatHistoryContainer = document.getElementById('chatHistory');
const newChatBtn = document.getElementById('newChatBtn');
const toast = document.getElementById('toast');
const shareBtn = document.getElementById('shareBtn');

// User & Settings Elements
const displayUsername = document.getElementById('displayUsername');
const settingsUsername = document.getElementById('settingsUsername');
const settingsPassword = document.getElementById('settingsPassword');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const togglePassword = document.getElementById('togglePassword');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// State
let conversations = JSON.parse(localStorage.getItem('conversations')) || [];
let currentConversationId = null;
let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
let messageCount = parseInt(sessionStorage.getItem('messageCount')) || 0;
let showPassword = false;
let conversationToDelete = null;

// Initialize
function init() {
    updateUIForUser();
    renderChatHistory();
    setupEventListeners();
    
    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
        sendBtn.disabled = !chatInput.value.trim();
    });

    // Check if we were in a conversation before
    if (conversations.length > 0) {
        loadConversation(conversations[0].id);
    }

    // Check for share link
    const urlParams = new URLSearchParams(window.location.search);
    const sharedContent = urlParams.get('share');
    if (sharedContent) {
        try {
            const messages = JSON.parse(atob(sharedContent));
            currentConversationId = 'shared_' + Date.now();
            
            // Show shared chat
            welcomeScreen.style.display = 'none';
            messagesContainer.innerHTML = '';
            messages.forEach(msg => appendMessage(msg.role, msg.content));
            
            // Optionally save shared chat to history
            conversations.unshift({
                id: currentConversationId,
                title: 'Shared Chat',
                messages: messages
            });
            saveConversations();
            renderChatHistory();
            
            showToast("Loaded shared conversation!");
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
            console.error("Failed to load shared chat", e);
        }
    }
}

function updateUIForUser() {
    if (currentUser) {
        loginOverlay.style.display = 'none';
        displayUsername.textContent = `User: ${currentUser.username}`;
        settingsUsername.textContent = currentUser.username;
        userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        settingsBtn.style.display = 'block';
    } else {
        displayUsername.textContent = 'Guest User';
        userAvatar.textContent = 'G';
        settingsBtn.style.display = 'none';
    }
}

function setupEventListeners() {
    // Login Handling
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        handleLogin(username, password);
    });

    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);

    // Send message on Enter (but not Shift+Enter)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // New Chat button
    newChatBtn.addEventListener('click', startNewChat);

    // Sidebar toggle for mobile
    sidebarToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Settings
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    togglePassword.addEventListener('click', () => {
        showPassword = !showPassword;
        settingsPassword.textContent = showPassword ? currentUser.password : '••••••••';
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('messageCount');
        location.reload();
    });

    // Share Button
    shareBtn.addEventListener('click', shareChat);

    // Delete Modal Actions
    closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', confirmDelete);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('active');
        }
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
    });
}

// Auth Functions
function handleLogin(username, password) {
    currentUser = { username, password };
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateUIForUser();
    
    // After login, show that the chat is still there
    showToast("Logged in successfully! Continuing your chat...");
}

// UI Helpers
function autoSendMessage(text) {
    chatInput.value = text;
    sendMessage();
}

function showToast(message = "Copied to clipboard!") {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Chat Functions
function startNewChat() {
    currentConversationId = null;
    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(welcomeScreen);
    welcomeScreen.style.display = 'flex';
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Check for login requirement on 2nd question
    if (!currentUser && messageCount >= 1) {
        loginOverlay.style.display = 'flex';
        return;
    }

    // Reset input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Remove welcome screen if present
    if (welcomeScreen.style.display !== 'none') {
        welcomeScreen.style.display = 'none';
        messagesContainer.innerHTML = '';
    }

    // Add User Message to UI
    appendMessage('user', text);

    // Handle Conversation State
    if (!currentConversationId) {
        currentConversationId = 'conv_' + Date.now();
        conversations.unshift({
            id: currentConversationId,
            title: text.length > 30 ? text.substring(0, 30) + '...' : text,
            messages: []
        });
    }

    const currentConv = conversations.find(c => c.id === currentConversationId);
    currentConv.messages.push({ role: 'user', content: text });

    // Increment message count for guest tracking
    messageCount++;
    sessionStorage.setItem('messageCount', messageCount);

    // Show Typing Indicator
    typingIndicator.classList.add('active');
    scrollToBottom();

    // --- PRODUCTION BACKEND CONFIG ---
    // After deploying to Render, set your URL here:
    const PROD_API_URL = "https://kali-ai-backend.onrender.com"; // Replace with your actual Render URL
    const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
        ? "http://localhost:5001/chat" 
        : `${PROD_API_URL}/chat`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: currentConv.messages
            })
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        const aiReply = data.reply;

        typingIndicator.classList.remove('active');
        appendMessage('ai', aiReply);
        
        currentConv.messages.push({ role: 'assistant', content: aiReply });
        saveConversations();
        renderChatHistory();

    } catch (error) {
        console.error('Error:', error);
        typingIndicator.classList.remove('active');
        appendMessage('ai', "I apologize, but I'm having trouble connecting to the server. Please ensure the backend is running at http://localhost:5001.");
    }

    scrollToBottom();
}

function appendMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const icon = role === 'ai' ? '<i class="fas fa-bolt"></i>' : '<i class="fas fa-user"></i>';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${icon}
        </div>
        <div class="message-content">
            <div class="message-text">${formatMessage(text)}</div>
            <div class="message-actions">
                <button class="copy-btn" onclick="copyToClipboard('${text.replace(/'/g, "\\'").replace(/\n/g, "\\n")}')">
                    <i class="far fa-copy"></i> Copy
                </button>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
}

function formatMessage(text) {
    return text.replace(/\n/g, '<br>');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast();
    });
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Share Logic
function shareChat() {
    if (!currentConversationId) {
        showToast("Start a chat first!");
        return;
    }
    const currentConv = conversations.find(c => c.id === currentConversationId);
    const content = btoa(JSON.stringify(currentConv.messages));
    const url = `${window.location.origin}${window.location.pathname}?share=${content}`;
    
    navigator.clipboard.writeText(url).then(() => {
        showToast("Share link copied!");
    });
}

// History Management
function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
}

function renderChatHistory() {
    if (conversations.length === 0) {
        chatHistoryContainer.innerHTML = '<div class="history-label">Recent Chats</div><div class="history-empty">No conversations yet</div>';
        return;
    }

    chatHistoryContainer.innerHTML = '<div class="history-label">Recent Chats</div>';
    
    conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = `history-item ${conv.id === currentConversationId ? 'active' : ''}`;
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = conv.title;
        
        item.innerHTML = `<i class="far fa-message"></i>`;
        item.appendChild(titleSpan);
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-chat-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = 'Delete Chat';
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openDeleteModal(conv.id);
        });
        
        item.appendChild(deleteBtn);
        
        item.addEventListener('click', () => {
            loadConversation(conv.id);
        });
        
        chatHistoryContainer.appendChild(item);
    });
}

function openDeleteModal(id) {
    conversationToDelete = id;
    deleteModal.classList.add('active');
}

function closeDeleteModal() {
    conversationToDelete = null;
    deleteModal.classList.remove('active');
}

function confirmDelete() {
    if (!conversationToDelete) return;
    
    const id = conversationToDelete;
    console.log("Execution: Permanently deleting conversation", id);
    
    const index = conversations.findIndex(c => c.id === id);
    if (index !== -1) {
        conversations.splice(index, 1);
        saveConversations();
        
        if (currentConversationId === id) {
            startNewChat();
        }
        
        renderChatHistory();
        showToast("Chat permanently removed");
    }
    
    closeDeleteModal();
}

function loadConversation(id) {
    currentConversationId = id;
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;

    welcomeScreen.style.display = 'none';
    messagesContainer.innerHTML = '';
    
    conv.messages.forEach(msg => {
        appendMessage(msg.role, msg.content);
    });

    renderChatHistory();
    scrollToBottom();
}

// Start the app
init();
