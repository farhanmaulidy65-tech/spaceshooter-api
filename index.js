const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// TAMBAHKAN INI: Agar bisa baca data dari WWWForm Unity
app.use(express.urlencoded({ extended: true }));

const db = mysql.createConnection({
    host: process.env.MYSQLHOST || 'mysql.railway.internal',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || 'XMHEdTUDkVuiyWfGZripxsBAQUhtuWgT',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 3306
});

db.connect((err) => {
    if (err) {
        console.error('Gagal konek ke MySQL: ' + err.stack);
        return;
    }
    console.log('Terhubung ke MySQL Railway!');
});

// ENDPOINT LOGIN (Yang tadi bikin kamu error 404)
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

// ENDPOINT UPDATE PROFILE
app.post('/update-profile', (req, res) => {
    const { username, avatar_url } = req.body;
    
    // Gunakan UPDATE saja kalau user sudah login
    const query = `UPDATE profiles SET avatar_url = ? WHERE username = ?`;

    db.query(query, [avatar_url, username], (err, result) => {
        if (err) return res.status(500).send("ERROR");
        res.send("success");
    });
});

app.get('/leaderboard', (req, res) => {
    db.query('SELECT username, score, avatar_url FROM profiles ORDER BY score DESC LIMIT 10', (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

app.listen(port, () => {
    console.log(`Server API jalan di port ${port}`);
});