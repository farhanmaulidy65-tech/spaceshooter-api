const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080; 

// 1. Middleware Optimization
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// 2. Database Connection Pool with Error Handling
const pool = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQL_DATABASE, 
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 15, // Ditingkatkan sedikit untuk traffic leaderboard
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Helper untuk eksekusi query dengan Promise agar lebih rapi (Opsional)
const dbQuery = (sql, params) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

const initDB = async () => {
    const tableQuery = `
        CREATE TABLE IF NOT EXISTS profiles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            score INT DEFAULT 0,
            avatar_url LONGTEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
    `;
    
    try {
        await dbQuery(tableQuery);
        console.log(" Database Sync: OK (Tabel Profiles Siap)");
    } catch (err) {
        console.error(" Database Error (Create Table):", err.message);
    }
};

initDB();

// --- API LOGIN & AUTO-REGISTER ---
app.post('/login', async (req, res) => {
    const { username, password, avatar_url } = req.body;
    
    const cleanUsername = username ? username.trim() : null;
    const cleanPassword = password ? password.trim() : null;
    const finalAvatar = (avatar_url && avatar_url !== 'none' && avatar_url !== '') ? avatar_url : 'none';

    if (!cleanUsername || !cleanPassword) {
        return res.status(400).send("INPUT_EMPTY");
    }

    try {
        const results = await dbQuery('SELECT * FROM profiles WHERE username = ?', [cleanUsername]);

        if (results.length > 0) {
            // Login Logic
            if (results[0].password === cleanPassword) {
                if (finalAvatar !== 'none') {
                    await dbQuery('UPDATE profiles SET avatar_url = ? WHERE username = ?', [finalAvatar, cleanUsername]);
                }
                return res.status(200).send("success");
            } else {
                return res.status(401).send("WRONG_PASSWORD");
            }
        } else {
            // Register Logic
            await dbQuery('INSERT INTO profiles (username, password, score, avatar_url) VALUES (?, ?, 0, ?)', 
            [cleanUsername, cleanPassword, finalAvatar]);
            return res.status(200).send("success");
        }
    } catch (err) {
        console.error("Auth Error:", err);
        res.status(500).send("DB_ERROR");
    }
});

// --- API UPDATE SCORE ---
app.post('/profiles', async (req, res) => {
    const { username, score } = req.body;
    
    if (!username) return res.status(400).send("USERNAME_MISSING");

    try {
        // Optimasi: Hanya update jika skor baru lebih tinggi (Highscore System)
        // Jika ingin selalu update skor terakhir, hapus bagian "AND score < ?"
        const updateQuery = 'UPDATE profiles SET score = ? WHERE username = ? AND score < ?';
        const result = await dbQuery(updateQuery, [score, username, score]);
        
        if (result.affectedRows === 0) {
            // Cek apakah user ada atau memang skor baru tidak lebih tinggi
            const userCheck = await dbQuery('SELECT score FROM profiles WHERE username = ?', [username]);
            if (userCheck.length === 0) return res.status(404).send("USER_NOT_FOUND");
            return res.status(200).send("score_not_higher");
        }

        console.log(`[Server] Highscore baru untuk ${username}: ${score}`);
        res.status(200).send("score_updated");
    } catch (err) {
        console.error("Update Score Error:", err);
        res.status(500).send("UPDATE_FAILED");
    }
});

// --- API GET LEADERBOARD (TOP 3) ---
app.get('/get-leaderboard', async (req, res) => {
    try {
        const query = 'SELECT username, score, avatar_url FROM profiles ORDER BY score DESC LIMIT 3';
        const results = await dbQuery(query);
        res.status(200).json(results);
    } catch (err) {
        console.error("Leaderboard Error:", err);
        res.status(500).send("ERROR");
    }
});

// --- API GET PROFILE ---
app.get('/get-profile/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const results = await dbQuery('SELECT avatar_url, score FROM profiles WHERE username = ?', [username]);
        if (results.length === 0) return res.status(404).send("NOT_FOUND");
        res.json(results[0]);
    } catch (err) {
        res.status(500).send("DB_ERROR");
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Server aktif di port ${port}`);
});