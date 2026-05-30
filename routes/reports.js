const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/summary', (req, res) => {
  db.serialize(() => {
    db.get('SELECT COUNT(*) AS studentCount FROM Students', (err, studentRow) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT COUNT(*) AS courseCount FROM Courses', (err, courseRow) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ studentCount: studentRow.studentCount, courseCount: courseRow.courseCount });
      });
    });
  });
});

router.get('/student-courses/:studentId', (req, res) => {
  db.all(
    `SELECT Courses.title, Courses.code, Courses.creditHours, Instructors.fullName AS instructorName
     FROM Enrollments
     JOIN Courses ON Enrollments.courseId = Courses.id
     LEFT JOIN Instructors ON Courses.instructorId = Instructors.id
     WHERE Enrollments.studentId = ?`,
    [req.params.studentId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.get('/pdf-placeholder', (req, res) => {
  res.json({ message: 'PDF export support can be added here with a library like pdfkit or puppeteer.' });
});

module.exports = router;
