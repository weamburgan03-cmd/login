const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  const sql = `
    SELECT s.*, u.username AS username, u.id AS userId
    FROM Students s
    LEFT JOIN Users u ON s.userId = u.id
  `;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { fullName, studentNumber, email, major, year, username, password } = req.body;
  if (!fullName || !studentNumber || !email || !major || !year || !username || !password) {
    return res.status(400).json({ error: 'جميع حقول الطالب مطلوبة (بما في ذلك username و password)' });
  }
  if (typeof year !== 'number' || year < 1) {
    return res.status(400).json({ error: 'السنة الدراسية غير صحيحة' });
  }

  // check username uniqueness
  db.get('SELECT id FROM Users WHERE username = ?', [username], (err, existingUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existingUser) return res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل' });

    // check email uniqueness across Students/Instructors
    db.get('SELECT userId FROM Students WHERE email = ? UNION SELECT userId FROM Instructors WHERE email = ?', [email, email], (errEmail, existingEmail) => {
      if (errEmail) return res.status(500).json({ error: errEmail.message });
      if (existingEmail) return res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });

      // create user then student
      db.run('INSERT INTO Users (username, password, role, status) VALUES (?, ?, ?, ?)', [username, password, 'Student', 'active'], function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        const userId = this.lastID;

        db.run(
          'INSERT INTO Students (userId, fullName, studentNumber, email, major, year) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, fullName, studentNumber, email, major, year],
          function (err3) {
            if (err3) {
              db.run('DELETE FROM Users WHERE id = ?', [userId]);
              if (err3.message && err3.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'الرقم الجامعي مستخدم بالفعل' });
              }
              return res.status(500).json({ error: err3.message });
            }
            res.status(201).json({ id: userId, username, role: 'Student', status: 'active' });
          }
        );
      });
    });
  });
});

router.get('/:id', (req, res) => {
  db.get('SELECT * FROM Students WHERE id = ?', [req.params.id], (err, student) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  });
});

router.put('/:id', (req, res) => {
  const { fullName, studentNumber, email, major, year } = req.body;
  db.run(
    'UPDATE Students SET fullName = ?, studentNumber = ?, email = ?, major = ?, year = ? WHERE id = ?',
    [fullName, studentNumber, email, major, year, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Student not found' });
      res.json({ id: req.params.id, fullName, studentNumber, email, major, year });
    }
  );
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM Students WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted' });
  });
});

module.exports = router;
