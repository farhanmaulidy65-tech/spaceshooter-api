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
    waitForConnections: true,
    connectionLimit: 10
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ENDPOINT LOGIN & AUTO-REGISTER (Satu Pintu)
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const cleanUser = username ? username.trim() : "";
    const cleanPass = password ? password.trim() : "123";

    if (!cleanUser) return res.status(400).send("USERNAME_EMPTY");

    // Cari user
    pool.query('SELECT * FROM profiles WHERE username = ?', [cleanUser], (err, results) => {
        if (err) return res.status(500).send("DB_ERROR");

        if (results.length > 0) {
            // User ada, langsung anggap sukses login
            res.status(200).send("success");
        } else {
            // User tidak ada, langsung buatkan akun baru (Auto-Register)
            const createUser = 'INSERT INTO profiles (username, password, score, avatar_url) VALUES (?, ?, 0, "none")';
            pool.query(createUser, [cleanUser, cleanPass], (insErr) => {
                if (insErr) return res.status(500).send("AUTO_REGISTER_FAILED");
                res.status(201).send("success");
            });
        }
    });
});

// GET PROFILE DATA (Untuk ambil Score & Avatar)
app.get('/get-profile/:username', (req, res) => {
    const username = req.params.username;
    pool.query('SELECT username, score, avatar_url FROM profiles WHERE username = ?', [username], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: "NOT_FOUND" });
        res.json(results[0]);
    });
});

// UPDATE SCORE & AVATAR (Gabungan agar aman)
app.post('/update-score', (req, res) => {
    const { username, score, avatar_url } = req.body;
    
    // Logika Update: Jika ada avatar_url baru, update. Jika score lebih tinggi, update.
    if (avatar_url) {
        pool.query('UPDATE profiles SET avatar_url = ? WHERE username = ?', [avatar_url, username]);
    }

    if (score) {
        const newScore = parseInt(score);
        pool.query('UPDATE profiles SET score = ? WHERE username = ? AND ? > score', [newScore, username, newScore]);
    }

    res.status(200).send("success");
});

app.get('/', (req, res) => res.send("SpaceShooter API Online!"));

app.listen(port, () => console.log(`Server Engine Aktif di Port: ${port}`));