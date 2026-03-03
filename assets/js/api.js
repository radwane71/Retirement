// إدارة الـ API Calls
class APIManager {
    constructor() {
        this.API_URL = 'http://localhost:3000/api';
    }

    // حفظ نسخة احتياطية
    async createBackup(trades, dividends, roadmap) {
        try {
            const response = await fetch(`${this.API_URL}/data/backup`, {
                method: 'POST',
                headers: authManager.getAuthHeaders(),
                body: JSON.stringify({ trades, dividends, roadmap })
            });

            return await response.json();
        } catch (error) {
            console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
            throw error;
        }
    }

    // تصدير البيانات
    async exportData(trades, dividends, roadmap) {
        try {
            const response = await fetch(`${this.API_URL}/data/export`, {
                method: 'POST',
                headers: authManager.getAuthHeaders(),
                body: JSON.stringify({ trades, dividends, roadmap })
            });

            const result = await response.json();
            
            if (result.success) {
                // تحميل الملف
                const blob = new Blob([JSON.stringify(result.data, null, 2)], { 
                    type: 'application/json' 
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `retirement_backup_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }

            return result;
        } catch (error) {
            console.error('خطأ في تصدير البيانات:', error);
            throw error;
        }
    }

    // استيراد البيانات
    async importData(jsonData) {
        try {
            const response = await fetch(`${this.API_URL}/data/import`, {
                method: 'POST',
                headers: authManager.getAuthHeaders(),
                body: JSON.stringify(jsonData)
            });

            return await response.json();
        } catch (error) {
            console.error('خطأ في استيراد البيانات:', error);
            throw error;
        }
    }

    // قائمة النسخ الاحتياطية
    async listBackups() {
        try {
            const response = await fetch(`${this.API_URL}/data/backups`, {
                headers: authManager.getAuthHeaders()
            });

            return await response.json();
        } catch (error) {
            console.error('خطأ في قراءة النسخ:', error);
            throw error;
        }
    }

    // استعادة نسخة
    async restoreBackup(filename) {
        try {
            const response = await fetch(`${this.API_URL}/data/restore/${filename}`, {
                headers: authManager.getAuthHeaders()
            });

            return await response.json();
        } catch (error) {
            console.error('خطأ في استعادة النسخة:', error);
            throw error;
        }
    }

    // حذف نسخة
    async deleteBackup(filename) {
        try {
            const response = await fetch(`${this.API_URL}/data/backup/${filename}`, {
                method: 'DELETE',
                headers: authManager.getAuthHeaders()
            });

            return await response.json();
        } catch (error) {
            console.error('خطأ في حذف النسخة:', error);
            throw error;
        }
    }
}

const apiManager = new APIManager();
