// StatisticsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { type UserResponse, userApi } from "@/shared/api/user";
import "./StatisticsPage.css";
import {
    courseProgressApi,
    type CourseStatisticsResponse,
    moduleProgressApi,
    type ModuleStatisticsResponse
} from "@/shared/api/progress.ts";

interface UserProgress {
    user: UserResponse;
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
    completed: boolean;
}

const StatisticsPage = () => {
    const { courseId, moduleId } = useParams<{ courseId?: string; moduleId?: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [completedUsers, setCompletedUsers] = useState<UserProgress[]>([]);
    const [inProgressUsers, setInProgressUsers] = useState<UserProgress[]>([]);

    const parentId = moduleId || courseId;
    const isModule = !!moduleId;
    const title = isModule ? "модуля" : "курса";
    const name = isModule ? "модуль" : "курс";

    useEffect(() => {
        const fetchStatistics = async () => {
            if (!parentId) return;

            setLoading(true);
            setError(null);

            try {
                let statistics: (CourseStatisticsResponse | ModuleStatisticsResponse)['users'];

                if (isModule) {
                    const res = await moduleProgressApi.getStatistics(parentId);
                    statistics = res.data.users || [];
                } else {
                    const res = await courseProgressApi.getStatistics(parentId);
                    statistics = res.data.users || [];
                }

                // Загружаем информацию о пользователях
                const usersWithProgress: UserProgress[] = [];

                for (const stat of statistics) {
                    try {
                        const userRes = await userApi.getById(stat.user_id);
                        usersWithProgress.push({
                            user: userRes.data,
                            completedLessons: stat.completed_lessons,
                            totalLessons: stat.total_lessons,
                            progressPercent: stat.progress_percent,
                            completed: stat.completed,
                        });
                    } catch (err) {
                        console.error(`Failed to fetch user ${stat.user_id}:`, err);
                    }
                }

                // Разделяем на завершивших и частично прошедших
                setCompletedUsers(usersWithProgress.filter(u => u.completed));
                setInProgressUsers(usersWithProgress.filter(u => !u.completed));
            } catch (err) {
                console.error("Failed to fetch statistics:", err);
                setError("Не удалось загрузить статистику");
            } finally {
                setLoading(false);
            }
        };

        fetchStatistics();
    }, [parentId, isModule]);

    const handleBack = () => {
        if (moduleId) navigate(`/modules/${moduleId}`);
        else if (courseId) navigate(`/courses/${courseId}`);
        else navigate("/");
    };

    const formatPercent = (percent: number): string => {
        return Math.round(percent) + "%";
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
        <div className="statistics-page">
            <div className="statistics-page-content">

                {error && <div className="form-error">{error}</div>}

                <div className="statistics-main-block">
                    <div className="statistics-page-header">
                        <button onClick={handleBack} className="back-button">← Назад</button>
                    </div>
                    <div className="statistics-header">
                        <h1 className="statistics-title">Статистика {title}</h1>
                        <div className="statistics-summary">
                            <div className="summary-item">
                                <span className="summary-label">Всего прошли:</span>
                                <span className="summary-value">{completedUsers.length}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">В процессе:</span>
                                <span className="summary-value">{inProgressUsers.length}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Всего:</span>
                                <span className="summary-value">{completedUsers.length + inProgressUsers.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="statistics-divider"></div>

                    {/* Завершившие */}
                    <div className="statistics-section">
                        <h2 className="section-subtitle">
                            Завершили {name} ({completedUsers.length})
                        </h2>
                        {completedUsers.length === 0 ? (
                            <div className="empty-list">
                                <p>Никто еще не завершил {name}</p>
                            </div>
                        ) : (
                            <div className="users-list">
                                {completedUsers.map(({ user: u, completedLessons, totalLessons, progressPercent }) => (
                                    <div key={u.id} className="user-card completed">
                                        <div className="user-card-info">
                                            <div className="user-avatar">
                                                {u.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-details">
                                                <span className="user-name">{u.full_name}</span>
                                                <span className="user-email">{u.email}</span>
                                            </div>
                                        </div>
                                        <div className="user-progress">
                                            <div className="progress-info">
                                                <span className="progress-text">{completedLessons}/{totalLessons} уроков</span>
                                                <span className="progress-percent">{formatPercent(progressPercent)}</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div className="progress-fill completed-fill" style={{ width: `${progressPercent}%` }}></div>
                                            </div>
                                            <span className="completed-badge">✅ Завершено</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="statistics-divider"></div>

                    {/* В процессе */}
                    <div className="statistics-section">
                        <h2 className="section-subtitle">
                            Проходят {name} ({inProgressUsers.length})
                        </h2>
                        {inProgressUsers.length === 0 ? (
                            <div className="empty-list">
                                <p>Нет пользователей в процессе прохождения</p>
                            </div>
                        ) : (
                            <div className="users-list">
                                {inProgressUsers.map(({ user: u, completedLessons, totalLessons, progressPercent }) => (
                                    <div key={u.id} className="user-card in-progress">
                                        <div className="user-card-info">
                                            <div className="user-avatar">
                                                {u.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-details">
                                                <span className="user-name">{u.full_name}</span>
                                                <span className="user-email">{u.email}</span>
                                            </div>
                                        </div>
                                        <div className="user-progress">
                                            <div className="progress-info">
                                                <span className="progress-text">{completedLessons}/{totalLessons} уроков</span>
                                                <span className="progress-percent">{formatPercent(progressPercent)}</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div className="progress-fill in-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                                            </div>
                                            <span className="in-progress-badge">⏳ В процессе</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatisticsPage;