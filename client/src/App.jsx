import { useEffect, useState } from 'react';

const adminTabs = [
  { key: 'dashboard', label: 'لوحة التحكم' },
  { key: 'users', label: 'المستخدمين' },
  { key: 'courses', label: 'المقررات' },
  { key: 'majors', label: 'التخصصات' },
  { key: 'reports', label: 'التقارير' }
];

const tabsByRole = {
  Admin: adminTabs,
  Student: [{ key: 'studentDashboard', label: 'لوحة الطالب' }],
  Instructor: [{ key: 'instructorDashboard', label: 'لوحة الدكتور' }]
};

const initialStudent = { fullName: '', studentNumber: '', email: '', major: '', year: 1, username: '', password: '' };
const initialStudentProfile = { username: '', fullName: '', email: '' };
const initialCourse = { title: '', code: '', creditHours: 3, level: '', majorId: '' };
const initialInstructor = { fullName: '', email: '', department: '' };
const levels = [
  { value: '1', label: 'السنة الأولى' },
  { value: '2', label: 'السنة الثانية' },
  { value: '3', label: 'السنة الثالثة' },
  { value: '4', label: 'السنة الرابعة' }
];

const getMajorLevelLabel = (level) => {
  if (!level && level !== 0) return 'غير محدد';
  const levelString = String(level);
  const match = levels.find((item) => item.value === levelString || item.label === levelString);
  return match ? match.label : String(level);
};

const getUserMajorDisplay = (user) => {
  if (user.role === 'Student') {
    return user.studentMajor || user.major || '';
  }
  if (user.role === 'Instructor') {
    return user.instructorMajor || user.major || '';
  }
  return '';
};

