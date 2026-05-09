import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import config from './config.js'
import rateLimit from 'express-rate-limit';
import mysql from 'mysql2';

const app = express();
const port = 4077;

// port gateway = 4077
// port auth = 4177
// port service main = 4277

// inisialisasi koneksi ke database
const db = mysql.createPool(config.db);

app.set('trust proxy', 1);

// set rate limit request
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 menit
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: "error",
        message: "Terlalu banyak request, silakan coba lagi nanti"
    }
});

app.use(limiter);

// --- PUBLIC ROUTE (Tanpa JWT) ---
app.use('/auth', (req, res, next) => {
    const publicPaths = ['/register', '/login', '/refresh-token', '/register-admin'];
    
    if (publicPaths.includes(req.path)) {
        return createProxyMiddleware({
            target: 'http://localhost:4177',
            changeOrigin: true,
            pathRewrite: { 
                '^/auth': '' 
            }
        })(req, res, next);
    }
    next();
});

// buat cek JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            status: "error",
            message: "Token JWT tidak ditemukan" 
        });
    }

    db.query("SELECT * FROM token_blacklist WHERE token = ?", [token], (err, results) => {
        if  (err) return res.status(500).json({ 
            status: "error",
            message: "Terjadi gangguan pada server, silakan coba lagi nanti"
        });
    
        if (results.length > 0) {
            return res.status(403).json({ 
                status: "error",
                message: "Token JWT yang anda masukkan tidak valid" 
            });
        }

        // verifikasi token pakai secret key
        jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ 
                    status: "error",
                    message: "Token JWT yang anda beri tidak valid"
                });
            }
            req.user = user;
            
            req.headers['x-user-data'] = JSON.stringify({
                id: user.id,
                username: user.username,
                role: user.role || 'mahasiswa'
            });
            next();
        });
    });
};

// --- PROTECTED ROUTE (ada JWT) ---
// API gateway arahin request ke /auth/profile
app.get('/auth/profile', authenticateToken, createProxyMiddleware({
    target: 'http://localhost:4177',
    changeOrigin: true,
    pathRewrite: { 
        '^/auth': '' 
    }
}));

// API gateway arahin request ke /auth/logout
app.post('/auth/logout', authenticateToken, createProxyMiddleware({
    target: 'http://localhost:4177',
    changeOrigin: true,
    pathRewrite: { 
        '^/auth': '' 
    }
}));

// API gateway arahin request ke service complaints/laporan
app.use('/complaints', authenticateToken, createProxyMiddleware({
    target: 'http://localhost:4277', 
    changeOrigin: true,
    pathRewrite: {
        '^/complaints': '',
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// port
app.listen(port, () => {
    console.log(`API Gateway berjalan di port ${port}`);
});