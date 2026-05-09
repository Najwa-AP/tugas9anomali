import 'dotenv/config';
import express from 'express';
import mysql, { Connection } from 'mysql2';
import config from './config.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';

const app = express();
const port = config.port;

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// inisialisasi koneksi ke database
const db = mysql.createPool(config.db);

const generateTokens = (user) => {
    const payload = {
        id: user.id, 
        username: user.username, 
        role: user.role
    };
    const accessToken = jwt.sign(
        payload,
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '45m' }
    );
    const refreshToken = jwt.sign(
        payload,
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
};

db.getConnection((err, connection) => {
    if (err) {
        console.error(
            "Gagal terhubung ke database, ", err.message);
            process.exit(1);
    }
    console.log("Berhasil terhubung ke database");
    connection.release();
});

// buat validasi input
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: "error",
            message: "Validasi gagal",
            errors: errors.array().map(err => ({ 
                field: err.path, 
                message: err.msg 
            }))
        });
    }
    next();
}

// route buat refresh token
app.post('/refresh-token', (req, res) => { 
    const { token } = req.body;
    if (!token) return res.status(401).json({
        status: "error",
        message: "Gagal refresh token. Token tidak ditemukan",
    });

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
        if (err) return res.status(403).json({
            status: "error",
            message: "Sesi login telah berakhir. Silakan login kembali",
        });

        // buat access token baru
        const accessToken = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '15m' }
        );
        res.status(200).json({ 
            status: "success",
            message: "Berhasil merefresh token!",
            access_token: accessToken 
        });
    });
});

// route buat register 
app.post('/register', [
    body('username').isLength({ min: 5 }).withMessage('Username minimal 5 karakter'),
    body('password').isLength({ min: 8 }).withMessage('Password minimal 8 karakter'),
    body('nim').isNumeric().withMessage('NIM harus berupa angka'),
    body('nama').notEmpty(),
    body('prodi').notEmpty(),
    validate 
], async (req, res) => {
    const { username, password, nim, nama, prodi } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ 
            status: "error", 
            message: "Tidak bisa terhubung ke server, silakan coba lagi nanti" 
        });

        connection.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ 
                status: "error", 
                message: "Transaction ke database gagal" 
            });

            // Insert table users
            const q1 = "INSERT INTO users (username, password, role) VALUES (?, ?, 'mahasiswa')";
            connection.query(q1, [username, hashedPassword], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        res.status(400).json({ 
                            status: "error", 
                            message: "Username sudah ada, silakan pilih username lain" });
                    });
                }

                const userId = result.insertId;

                // Insert table mahasiswa
                const q2 = "INSERT INTO mahasiswa (nim, user_id, nama, prodi) VALUES (?, ?, ?, ?)";
                connection.query(q2, [nim, userId, nama, prodi], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            res.status(400).json({ 
                                status: "error", 
                                message: "NIM sudah terdaftar dalam database" 
                            });
                        });
                    }

                    // komit jika kedua query sukses
                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                            });
                        };
                        res.status(201).json({ 
                            status: "success", 
                            message: "Registrasi Mahasiswa Berhasil" 
                        });
                        connection.release();
                    });
                });
            });
        });
    });
});

// route buat register admin 
app.post('/register-admin', [
    body('username').notEmpty(),
    body('password').isLength({ min: 8 }).withMessage('Password minimal 8 karakter'),
    validate 
], async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ 
            status: "error", 
            message: "Tidak bisa terhubung ke server, silakan coba lagi nanti" 
        });

        connection.beginTransaction(async (err) => {
            if (err) return res.status(500).json({ 
                status: "error", 
                message: "Transaction ke database gagal" 
            });

            // Insert table users
            const q1 = "INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')";
            connection.query(q1, [username, hashedPassword], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        res.status(400).json({ 
                            status: "error", 
                            message: "Username sudah ada, silakan pilih username lain" });
                    });
                }

                connection.commit((err) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                        });
                    };
                    res.status(201).json({ 
                        status: "success", 
                        message: "Registrasi Admin Berhasil" 
                    });
                    connection.release();
                });
            });
        });
    });
});

// route buat login
app.post('/login', [
    body('username').notEmpty().withMessage('Username tidak boleh kosong'),
    body('password').notEmpty().withMessage('Password tidak boleh kosong'),
    validate 
], (req, res) => {
    const { username, password } = req.body;

    const query = "SELECT * FROM users WHERE username = ?";
    db.query(query, [username], (err, results) => {
        if (err) {
            return res.status(500).json({ 
                status: "error", 
                message: "Server sedang error, silakan coba lagi nanti" 
            });
        };

        if (results.length === 0) {
            return res.status(401).json({ 
                status: "error",
                message: "Username atau password yang anda masukkan salah" 
            });
        };

        const user = results[0];

        const payload = { 
            id: user.id, 
            username: user.username, 
            role: user.role // otomatis di isi role"mahasiswa"
        };

        // banding password
        const isMatch = bcrypt.compareSync(password, user.password);
        if (isMatch) {
            const tokens = generateTokens(user);
            res.json({
                status: "success",
                message: "Login Berhasil",
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        role: user.role
                    },
                    ...tokens
                }
            });
        } else {
            return res.status(401).json({ 
                status: "error",
                message: "Username atau password yang anda masukkan salah" 
            });
        }
    });
});

// API gateway proses request logout
app.post('/logout', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({
            status: "error",
            message: "Token tidak ditemukan" })
    };

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.decode(token);
        const expiry = new Date(decoded.exp * 1000).toISOString().slice(0, 19).replace('T', ' ');

        const query = "INSERT INTO token_blacklist (token, expires_at) VALUES (?, ?)";
        db.query(query, [token, expiry], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(200).json({ 
                        status: "success", 
                        message: "User sudah logout" 
                    });
                }
                return res.status(500).json({ 
                    status: "error", 
                    message: "Gagal memproses logout" 
                });
            }
            
            res.json({ 
                status: "success", 
                message: "Logout berhasil, token telah dinonaktifkan" 
            });
        });
    } catch (error) {
        res.status(400).json({ 
            status: "error", 
            message: "Token tidak valid" 
        });
    }
});

// route buat lihat profil user sehabis login
app.get('/profile', (req, res) => {
    const userData = req.headers['x-user-data'];

    if (!userData) {
        return res.status(401).json({ 
            status: "error",
            message: "Informasi user tidak ditemukan"
        });
    }

    const user = JSON.parse(userData);

    res.status(200).json({
        status: "success",
        message: "Profil berhasil dimuat",
        user: user
    });
});

app.listen(port, () => {
    console.log(`Service Auth sedang berjalan dari port ${port}`);
});