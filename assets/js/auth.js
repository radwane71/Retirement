// إدارة المصادقة والجلسات
class AuthManager {
    constructor() {
        this.API_URL = 'http://localhost:3000/api';
        this.tokenKey = 'retirement_auth_token';
        this.userKey = 'retirement_user_data';
    }

    // تسجيل الدخول
    async login(username, password) {
        try {
            const response = await fetch(`${this.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'فشل تسجيل الدخول');
            }

            // حفظ البيانات
            localStorage.setItem(this.tokenKey, data.token);
            localStorage.setItem(this.userKey, JSON.stringify(data.user));

            return { success: true, user: data.user };

        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            return { success: false, error: error.message };
        }
    }

    // تسجيل الخروج
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        window.location.href = 'login.html';
    }

    // التحقق من تسجيل الدخول
    isAuthenticated() {
        const token = localStorage.getItem(this.tokenKey);
        if (!token) return false;

        // التحقق من انتهاء صلاحية الـ Token
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch {
            return false;
        }
    }

    // حماية الصفحة (استدعاء في بداية كل صفحة)
    protectPage() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
        }
    }

    // الحصول على الـ Token
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // الحصول على بيانات المستخدم
    getUser() {
        const userData = localStorage.getItem(this.userKey);
        return userData ? JSON.parse(userData) : null;
    }

    // Headers للطلبات
    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
        };
    }
}

// إنشاء نسخة عامة
const authManager = new AuthManager();
