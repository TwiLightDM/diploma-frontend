// HomePage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { courseApi, type CourseResponse } from "@/shared/api/course";
import { userApi, type UserResponse } from "@/shared/api/user";
import "./HomePage.css";
import {completedTheoryCourseApi} from "@/shared/api/completedTheoryCourse.ts";
import {completedCourseApi} from "@/shared/api/completedCourse.ts";

const formatDescription = (text: string | undefined): string => {
    if (!text) return '';
    return text.replace(/\\n/g, '\n');
};

const HomePage = () => {
    const navigate = useNavigate();
    const { user } = useOutletContext<{ user: UserResponse }>();
    const [courses, setCourses] = useState<CourseResponse[]>([]);
    const [completedCourseIds, setCompletedCourseIds] = useState<Set<string>>(new Set());
    const [theoryCompletedCourseIds, setTheoryCompletedCourseIds] = useState<Set<string>>(new Set());
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [savingRole, setSavingRole] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (user.role === "student") {
                    const coursesRes = await courseApi.getAvailable();
                    const allCourses = coursesRes.data.courses || [];

                    // Загружаем завершенные теоретические курсы
                    let theoryCompletedIds = new Set<string>();
                    try {
                        const theoryRes = await completedTheoryCourseApi.getMy();
                        const theoryCourses = theoryRes.data.completed_theory_courses || [];
                        theoryCompletedIds = new Set(theoryCourses.map(ctc => ctc.course_id));
                    } catch {
                        // игнорируем
                    }
                    setTheoryCompletedCourseIds(theoryCompletedIds);

                    // Загружаем полностью завершенные курсы
                    let fullyCompletedIds = new Set<string>();
                    try {
                        const completedRes = await completedCourseApi.getMy();
                        const completedCourses = completedRes.data.completed_courses || [];
                        fullyCompletedIds = new Set(completedCourses.map(cc => cc.course_id));
                    } catch {
                        // игнорируем
                    }
                    setCompletedCourseIds(fullyCompletedIds);

                    // Сортируем курсы: теория пройдена (но не полностью) - первыми
                    const sortedCourses = [...allCourses].sort((a, b) => {
                        const aTheoryOnly = theoryCompletedIds.has(a.id) && !fullyCompletedIds.has(a.id);
                        const bTheoryOnly = theoryCompletedIds.has(b.id) && !fullyCompletedIds.has(b.id);

                        if (aTheoryOnly && !bTheoryOnly) return -1;
                        if (!aTheoryOnly && bTheoryOnly) return 1;
                        return 0;
                    });

                    setCourses(sortedCourses);
                } else if (user.role === "teacher") {
                    const coursesRes = await courseApi.getMy();
                    setCourses(coursesRes.data.courses || []);
                } else if (user.role === "admin") {
                    const usersRes = await userApi.getAll();
                    setUsers(usersRes.data.users || []);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const handleCreateCourse = () => {
        navigate("/courses/create");
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        setSavingRole(true);
        try {
            await userApi.patchRole(userId, newRole);
            const usersRes = await userApi.getAll();
            setUsers(usersRes.data.users || []);
            setEditingUserId(null);
        } catch (error) {
            console.error("Failed to change role:", error);
        } finally {
            setSavingRole(false);
        }
    };

    const getRoleLabel = (role: string): string => {
        const labels: Record<string, string> = {
            student: "Студент",
            teacher: "Преподаватель",
            admin: "Администратор",
        };
        return labels[role] || role;
    };

    // Фильтрация курсов для студента
    const getFilteredCourses = (): CourseResponse[] => {
        if (user.role !== "student") return courses;

        if (showCompleted) {
            // Показываем только полностью завершенные курсы
            return courses.filter(c => completedCourseIds.has(c.id));
        } else {
            // Показываем курсы, которые не завершены полностью
            return courses.filter(c => !completedCourseIds.has(c.id));
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Загрузка...</p>
            </div>
        );
    }

    // Отображение для админа
    if (user.role === "admin") {
        return (
            <div className="home-container">
                <main className="home-main">
                    <div className="users-section">
                        <div className="section-header">
                            <h2 className="section-title">Пользователи</h2>
                        </div>

                        {users.length === 0 ? (
                            <div className="empty-state">
                                <p className="empty-message">Пользователи не найдены</p>
                            </div>
                        ) : (
                            <div className="users-table-wrapper">
                                <table className="users-table">
                                    <thead>
                                    <tr>
                                        <th>Имя</th>
                                        <th>Email</th>
                                        <th>Роль</th>
                                        <th>Действия</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="user-cell">
                                                    <div className="user-avatar-small">
                                                        {u.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="user-name-cell">{u.full_name}</span>
                                                </div>
                                            </td>
                                            <td>{u.email}</td>
                                            <td>
                                                <span className={`role-badge role-${u.role}`}>
                                                    {getRoleLabel(u.role)}
                                                </span>
                                            </td>
                                            <td>
                                                {u.role !== "admin" && (
                                                    <div className="role-actions">
                                                        {editingUserId === u.id ? (
                                                            <div className="role-select-group">
                                                                <select
                                                                    className="role-select"
                                                                    defaultValue={u.role}
                                                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                                    disabled={savingRole}
                                                                >
                                                                    <option value="student">Студент</option>
                                                                    <option value="teacher">Преподаватель</option>
                                                                </select>
                                                                <button
                                                                    className="cancel-role-button"
                                                                    onClick={() => setEditingUserId(null)}
                                                                    disabled={savingRole}
                                                                    title="Отмена"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="change-role-button"
                                                                onClick={() => setEditingUserId(u.id)}
                                                            >
                                                                Изменить роль
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {u.role === "admin" && (
                                                    <span className="admin-text">Администратор</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    const filteredCourses = getFilteredCourses();

    // Отображение для студента и преподавателя
    return (
        <div className="home-container">
            <main className="home-main">
                <div className="courses-section">
                    <div className="section-header">
                        <h2 className="section-title">
                            {user.role === "student"
                                ? (showCompleted ? "Завершенные курсы" : "Доступные курсы")
                                : "Мои курсы"
                            }
                        </h2>
                        <div className="section-header-actions">
                            {user.role === "student" && (
                                <button
                                    onClick={() => setShowCompleted(!showCompleted)}
                                    className={`toggle-completed-button ${showCompleted ? 'active' : ''}`}
                                >
                                    {showCompleted ? "Активные курсы" : "Завершенные курсы"}
                                </button>
                            )}
                            {user.role === "teacher" && (
                                <>
                                    <button onClick={handleCreateCourse} className="create-course-button">
                                        Создать курс
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {filteredCourses.length === 0 ? (
                        <div className="empty-state">
                            <p className="empty-message">
                                {showCompleted ? "Нет завершенных курсов" : "В данный момент курсы не найдены"}
                            </p>
                        </div>
                    ) : (
                        <div className="courses-grid">
                            {filteredCourses.map((course) => {
                                const isPublished = !!course.published_at;
                                const isTheoryCompleted = theoryCompletedCourseIds.has(course.id);
                                const isFullyCompleted = completedCourseIds.has(course.id);

                                return (
                                    <div key={course.id} className={`course-card ${user.role === 'teacher' && !isPublished ? 'not-published' : ''} ${isTheoryCompleted && !isFullyCompleted ? 'theory-completed' : ''} ${isFullyCompleted ? 'fully-completed' : ''}`}>
                                        <div className="course-status-badges">
                                            {user.role === 'teacher' && !isPublished && (
                                                <span className="course-badge not-published-badge">📝 Не опубликован</span>
                                            )}
                                            {user.role === 'student' && isTheoryCompleted && !isFullyCompleted && (
                                                <span className="course-badge theory-badge">📚 Теория пройдена</span>
                                            )}
                                            {user.role === 'student' && isFullyCompleted && (
                                                <span className="course-badge completed-badge">✅ Завершен</span>
                                            )}
                                        </div>

                                        <h3 className="course-title">{course.title}</h3>

                                        <div className="course-description">
                                            {formatDescription(course.description).split('\n').map((line, idx, arr) => (
                                                <span key={idx}>
                            {line}
                                                    {idx < arr.length - 1 && <br />}
                        </span>
                                            ))}
                                        </div>

                                        <div className="course-stats">
                                            <div className="stat-item">
                                                <span className="stat-icon">📚</span>
                                                <span className="stat-value">
                            {course.amount_of_modules || 0} модулей
                        </span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-icon">📝</span>
                                                <span className="stat-value">
                            {course.amount_of_lessons || 0} уроков
                        </span>
                                            </div>
                                        </div>

                                        <div className="course-meta">
                    <span className={`access-badge ${course.access_type === 'public' ? 'public' : 'private'}`}>
                        {course.access_type === 'public' ? 'Публичный' : 'Приватный'}
                    </span>
                                            {course.published_at && (
                                                <span className="publish-date">
                            📅 {new Date(course.published_at).toLocaleDateString('ru-RU')}
                        </span>
                                            )}
                                        </div>
                                        <button
                                            className="course-button"
                                            onClick={() => navigate(`/courses/${course.id}`)}
                                        >
                                            Подробнее
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default HomePage;