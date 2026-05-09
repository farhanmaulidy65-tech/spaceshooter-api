const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Konfigurasi Database ---
const db = mysql.createConnection({
    host: process.env.MYSQLHOST || 'mysql.railway.internal',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'XMHEdTUDkVuiyWfGZripxsBAQUhtuWgT',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 3306
});

db.connect((err) => {
    if (err) {
        console.error('Koneksi MySQL Gagal: ' + err.stack);
        return;
    }
    console.log('Backend SpaceShooter Terhubung ke Database!');
});

// --- API Endpoints ---

/**
 * 1. LOGIN & AUTO-REGISTER
 * Jika username tidak ada, otomatis buat baru.
 */
app.post('/login', (req, res) => {
    const { username } = req.body;
    
    if (!username) return res.status(400).send("USERNAME_EMPTY");

    const checkQuery = 'SELECT * FROM profiles WHERE username = ?';
    
    db.query(checkQuery, [username], (err, results) => {
        if (err) return res.status(500).send("ERROR_DATABASE");

        if (results.length > 0) {
            // User sudah ada, langsung kirim sukses
            res.send("success");
        } else {
            // User baru, buat otomatis dengan skor 0 dan password default
            const insertQuery = 'INSERT INTO profiles (username, password, score, avatar_url) VALUES (?, ?, 0, ?)';
            db.query(insertQuery, [username, '123', 'none'], (err, result) => {
                if (err) return res.status(500).send("ERROR_INSERT");
                res.send("success");
            });
        }
    });
});

/**
 * 2. GET PROFILE DATA
 * Digunakan untuk mengambil foto profil & skor saat masuk ke Scene Menu.
 */
app.get('/get-profile/:username', (req, res) => {
    const { username } = req.params;
    const query = 'SELECT username, avatar_url, score FROM profiles WHERE username = ?';

    db.query(query, [username], (err, results) => {
        if (err) return res.status(500).json({ error: "DB_ERROR" });
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: "NOT_FOUND" });
        }
    });
});

/**
 * 3. UPDATE PROFILE (AVATAR)
 */
app.post('/update-profile', (req, res) => {
    const { username, avatar_url } = req.body;
    const query = 'UPDATE profiles SET avatar_url = ? WHERE username = ?';

    db.query(query, [avatar_url, username], (err, result) => {
        if (err) return res.status(500).send("ERROR");
        res.send("success");
    });
});

/**
 * 4. UPDATE SCORE
 * Digunakan saat Game Over untuk mengirim skor terbaru.
 */
app.post('/update-score', (req, res) => {
    const { username, score } = req.body;
    const query = 'UPDATE profiles SET score = ? WHERE username = ? AND ? > score';

    // Hanya update jika skor baru lebih tinggi dari skor lama (Highscore logic)
    db.query(query, [score, username, score], (err, result) => {
        if (err) return res.status(500).send("ERROR");
        res.send("success");
    });
});

/**
 * 5. LEADERBOARD (TOP 10)
 */
app.get('/leaderboard', (req, res) => {
    const query = 'SELECT username, score, avatar_url FROM profiles ORDER BY score DESC LIMIT 10';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// --- Menjalankan Server ---
app.listen(port, () => {
    console.log(`Server aktif dan profesional di port ${port}`);
});