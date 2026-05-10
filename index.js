const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080; 

// 1. Meningkatkan limit body parser agar bisa menerima string Base64 yang besar
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// 2. Perbaikan Nama Variabel Database (Menyesuaikan dengan Railway)
const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQL_DATABASE, // REVISI: Tambahkan garis bawah (_) agar terbaca Railway
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 3. Fungsi Inisialisasi Database
const initDB = () => {
    // Menggunakan LONGTEXT agar data foto tidak terpotong (Database Sync)
    const tableQuery = `
        CREATE TABLE IF NOT EXISTS profiles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            score INT DEFAULT 0,
            avatar_url LONGTEXT
        ) ENGINE=InnoDB;
    `;
    
    pool.query(tableQuery, (err) => {
        if (err) {
            console.error("Database Error (Create Table):", err.message);
        } else {
            console.log("Database Sync: OK (Tabel Profiles Siap - LONGTEXT)");
        }
    });
};

// Jalankan pembuatan tabel saat server start
initDB();

// --- API LOGIN & AUTO-REGISTER ---
app.post('/login', (req, res) => {
    const { username, password, avatar_url } = req.body;
    
    // Validasi input dasar
    const cleanUsername = username ? username.trim() : null;
    const cleanPassword = password ? password.trim() : null;
    const finalAvatar = (avatar_url && avatar_url !== 'none' && avatar_url !== '') ? avatar_url : 'none';

    if (!cleanUsername || !cleanPassword) {
        return res.status(400).send("INPUT_EMPTY");
    }

    // Cek apakah user sudah ada
    pool.query('SELECT * FROM profiles WHERE username = ?', [cleanUsername], (err, results) => {
        if (err) {
            console.error("Login Query Error:", err);
            return res.status(500).send("DB_ERROR");
        }

        if (results.length > 0) {
            // User ditemukan, cek password
            if (results[0].password === cleanPassword) {
                // Update avatar terbaru saat login jika user mengirim foto baru
                if (finalAvatar !== 'none') {
                    pool.query('UPDATE profiles SET avatar_url = ? WHERE username = ?', [finalAvatar, cleanUsername], (updErr) => {
                        if (updErr) console.error("Update Avatar Error:", updErr);
                    });
                }
                return res.status(200).send("success");
            } else {
                return res.status(401).send("WRONG_PASSWORD");
            }
        } else {
            // User tidak ditemukan, lakukan Auto-Register
            pool.query('INSERT INTO profiles (username, password, score, avatar_url) VALUES (?, ?, 0, ?)', 
            [cleanUsername, cleanPassword, finalAvatar], (insErr) => {
                if (insErr) {
                    console.error("Register Error:", insErr);
                    return res.status(500).send("REG_FAILED");
                }
                return res.status(200).send("success");
            });
        }
    });
});

// --- API GET PROFILE ---
app.get('/get-profile/:username', (req, res) => {
    const { username } = req.params;
    pool.query('SELECT avatar_url, score FROM profiles WHERE username = ?', [username], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send("NOT_FOUND");
        }
        res.json(results[0]);
    });
});

// Jalankan Server
app.listen(port, "0.0.0.0", () => {
    console.log(`Server aktif di port ${port}`);
});