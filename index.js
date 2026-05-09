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

// --- Konfigurasi Database (Menggunakan Pool agar lebih stabil) ---
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'mysql.railway.internal',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'XMHEdTUDkVuiyWfGZripxsBAQUhtuWgT',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test koneksi awal
pool.getConnection((err, connection) => {
    if (err) {
        console.error('CRITICAL: Koneksi MySQL Gagal! ->', err.message);
    } else {
        console.log('SUCCESS: Database SpaceShooter Siap Digunakan!');
        connection.release();
    }
});

// --- API Endpoints ---

/**
 * 1. LOGIN & AUTO-REGISTER
 * Menangani player masuk hanya dengan nama.
 */
app.post('/login', (req, res) => {
    const { username } = req.body;
    
    if (!username || username.trim() === "") {
        return res.status(400).send("USERNAME_EMPTY");
    }

    const checkQuery = 'SELECT * FROM profiles WHERE username = ?';
    
    pool.query(checkQuery, [username], (err, results) => {
        if (err) {
            console.error("[Login Error]:", err.message);
            return res.status(500).send("INTERNAL_SERVER_ERROR");
        }

        if (results.length > 0) {
            res.status(200).send("success");
        } else {
            // Auto-Register user baru
            const insertQuery = 'INSERT INTO profiles (username, password, score, avatar_url) VALUES (?, ?, 0, ?)';
            pool.query(insertQuery, [username, '123', 'none'], (insertErr) => {
                if (insertErr) {
                    console.error("[Register Error]:", insertErr.message);
                    return res.status(500).send("FAILED_TO_CREATE_USER");
                }
                res.status(201).send("success");
            });
        }
    });
});

/**
 * 2. GET PROFILE DATA
 * Mengambil data spesifik satu player.
 */
app.get('/get-profile/:username', (req, res) => {
    const { username } = req.params;
    const query = 'SELECT username, avatar_url, score FROM profiles WHERE username = ?';

    pool.query(query, [username], (err, results) => {
        if (err) {
            console.error("[GetProfile Error]:", err.message);
            return res.status(500).json({ error: "DATABASE_ERROR" });
        }
        
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: "USER_NOT_FOUND" });
        }
    });
});

/**
 * 3. UPDATE PROFILE (AVATAR)
 */
app.post('/update-profile', (req, res) => {
    const { username, avatar_url } = req.body;
    const query = 'UPDATE profiles SET avatar_url = ? WHERE username = ?';

    pool.query(query, [avatar_url, username], (err) => {
        if (err) {
            console.error("[UpdateProfile Error]:", err.message);
            return res.status(500).send("ERROR");
        }
        res.send("success");
    });
});

/**
 * 4. UPDATE SCORE (HIGHSCORE LOGIC)
 */
app.post('/update-score', (req, res) => {
    const { username, score } = req.body;
    
    // Pastikan score adalah angka
    const newScore = parseInt(score);
    if (isNaN(newScore)) return res.status(400).send("INVALID_SCORE");

    // Hanya update jika skor baru lebih tinggi (Highscore)
    const query = 'UPDATE profiles SET score = ? WHERE username = ? AND ? > score';

    pool.query(query, [newScore, username, newScore], (err, result) => {
        if (err) {
            console.error("[UpdateScore Error]:", err.message);
            return res.status(500).send("ERROR");
        }
        res.send("success");
    });
});

/**
 * 5. LEADERBOARD (TOP 10)
 */
app.get('/leaderboard', (req, res) => {
    const query = 'SELECT username, score, avatar_url FROM profiles ORDER BY score DESC LIMIT 10';
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error("[Leaderboard Error]:", err.message);
            return res.status(500).json({ error: "FAILED_FETCH_LEADERBOARD" });
        }
        res.json(results);
    });
});

// --- Health Check ---
app.get('/', (req, res) => res.send("API SpaceShooter is Running Online!"));

// --- Start Server ---
app.listen(port, () => {
    console.log(`==========================================`);
    console.log(`Server aktif di port: ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`==========================================`);
});