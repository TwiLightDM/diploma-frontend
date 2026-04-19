// HomePage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { courseApi, type CourseResponse } from "@/shared/api/course";
import type { UserResponse } from "@/shared/api/user";
import "./HomePage.css";

const formatDescription = (text: string | undefined): string => {
    if (!text) return '';
    return text.replace(/\\n/g, '\n');
};

const HomePage = () => {
    const navigate = useNavigate();
    const { user } = useOutletContext<{ user: UserResponse }>();
    const [courses, setCourses] = useState<CourseResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (user.role === "student") {
                    const coursesRes = await courseApi.getAll();
                    setCourses(coursesRes.data.courses || []);
                } else if (user.role === "teacher") {
                    const coursesRes = await courseApi.getMy();
                    setCourses(coursesRes.data.courses || []);
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

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Загрузка...</p>
            </div>
        );
    }

    return (
        <div className="home-container">
            <main className="home-main">
                <div className="courses-section">
                    <div className="section-header">
                        <h2 className="section-title">
                            {user.role === "student" ? "Доступные курсы" : "Мои курсы"}
                        </h2>
                        {user.role === "teacher" && (
                            <button onClick={handleCreateCourse} className="create-course-button">
                                Создать курс
                            </button>
                        )}
                    </div>

                    {courses.length === 0 ? (
                        <div className="empty-state">
                            <p className="empty-message">В данный момент курсы не найдены</p>
                        </div>
                    ) : (
                        <div className="courses-grid">
                            {courses.map((course) => (
                                <div key={course.id} className="course-card">
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
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default HomePage;