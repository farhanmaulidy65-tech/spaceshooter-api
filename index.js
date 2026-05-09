const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config(); // Opsional: Untuk keamanan environment variables

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Konfigurasi Database
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
    console.log('Terhubung ke database!');
});

// --- API Endpoints ---

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM profiles WHERE username = ? AND password = ?';
    
    db.query(query, [username, password], (err, results) => {
        if (err) return res.status(500).send("ERROR");
        if (results.length > 0) {
            res.send("success");
        } else {
            res.send("wrong");
        }
    });
});

// Update Profile
app.post('/update-profile', (req, res) => {
    const { username, avatar_url } = req.body;
    const query = 'UPDATE profiles SET avatar_url = ? WHERE username = ?';

    db.query(query, [avatar_url, username], (err, result) => {
        if (err) return res.status(500).send("ERROR");
        res.send("success");
    });
});

// Leaderboard
app.get('/leaderboard', (req, res) => {
    const query = 'SELECT username, score, avatar_url FROM profiles ORDER BY score DESC LIMIT 10';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Menjalankan Server
app.listen(port, () => {
    console.log(`Server aktif di port ${port}`);
});