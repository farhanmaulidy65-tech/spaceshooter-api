const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080; 

// --- 1. Konfigurasi Database ---
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'mysql.railway.internal',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'XMHEdTUDkVuiyWfGZripxsBAQUhtuWgT',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

// --- 2. Database Auto-Fixer (Biar nggak Error 500 lagi) ---
const fixDatabase = () => {
    // Pastikan tabel ada
    const createTable = `
        CREATE TABLE IF NOT EXISTS profiles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) DEFAULT '123',
            score INT DEFAULT 0,
            avatar_url VARCHAR(255) DEFAULT 'none'
        ) ENGINE=InnoDB;
    `;
    
    pool.query(createTable, (err) => {
        if (err) console.error("Gagal buat tabel:", err.message);
        else {
            console.log("Tabel profiles siap!");
            // Pastikan kolom avatar_url ada (jika tabel lama belum punya)
            pool.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) DEFAULT 'none'", () => {});
            pool.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT '123'", () => {});
        }
    });
};

fixDatabase();

// --- 3. Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 4. Endpoints ---

// LOGIN & AUTO-REGISTER (Satu Pintu)
app.post('/login', (req, res) => {
    const username = req.body.username ? req.body.username.trim() : null;
    if (!username) return res.status(400).send("USERNAME_EMPTY");

    pool.query('SELECT * FROM profiles WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).send("DB_ERROR");

        if (results.length > 0) {
            res.status(200).send("success");
        } else {
            // Langsung daftarin kalau belum ada
            pool.query('INSERT INTO profiles (username) VALUES (?)', [username], (insErr) => {
                if (insErr) return res.status(500).send("REGISTER_FAILED");
                res.status(201).send("success");
            });
        }
    });
});

// UPDATE SCORE & AVATAR
app.post('/update-score', (req, res) => {
    const { username, score, avatar_url } = req.body;
    
    if (!username) return res.status(400).send("NO_USER");

    // Jika ada kiriman avatar, update avatarnya
    if (avatar_url) {
        pool.query('UPDATE profiles SET avatar_url = ? WHERE username = ?', [avatar_url, username]);
    }

    // Jika ada kiriman score, update jika lebih tinggi (Highscore)
    if (score) {
        const nScore = parseInt(score);
        pool.query('UPDATE profiles SET score = ? WHERE username = ? AND ? > score', [nScore, username, nScore]);
    }

    res.send("success");
});

// GET DATA UNTUK PROFILE MENU
app.get('/get-profile/:username', (req, res) => {
    pool.query('SELECT * FROM profiles WHERE username = ?', [req.params.username], (err, results) => {
        if (err || results.length === 0) return res.status(404).send("NOT_FOUND");
        res.json(results[0]);
    });
});

app.get('/', (req, res) => res.send("API SpaceShooter Aktif!"));

app.listen(port, () => console.log(`Server lari di port ${port}`));