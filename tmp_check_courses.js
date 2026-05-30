const db = require('./db');

// Check Majors
db.all('SELECT * FROM Majors', (err, majors) => {
  console.log('=== MAJORS ===');
  if (err) console.log('Error:', err);
  else console.log(majors);
  
  // Check Courses
  db.all(`SELECT Courses.*, Majors.name AS majorName, Majors.level AS majorLevel
           FROM Courses
           LEFT JOIN Majors ON Courses.majorId = Majors.id`, (err2, courses) => {
    console.log('\n=== COURSES ===');
    if (err2) console.log('Error:', err2);
    else console.log(courses);
    
    process.exit(0);
  });
});
