const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'srs.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err);
    process.exit(1);
  }
});

const init = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT,
      status TEXT DEFAULT 'active'
    )`);

    db.all('PRAGMA table_info(Users)', (err, columns) => {
      if (!err && columns && !columns.find((column) => column.name === 'status')) {
        db.run("ALTER TABLE Users ADD COLUMN status TEXT DEFAULT 'active'");
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS Students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      fullName TEXT,
      studentNumber TEXT UNIQUE,
      email TEXT,
      major TEXT,
      year INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Instructors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      fullName TEXT,
      email TEXT,
      department TEXT,
      staffNumber TEXT UNIQUE,
      major TEXT,
      courseName TEXT
    )`);

    db.all("PRAGMA table_info(Students)", (err, columns) => {
      if (!err && columns) {
        const names = columns.map((column) => column.name);
        if (!names.includes('userId')) {
          db.run('ALTER TABLE Students ADD COLUMN userId INTEGER');
        }
      }
    });

    db.all("PRAGMA table_info(Instructors)", (err, columns) => {
      if (!err && columns) {
        const names = columns.map((column) => column.name);
        if (!names.includes('userId')) {
          db.run('ALTER TABLE Instructors ADD COLUMN userId INTEGER');
        }
        if (!names.includes('staffNumber')) {
          db.run('ALTER TABLE Instructors ADD COLUMN staffNumber TEXT');
        }
        if (!names.includes('major')) {
          db.run('ALTER TABLE Instructors ADD COLUMN major TEXT');
        }
        if (!names.includes('courseName')) {
          db.run('ALTER TABLE Instructors ADD COLUMN courseName TEXT');
        }
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS Majors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      level TEXT
    )`);

    db.all('PRAGMA table_info(Majors)', (err, columns) => {
      if (!err && columns) {
        const names = columns.map((column) => column.name);
        if (!names.includes('level')) {
          db.run('ALTER TABLE Majors ADD COLUMN level TEXT');
        }
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS Courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      code TEXT UNIQUE,
      creditHours INTEGER,
      instructorId INTEGER,
      majorId INTEGER,
      FOREIGN KEY (instructorId) REFERENCES Instructors(id),
      FOREIGN KEY (majorId) REFERENCES Majors(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS CourseRequests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      code TEXT,
      creditHours INTEGER,
      instructorId INTEGER,
      majorId INTEGER,
      status TEXT DEFAULT 'pending',
      requestedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instructorId) REFERENCES Instructors(id),
      FOREIGN KEY (majorId) REFERENCES Majors(id)
    )`);

    db.all('PRAGMA table_info(Courses)', (err, columns) => {
      if (!err && columns) {
        const names = columns.map((column) => column.name);
        if (!names.includes('majorId')) {
          db.run('ALTER TABLE Courses ADD COLUMN majorId INTEGER');
        }
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS Enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER,
      courseId INTEGER,
      registeredAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(studentId, courseId),
      FOREIGN KEY (studentId) REFERENCES Students(id),
      FOREIGN KEY (courseId) REFERENCES Courses(id)
    )`);

    db.get('SELECT COUNT(*) as count FROM Users WHERE username = ?', ['admin'], (err, row) => {
      if (!err && row.count === 0) {
        db.run('INSERT INTO Users (username, password, role) VALUES (?, ?, ?)', ['admin', 'admin123', 'Admin']);
      }
    });
  });
};

init();

module.exports = db;
