const express = require('express');
const db = require('../db');
const router = express.Router();

// Return all users with basic profile fields
router.get('/', (req, res) => {
  const sql = `
    SELECT u.id, u.username, u.role, u.status,
      s.fullName AS studentFullName, s.studentNumber, s.email AS studentEmail, s.major AS studentMajor, s.year,
      i.fullName AS instructorFullName, i.email AS instructorEmail, i.department, i.staffNumber, i.major AS instructorMajor, i.courseName
    FROM Users u
    LEFT JOIN Students s ON s.userId = u.id
    LEFT JOIN Instructors i ON i.userId = u.id
  `;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const authQuery = `
    SELECT u.id, u.username, u.role, u.status
    FROM Users u
    WHERE u.password = ?
      AND (
        u.username = ?
        OR u.id IN (SELECT userId FROM Students WHERE email = ?)
        OR u.id IN (SELECT userId FROM Instructors WHERE email = ?)
      )
  `;

  db.get(authQuery, [password, username, username, username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Instructor account is pending admin approval' });
    }

    if (user.role === 'Student') {
      db.get('SELECT * FROM Students WHERE userId = ?', [user.id], (err2, student) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: 'Login successful', user: { ...user, profile: student } });
      });
    } else if (user.role === 'Instructor') {
      db.get('SELECT * FROM Instructors WHERE userId = ?', [user.id], (err2, instructor) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: 'Login successful', user: { ...user, profile: instructor } });
      });
    } else {
      res.json({ message: 'Login successful', user });
    }
  });
});

router.post('/register', (req, res) => {
  const { username, password, role, fullName, studentNumber, email, major, year, courseName } = req.body;
  if (!username || !password || !role || !fullName || !studentNumber || !email) {
    return res.status(400).json({ error: 'جميع الحقول الأساسية مطلوبة' });
  }

  const allowedRoles = ['Student', 'Instructor'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Role must be Student or Instructor' });
  }

  if (role === 'Student') {
    if (!year) {
      return res.status(400).json({ error: 'السنة الدراسية مطلوبة للطالب' });
    }
    if (!major) {
      return res.status(400).json({ error: 'التخصص مطلوب للطالب' });
    }
  }

  if (role === 'Instructor' && !courseName) {
    return res.status(400).json({ error: 'اسم المادة مطلوب للدكتور' });
  }

  const finalizeInstructorSignup = (resolvedMajor) => {
    if (!resolvedMajor) {
      return res.status(400).json({ error: 'التخصص غير معروف، تأكد من اختيار مادة صحيحة أو أضف التخصص أولًا' });
    }

    db.get('SELECT id FROM Users WHERE username = ?', [username], (errUnique, existingUser) => {
      if (errUnique) return res.status(500).json({ error: errUnique.message });
      if (existingUser) return res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل' });

      db.get('SELECT userId FROM Students WHERE email = ? UNION SELECT userId FROM Instructors WHERE email = ?', [email, email], (errEmail, existingEmail) => {
        if (errEmail) return res.status(500).json({ error: errEmail.message });
        if (existingEmail) return res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });

        const status = role === 'Instructor' ? 'pending' : 'active';
        db.run('INSERT INTO Users (username, password, role, status) VALUES (?, ?, ?, ?)', [username, password, role, status], function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          const userId = this.lastID;

          if (role === 'Student') {
            db.run('INSERT INTO Students (userId, fullName, studentNumber, email, major, year) VALUES (?, ?, ?, ?, ?, ?)',
              [userId, fullName, studentNumber, email, resolvedMajor, year], function (err3) {
                if (err3) {
                  db.run('DELETE FROM Users WHERE id = ?', [userId]);
                  return res.status(500).json({ error: err3.message });
                }
                res.status(201).json({ id: userId, username, role, status });
              });
          } else {
            db.run('INSERT INTO Instructors (userId, fullName, email, department, staffNumber, major, courseName) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [userId, fullName, email, '', studentNumber, resolvedMajor, courseName], function (err3) {
                if (err3) {
                  db.run('DELETE FROM Users WHERE id = ?', [userId]);
                  return res.status(500).json({ error: err3.message });
                }
                const instructorId = this.lastID;
                const courseQuery = `
                  SELECT Courses.id
                  FROM Courses
                  JOIN Majors ON Courses.majorId = Majors.id
                  WHERE Courses.title = ? AND Majors.name = ?
                  LIMIT 1
                `;
                db.get(courseQuery, [courseName, resolvedMajor], (errCourse, courseRow) => {
                  if (errCourse) {
                    db.run('DELETE FROM Users WHERE id = ?', [userId]);
                    db.run('DELETE FROM Instructors WHERE id = ?', [instructorId]);
                    return res.status(500).json({ error: errCourse.message });
                  }
                  if (courseRow) {
                    db.run('UPDATE Courses SET instructorId = ? WHERE id = ?', [instructorId, courseRow.id], function (err4) {
                      if (err4) {
                        db.run('DELETE FROM Users WHERE id = ?', [userId]);
                        db.run('DELETE FROM Instructors WHERE id = ?', [instructorId]);
                        return res.status(500).json({ error: err4.message });
                      }
                      res.status(201).json({ id: userId, username, role, status });
                    });
                  } else {
                    res.status(201).json({ id: userId, username, role, status });
                  }
                });
              });
          }
        });
      });
    });
  };

  const resolveMajor = () => {
    if (major) {
      db.get('SELECT id FROM Majors WHERE name = ?', [major], (err, majorRow) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!majorRow) {
          return res.status(400).json({ error: 'التخصص غير موجود، يجب إضافته من قبل الأدمن أولا' });
        }
        finalizeInstructorSignup(major);
      });
    } else if (courseName) {
      db.get(
        `SELECT Majors.name AS majorName FROM Courses JOIN Majors ON Courses.majorId = Majors.id WHERE Courses.title = ? LIMIT 1`,
        [courseName],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!row) return res.status(400).json({ error: 'لم يتم العثور على المادة أو التخصص المرتبط بها' });
          finalizeInstructorSignup(row.majorName);
        }
      );
    } else {
      finalizeInstructorSignup(null);
    }
  };

  resolveMajor();
});

