const express = require('express');
const path = require('path');
const db = require('./db');
const usersRouter = require('./routes/users');
const studentsRouter = require('./routes/students');
const coursesRouter = require('./routes/courses');
const instructorsRouter = require('./routes/instructors');
const enrollmentsRouter = require('./routes/enrollments');
const reportsRouter = require('./routes/reports');
const majorsRouter = require('./routes/majors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/users', usersRouter);
app.use('/api/students', studentsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/instructors', instructorsRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/majors', majorsRouter);

app.get('/api', (req, res) => {
  res.json({
    message: 'Student Registration System API',
    endpoints: [
      '/api/users',
      '/api/students',
      '/api/courses',
      '/api/instructors',
      '/api/enrollments',
      '/api/reports',
      '/api/majors'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`SRS server is running on http://localhost:${PORT}`);
});
