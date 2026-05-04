const express = require('express');
const mysql = require('mysql');
const router = express.Router();

//konfigurasi koneksi mysql
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_js_se' 
});

//koneksi ke mysql
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to MySQL');
});

// create mhs POST
router.post('/mahasiswa', (req, res) => {
    const { nim, nama, prodi } = req.body;
    const sql = `INSERT INTO mahasiswa (nim, nama, prodi) VALUES (?, ?, ?)`;
    db.query(sql, [nim, nama, prodi], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        } 
        res.status(201).send({nim: result.insertId, nim, nama, prodi});
    });
});

// read all mhs GET
router.get('/mahasiswa', (req, res) => {
    const sql =`SELECT * FROM mahasiswa`;
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(200).send(result);
    });
});

// read single mhs by nim GET
router.get('/mahasiswa/:nim', (req, res) => {
    const sql =`SELECT * FROM mahasiswa WHERE nim = ?`;
    db.query(sql, [req.params.nim], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (result.length === 0) {
            return res.status(404).send({ message: 'Mahasiswa not found'});
        }
        res.status(200).send(result[0]);
    });
});

// update mhs by nim PUT
router.put('/mahasiswa/:nim', (req, res) => {
    const { nim, nama, prodi } = req.body;
    const sql =`UPDATE mahasiswa SET nim = ?, nama = ?, prodi = ? WHERE nim = ?`;
    db.query(sql, [nim, nama, prodi, req.params.nim], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: 'Mahasiswa not found'});
        }
        res.status(200).send({ nim: req.params.nim, nama, prodi});
    });
});

// delete mhs by nim DELETE
router.delete('/mahasiswa/:nim', (req, res) => {
    const sql =`DELETE FROM mahasiswa WHERE nim = ?`;
    db.query(sql, [req.params.nim], (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: 'Mahasiswa not found'});
        }
        res.status(200).send({ message: 'Mahasiswa deleted successfully'});
    });
});

module.exports = router;