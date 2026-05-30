# Student Registration System (SRS)

Simple Student Registration System built with Node.js, Express, and SQLite.

## Features

- Users: login and role support (Student, Instructor, Admin)
- Students: add, edit, view, delete
- Courses: add, edit, view, delete
- Instructors: add, list, assign to courses
- Enrollment: register students to courses with duplicate prevention
- Reports: student count, course count, student enrollments

## Run locally

1. Install backend dependencies

```powershell
npm install
```

2. Start the backend server

```powershell
npm start
```

3. Install frontend dependencies

```powershell
cd client
npm install
```

4. Start the React client

```powershell
npm run dev
```

5. Open the frontend in a browser

Vite typically opens at `http://localhost:5173`

## API

The backend API is mounted under `/api` on `http://localhost:3000`.
