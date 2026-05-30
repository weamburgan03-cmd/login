const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  db.all('SELECT * FROM Majors ORDER BY level, name', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const name = req.body.name?.trim();
  const level = req.body.level?.trim();
  if (!name) return res.status(400).json({ error: 'اسم التخصص مطلوب' });
  if (!level) return res.status(400).json({ error: 'المستوى الدراسي مطلوب' });

  db.run('INSERT INTO Majors (name, level) VALUES (?, ?)', [name, level], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'هذا التخصص موجود بالفعل' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, name, level });
  });
});

router.put('/:id', (req, res) => {
  const id = req.params.id;
  const name = req.body.name?.trim();
  const level = req.body.level?.trim();
  if (!name) return res.status(400).json({ error: 'اسم التخصص مطلوب' });
  if (!level) return res.status(400).json({ error: 'المستوى الدراسي مطلوب' });

  db.run('UPDATE Majors SET name = ?, level = ? WHERE id = ?', [name, level, id], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'هذا التخصص موجود بالفعل' });
      }
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'التخصص غير موجود' });
    }
    res.json({ id: Number(id), name, level });
  });
});

router.delete('/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM Majors WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'التخصص غير موجود' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
