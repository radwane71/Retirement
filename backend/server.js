require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting للحماية من الهجمات
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 5, // 5 محاولات فقط
    message: { error: 'كثرت محاولات الدخول. حاول بعد 15 دقيقة.' }
});

// مسار ملف البيانات
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// إنشاء المجلدات إذا لم تكن موجودة
const initializeDirectories = async () => {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        
        // إنشاء ملف المستخدمين الافتراضي
        try {
            await fs.access(USERS_FILE);
        } catch {
            const defaultPassword = await bcrypt.hash('1117473137', 10);
            const defaultUser = {
                username: 'radwan aljohani',
                password: defaultPassword,
                email: 'radwan@retirement.com',
                createdAt: new Date().toISOString()
            };
            await fs.writeFile(USERS_FILE, JSON.stringify({ users: [defaultUser] }, null, 2));
            console.log('✅ ملف المستخدمين تم إنشاؤه');
        }
    } catch (error) {
        console.error('❌ خطأ في تهيئة المجلدات:', error);
    }
};

// Middleware للتحقق من الـ Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'لا يوجد صلاحية وصول' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'الجلسة انتهت، سجل دخول مرة أخرى' });
        }
        req.user = user;
        next();
    });
};

// 🔐 API: تسجيل الدخول
app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'أدخل اسم المستخدم وكلمة المرور' });
        }

        const usersData = JSON.parse(await fs.readFile(USERS_FILE, 'utf-8'));
        const user = usersData.users.find(u => u.username === username);

        if (!user) {
            return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
        }

        const token = jwt.sign(
            { username: user.username, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            token,
            user: {
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// 💾 API: حفظ البيانات (Backup كامل)
app.post('/api/data/backup', authenticateToken, async (req, res) => {
    try {
        const { trades, dividends, roadmap } = req.body;

        if (!trades && !dividends && !roadmap) {
            return res.status(400).json({ error: 'لا توجد بيانات للحفظ' });
        }

        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            user: req.user.username,
            data: {
                trades: trades || [],
                dividends: dividends || [],
                roadmap: roadmap || []
            }
        };

        const filename = `backup_${Date.now()}.json`;
        const filepath = path.join(BACKUP_DIR, filename);

        await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));

        res.json({
            success: true,
            message: 'تم حفظ النسخة الاحتياطية بنجاح',
            filename,
            timestamp: backupData.timestamp
        });

    } catch (error) {
        console.error('خطأ في حفظ البيانات:', error);
        res.status(500).json({ error: 'فشل حفظ البيانات' });
    }
});

// 📥 API: تصدير البيانات (Download JSON)
app.post('/api/data/export', authenticateToken, async (req, res) => {
    try {
        const { trades, dividends, roadmap } = req.body;

        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            user: req.user.username,
            data: {
                trades: trades || [],
                dividends: dividends || [],
                roadmap: roadmap || []
            }
        };

        res.json({
            success: true,
            data: exportData
        });

    } catch (error) {
        console.error('خطأ في تصدير البيانات:', error);
        res.status(500).json({ error: 'فشل تصدير البيانات' });
    }
});

// 📤 API: استيراد البيانات (Upload JSON)
app.post('/api/data/import', authenticateToken, async (req, res) => {
    try {
        const importData = req.body;

        // التحقق من صحة البيانات
        if (!importData.data || !importData.version) {
            return res.status(400).json({ error: 'ملف JSON غير صالح' });
        }

        res.json({
            success: true,
            message: 'تم استيراد البيانات بنجاح',
            data: importData.data
        });

    } catch (error) {
        console.error('خطأ في استيراد البيانات:', error);
        res.status(400).json({ error: 'ملف JSON تالف أو غير صالح' });
    }
});

// 📋 API: قائمة النسخ الاحتياطية
app.get('/api/data/backups', authenticateToken, async (req, res) => {
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const backups = files
            .filter(f => f.endsWith('.json'))
            .map(f => ({
                filename: f,
                timestamp: parseInt(f.split('_')[1].split('.')[0])
            }))
            .sort((a, b) => b.timestamp - a.timestamp);

        res.json({
            success: true,
            backups
        });

    } catch (error) {
        console.error('خطأ في قراءة النسخ الاحتياطية:', error);
        res.status(500).json({ error: 'فشل قراءة النسخ الاحتياطية' });
    }
});

// 🔄 API: استعادة نسخة احتياطية
app.get('/api/data/restore/:filename', authenticateToken, async (req, res) => {
    try {
        const filepath = path.join(BACKUP_DIR, req.params.filename);
        const backupContent = await fs.readFile(filepath, 'utf-8');
        const backupData = JSON.parse(backupContent);

        res.json({
            success: true,
            data: backupData.data
        });

    } catch (error) {
        console.error('خطأ في استعادة النسخة:', error);
        res.status(500).json({ error: 'فشل استعادة النسخة الاحتياطية' });
    }
});

// 🗑️ API: حذف نسخة احتياطية
app.delete('/api/data/backup/:filename', authenticateToken, async (req, res) => {
    try {
        const filepath = path.join(BACKUP_DIR, req.params.filename);
        await fs.unlink(filepath);

        res.json({
            success: true,
            message: 'تم حذف النسخة الاحتياطية'
        });

    } catch (error) {
        console.error('خطأ في حذف النسخة:', error);
        res.status(500).json({ error: 'فشل حذف النسخة' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// تشغيل الخادم
initializeDirectories().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Backend يعمل على: http://localhost:${PORT}`);
        console.log(`📁 مجلد البيانات: ${DATA_DIR}`);
        console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET.substring(0, 10)}...`);
    });
});
