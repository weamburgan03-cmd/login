const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  db.all(
    `SELECT Courses.*, Instructors.fullName AS instructorName, Majors.name AS majorName, Majors.level AS majorLevel
     FROM Courses
     LEFT JOIN Instructors ON Courses.instructorId = Instructors.id
     LEFT JOIN Majors ON Courses.majorId = Majors.id`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/', (req, res) => {
  const { title, code, creditHours, instructorId, majorId } = req.body;
  db.run(
    'INSERT INTO Courses (title, code, creditHours, instructorId, majorId) VALUES (?, ?, ?, ?, ?)',
    [title, code, creditHours, instructorId || null, majorId || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, title, code, creditHours, instructorId, majorId });
    }
  );
});

router.get('/instructor/:instructorId', (req, res) => {
  db.all('SELECT * FROM Courses WHERE instructorId = ?', [req.params.instructorId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/requests', (req, res) => {
  const statusFilter = req.query.status || 'pending';
  db.all(
    `SELECT CourseRequests.*, Instructors.fullName AS instructorName, Users.username, Majors.name AS majorName
     FROM CourseRequests
     LEFT JOIN Instructors ON CourseRequests.instructorId = Instructors.id
     LEFT JOIN Users ON Instructors.userId = Users.id
     LEFT JOIN Majors ON CourseRequests.majorId = Majors.id
     WHERE CourseRequests.status = ?`,
    [statusFilter],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/requests', (req, res) => {
  const { title, code, creditHours, instructorId, majorId } = req.body;
    if (!title || !code || !instructorId || !majorId) {
      return res.status(400).json({ error: 'الحقل title و code و instructorId و majorId مطلوبة' });
    }

    const cleanCode = String(code).trim();
    const cleanTitle = String(title).trim();

    // Check if a course already exists with this code
    db.get('SELECT id FROM Courses WHERE code = ?', [cleanCode], (errCourse, existingCourse) => {
      if (errCourse) return res.status(500).json({ error: errCourse.message });
      if (existingCourse) return res.status(409).json({ error: 'المقرر موجود بالفعل' });

      // Check if there is already a pending request with same code or same title by same instructor
      db.get(
        'SELECT id FROM CourseRequests WHERE (code = ? OR (title = ? AND instructorId = ?)) AND status = ?',
        [cleanCode, cleanTitle, instructorId, 'pending'],
        (errReq, existingReq) => {
          if (errReq) return res.status(500).json({ error: errReq.message });
          if (existingReq) return res.status(409).json({ error: 'تم إرسال طلب لهذه المادة بالفعل وهو قيد المعالجة' });

          db.run(
            'INSERT INTO CourseRequests (title, code, creditHours, instructorId, majorId, status) VALUES (?, ?, ?, ?, ?, ?)',
            [cleanTitle, cleanCode, creditHours || 0, instructorId, majorId, 'pending'],
            function (err) {
              if (err) return res.status(500).json({ error: err.message });
              res.status(201).json({ id: this.lastID, title: cleanTitle, code: cleanCode, creditHours, instructorId, majorId, status: 'pending' });
            }
          );
        }
      );
    });
});

router.post('/requests/approve/:id', (req, res) => {
  const requestId = req.params.id;
  db.get('SELECT * FROM CourseRequests WHERE id = ?', [requestId], (err, request) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'This request has already been processed' });

    db.get('SELECT id FROM Courses WHERE code = ?', [request.code], (err2, existingCourse) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (existingCourse) return res.status(400).json({ error: 'A course with this code already exists' });

      db.run(
        'INSERT INTO Courses (title, code, creditHours, instructorId, majorId) VALUES (?, ?, ?, ?, ?)',
        [request.title, request.code, request.creditHours, request.instructorId, request.majorId],
        function (insertErr) {
          if (insertErr) return res.status(500).json({ error: insertErr.message });

          db.run(
            'UPDATE CourseRequests SET status = ? WHERE id = ?',
            ['approved', requestId],
            function (updateErr) {
              if (updateErr) return res.status(500).json({ error: updateErr.message });
              res.json({ message: 'Course request approved', courseId: this.lastID });
            }
          );
        }
      );
    });
  });
});

router.post('/requests/reject/:id', (req, res) => {
  const requestId = req.params.id;
  db.get('SELECT * FROM CourseRequests WHERE id = ?', [requestId], (err, request) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'This request has already been processed' });

    db.run('UPDATE CourseRequests SET status = ? WHERE id = ?', ['rejected', requestId], function (updateErr) {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      res.json({ message: 'Course request rejected' });
    });
  });
});

router.get('/:id', (req, res) => {
  db.get('SELECT * FROM Courses WHERE id = ?', [req.params.id], (err, course) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  });
});

router.put('/:id', (req, res) => {
  const { title, code, creditHours, instructorId, majorId } = req.body;
  db.run(
    'UPDATE Courses SET title = ?, code = ?, creditHours = ?, instructorId = ?, majorId = ? WHERE id = ?',
    [title, code, creditHours, instructorId || null, majorId || null, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Course not found' });
      res.json({ id: req.params.id, title, code, creditHours, instructorId, majorId });
    }
  );
});

// Note: request handlers for course requests are implemented above (with validation/duplicate checks).

router.post('/requests/approve/:id', (req, res) => {
  const requestId = req.params.id;
  db.get('SELECT * FROM CourseRequests WHERE id = ?', [requestId], (err, request) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'This request has already been processed' });

    db.get('SELECT id FROM Courses WHERE code = ?', [request.code], (err2, existingCourse) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (existingCourse) return res.status(400).json({ error: 'A course with this code already exists' });

      db.run(
        'INSERT INTO Courses (title, code, creditHours, instructorId, majorId) VALUES (?, ?, ?, ?, ?)',
        [request.title, request.code, request.creditHours, request.instructorId, request.majorId],
        function (insertErr) {
          if (insertErr) return res.status(500).json({ error: insertErr.message });
          const createdCourseId = this.lastID;

          db.run(
            'UPDATE CourseRequests SET status = ? WHERE id = ?',
            ['approved', requestId],
            function (updateErr) {
              if (updateErr) return res.status(500).json({ error: updateErr.message });
              res.json({ message: 'Course request approved', courseId: createdCourseId });
            }
          );
        }
      );
    });
  });
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM Courses WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Course not found' });
    res.json({ message: 'Course deleted' });
  });
});

module.exports = router;
