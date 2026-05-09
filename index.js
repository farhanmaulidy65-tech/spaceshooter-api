const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Konfigurasi Koneksi Database (Gunakan data yang kamu catat!)
const db = mysql.createConnection({
    host: 'mysql.railway.internal', // Sesuai MYSQLHOST kamu
    user: 'root',                   // Sesuai MYSQLUSER kamu
    password: 'XMHEdTUDkVuiyWfGZripxsBAQUhtuWgT', // Sesuai MYSQLPASSWORD kamu
    database: 'railway',            // Sesuai MYSQLDATABASE kamu
    port: 3306                      // Sesuai MYSQLPORT kamu
});

db.connect((err) => {
    if (err) {
        console.error('Gagal konek ke MySQL: ' + err.stack);
        return;
    }
    console.log('Terhubung ke MySQL Railway!');
});

// Endpoint untuk Register/Update Profile (Termasuk Avatar URL dari File Explorer)
app.post('/update-profile', (req, res) => {
    const { username, password, avatar_url } = req.body;
    
    const query = `INSERT INTO profiles (username, password, avatar_url) 
                   VALUES (?, ?, ?) 
                   ON DUPLICATE KEY UPDATE avatar_url = ?, password = ?`;

    db.query(query, [username, password, avatar_url, avatar_url, password], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ message: 'Profile berhasil diperbarui!', data: result });
    });
});

// Endpoint untuk ambil Highscore
app.get('/leaderboard', (req, res) => {
    db.query('SELECT username, score, avatar_url FROM profiles ORDER BY score DESC LIMIT 10', (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

app.listen(port, () => {
    console.log(`Server API jalan di port ${port}`);
});
