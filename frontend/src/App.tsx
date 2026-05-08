import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Dashboard } from './views/Dashboard';
import { StudentProfiles } from './views/StudentProfiles';
import { CohortDetails } from './views/CohortDetails';
import { Schedule } from './views/Schedule';
import { LogNotes } from './views/LogNotes';
import { Messages } from './views/Messages';
import { ClassList } from './views/ClassList';
import { AdvisorProfile } from './views/AdvisorProfile';
import { Login } from './views/Login';
import apiClient from './lib/api';
import {
  GraduationCap,
  BookOpen,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  XCircle,
  Award,
} from 'lucide-react';

import { StudentDashboard } from './views/student/StudentDashboard';
import { StudentAcademic } from './views/student/StudentAcademic';
import { StudentMessages } from './views/student/StudentMessages';
import { StudentAppointments } from './views/student/StudentAppointments';

// --- ADMIN IMPORTS ---
import { AdminDashboard } from './views/admin/AdminDashboard';
import { AdminAdvisors } from './views/admin/AdminAdvisor'; 
import { AdminClasses } from './views/admin/AdminClasses';

/* ─────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────── */

interface CourseRow {
  enrollment_id: number;
  semester: string;
  course_code: string;
  course_name: string;
  credits: number;
  letter: string;
  gpa_points: number;
}

interface DetailData {
  student: {
    id: number;
    mssv: string;
    full_name: string;
    class_code: string;
    cohort: string;
  };
  gpa: number;
  warnings: string[];
  courses: CourseRow[];
}

interface SelectedContact {
  id: number;
  name: string;
  mssv: string;
}

interface CurrentUser {
  id?: number;
  email?: string;
  full_name?: string;
  role?: 'ADMIN' | 'ADVISOR' | 'STUDENT' | string;
  student_id?: number | null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────── */

const gradeColor = (letter: string) =>
  ({
    A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    B: 'bg-blue-100 text-blue-700 border-blue-200',
    C: 'bg-amber-100 text-amber-700 border-amber-200',
    D: 'bg-orange-100 text-orange-700 border-orange-200',
    F: 'bg-red-100 text-red-700 border-red-200',
  }[letter] ?? 'bg-slate-100 text-slate-500 border-slate-200');

const gpaColor = (gpa: number) =>
  gpa >= 3.5
    ? 'text-emerald-600'
    : gpa >= 2.5
      ? 'text-blue-600'
      : gpa >= 2.0
        ? 'text-amber-600'
        : 'text-red-600';

const gpaLabel = (gpa: number) => {
  if (gpa >= 3.5) return { text: 'XUẤT SẮC', cls: 'bg-emerald-100 text-emerald-700' };
  if (gpa >= 3.0) return { text: 'GIỎI', cls: 'bg-blue-100 text-blue-700' };
  if (gpa >= 2.5) return { text: 'KHÁ', cls: 'bg-sky-100 text-sky-700' };
  if (gpa >= 2.0) return { text: 'TB', cls: 'bg-amber-100 text-amber-700' };

  return { text: 'YẾU', cls: 'bg-red-100 text-red-700' };
};

/* ─────────────────────────────────────────────────────────────────────────
   StudentDetail - màn advisor xem chi tiết một sinh viên
───────────────────────────────────────────────────────────────────────── */

function StudentDetail({
  studentId,
  onBack,
}: {
  studentId: string | null;
  onBack: () => void;
}) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;

    setLoading(true);
    setError(null);
    setData(null);

