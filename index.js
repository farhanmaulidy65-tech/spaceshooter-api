const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
// Railway menggunakan port 8080 secara internal, port 3000 tetap aman sebagai fallback
const port = process.env.PORT || 8080; 

// --- 1. Konfigurasi Database (Connection Pool) ---
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

// --- 2. Database Auto-Initializer (PENTING) ---
// Fungsi ini memastikan tabel selalu ada dan memiliki struktur yang benar (id auto-increment)
const initializeDatabase = () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS profiles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) DEFAULT '123',
            score INT DEFAULT 0,
            avatar_url VARCHAR(255) DEFAULT 'none'
        ) ENGINE=InnoDB;
    `;

    pool.query(createTableQuery, (err) => {
        if (err) {
            console.error('CRITICAL: Gagal inisialisasi tabel ->', err.message);
        } else {
            console.log('SUCCESS: Tabel "profiles" siap (Auto-Increment Aktif)');
        }
    });
};

// Jalankan inisialisasi saat startup
initializeDatabase();

// --- 3. Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 4. API Endpoints ---

/**
 * LOGIN & AUTO-REGISTER
 * Menggunakan logic profesional: Jika tidak ada, buat. Jika ada, sukses.
 */
app.post('/login', (req, res) => {
    const { username } = req.body;
    
    if (!username || username.trim() === "") {
        return res.status(400).send("USERNAME_EMPTY");
    }

    const checkUser = 'SELECT * FROM profiles WHERE username = ?';
    
    pool.query(checkUser, [username.trim()], (err, results) => {
        if (err) {
            console.error("[Login Error]:", err.message);
            return res.status(500).send("DB_ERROR");
        }

        if (results.length > 0) {
            res.status(200).send("success");
        } else {
            // Auto-Register: id tidak dimasukkan karena sudah AUTO_INCREMENT di DB
            const createUser = 'INSERT INTO profiles (username, password, score, avatar_url) VALUES (?, ?, 0, ?)';
            pool.query(createUser, [username.trim(), '123', 'none'], (insErr) => {
                if (insErr) {
                    console.error("[Register Error]:", insErr.message);
                    return res.status(500).send("REGISTER_FAILED");
                }
                res.status(201).send("success");
            });
        }
    });
});

/**
 * GET PROFILE DATA
 */
app.get('/get-profile/:username', (req, res) => {
    const { username } = req.params;
    const query = 'SELECT username, avatar_url, score FROM profiles WHERE username = ?';

    pool.query(query, [username], (err, results) => {
        if (err) return res.status(500).json({ error: "DB_ERROR" });
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: "USER_NOT_FOUND" });
        }
    });
});

/**
 * UPDATE SCORE (HIGHSCORE ONLY)
 */
app.post('/update-score', (req, res) => {
    const { username, score } = req.body;
    const newScore = parseInt(score);

    if (isNaN(newScore)) return res.status(400).send("INVALID_SCORE");

    // Hanya update jika skor baru > skor di database
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
 * LEADERBOARD
 */
app.get('/leaderboard', (req, res) => {
    const query = 'SELECT username, score, avatar_url FROM profiles ORDER BY score DESC LIMIT 10';
    
    pool.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: "FETCH_FAILED" });
        res.json(results);
    });
});

// --- 5. Health Check & Server Start ---
app.get('/', (req, res) => res.send("SpaceShooter API is Online. Ready to fly!"));

app.listen(port, () => {
    console.log(`==========================================`);
    console.log(` Server Engine Aktif di Port: ${port}`);
    console.log(` Database: ${process.env.MYSQLDATABASE || 'railway'}`);
    console.log(`==========================================`);
});