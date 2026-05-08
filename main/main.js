import 'dotenv/config';
import express from 'express';
import mysql, { Connection } from 'mysql2';
import config from './config.js';
import { body, validationResult } from 'express-validator';

const app = express();
const port = config.port;

app.use(express.json());

// inisialisasi koneksi ke database
const db = mysql.createPool(config.db);

// buat ambil data dari gateway
const identifyUser = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId || !userRole) {
        return res.status(401).json({ 
            status: "error",
            message: "Akses ilegal. Silakan mengaksesnya lewat Gateway" 
        });
    }

    req.user = { id: userId, role: userRole };
    next();
};

// buat validasi input dari user
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
};

// ambil data (Admin: lihat semua, Mahasiswa: miliknya sendiri)
app.get('/laporan', identifyUser, (req, res) => {
    let query = "SELECT * FROM pengaduan";
    let params = [];

    if (req.user.role !== 'admin') {
        // Cari NIM mahasiswa berdasarkan user_id (karena di JWT cuma ada user_id)
        // Atau kamu bisa modifikasi JWT agar bawa NIM juga biar lebih cepat
        query = "SELECT p.* FROM pengaduan p JOIN mahasiswa m ON p.nim_pelapor = m.nim WHERE m.user_id = ?";
        params = [req.user.id];
    }

    db.query(query, params, (err, results) => {
        if (err) {
            return res.status(500).json({
                status: "error",
                message: "Terjadi kesalahan pada database, silakan coba lagi nanti",
                error: err.message
            });
        }

        // Jika berhasil
        res.status(200).json({
            status: "success",
            message: "Data berhasil diambil",
            data: results
            });
    });
});

// buat laporan (Mahasiswa only) & producer RabbitMQ
app.post('/laporan', [
    identifyUser,
    body('isi_laporan')
        .notEmpty().withMessage('Isi laporan tidak boleh kosong')
        .isLength({ min: 10 }).withMessage('Isi laporan minimal 10 karakter'),
    validate 
], (req, res) => {
    if (req.user.role !== 'mahasiswa') {
        return res.status(403).json({ 
            status: "error",
            message: "Hanya mahasiswa yang bisa melapor" 
        });
    }
     
    const { isi_laporan } = req.body;

    // cari NIM berdasarkan user_id
    db.query("SELECT nim FROM mahasiswa WHERE user_id = ?", [req.user.id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ 
                status: "error",
                message: "Data mahasiswa tidak ditemukan" 
            });
        }

        const nim = results[0].nim;

        // simpan ke Database
        const queryInsert = "INSERT INTO pengaduan (nim_pelapor, isi_laporan) VALUES (?, ?)";
        db.query(queryInsert, [nim, isi_laporan], async (err, result) => {
            if (err) { 
                return res.status(500).json({ 
                    status: "error",
                    message: "Server sedang bermasalah, silakan coba lagi nanti"  
                });
            }

            const newLaporan = {
                id: result.insertId,
                nim: nim,
                isi: isi_laporan,
                status: 'pending'
            };

            // kirim ke RabbitMQ
            try {
                const connection = await amqp.connect('amqp://localhost');
                const channel = await connection.createChannel();
                const queue = 'laporan_queue';
                
                await channel.assertQueue(queue, { durable: true }); // biar pesan gk hilang klo rabbitmq restart
                channel.sendToQueue(queue, Buffer.from(JSON.stringify(newLaporan)));
                
                console.log(" [x] Sent to RabbitMQ:", newLaporan);
                
                // respon ke client tanpa menunggu consumer
                res.status(201).json({
                    status: "success",
                    message: "Laporan berhasil dibuat dan sedang diproses oleh sistem",
                    data: newLaporan
                });

                setTimeout(() => connection.close(), 500);
            } catch (error) {
                console.error("RabbitMQ Error:", error);
                // Tetap kirim sukses karena DB sudah masuk
                res.status(201).json({ 
                    status: "success", 
                    message: "Laporan tersimpan (Log MQ Gagal)" 
                });
            }
        });
    });
});

// update status laporan (Admin Only)
app.put('/laporan/:id', [
    identifyUser,
    body('status')
        .isIn(['pending', 'proses', 'selesai'])
        .withMessage('Status harus berupa: pending, proses, atau selesai'),
    validate
], (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            status: "error",
            message: "Akses ditolak" 
        });
    }
    const { status } = req.body; // pending, proses, selesai
    
    db.query("UPDATE pengaduan SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
        if (err) {
            return res.status(500).json({ 
                 status: "error",
                message: "Database sedang bermasalah"  
            });
        }
        res.status(200).json({ 
            status: "success",
            message: "Status laporan berhasil diperbarui" 
        });
    });
});

// delete laporan (Admin only) 
app.delete('/laporan/:id', identifyUser, (req, res) => {
    // Cek apakah yang akses adalah admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            status: "error",
            message: "Hanya admin yang diperbolehkan menghapus laporan" 
        });
    }

    const laporanId = req.params.id;

    db.query("DELETE FROM pengaduan WHERE id = ?", [laporanId], (err, result) => {
        if (err) {
            return res.status(500).json({ 
                status: "error",
                message: "Gagal menghapus data dari database" 
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                status: "error",
                message: "Laporan tidak ditemukan" 
            });
        }

        res.status(200).json({ 
            status: "success",
            message: `Laporan dengan ID ${laporanId} berhasil dihapus` 
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});