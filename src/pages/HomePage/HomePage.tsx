import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userApi, type UserResponse } from "@/shared/api/user";
import { courseApi, type CourseResponse } from "@/shared/api/course";
import "./HomePage.css";

const formatDescription = (text: string | undefined): string => {
    if (!text) return '';
    return text.replace(/\\n/g, '\n');
};

const HomePage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserResponse | null>(null);
    const [courses, setCourses] = useState<CourseResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userRes = await userApi.getMe();
                setUser(userRes.data);

                if (userRes.data.role === "student") {
                    const coursesRes = await courseApi.getAll();
                    setCourses(coursesRes.data.courses || []);
                } else if (userRes.data.role === "teacher") {
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
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        navigate("/login");
    };

    const handleProfile = () => {
        navigate("/profile");
        setDropdownOpen(false);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Загрузка...</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="home-container">
            <header className="home-header">
                <div className="header-left">
                    <h1 className="logo">Сервис курсов</h1>
                </div>
                <div className="header-right">
                    <div className="user-info">
                        <span className="user-name">{user.full_name}</span>
                        <div
                            className="avatar"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                            {user.full_name.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    {dropdownOpen && (
                        <>
                            <div
                                className="dropdown-overlay"
                                onClick={() => setDropdownOpen(false)}
                            />
                            <div className="dropdown-menu">
                                <button
                                    className="dropdown-item"
                                    onClick={handleProfile}
                                >
                                    👤 Перейти в профиль
                                </button>
                                <button
                                    className="dropdown-item logout"
                                    onClick={handleLogout}
                                >
                                    🚪 Выйти из аккаунта
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </header>

            <main className="home-main">
                <div className="courses-section">
                    <h2 className="section-title">
                        {user.role === "student" ? "Доступные курсы" : "Мои курсы"}
                    </h2>

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

                                    <div className="course-meta">
                                        <span className={`access-badge ${course.access_type === 'public' ? 'public' : 'private'}`}>
                                            {course.access_type === 'public' ? 'Публичный' : 'Приватный'}
                                        </span>
                                        <span className="publish-date">
                                            📅 {new Date(course.published_at).toLocaleDateString('ru-RU')}
                                        </span>
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