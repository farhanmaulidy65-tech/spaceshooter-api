const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
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

// --- 2. Database Auto-Initializer (Self-Healing) ---
const initializeDatabase = () => {
    // Memastikan tabel ada dengan ID yang otomatis bertambah (Auto-Increment)
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
            console.log('SUCCESS: Database & Tabel "profiles" Siap (Auto-Increment Aktif)');
        }
    });
};

initializeDatabase();

// --- 3. Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 4. API Endpoints ---

// LOGIN & AUTO-REGISTER
app.post('/login', (req, res) => {
    const { username } = req.body;
    
    if (!username || username.trim() === "") {
        return res.status(400).send("USERNAME_EMPTY");
    }

    const cleanUsername = username.trim();

    pool.query('SELECT * FROM profiles WHERE username = ?', [cleanUsername], (err, results) => {
        if (err) return res.status(500).send("DB_ERROR");

        if (results.length > 0) {
            res.status(200).send("success");
        } else {
            // Register otomatis: id tidak dikirim agar diisi otomatis oleh MySQL
            const createUser = 'INSERT INTO profiles (username, password, score, avatar_url) VALUES (?, "123", 0, "none")';
            pool.query(createUser, [cleanUsername], (insErr) => {
                if (insErr) return res.status(500).send("REGISTER_FAILED");
                res.status(201).send("success");
            });
        }
    });
});

// UPDATE SCORE (Highscore Logic)
app.post('/update-score', (req, res) => {
    const { username, score } = req.body;
    const newScore = parseInt(score);

    if (isNaN(newScore)) return res.status(400).send("INVALID_SCORE");

    // Hanya update jika skor baru lebih tinggi dari skor lama
    const query = 'UPDATE profiles SET score = ? WHERE username = ? AND ? > score';
    pool.query(query, [newScore, username, newScore], (err) => {
        if (err) return res.status(500).send("ERROR");
        res.send("success");
    });
});

// LEADERBOARD (Top 10)
app.get('/leaderboard', (req, res) => {
    const query = 'SELECT username, score, avatar_url FROM profiles ORDER BY score DESC LIMIT 10';
    pool.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: "FETCH_FAILED" });
        res.json(results);
    });
});

app.get('/', (req, res) => res.send("SpaceShooter API Online!"));

app.listen(port, () => {
    console.log(`==========================================`);
    console.log(` Server Engine Aktif di Port: ${port}`);
    console.log(`==========================================`);
});