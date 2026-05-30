const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  db.all('SELECT * FROM Instructors', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { fullName, email, department } = req.body;
  db.run('INSERT INTO Instructors (fullName, email, department) VALUES (?, ?, ?)', [fullName, email, department], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, fullName, email, department });
  });
});

router.get('/:id/courses', (req, res) => {
  db.all('SELECT * FROM Courses WHERE instructorId = ?', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