router.get('/pending', (req, res) => {
  const sql = `
    SELECT u.id, u.username, u.role, u.status,
      i.email AS email, i.major AS major, i.courseName AS courseName,
      m.level AS level
    FROM Users u
    LEFT JOIN Instructors i ON i.userId = u.id
    LEFT JOIN Majors m ON m.name = i.major
    WHERE u.role = ? AND u.status = ?
  `;
  db.all(sql, ['Instructor', 'pending'], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/approve/:id', (req, res) => {
  const userId = req.params.id;
  db.run('UPDATE Users SET status = ? WHERE id = ? AND role = ?', ['active', userId, 'Instructor'], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Instructor not found or already approved' });
    res.json({ message: 'Instructor approved' });
  });
});

router.post('/reject/:id', (req, res) => {
  const userId = req.params.id;
  db.run('UPDATE Users SET status = ? WHERE id = ? AND role = ?', ['rejected', userId, 'Instructor'], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Instructor not found or already processed' });
    res.json({ message: 'Instructor rejected' });
  });
});

// Admin endpoint to create a new user (Student or Instructor)
router.post('/', (req, res) => {
  const { username, password, fullName, email, role, status, level, major, referenceNumber, courseName, studentNumber, staffNumber, department } = req.body;

  if (!username || !password || !fullName || !email || !role) {
    return res.status(400).json({ error: 'username, password, fullName, email, and role are required' });
  }

  const allowedRoles = ['Student', 'Instructor', 'Admin'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Role must be Student, Instructor, or Admin' });
  }

  const resolveMajor = (callback) => {
    if (role === 'Admin') {
      return callback('');
    }

    if (major) {
      db.get('SELECT id FROM Majors WHERE name = ?', [major], (errMajor, majorRow) => {
        if (errMajor) return res.status(500).json({ error: errMajor.message });
        if (!majorRow) return res.status(400).json({ error: 'التخصص غير موجود' });
        callback(major);
      });
    } else if (courseName) {
      db.get(
        `SELECT Majors.name AS majorName FROM Courses JOIN Majors ON Courses.majorId = Majors.id WHERE Courses.title = ? LIMIT 1`,
        [courseName],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!row) return res.status(400).json({ error: 'لم يتم العثور على التخصص المرتبط بالمادة' });
          callback(row.majorName);
        }
      );
    } else {
      callback(major || '');
    }
  };

  const createUser = (resolvedMajor) => {
    const finalStatus = (role === 'Instructor' && !status) ? 'pending' : (status || 'active');
    db.run('INSERT INTO Users (username, password, role, status) VALUES (?, ?, ?, ?)',
      [username, password, role, finalStatus], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const userId = this.lastID;

        if (role === 'Student') {
          db.run('INSERT INTO Students (userId, fullName, email, studentNumber, major, year) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, fullName, email, referenceNumber || studentNumber || '', resolvedMajor || '', level || '1'], function (err2) {
              if (err2) {
                db.run('DELETE FROM Users WHERE id = ?', [userId]);
                return res.status(500).json({ error: err2.message });
              }
              res.status(201).json({ id: userId, username, role, status: finalStatus, message: 'تم إنشاء المستخدم بنجاح' });
            });
        } else if (role === 'Instructor') {
          db.run('INSERT INTO Instructors (userId, fullName, email, department, staffNumber, major, courseName) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, fullName, email, department || '', referenceNumber || staffNumber || '', resolvedMajor || '', courseName || ''], function (err2) {
              if (err2) {
                db.run('DELETE FROM Users WHERE id = ?', [userId]);
                return res.status(500).json({ error: err2.message });
              }
              const instructorId = this.lastID;

              if (courseName && resolvedMajor) {
                const courseQuery = `
                  SELECT Courses.id
                  FROM Courses
                  JOIN Majors ON Courses.majorId = Majors.id
                  WHERE Courses.title = ? AND Majors.name = ?
                  LIMIT 1
                `;
                db.get(courseQuery, [courseName, resolvedMajor], (errCourse, courseRow) => {
                  if (!errCourse && courseRow) {
                    db.run('UPDATE Courses SET instructorId = ? WHERE id = ?', [instructorId, courseRow.id], function (err3) {
                      if (!err3) {
                        res.status(201).json({ id: userId, username, role, status: finalStatus, message: 'تم إنشاء المستخدم بنجاح' });
                      } else {
                        res.status(201).json({ id: userId, username, role, status: finalStatus, message: 'تم إنشاء المستخدم بنجاح (لم يتم ربط المادة)' });
                      }
                    });
                  } else {
                    res.status(201).json({ id: userId, username, role, status: finalStatus, message: 'تم إنشاء المستخدم بنجاح' });
                  }
                });
              } else {
                res.status(201).json({ id: userId, username, role, status: finalStatus, message: 'تم إنشاء المستخدم بنجاح' });
              }
            });
        } else if (role === 'Admin') {
          res.status(201).json({ id: userId, username, role, status: finalStatus, message: 'تم إنشاء المستخدم بنجاح' });
        }
      });
  };

  resolveMajor((resolvedMajor) => {
    createUser(resolvedMajor);
  });
});

