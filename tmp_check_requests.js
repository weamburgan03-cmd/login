const db = require('./db');

function showTables() {
  db.all('SELECT id, title, code, creditHours, instructorId, majorId, status, requestedAt FROM CourseRequests', (err, rows) => {
    if (err) return console.error('CourseRequests error:', err.message);
    console.log('CourseRequests count:', rows.length);
    console.table(rows);

    db.all('SELECT id, title, code, creditHours, instructorId, majorId FROM Courses', (err2, courses) => {
      if (err2) return console.error('Courses error:', err2.message);
      console.log('Courses count:', courses.length);
      console.table(courses);
      process.exit(0);
    });
  });
}

showTables();