const initialAuth = { username: '', password: '', role: 'Student', fullName: '', studentNumber: '', email: '', level: '', major: '', year: 1, courseName: '' };

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || response.statusText);
  }
  return response.json();
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersFilterRole, setUsersFilterRole] = useState('All');
  const [usersSearch, setUsersSearch] = useState('');
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [majors, setMajors] = useState([]);
  const [report, setReport] = useState({ studentCount: 0, courseCount: 0 });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingCourseRequests, setPendingCourseRequests] = useState([]);
  const [studentForm, setStudentForm] = useState(initialStudent);
  const [courseForm, setCourseForm] = useState(initialCourse);
  const [instructorForm, setInstructorForm] = useState(initialInstructor);
  const [courseRequest, setCourseRequest] = useState({ level: '', majorId: '', courseId: '', title: '', code: '', creditHours: '' });
  const [courseRequestMessage, setCourseRequestMessage] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [majorStatus, setMajorStatus] = useState('');
  const [studentStatus, setStudentStatus] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [studentCourses, setStudentCourses] = useState([]);
  const [instructorCourses, setInstructorCourses] = useState([]);
  const [studentProfileForm, setStudentProfileForm] = useState(initialStudentProfile);
  const [editingStudentProfile, setEditingStudentProfile] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ username: '', fullName: '', email: '', role: '', status: '', password: '', major: '', referenceNumber: '' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', fullName: '', email: '', role: 'Student', status: 'active', level: '1', major: '', referenceNumber: '', courseName: '' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(initialAuth);
  const [newMajor, setNewMajor] = useState('');
  const [newMajorLevel, setNewMajorLevel] = useState('1');
  const [editingMajorId, setEditingMajorId] = useState(null);
  const [editingMajorName, setEditingMajorName] = useState('');
  const [editingMajorLevel, setEditingMajorLevel] = useState('');

  const apiPrefix = '/api';

  const loadAdminData = async () => {
    try {
      const [studentsData, coursesData, instructorsData, majorsData, reportData, usersData] = await Promise.all([
        fetchJson(`${apiPrefix}/students`),
        fetchJson(`${apiPrefix}/courses`),
        fetchJson(`${apiPrefix}/instructors`),
        fetchJson(`${apiPrefix}/majors`),
        fetchJson(`${apiPrefix}/reports/summary`),
        fetchJson(`${apiPrefix}/users`)
      ]);
      setStudents(studentsData);
      setCourses(coursesData);
      setInstructors(instructorsData);
      setMajors(majorsData);
      setReport(reportData);
      setUsers(usersData);
      await Promise.all([loadPendingUsers(), loadPendingCourseRequests()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadStudentData = async (studentId) => {
    try {
      const [majorsData, coursesData] = await Promise.all([
        fetchJson(`${apiPrefix}/majors`),
        fetchJson(`${apiPrefix}/courses`)
      ]);
      setMajors(majorsData);
      setStudentCourses(coursesData);
      if (currentUser?.profile) {
        setStudentProfileForm({
          username: currentUser.username || '',
          fullName: currentUser.profile.fullName || '',
          email: currentUser.profile.email || ''
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadInstructorData = async (instructorId) => {
    try {
      const [majorsData, instructorCoursesData] = await Promise.all([
        fetchJson(`${apiPrefix}/majors`),
        fetchJson(`${apiPrefix}/courses/instructor/${instructorId}`)
      ]);
      setMajors(majorsData);
      setInstructorCourses(instructorCoursesData);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadPendingUsers = async () => {
    try {
      const pending = await fetchJson(`${apiPrefix}/users/pending`);
      setPendingUsers(pending);
    } catch (err) {
      setPendingUsers([]);
    }
  };

  const loadPendingCourseRequests = async () => {
    try {
      const pending = await fetchJson(`${apiPrefix}/courses/requests`);
      setPendingCourseRequests(pending);
    } catch (err) {
      setPendingCourseRequests([]);
    }
  };

  const loadMajorsOnly = async () => {
    try {
      const majorsData = await fetchJson(`${apiPrefix}/majors`);
      setMajors(majorsData);
    } catch (err) {
      setMajors([]);
    }
  };

  const loadCoursesOnly = async () => {
    try {
      const coursesData = await fetchJson(`${apiPrefix}/courses`);
      setCourses(coursesData);
    } catch (err) {
      setCourses([]);
    }
  };

  useEffect(() => {
    loadMajorsOnly();
    loadCoursesOnly();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'Admin') {
      setActiveTab('dashboard');
      loadAdminData();
    } else if (currentUser.role === 'Student') {
      setActiveTab('studentDashboard');
      loadStudentData(currentUser.profile?.id);
    } else if (currentUser.role === 'Instructor') {
      setActiveTab('instructorDashboard');
      loadInstructorData(currentUser.profile?.id);
    }
  }, [currentUser]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      if (authMode === 'login') {
        const result = await fetchJson(`${apiPrefix}/users/login`, {
          method: 'POST',
          body: JSON.stringify(authForm)
        });
        setCurrentUser(result.user);
        setMessage('تم تسجيل الدخول بنجاح');
      } else {
        const result = await fetchJson(`${apiPrefix}/users/register`, {
          method: 'POST',
          body: JSON.stringify(authForm)
        });
        setMessage(result.status === 'pending' ? 'تم إنشاء الحساب، في انتظار موافقة الأدمن.' : 'تم إنشاء الحساب بنجاح');
        setAuthForm(initialAuth);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelEditMajor = () => {
    setEditingMajorId(null);
    setEditingMajorName('');
    setError('');
    setMajorStatus('');
  };

  const handleEditMajor = (major) => {
    setEditingMajorId(major.id);
    setEditingMajorName(major.name);
    setEditingMajorLevel(major.level);
  };

  const handleSaveMajorEdit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setMajorStatus('');

    const trimmedName = editingMajorName.trim();
    const trimmedLevel = editingMajorLevel.trim();
    if (!trimmedName) {
      const msg = 'اسم التخصص مطلوب';
      setError(msg);
      setMajorStatus(msg);
      return;
    }
    if (!trimmedLevel) {
      const msg = 'المستوى الدراسي مطلوب';
      setError(msg);
      setMajorStatus(msg);
      return;
    }
    if (majors.some((major) => major.name.toLowerCase() === trimmedName.toLowerCase() && major.id !== editingMajorId)) {
      const msg = 'هذا التخصص موجود بالفعل';
      setError(msg);
      setMajorStatus(msg);
      return;
    }

    try {
      await fetchJson(`${apiPrefix}/majors/${editingMajorId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: trimmedName, level: trimmedLevel })
      });
      setEditingMajorId(null);
      setEditingMajorName('');
      setMessage('تم تعديل التخصص بنجاح');
      setMajorStatus('تم تعديل التخصص بنجاح');
      await loadMajorsOnly();
    } catch (err) {
      setError(err.message);
      setMajorStatus(err.message);
    }
  };

  const handleDeleteMajor = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التخصص؟')) return;
    setError('');
    setMessage('');
    setMajorStatus('');

    try {
      await fetchJson(`${apiPrefix}/majors/${id}`, {
        method: 'DELETE'
      });
      setMessage('تم حذف التخصص بنجاح');
      setMajorStatus('تم حذف التخصص بنجاح');
      await loadMajorsOnly();
    } catch (err) {
      setError(err.message);
      setMajorStatus(err.message);
    }
  };

  const handleApprove = async (id) => {
    setError('');
    setMessage('');
    try {
      await fetchJson(`${apiPrefix}/users/approve/${id}`, { method: 'POST' });
      setMessage('تمت الموافقة على حساب الدكتور');
      await loadPendingUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectInstructor = async (id) => {
    setError('');
    setMessage('');
    try {
      await fetchJson(`${apiPrefix}/users/reject/${id}`, { method: 'POST' });
      setMessage('تم رفض طلب حساب الدكتور بنجاح');
      await loadPendingUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRequestCourse = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCourseRequestMessage('');
    if (!currentUser?.profile?.id) {
      setCourseRequestMessage('لا يمكن إرسال طلب المادة الآن. حاول مرة أخرى لاحقًا.');
      return;
    }
    try {
      if (courseRequest.courseId === '__new') {
        // Submit a new-course request with the provided fields
        if (!courseRequest.title || !courseRequest.code) {
          setCourseRequestMessage('الرجاء تعبئة اسم المادة ورمزها.');
          return;
        }
        await fetchJson(`${apiPrefix}/courses/requests`, {
          method: 'POST',
          body: JSON.stringify({
            title: courseRequest.title,
            code: courseRequest.code,
            creditHours: Number(courseRequest.creditHours) || 0,
            majorId: Number(courseRequest.majorId),
            instructorId: currentUser.profile.id
          })
        });
        setCourseRequestMessage('تم إرسال طلب إضافة مادة جديدة. في انتظار موافقة الأدمن.');
        setCourseRequest({ level: '', majorId: '', courseId: '', title: '', code: '', creditHours: '' });
      } else {
        // Selected an existing course — inform the user or optionally request assignment
        const selectedCourse = courses.find((course) => String(course.id) === String(courseRequest.courseId));
        if (!selectedCourse) {
          setCourseRequestMessage('الرجاء اختيار مادة صحيحة من القائمة.');
          return;
        }
        // If the course already exists, server will respond with conflict; show a message instead
        setCourseRequestMessage('المادة التي اخترتها موجودة بالفعل في النظام.');
      }
    } catch (err) {
      setCourseRequestMessage(err.message || 'حدث خطأ أثناء إرسال الطلب');
    }
  };

  const handleApproveCourseRequest = async (id) => {
    setError('');
    setMessage('');
    try {
      await fetchJson(`${apiPrefix}/courses/requests/approve/${id}`, { method: 'POST' });
      setMessage('تمت الموافقة على طلب المادة بنجاح');
      await Promise.all([loadPendingCourseRequests(), loadMajorsOnly()]);
      const updatedCourses = await fetchJson(`${apiPrefix}/courses`);
      setCourses(updatedCourses);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectCourseRequest = async (id) => {
    setError('');
    setMessage('');
    try {
      await fetchJson(`${apiPrefix}/courses/requests/reject/${id}`, { method: 'POST' });
      setMessage('تم رفض طلب المادة وحُذِف من قائمة الطلبات.');
      await loadPendingCourseRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMajor = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setMajorStatus('');
    const trimmedMajor = newMajor.trim();
    const trimmedLevel = newMajorLevel.trim();
    if (!trimmedMajor) {
      const msg = 'اسم التخصص مطلوب';
      setError(msg);
      setMajorStatus(msg);
      return;
    }
    if (!trimmedLevel) {
      const msg = 'المستوى الدراسي مطلوب';
      setError(msg);
      setMajorStatus(msg);
      return;
    }
    if (majors.some((major) => major.name.toLowerCase() === trimmedMajor.toLowerCase())) {
      const msg = 'هذا التخصص موجود بالفعل';
      setError(msg);
      setMajorStatus(msg);
      return;
    }
    try {
      await fetchJson(`${apiPrefix}/majors`, {
        method: 'POST',
        body: JSON.stringify({ name: trimmedMajor, level: trimmedLevel })
      });
      setNewMajor('');
      setNewMajorLevel('1');
      setMessage('تم إضافة التخصص بنجاح');
      setMajorStatus('تم إضافة التخصص بنجاح');
      await loadMajorsOnly();
    } catch (err) {
      setError(err.message);
      setMajorStatus(err.message);
    }
  };

  const handleSubmit = async (event, type) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      if (type === 'student') {
        await fetchJson(`${apiPrefix}/students`, {
          method: 'POST',
          body: JSON.stringify(studentForm)
        });
        setStudentForm(initialStudent);
        setStudentStatus('تم إضافة الطالب بنجاح');
      }
      if (type === 'course') {
        const payload = {
          ...courseForm,
          majorId: courseForm.majorId ? Number(courseForm.majorId) : null
        };
        await fetchJson(`${apiPrefix}/courses`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setCourseForm(initialCourse);
      }
      if (type === 'instructor') {
        await fetchJson(`${apiPrefix}/instructors`, {
          method: 'POST',
          body: JSON.stringify(instructorForm)
        });
        setInstructorForm(initialInstructor);
      }
      setMessage(type === 'student' ? studentStatus || 'تم حفظ البيانات بنجاح' : 'تم حفظ البيانات بنجاح');
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, type) => {
    setError('');
    setMessage('');
    try {
      await fetchJson(`${apiPrefix}/${type}/${id}`, { method: 'DELETE' });
      setMessage('تم الحذف بنجاح');
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthMode('login');
    setAuthForm(initialAuth);
    setError('');
    setMessage('');
  };

  const renderAuth = () => (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-hero">
          <div className="auth-logo">
            <div className="auth-logo-icon">🎓</div>
            <div>
              <strong>صحبتي</strong>
              <p>بوابة التسجيل الذكيّة للطلاب والدكاترة.</p>
            </div>
          </div>
          <div className="auth-hero-body">
            <div className="auth-hero-text">
              <h2>{authMode === 'login' ? 'مرحبا بك مرة أخرى' : 'ابدأ رحلتك معنا'}</h2>
              <p>استخدم اسم المستخدم وكلمة المرور للدخول، أو أنشئ حسابًا جديدًا بسهولة.</p>
            </div>
            <div className="mouse-pointer" aria-hidden="true">
              <div className="mouse-wheel" />
            </div>
          </div>
        </div>
        <h1>{authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</h1>
        {(error || message) && (
          <div className={`auth-status ${error ? 'error' : 'success'}`}>
            {error || message}
          </div>
        )}
        <form onSubmit={handleAuthSubmit}>
          <div className="form-row">
            <input
              type="text"
              placeholder="اسم المستخدم أو البريد الإلكتروني"
              value={authForm.username}
              onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="كلمة المرور"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              required
            />
          </div>
          {authMode === 'register' && (
            <>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="الاسم"
                  value={authForm.fullName}
                  onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="الرقم الجامعي"
                  value={authForm.studentNumber}
                  onChange={(e) => setAuthForm({ ...authForm, studentNumber: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <label style={{ width: '100%' }}>
                  نوع الحساب
                  <select
                    value={authForm.role}
                    onChange={(e) => setAuthForm({ ...authForm, role: e.target.value, courseName: '' })}
                  >
                    <option value="Student">طالب</option>
                    <option value="Instructor">دكتور</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label style={{ width: '100%' }}>
                  المستوى الدراسي
                  <select
                    value={authForm.level}
                    onChange={(e) => setAuthForm({ ...authForm, level: e.target.value, major: '', courseName: '' })}
                    required
                  >
                    <option value="">اختر المستوى</option>
                    {levels.map((level) => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label style={{ width: '100%' }}>
                  التخصص
                  <select
                    value={authForm.major}
                    onChange={(e) => setAuthForm({ ...authForm, major: e.target.value, courseName: '' })}
                    required
                  >
                    <option value="">اختر التخصص</option>
                    {majors
                      .filter((major) => major.level === authForm.level)
                      .map((major) => (
                        <option key={major.id} value={major.name}>{major.name}</option>
                      ))}
                  </select>
                </label>
              </div>
              {authForm.role === 'Instructor' && (
                <div className="form-row">
                  <label style={{ width: '100%' }}>
                    المادة
                    <select
                      value={authForm.courseName}
                      onChange={(e) => setAuthForm({ ...authForm, courseName: e.target.value })}
                      required
                    >
                      <option value="">اختر المادة</option>
                      {courses
                        .filter((course) => course.majorName === authForm.major && course.majorLevel === authForm.level)
                        .map((course) => (
                          <option key={course.id} value={course.title}>{course.title}</option>
                        ))}
                    </select>
                  </label>
                </div>
              )}
            </>
          )}
          <button type="submit" className="primary">{authMode === 'login' ? 'دخول' : 'إنشاء حساب'}</button>
        </form>
        <div className="switch-auth">
          <p>
            {authMode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
            <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }}>
              {authMode === 'login' ? 'إنشاء حساب' : 'تسجيل دخول'}
            </button>
          </p>
        </div>
        {authMode === 'register' && (
          <div className="alert" style={{ marginTop: '16px' }}>
            عند تسجيل حساب دكتور، يجب الموافقة عليه من قبل الأدمن قبل أن يتمكن من الدخول.
          </div>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <>
      {currentUser && (
        <div className="card" style={{ marginBottom: '18px' }}>
          <strong>مرحبًا، {currentUser.username} ({currentUser.role})</strong>
        </div>
      )}
      <div className="grid-2">
        <div className="card">
          <h2>إجمالي الطلبة</h2>
          <p className="message">{report.studentCount}</p>
        </div>
        <div className="card">
          <h2>إجمالي المقررات</h2>
          <p className="message">{report.courseCount}</p>
        </div>
      </div>
      {currentUser?.role === 'Admin' && (
        <div className="card">
          <h2>طلبات الموافقة على حسابات الدكاترة</h2>
          {pendingUsers.length === 0 ? (
            <p>لا توجد حسابات معلقة.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>اسم المستخدم</th>
                    <th>البريد الإلكتروني</th>
                    <th>التخصص</th>
                    <th>المستوى</th>
                    <th>المادة</th>
                    <th>الحالة</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email || 'غير متوفر'}</td>
                      <td>{user.major || 'غير محدد'}</td>
                      <td>{getMajorLevelLabel(user.level)}</td>
                      <td>{user.courseName || 'غير محددة'}</td>
                      <td>{user.status}</td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button className="primary" onClick={() => handleApprove(user.id)}>
                          موافقة
                        </button>
                        <button className="danger" onClick={() => handleRejectInstructor(user.id)}>
                          رفض
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {currentUser?.role === 'Admin' && (
        <div className="card" style={{ marginTop: '18px' }}>
          <h2>طلبات الموافقة على مقررات جديدة</h2>
          {pendingCourseRequests.length === 0 ? (
            <p>لا توجد طلبات مقررات معلقة.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>المادة</th>
                    <th>كود المادة</th>
                    <th>التخصص</th>
                    <th>عدد الساعات</th>
                    <th>الدكتور</th>
                    <th>الحالة</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCourseRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.title}</td>
                      <td>{request.code}</td>
                      <td>{request.majorName || 'غير محدد'}</td>
                      <td>{request.creditHours || 'غير محدد'}</td>
                      <td>{request.instructorName || request.username || 'غير متوفر'}</td>
                      <td>{request.status}</td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button className="primary" onClick={() => handleApproveCourseRequest(request.id)}>
                          موافقة
                        </button>
                        <button className="danger" onClick={() => handleRejectCourseRequest(request.id)}>
                          رفض
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <div className="card">
        <h2>ملخص النظام</h2>
        <p>يمكنك إدارة الطلبة، المقررات، الدكاترة، التسجيلات، وعرض التقارير من الشريط الجانبي.</p>
      </div>
    </>
  );

  const renderStudentDashboard = () => (
    <div className="card">
      <h2>لوحة الطالب</h2>
      <p>مرحبًا {currentUser.username}، هذه لوحة مخصصة للطالب.</p>
      {currentUser?.profile ? (
        <>
          <div style={{ marginTop: '18px' }}>
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '20px', border: '1px solid #e9ecef' }}>
              <h3 style={{ margin: '0 0 18px 0', color: '#2c3e50', fontSize: '20px', borderBottom: '3px solid #27ae60', paddingBottom: '12px' }}>معلومات الطالب</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                <div>
                  <p style={{ margin: '0 0 6px 0', color: '#7f8c8d', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>الاسم</p>
                  <p style={{ margin: 0, color: '#2c3e50', fontSize: '16px', fontWeight: '500' }}>{currentUser.profile.fullName}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px 0', color: '#7f8c8d', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>الرقم الجامعي</p>
                  <p style={{ margin: 0, color: '#2c3e50', fontSize: '16px', fontWeight: '500' }}>{currentUser.profile.studentNumber}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px 0', color: '#7f8c8d', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>البريد الإلكتروني</p>
                  <p style={{ margin: 0, color: '#2c3e50', fontSize: '16px', fontWeight: '500', direction: 'ltr', textAlign: 'right' }}>{currentUser.profile.email}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px 0', color: '#7f8c8d', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>التخصص</p>
                  <p style={{ margin: 0, color: '#2c3e50', fontSize: '16px', fontWeight: '500' }}>{currentUser.profile.major}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 6px 0', color: '#7f8c8d', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>السنة الدراسية</p>
                  <p style={{ margin: 0, color: '#2c3e50', fontSize: '16px', fontWeight: '500' }}>{currentUser.profile.year}</p>
                </div>
              </div>
              <button className="primary" style={{ marginTop: '18px' }} onClick={() => setEditingStudentProfile((value) => !value)}>
                {editingStudentProfile ? 'إلغاء التعديل' : '✏️ تعديل البيانات'}
              </button>
            </div>
          </div>

          {editingStudentProfile && (
            <div className="card" style={{ marginTop: '18px' }}>
              <h3>تعديل بيانات الطالب</h3>
              <form onSubmit={handleSaveStudentProfile}>
                <div className="grid-2">
                  <label style={{ width: '100%' }}>
                    اسم المستخدم
                    <input
                      placeholder="اسم المستخدم"
                      value={studentProfileForm.username}
                      onChange={(e) => setStudentProfileForm({ ...studentProfileForm, username: e.target.value })}
                      required
                    />
                  </label>
                  <label style={{ width: '100%' }}>
                    الاسم الكامل
                    <input
                      placeholder="الاسم الكامل"
                      value={studentProfileForm.fullName}
                      onChange={(e) => setStudentProfileForm({ ...studentProfileForm, fullName: e.target.value })}
                      required
                    />
                  </label>
                  <label style={{ width: '100%' }}>
                    البريد الإلكتروني
                    <input
                      placeholder="البريد الإلكتروني"
                      value={studentProfileForm.email}
                      onChange={(e) => setStudentProfileForm({ ...studentProfileForm, email: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <button type="submit" className="primary">حفظ التعديلات</button>
              </form>
            </div>
          )}
        </>
      ) : (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '16px', marginTop: '18px', color: '#856404' }}>
          <p style={{ margin: 0, fontSize: '15px' }}>⚠️ لم يتم العثور على بيانات الطالب المرتبطة بهذا الحساب.</p>
        </div>
      )}
      <div className="card" style={{ marginTop: '18px' }}>
        <h3>المقررات المسجلة</h3>
        {(() => {
          const majorName = currentUser?.profile?.major?.trim();
          const filteredCourses = studentCourses.filter(course => course.majorName?.trim() === majorName);
          return filteredCourses.length === 0 ? (
            <p>لا توجد مقررات مسجلة في تخصص {majorName || 'غير محدد'} بعد.</p>
          ) : (
            <ul>
              {filteredCourses.map((course) => (
                <li key={course.id}>{course.title} — {course.instructorName || 'غير محدد'}</li>
              ))}
            </ul>
          );
        })()}
      </div>
    </div>
  );

  const renderInstructorDashboard = () => (
    <div className="card">
      <h2>لوحة الدكتور</h2>
      <p>مرحبًا {currentUser.username}، هذه لوحة مخصصة للدكتور.</p>
      {currentUser?.profile ? (
        <div style={{ marginTop: '18px' }}>
          <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '20px', border: '1px solid #e9ecef' }}>
            <h3 style={{ margin: '0 0 18px 0', color: '#2c3e50', fontSize: '20px', borderBottom: '3px solid #3498db', paddingBottom: '12px' }}>معلومات الدكتور</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              <div>
                <p style={{ margin: '0 0 6px 0', color: '#7f8c8d', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>الاسم</p>
                <p style={{ margin: 0, color: '#2c3e50', fontSize: '16px', fontWeight: '500' }}>{currentUser.profile.fullName}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 6px 0', color: '#7f8c8d', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>البريد الإلكتروني</p>
                <p style={{ margin: 0, color: '#2c3e50', fontSize: '16px', fontWeight: '500', direction: 'ltr', textAlign: 'right' }}>{currentUser.profile.email}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 6px 0', color: '#7f8c8d', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>القسم/التخصص</p>
                <p style={{ margin: 0, color: '#2c3e50', fontSize: '16px', fontWeight: '500' }}>{currentUser.profile.department || currentUser.profile.major || '—'}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 6px 0', color: '#7f8c8d', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>رقم الموظف</p>
                <p style={{ margin: 0, color: '#2c3e50', fontSize: '16px', fontWeight: '500' }}>{currentUser.profile.staffNumber || '—'}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ margin: '0 0 6px 0', color: '#7f8c8d', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>المادة المسندة</p>
                <p style={{ margin: 0, color: '#2c3e50', fontSize: '16px', fontWeight: '500' }}>{currentUser.profile.courseName || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '16px', marginTop: '18px', color: '#856404' }}>
          <p style={{ margin: 0, fontSize: '15px' }}>⚠️ لم يتم العثور على بيانات الدكتور المرتبطة بهذا الحساب.</p>
        </div>
      )}
      <div className="card" style={{ marginTop: '18px' }}>
        <h3>طلب مادة جديدة</h3>
        <form onSubmit={handleRequestCourse}>
          <div className="form-row">
            <label style={{ width: '100%' }}>
              المستوى الدراسي
              <select
                value={courseRequest.level}
                onChange={(e) => setCourseRequest({ ...courseRequest, level: e.target.value, majorId: '', courseId: '' })}
                required
              >
                <option value="">اختر المستوى</option>
                {levels.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label style={{ width: '100%' }}>
              التخصص
              <select
                value={courseRequest.majorId}
                onChange={(e) => setCourseRequest({ ...courseRequest, majorId: e.target.value })}
                required
              >
                <option value="">اختر التخصص</option>
                {majors
                  .filter((major) => major.level === courseRequest.level)
                  .map((major) => (
                    <option key={major.id} value={major.id}>{major.name}</option>
                  ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label style={{ width: '100%' }}>
              المادة
              <select
                value={courseRequest.courseId}
                onChange={(e) => setCourseRequest({ ...courseRequest, courseId: e.target.value })}
                required
              >
                <option value="">اختر المادة</option>
                <option value="__new">إضافة مادة جديدة</option>
                {courses
                  .filter((course) => String(course.majorId) === String(courseRequest.majorId) && String(course.majorLevel) === String(courseRequest.level))
                  .map((course) => (
                    <option key={course.id} value={course.id}>{course.title} ({course.code})</option>
                  ))}
              </select>
            </label>
          </div>
          {courseRequest.courseId === '__new' && (
            <>
              <div className="form-row">
                <input placeholder="اسم المادة" value={courseRequest.title} onChange={(e) => setCourseRequest({ ...courseRequest, title: e.target.value })} required />
                <input placeholder="رمز المادة" value={courseRequest.code} onChange={(e) => setCourseRequest({ ...courseRequest, code: e.target.value })} required />
              </div>
              <div className="form-row">
                <input type="number" min="1" max="10" placeholder="عدد الساعات" value={courseRequest.creditHours} onChange={(e) => setCourseRequest({ ...courseRequest, creditHours: e.target.value })} required />
              </div>
            </>
          )}
          <button type="submit" className="primary">طلب موافقة على المادة</button>
        </form>
        {courseRequestMessage && <div className="alert" style={{ marginTop: '12px' }}>{courseRequestMessage}</div>}
      </div>
      <div className="card" style={{ marginTop: '18px' }}>
        <h3>المقررات التي تدرّسها</h3>
        {instructorCourses.length === 0 ? (
          currentUser?.profile?.courseName ? (
            <ul>
              <li>{currentUser.profile.courseName} (المادة المحددة عند التسجيل)</li>
            </ul>
          ) : (
            <p>لم يتم تعيين أي مقررات بعد.</p>
          )
        ) : (
          <ul>
            {instructorCourses.map((course) => (
              <li key={course.id}>{course.title} ({course.code})</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const handleSaveStudentProfile = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!currentUser?.id) {
      setError('لا يمكن تحديث البيانات في هذا الوقت');
      return;
    }

    try {
      const updated = await fetchJson(`${apiPrefix}/users/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(studentProfileForm)
      });
      setMessage('تم تحديث البيانات بنجاح');
      setCurrentUser((prev) => ({ ...prev, username: updated.username, profile: updated }));
      setEditingStudentProfile(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const renderStudents = () => (
    <div className="card">
      <h2>إدارة الطلبة</h2>
      <form onSubmit={(event) => handleSubmit(event, 'student')}>
        <div className="grid-2">
          <input placeholder="اسم المستخدم (للدخول)" value={studentForm.username} onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })} required />
          <input placeholder="كلمة المرور" type="password" value={studentForm.password} onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} required />
          <input placeholder="الاسم الكامل" value={studentForm.fullName} onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })} required />
          <input placeholder="الرقم الجامعي" value={studentForm.studentNumber} onChange={(e) => setStudentForm({ ...studentForm, studentNumber: e.target.value })} required />
          <input placeholder="البريد الإلكتروني" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} required />
          <label style={{ width: '100%' }}>
            التخصص
            <select value={studentForm.major} onChange={(e) => setStudentForm({ ...studentForm, major: e.target.value })} required>
              <option value="">اختر التخصص</option>
              {majors.map((major) => (
                <option key={major.id} value={major.name}>{major.name}</option>
              ))}
            </select>
          </label>
          <input type="number" min="1" max="8" placeholder="السنة الدراسية" value={studentForm.year} onChange={(e) => setStudentForm({ ...studentForm, year: Number(e.target.value) })} required />
        </div>
        <button type="submit" className="primary">إضافة طالب</button>
      </form>
      {studentStatus && (
        <div className="alert" style={{ marginTop: '16px', borderColor: error ? '#fca5a5' : '#a5f3fc', color: error ? '#991b1b' : '#0f766e' }}>
          {studentStatus}
        </div>
      )}

      <div className="table-wrapper" style={{ marginTop: '24px' }}>
        <table>
          <thead>
            <tr>
              <th>اسم المستخدم</th>
              <th>الاسم</th>
              <th>الرقم الجامعي</th>
              <th>البريد</th>
              <th>التخصص</th>
              <th>السنة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.username || ''}</td>
                <td>{student.fullName}</td>
                <td>{student.studentNumber}</td>
                <td>{student.email}</td>
                <td>{student.major}</td>
                <td>{student.year}</td>
                <td>
                  <button className="danger" onClick={() => handleDelete(student.id, 'students')}>حذف</button>
                </td>
              </tr>
            ))}
            {students.length === 0 && <tr><td colSpan="6">لا يوجد طلبة بعد.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCourses = () => (
    <div className="card">
      <h2>إضافة مادة</h2>
      <form onSubmit={(event) => handleSubmit(event, 'course')}>
        <div className="grid-2">
          <input placeholder="اسم المادة" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} required />
          <input placeholder="رمز المادة" value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} required />
          <input type="number" min="1" max="10" placeholder="عدد الساعات" value={courseForm.creditHours} onChange={(e) => setCourseForm({ ...courseForm, creditHours: Number(e.target.value) })} required />
          <label style={{ width: '100%' }}>
            المستوى الدراسي
            <select value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value, majorId: '' })} required>
              <option value="">اختر المستوى</option>
              {levels.map((lv) => (
                <option key={lv.value} value={lv.value}>{lv.label}</option>
              ))}
            </select>
          </label>
          <label style={{ width: '100%' }}>
            التخصص
            <select value={courseForm.majorId} onChange={(e) => setCourseForm({ ...courseForm, majorId: e.target.value })} required>
              <option value="">اختر التخصص</option>
              {majors
                .filter((major) => major.level === courseForm.level)
                .map((major) => (
                  <option key={major.id} value={major.id}>{major.name}</option>
                ))}
            </select>
          </label>
        </div>
        <button type="submit" className="primary">إضافة مادة</button>
      </form>

      <div className="table-wrapper" style={{ marginTop: '24px' }}>
        <table>
          <thead>
            <tr>
              <th>اسم المادة</th>
              <th>الكود</th>
              <th>الساعات</th>
              <th>التخصص</th>
              <th>الدكتور</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>{course.title}</td>
                <td>{course.code}</td>
                <td>{course.creditHours}</td>
                <td>{course.majorName || 'غير محدد'}</td>
                <td>{course.instructorName || 'غير مضاف'}</td>
                <td><button className="danger" onClick={() => handleDelete(course.id, 'courses')}>حذف</button></td>
              </tr>
            ))}
            {courses.length === 0 && <tr><td colSpan="6">لا توجد مقررات بعد.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMajors = () => (
    <div className="card">
      <h2>إدارة التخصصات</h2>
      <form onSubmit={handleAddMajor} style={{ marginBottom: '18px' }}>
        <div className="form-row">
          <input
            type="text"
            placeholder="اسم التخصص الجديد"
            value={newMajor}
            onChange={(e) => setNewMajor(e.target.value)}
            required
          />
          <label style={{ width: '220px' }}>
            المستوى الدراسي
            <select value={newMajorLevel} onChange={(e) => setNewMajorLevel(e.target.value)} required>
              {levels.map((level) => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="primary">إضافة التخصص</button>
        </div>
      </form>
      {majorStatus && (
        <div className="alert" style={{ marginBottom: '18px', borderColor: error ? '#fca5a5' : '#a5f3fc', color: error ? '#991b1b' : '#0f766e' }}>
          {majorStatus}
        </div>
      )}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>التخصص</th>
              <th>المستوى</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {majors.length === 0 ? (
              <tr><td colSpan="3">لا توجد تخصصات بعد.</td></tr>
            ) : majors.map((major) => (
              <tr key={major.id}>
                <td>
                  {editingMajorId === major.id ? (
                    <input
                      type="text"
                      value={editingMajorName}
                      onChange={(e) => setEditingMajorName(e.target.value)}
                      required
                    />
                  ) : (
                    major.name
                  )}
                </td>
                <td>
                  {editingMajorId === major.id ? (
                    <select value={editingMajorLevel} onChange={(e) => setEditingMajorLevel(e.target.value)} required>
                      {levels.map((level) => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  ) : (
                    getMajorLevelLabel(major.level)
                  )}
                </td>
                <td className="action-buttons">
                  {editingMajorId === major.id ? (
                    <>
                      <button type="button" className="primary" onClick={handleSaveMajorEdit}>حفظ</button>
                      <button type="button" className="secondary" onClick={handleCancelEditMajor}>إلغاء</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="secondary" onClick={() => handleEditMajor(major)}>تعديل</button>
                      <button type="button" className="danger" onClick={() => handleDeleteMajor(major.id)}>حذف</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderInstructors = () => (
    <div className="card">
      <h2>إدارة الدكاترة</h2>
      <form onSubmit={(event) => handleSubmit(event, 'instructor')}>
        <div className="grid-2">
          <input placeholder="الاسم الكامل" value={instructorForm.fullName} onChange={(e) => setInstructorForm({ ...instructorForm, fullName: e.target.value })} required />
          <input placeholder="البريد الإلكتروني" value={instructorForm.email} onChange={(e) => setInstructorForm({ ...instructorForm, email: e.target.value })} required />
          <input placeholder="القسم" value={instructorForm.department} onChange={(e) => setInstructorForm({ ...instructorForm, department: e.target.value })} required />
        </div>
        <button type="submit" className="primary">إضافة دكتور</button>
      </form>

      <div className="table-wrapper" style={{ marginTop: '24px' }}>
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>القسم</th>
            </tr>
          </thead>
          <tbody>
            {instructors.map((inst) => (
              <tr key={inst.id}>
                <td>{inst.fullName}</td>
                <td>{inst.email}</td>
                <td>{inst.department}</td>
              </tr>
            ))}
            {instructors.length === 0 && <tr><td colSpan="3">لا يوجد دكاترة بعد.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const openEditUser = (user) => {
    setEditingUserId(user.id);
    setEditUserForm({
      username: user.username || '',
      fullName: user.studentFullName || user.instructorFullName || '',
      email: user.studentEmail || user.instructorEmail || '',
      role: user.role || '',
      status: user.status || '',
      password: '',
      major: user.studentMajor || user.major || '',
      referenceNumber: user.studentNumber || user.staffNumber || ''
    });
  };

  const handleEditUserChange = (field, value) => {
    setEditUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!editingUserId) return;
    try {
      const payload = {
        username: editUserForm.username,
        fullName: editUserForm.fullName,
        email: editUserForm.email,
        role: editUserForm.role,
        status: editUserForm.status
      };
      if (editUserForm.password) payload.password = editUserForm.password;
      if (editUserForm.major) payload.major = editUserForm.major;
      if (editUserForm.referenceNumber) {
        if (editUserForm.role === 'Student') payload.studentNumber = editUserForm.referenceNumber;
        else if (editUserForm.role === 'Instructor') payload.staffNumber = editUserForm.referenceNumber;
      }
      await fetchJson(`${apiPrefix}/users/${editingUserId}`, { method: 'PUT', body: JSON.stringify(payload) });
      setMessage('تم تحديث المستخدم بنجاح');
      setEditingUserId(null);
      setEditUserForm({ username: '', fullName: '', email: '', role: '', status: '', password: '', major: '', referenceNumber: '' });
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setEditUserForm({ username: '', fullName: '', email: '', role: '', status: '', password: '', major: '', referenceNumber: '' });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const payload = {
        username: newUserForm.username,
        password: newUserForm.password,
        fullName: newUserForm.fullName,
        email: newUserForm.email,
        role: newUserForm.role,
        status: newUserForm.status,
        level: newUserForm.level,
        major: newUserForm.major
      };
      if (newUserForm.referenceNumber) {
        if (newUserForm.role === 'Student') payload.studentNumber = newUserForm.referenceNumber;
        else if (newUserForm.role === 'Instructor') payload.staffNumber = newUserForm.referenceNumber;
      }
      if (newUserForm.role === 'Instructor' && newUserForm.courseName) {
        payload.courseName = newUserForm.courseName;
      }
      await fetchJson(`${apiPrefix}/users`, { method: 'POST', body: JSON.stringify(payload) });
      setMessage('تم إنشاء المستخدم بنجاح');
      setCreatingUser(false);
      setNewUserForm({ username: '', password: '', fullName: '', email: '', role: 'Student', status: 'active', level: '1', major: '', referenceNumber: '', courseName: '' });
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelCreateUser = () => {
    setCreatingUser(false);
    setNewUserForm({ username: '', password: '', fullName: '', email: '', role: 'Student', status: 'active', level: '1', major: '', referenceNumber: '', courseName: '' });
  };

  const renderUsers = () => (
    <div className="card">
      <h2>إدارة المستخدمين</h2>
      {!creatingUser && (
        <div style={{ marginBottom: '18px' }}>
          <button className="primary" onClick={() => setCreatingUser(true)}>
            + إضافة مستخدم جديد
          </button>
        </div>
      )}
      {creatingUser && (
        <div className="card" style={{ marginBottom: '18px' }}>
          <h3>إنشاء مستخدم جديد</h3>
          <form onSubmit={handleCreateUser}>
            <div className="grid-2">
              <label style={{ width: '100%' }}>
                اسم المستخدم *
                <input value={newUserForm.username} onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })} required />
              </label>
              <label style={{ width: '100%' }}>
                كلمة المرور *
                <input type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} required />
              </label>
              <label style={{ width: '100%' }}>
                الاسم الكامل *
                <input value={newUserForm.fullName} onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })} required />
              </label>
              <label style={{ width: '100%' }}>
                البريد الإلكتروني *
                <input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} required />
              </label>
              <label style={{ width: '100%' }}>
                نوع الحساب *
                <select value={newUserForm.role} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })} required>
                  <option value="Student">طالب</option>
                  <option value="Instructor">دكتور</option>
                  <option value="Admin">أدمن</option>
                </select>
              </label>
              <label style={{ width: '100%' }}>
                الحالة *
                <select value={newUserForm.status} onChange={(e) => setNewUserForm({ ...newUserForm, status: e.target.value })} required>
                  <option value="active">active</option>
                  <option value="pending">pending</option>
                  <option value="disabled">disabled</option>
                </select>
              </label>
              <label style={{ width: '100%' }}>
                المستوى الدراسي *
                <select value={newUserForm.level} onChange={(e) => setNewUserForm({ ...newUserForm, level: e.target.value })} required>
                  <option value="1">السنة الأولى</option>
                  <option value="2">السنة الثانية</option>
                  <option value="3">السنة الثالثة</option>
                  <option value="4">السنة الرابعة</option>
                </select>
              </label>
              <label style={{ width: '100%' }}>
                التخصص *
                <select value={newUserForm.major} onChange={(e) => setNewUserForm({ ...newUserForm, major: e.target.value })} required>
                  <option value="">اختر التخصص</option>
                  {majors
                    .filter((m) => m.level === newUserForm.level)
                    .map((m) => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                </select>
              </label>
              <label style={{ width: '100%' }}>
                الرقم الجامعي/رقم موظف
                <input value={newUserForm.referenceNumber} onChange={(e) => setNewUserForm({ ...newUserForm, referenceNumber: e.target.value })} />
              </label>
              {newUserForm.role === 'Instructor' && (
                <label style={{ width: '100%' }}>
                  المادة
                  <select value={newUserForm.courseName} onChange={(e) => setNewUserForm({ ...newUserForm, courseName: e.target.value })}>
                    <option value="">لم يتم اختيار مادة</option>
                    {courses
                      .filter((c) => c.majorName === newUserForm.major && c.majorLevel === newUserForm.level)
                      .map((c) => (
                        <option key={c.id} value={c.title}>{c.title} ({c.code})</option>
                      ))}
                  </select>
                </label>
              )}
            </div>
            <div style={{ marginTop: '12px' }}>
              <button type="submit" className="primary">إنشاء</button>
              <button type="button" className="danger" style={{ marginLeft: '8px' }} onClick={handleCancelCreateUser}>إلغاء</button>
            </div>
          </form>
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        <label>
          فرز حسب الدور
          <select value={usersFilterRole} onChange={(e) => setUsersFilterRole(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="All">الكل</option>
            <option value="Student">طالب</option>
            <option value="Instructor">دكتور</option>
            <option value="Admin">أدمن</option>
          </select>
        </label>
        <label style={{ flex: 1 }}>
          بحث
          <input placeholder="ابحث باسم، يوزر، ايميل أو رقم مرجعي" value={usersSearch} onChange={(e) => setUsersSearch(e.target.value)} style={{ width: '100%', marginLeft: 8 }} />
        </label>
        <button className="primary" onClick={() => { setUsersFilterRole('All'); setUsersSearch(''); }}>مسح</button>
      </div>
      <div className="table-wrapper" style={{ marginTop: '12px' }}>
        <table>
          <thead>
            <tr>
              <th>اسم المستخدم</th>
              <th>الاسم</th>
              <th>التخصص</th>
              <th>المرجع</th>
              <th>البريد</th>
              <th>الدور</th>
              <th>الحالة</th>
              <th>إجراء</th>
              <th>حذف</th>
            </tr>
          </thead>
          <tbody>
            {users
              .filter((u) => {
                if (usersFilterRole !== 'All' && u.role !== usersFilterRole) return false;
                if (!usersSearch.trim()) return true;
                const q = usersSearch.trim().toLowerCase();
                const fields = [
                  (u.username || '').toLowerCase(),
                  (u.studentFullName || u.instructorFullName || '').toLowerCase(),
                  (u.studentEmail || u.instructorEmail || '').toLowerCase(),
                  (u.studentNumber || u.staffNumber || '').toLowerCase(),
                  getUserMajorDisplay(u).toLowerCase()
                ];
                return fields.some((f) => f.includes(q));
              })
              .map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.studentFullName || u.instructorFullName || ''}</td>
                  <td>{getUserMajorDisplay(u)}</td>
                  <td>{u.studentNumber || u.staffNumber || ''}</td>
                  <td>{u.studentEmail || u.instructorEmail || ''}</td>
                  <td>{u.role}</td>
                  <td>{u.status}</td>
                  <td>
                    <button className="primary" onClick={() => openEditUser(u)}>تعديل</button>
                  </td>
                  <td>
                    {u.role !== 'Admin' && (
                      <button
                        className="danger"
                        onClick={() => {
                          if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
                            handleDelete(u.id, 'users');
                          }
                        }}
                      >
                        حذف
                      </button>
                    )}
                  </td>
                </tr>
            ))}
            {users.filter((u) => {
              if (usersFilterRole !== 'All' && u.role !== usersFilterRole) return false;
              if (!usersSearch.trim()) return true;
              const q = usersSearch.trim().toLowerCase();
              const fields = [
                (u.username || '').toLowerCase(),
                (u.studentFullName || u.instructorFullName || '').toLowerCase(),
                (u.studentEmail || u.instructorEmail || '').toLowerCase(),
                (u.studentNumber || u.staffNumber || '').toLowerCase(),
                getUserMajorDisplay(u).toLowerCase()
              ];
              return fields.some((f) => f.includes(q));
            }).length === 0 && <tr><td colSpan="9">لا يوجد مستخدمين.</td></tr>}
          </tbody>
        </table>
      </div>

      {editingUserId && (
        <div className="card" style={{ marginTop: '18px' }}>
          <h3>تعديل مستخدم</h3>
          <form onSubmit={handleSaveUser}>
            <div className="grid-2">
              <label style={{ width: '100%' }}>
                اسم المستخدم
                <input value={editUserForm.username} onChange={(e) => handleEditUserChange('username', e.target.value)} required />
              </label>
              <label style={{ width: '100%' }}>
                الاسم الكامل
                <input value={editUserForm.fullName} onChange={(e) => handleEditUserChange('fullName', e.target.value)} />
              </label>
              <label style={{ width: '100%' }}>
                البريد الإلكتروني
                <input value={editUserForm.email} onChange={(e) => handleEditUserChange('email', e.target.value)} />
              </label>
              <label style={{ width: '100%' }}>
                كلمة المرور (اتركها فارغة إذا لا تريد التغيير)
                <input type="password" value={editUserForm.password} onChange={(e) => handleEditUserChange('password', e.target.value)} />
              </label>
              <label style={{ width: '100%' }}>
                الدور
                <select value={editUserForm.role} onChange={(e) => handleEditUserChange('role', e.target.value)}>
                  <option value="Student">طالب</option>
                  <option value="Instructor">دكتور</option>
                  <option value="Admin">أدمن</option>
                </select>
              </label>
              <label style={{ width: '100%' }}>
                الحالة
                <select value={editUserForm.status} onChange={(e) => handleEditUserChange('status', e.target.value)}>
                  <option value="active">active</option>
                  <option value="pending">pending</option>
                  <option value="disabled">disabled</option>
                </select>
              </label>
              <label style={{ width: '100%' }}>
                التخصص
                <input value={editUserForm.major} onChange={(e) => handleEditUserChange('major', e.target.value)} />
              </label>
              <label style={{ width: '100%' }}>
                الرقم المرجعي
                <input value={editUserForm.referenceNumber} onChange={(e) => handleEditUserChange('referenceNumber', e.target.value)} />
              </label>
            </div>
            <div style={{ marginTop: '12px' }}>
              <button type="submit" className="primary">حفظ</button>
              <button type="button" className="danger" style={{ marginLeft: '8px' }} onClick={handleCancelEditUser}>إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  const renderReports = () => (
    <div className="card">
      <h2>تقارير</h2>
      <div className="grid-2">
        <div className="alert">
          <strong>عدد الطلبة:</strong> {report.studentCount}
        </div>
        <div className="alert">
          <strong>عدد المقررات:</strong> {report.courseCount}
        </div>
      </div>
      <div className="card" style={{ marginTop: '18px' }}>
        <h3>قائمة المقررات المسجلة لكل طالب</h3>
        <p>يمكنك عرض هذه البيانات بواسطة استدعاء تقارير API أو إضافة صفحة تفصيلية لاحقًا.</p>
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div className="app-shell">
        {renderAuth()}
      </div>
    );
  }

  const visibleTabs = tabsByRole[currentUser.role] || adminTabs;
  const activeTabLabel = visibleTabs.find((item) => item.key === activeTab)?.label || visibleTabs[0]?.label;

  const handleTabClick = (tabKey) => {
    setActiveTab(tabKey);
    setMobileMenuOpen(false);
  };

  return (
    <div className="layout">
      <div className={`sidebar-backdrop ${mobileMenuOpen ? 'visible' : ''}`} onClick={() => setMobileMenuOpen(false)} />
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : 'closed'}`}>
        <h2>نظام تسجيل الطلبة</h2>
        <nav>
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? 'active' : ''}
              onClick={() => handleTabClick(tab.key)}
            >
              {tab.label}
            </button>
          ))}
          <button type="button" className="danger" onClick={handleLogout}>
            تسجيل خروج
          </button>
        </nav>
      </aside>
      <main className="main">
        <div className="header">
          <div>
            <h1>{activeTabLabel}</h1>
            <p>مرحبًا بك في صفحة الإدارة.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button type="button" className="menu-toggle" onClick={() => setMobileMenuOpen((prev) => !prev)}>
              {mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'studentDashboard' && renderStudentDashboard()}
        {activeTab === 'instructorDashboard' && renderInstructorDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'courses' && renderCourses()}
        {activeTab === 'majors' && renderMajors()}
        {activeTab === 'instructors' && renderInstructors()}
        {activeTab === 'reports' && renderReports()}
      </main>
    </div>
  );
}

export default App;