router.put('/:id', (req, res) => {
  const userId = req.params.id;
  const { username, fullName, email, password, role, status, studentNumber, staffNumber, major } = req.body;

  // check username uniqueness when provided
  const checkUsername = (cb) => {
    if (!username) return cb(null);
    db.get('SELECT id FROM Users WHERE username = ? AND id != ?', [username, userId], (err, existingUser) => {
      if (err) return cb(err);
      if (existingUser) return cb(new Error('اسم المستخدم مستخدم بالفعل'));
      cb(null);
    });
  };

  checkUsername((errCheck) => {
    if (errCheck) return res.status(errCheck.message === 'اسم المستخدم مستخدم بالفعل' ? 409 : 500).json({ error: errCheck.message });

    db.get('SELECT role FROM Users WHERE id = ?', [userId], (err2, user) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (!user) return res.status(404).json({ error: 'User not found' });

      // build update for Users table
      const fields = [];
      const params = [];
      if (username) { fields.push('username = ?'); params.push(username); }
      if (typeof password !== 'undefined') { fields.push('password = ?'); params.push(password); }
      if (typeof role !== 'undefined') { fields.push('role = ?'); params.push(role); }
      if (typeof status !== 'undefined') { fields.push('status = ?'); params.push(status); }

      const updateUsers = (next) => {
        if (fields.length === 0) return next();
        const sql = `UPDATE Users SET ${fields.join(', ')} WHERE id = ?`;
        db.run(sql, [...params, userId], function (err3) {
          if (err3) return res.status(500).json({ error: err3.message });
          next();
        });
      };

      updateUsers(() => {
        const syncProfile = (profileSql, params, querySql) => {
            if (!fullName && !email && !studentNumber && !major && !staffNumber) {
              // no profile updates requested, return current combined profile
              db.get(querySql, [userId], (err5, updatedProfile) => {
                if (err5) return res.status(500).json({ error: err5.message });
                res.json({ ...updatedProfile, username: username || updatedProfile.username, role: role || user.role });
              });
              return;
            }
            db.run(profileSql, params, function (err4) {
              if (err4) return res.status(500).json({ error: err4.message });

              db.get(querySql, [userId], (err5, updatedProfile) => {
                if (err5) return res.status(500).json({ error: err5.message });
                res.json({ ...updatedProfile, username: username || updatedProfile.username, role: role || user.role });
              });
            });
          };

          if (user.role === 'Student') {
            // allow updating studentNumber and major in addition to fullName and email
            syncProfile(
              'UPDATE Students SET fullName = COALESCE(?, fullName), email = COALESCE(?, email), studentNumber = COALESCE(?, studentNumber), major = COALESCE(?, major) WHERE userId = ?',
              [fullName, email, studentNumber, major, userId],
              'SELECT u.id, u.username, u.role, u.status, s.studentNumber, s.fullName, s.email, s.major, s.year FROM Users u JOIN Students s ON s.userId = u.id WHERE u.id = ?'
            );
          } else if (user.role === 'Instructor') {
            // allow updating staffNumber and major (and fullName/email)
            syncProfile(
              'UPDATE Instructors SET fullName = COALESCE(?, fullName), email = COALESCE(?, email), staffNumber = COALESCE(?, staffNumber), major = COALESCE(?, major) WHERE userId = ?',
              [fullName, email, staffNumber, major, userId],
              'SELECT u.id, u.username, u.role, u.status, i.fullName, i.email, i.department, i.staffNumber, i.major, i.courseName FROM Users u JOIN Instructors i ON i.userId = u.id WHERE u.id = ?'
            );
          } else {
          db.get('SELECT id, username, role, status FROM Users WHERE id = ?', [userId], (err6, updatedUser) => {
            if (err6) return res.status(500).json({ error: err6.message });
            res.json(updatedUser);
          });
        }
      });
    });
  });
});

