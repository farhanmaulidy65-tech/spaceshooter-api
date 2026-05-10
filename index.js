const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080; 

const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'mysql.railway.internal',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'XMHEdTUDkVuiyWfGZripxsBAQUhtuWgT',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 3306,
    connectTimeout: 20000,
    waitForConnections: true,
    connectionLimit: 10
});

// --- AUTO-FIX DATABASE (Memastikan Struktur Benar) ---
const initDB = () => {
    const tableQuery = `
        CREATE TABLE IF NOT EXISTS profiles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) DEFAULT '123',
            score INT DEFAULT 0,
            avatar_url VARCHAR(255) DEFAULT 'none'
        ) ENGINE=InnoDB;
    `;
    pool.query(tableQuery, (err) => {
        if (err) console.error("Database Error:", err.message);
        else {
            console.log("Database Sync: OK");
            // Pastikan kolom avatar_url ada jika tabel sudah lama
            pool.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) DEFAULT 'none'", () => {});
        }
    });
};
initDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API LOGIN & AUTO-CREATE ---
app.post('/login', (req, res) => {
    const username = req.body.username ? req.body.username.trim() : null;
    if (!username) return res.status(400).send("USERNAME_EMPTY");

    // Cari user
    pool.query('SELECT username FROM profiles WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error("Login Query Error:", err);
            return res.status(500).send("DB_ERROR");
        }

        if (results.length > 0) {
            // User ditemukan, langsung sukses
            return res.status(200).send("success");
        } else {
            // User tidak ada, buatkan otomatis
            pool.query('INSERT INTO profiles (username, password, score, avatar_url) VALUES (?, "123", 0, "none")', [username], (insErr) => {
                if (insErr) {
                    console.error("Auto-Register Error:", insErr);
                    return res.status(500).send("REG_FAILED");
                }
                return res.status(200).send("success");
            });
        }
    });
});

// --- API UPDATE SCORE & AVATAR ---
app.post('/update-score', (req, res) => {
    const { username, score, avatar_url } = req.body;
    if (!username) return res.status(400).send("MISSING_USER");

    if (avatar_url) {
        pool.query('UPDATE profiles SET avatar_url = ? WHERE username = ?', [avatar_url, username]);
    }
    
    if (score !== undefined) {
        const nScore = parseInt(score);
        // Highscore logic: update jika score baru lebih tinggi
        pool.query('UPDATE profiles SET score = ? WHERE username = ? AND ? > score', [nScore, username, nScore]);
    }
    
    return res.status(200).send("success");
});

app.listen(port, "0.0.0.0", () => console.log(`Server aktif di port ${port}`));