const express = require('express');
const db = require('../db');
const router = express.Router();
const MAX_COURSES_PER_STUDENT = 6;

router.post('/', (req, res) => {
  const { studentId, courseId } = req.body;
  if (!studentId || !courseId) return res.status(400).json({ error: 'studentId and courseId are required' });

  db.get('SELECT COUNT(*) AS count FROM Enrollments WHERE studentId = ?', [studentId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row.count >= MAX_COURSES_PER_STUDENT) {
      return res.status(400).json({ error: `Student may register at most ${MAX_COURSES_PER_STUDENT} courses` });
    }

    db.run('INSERT INTO Enrollments (studentId, courseId) VALUES (?, ?)', [studentId, courseId], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Student already registered for this course' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, studentId, courseId });
    });
  });
});

router.get('/student/:studentId', (req, res) => {
  db.all(
    `SELECT Courses.id,
            Courses.title,
            Courses.code,
            Courses.creditHours,
            Instructors.fullName AS instructorName,
            Instructors.email AS instructorEmail,
            Instructors.department AS instructorDepartment,
            Instructors.staffNumber AS instructorStaffNumber
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

router.get('/', (req, res) => {
  db.all(
    `SELECT Enrollments.id, Students.fullName AS studentName, Courses.title AS courseTitle, Enrollments.registeredAt
     FROM Enrollments
     JOIN Students ON Enrollments.studentId = Students.id
     JOIN Courses ON Enrollments.courseId = Courses.id`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