router.delete('/:id', (req, res) => {
  const userId = req.params.id;

  db.serialize(() => {
    db.get('SELECT id AS studentId FROM Students WHERE userId = ?', [userId], (err, studentRow) => {
      if (err) return res.status(500).json({ error: err.message });

      const deleteStudentData = (next) => {
        if (!studentRow) return next();
        db.run('DELETE FROM Enrollments WHERE studentId = ?', [studentRow.studentId], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          db.run('DELETE FROM Students WHERE userId = ?', [userId], (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            next();
          });
        });
      };

      db.get('SELECT id AS instructorId FROM Instructors WHERE userId = ?', [userId], (err4, instructorRow) => {
        if (err4) return res.status(500).json({ error: err4.message });

        const deleteInstructorData = (next) => {
          if (!instructorRow) return next();
          db.run('UPDATE Courses SET instructorId = NULL WHERE instructorId = ?', [instructorRow.instructorId], (err5) => {
            if (err5) return res.status(500).json({ error: err5.message });
            db.run('DELETE FROM Instructors WHERE userId = ?', [userId], (err6) => {
              if (err6) return res.status(500).json({ error: err6.message });
              next();
            });
          });
        };

        deleteStudentData(() => {
          deleteInstructorData(() => {
            db.run('DELETE FROM Users WHERE id = ?', [userId], function (err7) {
              if (err7) return res.status(500).json({ error: err7.message });
              if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
              res.json({ message: 'User deleted' });
            });
          });
        });
      });
    });
  });
});

module.exports = router;
