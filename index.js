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

// AUTO-FIX DATABASE STRUCTURE
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
        if (!err) {
            // Memastikan kolom tambahan ada jika tabel sudah lama dibuat
            pool.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT '123'", () => {});
            pool.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) DEFAULT 'none'", () => {});
        }
    });
};
initDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/login', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).send("USERNAME_EMPTY");

    pool.query('SELECT * FROM profiles WHERE username = ?', [username.trim()], (err, results) => {
        if (err) return res.status(500).send("DB_ERROR");

        if (results.length > 0) {
            res.status(200).send("success");
        } else {
            // Auto-Register jika user baru
            pool.query('INSERT INTO profiles (username) VALUES (?)', [username.trim()], (insErr) => {
                if (insErr) return res.status(500).send("REG_ERROR");
                res.status(201).send("success");
            });
        }
    });
});

app.post('/update-score', (req, res) => {
    const { username, score, avatar_url } = req.body;
    if (avatar_url) pool.query('UPDATE profiles SET avatar_url = ? WHERE username = ?', [avatar_url, username]);
    if (score) {
        const nScore = parseInt(score);
        pool.query('UPDATE profiles SET score = ? WHERE username = ? AND ? > score', [nScore, username, nScore]);
    }
    res.send("success");
});

app.listen(port, () => console.log(`Server Aktif!`));