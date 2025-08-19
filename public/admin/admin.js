class AdminDashboard {
    constructor() {
        this.token = localStorage.getItem('hr_chatbot_token');
        this.baseUrl = '/api';
        this.init();
    }

    async init() {
        if (!this.token) {
            this.redirectToLogin();
            return;
        }

        await this.loadUserProfile();
        this.setupEventListeners();
        this.loadDashboardData();
    }

    async loadUserProfile() {
        try {
            const response = await this.apiCall('/auth/profile');
            if (response.role !== 'admin' && response.role !== 'hr') {
                alert('Admin access required');
                this.redirectToLogin();
                return;
            }
            document.getElementById('user-name').textContent = response.name;
        } catch (error) {
            console.error('Failed to load profile:', error);
            this.redirectToLogin();
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('hr_chatbot_token');
            this.redirectToLogin();
        });

        // Sync policies
        document.getElementById('sync-policies').addEventListener('click', () => {
            this.syncPolicies();
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('border-blue-500', 'text-blue-600');
        document.querySelector(`[data-tab="${tabName}"]`).classList.remove('border-transparent', 'text-gray-500');

        // Show/hide content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${tabName}-tab`).classList.remove('hidden');

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadDashboardData() {
        try {
            const analytics = await this.apiCall('/admin/analytics');
            this.updateStatsCards(analytics.totals);
            this.loadTabData('analytics');
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateStatsCards(totals) {
        document.getElementById('total-queries').textContent = totals.queries || 0;
        document.getElementById('total-users').textContent = totals.users || 0;
        document.getElementById('total-policies').textContent = totals.policies || 0;
        document.getElementById('avg-rating').textContent = '4.2'; // Placeholder
    }

    async loadTabData(tabName) {
        try {
            switch (tabName) {
                case 'analytics':
                    await this.loadAnalytics();
                    break;
                case 'reports':
                    await this.loadReports();
                    break;
                case 'policies':
                    await this.loadPolicies();
                    break;
                case 'users':
                    await this.loadUsers();
                    break;
            }
        } catch (error) {
            console.error(`Failed to load ${tabName} data:`, error);
        }
    }

    async loadAnalytics() {
        const analytics = await this.apiCall('/admin/analytics');
        
        // Create chart
        const ctx = document.getElementById('analytics-chart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: analytics.analytics.map(a => new Date(a.date).toLocaleDateString()),
                datasets: [{
                    label: 'Total Queries',
                    data: analytics.analytics.map(a => a.total_queries),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    async loadReports() {
        const [topAnswered, topUnanswered] = await Promise.all([
            this.apiCall('/admin/reports/top-answered'),
            this.apiCall('/admin/reports/top-unanswered')
        ]);

        this.renderReportList('top-answered', topAnswered.data);
        this.renderReportList('top-unanswered', topUnanswered.data);
    }

    renderReportList(containerId, data) {
        const container = document.getElementById(containerId);
        container.innerHTML = data.map(item => `
            <div class="bg-gray-50 p-3 rounded">
                <p class="font-medium">${item.query_text}</p>
                <p class="text-sm text-gray-600">Frequency: ${item.frequency}</p>
            </div>
        `).join('');
    }

    async loadPolicies() {
        const policies = await this.apiCall('/policies');
        const container = document.getElementById('policies-list');
        
        container.innerHTML = policies.policies.map(policy => `
            <div class="bg-gray-50 p-4 rounded flex justify-between items-center">
                <div>
                    <h4 class="font-medium">${policy.title}</h4>
                    <p class="text-sm text-gray-600">Category: ${policy.category}</p>
                    <p class="text-xs text-gray-500">Updated: ${new Date(policy.last_updated).toLocaleDateString()}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                    <button class="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async loadUsers() {
        const users = await this.apiCall('/admin/users');
        const container = document.getElementById('users-list');
        
        container.innerHTML = users.users.map(user => `
            <div class="bg-gray-50 p-4 rounded flex justify-between items-center">
                <div>
                    <h4 class="font-medium">${user.name}</h4>
                    <p class="text-sm text-gray-600">${user.email}</p>
                    <p class="text-xs text-gray-500">Queries: ${user.totalQueries} | Rating: ${user.avgRating || 'N/A'}</p>
                </div>
                <select class="border rounded px-2 py-1 text-sm" onchange="dashboard.updateUserRole(${user.id}, this.value)">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="hr" ${user.role === 'hr' ? 'selected' : ''}>HR</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </div>
        `).join('');
    }

    async syncPolicies() {
        try {
            this.showLoading(true);
            await this.apiCall('/policies/sync', 'POST');
            alert('Policies synced successfully!');
            this.loadPolicies();
        } catch (error) {
            alert('Failed to sync policies: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async updateUserRole(userId, newRole) {
        try {
            await this.apiCall(`/admin/users/${userId}/role`, 'PATCH', { role: newRole });
            alert('User role updated successfully!');
        } catch (error) {
            alert('Failed to update user role: ' + error.message);
        }
    }

    async apiCall(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(this.baseUrl + endpoint, options);
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }

        return response.json();
    }

    showLoading(show) {
        document.getElementById('loading').classList.toggle('hidden', !show);
    }

    redirectToLogin() {
        window.location.href = '/admin/login.html';
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new AdminDashboard();
});