    apiClient
      .get(`/students/${studentId}`)
      .then(({ data: responseData }) => {
        if (responseData.message) throw new Error(responseData.message);
        setData(responseData);
      })
      .catch((err: any) => {
        setError(err.response?.data?.message || err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [studentId]);

  if (!studentId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-slate-400">
        <GraduationCap className="w-16 h-16 opacity-30" />
        <p className="font-semibold">Chưa chọn sinh viên nào</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Đang tải hồ sơ...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-red-400">
        <XCircle className="w-10 h-10" />
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { student, gpa, warnings, courses } = data;
  const label = gpaLabel(gpa);
  const totalCredits = courses.reduce((sum, course) => sum + Number(course.credits), 0);
  const failCount = courses.filter((course) => course.letter === 'F').length;

  const semMap: Record<string, CourseRow[]> = {};
  for (const course of courses) {
    (semMap[course.semester] ??= []).push(course);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại
      </button>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary to-primary-container" />

        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary-container/20 flex items-center justify-center shrink-0">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-slate-900">{student.full_name}</h1>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${label.cls}`}>
                {label.text}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
              <span className="font-mono font-bold text-slate-700">{student.mssv}</span>
              <span>·</span>
              <span>{student.class_code}</span>
              <span>·</span>
              <span>Khóa {student.cohort}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className={`text-4xl font-black ${gpaColor(gpa)}`}>{gpa.toFixed(2)}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-normal">
              GPA Tích lũy
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 grid grid-cols-3 divide-x divide-slate-100">
          {[
            { label: 'Tổng tín chỉ', value: totalCredits, Icon: BookOpen },
            { label: 'Số môn học', value: courses.length, Icon: TrendingUp },
            { label: 'Môn rớt', value: failCount, Icon: failCount > 0 ? TrendingDown : Award },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="px-6 py-4 flex items-center gap-3">
              <Icon className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-lg font-bold text-slate-800">{value}</div>
                <div className="text-[11px] text-slate-400 font-medium">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 text-sm mb-1">Cảnh báo học vụ</p>
            {warnings.map((warning, index) => (
              <p key={index} className="text-sm text-red-600">
                • {warning}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(semMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([semester, rows]) => {
            const semesterCredits = rows.reduce((sum, course) => sum + Number(course.credits), 0);

            const semesterGpa =
              semesterCredits > 0
                ? (
                    rows.reduce(
                      (sum, course) =>
                        sum + Number(course.gpa_points) * Number(course.credits),
                      0
                    ) / semesterCredits
                  ).toFixed(2)
                : '—';

            return (
              <div
                key={semester}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-sm">{semester}</span>
                  <span className="text-xs text-slate-500">
                    GPA kỳ:{' '}
                    <span className={`font-bold ${gpaColor(Number(semesterGpa))}`}>
                      {semesterGpa}
                    </span>
                    {' · '}
                    {semesterCredits} TC
                  </span>
                </div>

                <div className="divide-y divide-slate-50">
                  {rows.map((course) => (
                    <div
                      key={course.enrollment_id}
                      className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-xs font-mono font-bold text-slate-400 w-14 shrink-0">
                        {course.course_code}
                      </span>
                      <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">
                        {course.course_name}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {course.credits} TC
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${gradeColor(
                          course.letter
                        )}`}
                      >
                        {course.letter ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   App root
───────────────────────────────────────────────────────────────────────── */

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedClassCode, setSelectedClassCode] = useState<string | null>(null);
  const [prevView, setPrevView] = useState('profiles');
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);

  const goToStudent = (id: string, from: string = 'profiles') => {
    setPrevView(from);
    setSelectedStudentId(id);
    setCurrentView('studentDetail');
  };

  const goToClass = (code: string) => {
    setSelectedClassCode(code);
    setCurrentView('cohort');
  };

  const handleMessageStudent = (student: SelectedContact) => {
    setSelectedContact(student);
    setCurrentView('messages');
  };

  const handleSetCurrentView = (view: string) => {
    if (view !== 'messages') {
      setSelectedContact(null);
    }
    setCurrentView(view);
  };

  const handleSearchSelect = (item: { type: string; id: number | null; code: string }) => {
    if (item.type === 'student') {
      goToStudent(String(item.id), currentView);
    } else {
      goToClass(item.code);
    }
  };

  const handleLogin = (user?: CurrentUser) => {
    setCurrentUser(user || null);
    setIsAuthenticated(true);

    // Cập nhật điều hướng mặc định theo Role
    if (user?.role === 'STUDENT') {
      setCurrentView('studentDashboard');
    } else if (user?.role === 'ADMIN') {
      setCurrentView('adminDashboard');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
    setSelectedStudentId(null);
    setSelectedClassCode(null);
    setSelectedContact(null);
    localStorage.clear();
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Các biến Helper phân quyền View
  const isStudent = currentUser?.role === 'STUDENT';
  const isAdmin = currentUser?.role === 'ADMIN';
  const isAdvisor = currentUser?.role === 'ADVISOR';

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex antialiased selection:bg-primary/20 selection:text-primary">
      <Sidebar
        currentView={currentView}
        setCurrentView={handleSetCurrentView}
        role={currentUser?.role}
      />

      <main className="flex-grow lg:ml-[280px] flex flex-col min-h-screen relative overflow-hidden bg-surface">
        <Toolbar
          setCurrentView={handleSetCurrentView}
          onLogout={handleLogout}
          onSearchSelect={handleSearchSelect}
        />

        <div className="flex-1 overflow-y-auto w-full pt-32 px-6 sm:px-10 pb-12">
          
          {/* ──────────────── ADVISOR VIEWS ──────────────── */}
          {isAdvisor && currentView === 'dashboard' && (
            <Dashboard
              onNavigate={handleSetCurrentView}
              onMessageStudent={handleMessageStudent}
            />
          )}

          {isAdvisor && currentView === 'profiles' && (
            <StudentProfiles
              onNavigate={handleSetCurrentView}
              onSelectClass={goToClass}
            />
          )}

          {isAdvisor && currentView === 'studentDetail' && (
            <StudentDetail
              studentId={selectedStudentId}
              onBack={() => setCurrentView(prevView)}
            />
          )}

          {isAdvisor && currentView === 'cohort' && (
            <CohortDetails
              classCode={selectedClassCode}
              onNavigate={handleSetCurrentView}
              onSelectStudent={(id) => goToStudent(id, 'cohort')}
            />
          )}

          {isAdvisor && currentView === 'classlist' && (
            <ClassList
              onNavigate={handleSetCurrentView}
              onMessageStudent={handleMessageStudent}
            />
          )}

          {isAdvisor && currentView === 'schedule' && <Schedule />}
          {isAdvisor && currentView === 'notes' && <LogNotes />}
          {isAdvisor && currentView === 'messages' && (
            <Messages initialContact={selectedContact} />
          )}

          {/* ──────────────── ADMIN VIEWS ──────────────── */}
          {isAdmin && currentView === 'adminDashboard' && <AdminDashboard />}
          {isAdmin && currentView === 'adminAdvisors' && <AdminAdvisors />}
          {isAdmin && currentView === 'adminClasses' && <AdminClasses />}


          {/* ──────────────── SHARED VIEWS (ADMIN & ADVISOR) ──────────────── */}
          {!isStudent && currentView === 'profile' && <AdvisorProfile />}


          {/* ──────────────── STUDENT VIEWS ──────────────── */}
          {isStudent && currentView === 'studentDashboard' && <StudentDashboard />}
          {isStudent && currentView === 'studentAcademic' && <StudentAcademic />}
          {isStudent && currentView === 'studentMessages' && <StudentMessages />}
          {isStudent && currentView === 'studentAppointments' && <StudentAppointments />}

          {/* Fallback cho Student nếu currentView không hợp lệ */}
          {isStudent &&
            ![
              'studentDashboard',
              'studentAcademic',
              'studentMessages',
              'studentAppointments',
            ].includes(currentView) && <StudentDashboard />}
        </div>
      </main>
    </div>
  );
}