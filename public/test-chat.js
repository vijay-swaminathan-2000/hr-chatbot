class ChatTester {
    constructor() {
        this.token = null;
        this.sessionId = null;
        this.init();
    }

    async init() {
        await this.loadUsers();
        this.setupEventListeners();
    }

    async loadUsers() {
        try {
            console.log('Loading users...');
            const response = await fetch('/api/test-auth/users');
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Users data:', data);
            
            const select = document.getElementById('user-select');
            if (data.users && data.users.length > 0) {
                select.innerHTML = '<option value="">Select test user...</option>' + 
                    data.users.map(user => 
                        `<option value="${user.email}">${user.name} (${user.role})</option>`
                    ).join('');
                console.log('Users loaded successfully');
            } else {
                select.innerHTML = '<option value="">No users found</option>';
            }
        } catch (error) {
            console.error('Load users error:', error);
            const select = document.getElementById('user-select');
            select.innerHTML = '<option value="">Error loading users</option>';
            this.showStatus('Failed to load users: ' + error.message, 'error');
        }
    }

    setupEventListeners() {
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        document.querySelectorAll('.quick-query').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('message-input').value = e.target.dataset.query;
                this.sendMessage();
            });
        });
    }

    async login() {
        const email = document.getElementById('user-select').value;
        if (!email) return;

        try {
            const response = await fetch('/api/test-auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                this.sessionId = `test_${Date.now()}`;
                this.showStatus(`Logged in as ${data.user.name}`, 'success');
                document.getElementById('login-section').classList.add('hidden');
                document.getElementById('chat-section').classList.remove('hidden');
                this.addMessage('system', 'Welcome! Ask me about company policies.');
            } else {
                this.showStatus(data.error, 'error');
            }
        } catch (error) {
            this.showStatus('Login failed', 'error');
        }
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        if (!message || !this.token) return;

        input.value = '';
        this.addMessage('user', message);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    message, 
                    sessionId: this.sessionId 
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.addMessage('bot', data.response, data.type, data.confidence);
            } else {
                this.addMessage('bot', data.error || 'Sorry, I encountered an error.', 'error');
            }
        } catch (error) {
            this.addMessage('bot', 'Failed to send message. Please try again.', 'error');
        }
    }

    addMessage(sender, text, type = null, confidence = null) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        
        let bgColor = sender === 'user' ? 'bg-blue-100' : 'bg-gray-100';
        if (type === 'error') bgColor = 'bg-red-100';
        if (type === 'escalation') bgColor = 'bg-yellow-100';

        messageDiv.className = `p-4 rounded-lg ${bgColor}`;
        
        let content = `<div class="font-semibold text-sm mb-1">${sender.toUpperCase()}</div>`;
        content += `<div class="whitespace-pre-wrap">${text}</div>`;
        
        if (confidence !== null) {
            content += `<div class="text-xs text-gray-500 mt-2">Confidence: ${Math.round(confidence * 100)}%</div>`;
        }

        messageDiv.innerHTML = content;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('login-status');
        statusEl.textContent = message;
        statusEl.className = `mt-2 text-sm ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatTester();
});
