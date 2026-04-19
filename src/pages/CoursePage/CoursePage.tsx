// CoursePage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { userApi, type UserResponse } from "@/shared/api/user";
import { courseApi, type CourseResponse } from "@/shared/api/course";
import { moduleApi, type ModuleResponse } from "@/shared/api/module";
import "./CoursePage.css";

const formatDescription = (text: string | undefined): string => {
    if (!text) return '';
    return text.replace(/\\n/g, '\n');
};

type CourseUpdateData = {
    title?: string;
    description?: string;
    access_type?: "public" | "group_only";
};

// Модальное окно подтверждения удаления
const DeleteConfirmModal = ({
                                isOpen,
                                onClose,
                                onConfirm,
                                isDeleting
                            }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal-title">Подтверждение удаления</h3>
                <p className="modal-text">Вы точно уверены, что хотите удалить курс?</p>
                <div className="modal-actions">
                    <button onClick={onClose} className="modal-cancel-button">
                        Нет, отмена
                    </button>
                    <button onClick={onConfirm} className="modal-confirm-button" disabled={isDeleting}>
                        {isDeleting ? "Удаление..." : "Да, удалить"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CoursePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useOutletContext<{ user: UserResponse }>();
    const [course, setCourse] = useState<CourseResponse | null>(null);
    const [owner, setOwner] = useState<UserResponse | null>(null);
    const [modules, setModules] = useState<ModuleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Состояния для редактирования
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState("");
    const [editedDescription, setEditedDescription] = useState("");
    const [editedAccessType, setEditedAccessType] = useState<"public" | "group_only">("public");
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Состояние для модального окна удаления
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchCourseData = async () => {
        if (!id) return;

        setLoading(true);
        setError(null);

        try {
            const courseRes = await courseApi.getById(id);
            setCourse(courseRes.data);
            setEditedTitle(courseRes.data.title);
            setEditedDescription(courseRes.data.description);
            setEditedAccessType(courseRes.data.access_type);

            if (courseRes.data.owner_id) {
                const ownerRes = await userApi.getById(courseRes.data.owner_id);
                setOwner(ownerRes.data);
            }

            const modulesRes = await moduleApi.getAllByCourseId(id);
            const sortedModules = (modulesRes.data.modules || []).sort(
                (a, b) => a.position - b.position
            );
            setModules(sortedModules);
        } catch (err) {
            console.error("Failed to fetch course data:", err);
            setError("Не удалось загрузить данные курса");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourseData();
    }, [id]);

    // Проверка изменений при редактировании
    useEffect(() => {
        if (course && isEditing) {
            const titleChanged = editedTitle.trim() !== course.title;
            const descriptionChanged = editedDescription.trim() !== course.description;
            const accessTypeChanged = editedAccessType !== course.access_type;
            setHasChanges(titleChanged || descriptionChanged || accessTypeChanged);
        }
    }, [editedTitle, editedDescription, editedAccessType, course, isEditing]);

    const handlePublish = async () => {
        if (!id) return;

        setPublishing(true);
        try {
            await courseApi.patchPublish(id);
            await fetchCourseData();
        } catch (err) {
            console.error("Failed to publish course:", err);
            setError("Не удалось опубликовать курс");
        } finally {
            setPublishing(false);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        if (course) {
            setEditedTitle(course.title);
            setEditedDescription(course.description);
            setEditedAccessType(course.access_type);
        }
        setIsEditing(false);
        setHasChanges(false);
    };

    const handleSave = async () => {
        if (!id || !course) return;

        setIsSaving(true);
        try {
            const updateData: CourseUpdateData = {};

            const trimmedTitle = editedTitle.trim();
            const trimmedDescription = editedDescription.trim();

            if (trimmedTitle !== course.title) {
                updateData.title = trimmedTitle;
            }
            if (trimmedDescription !== course.description) {
                updateData.description = trimmedDescription;
            }
            if (editedAccessType !== course.access_type) {
                updateData.access_type = editedAccessType;
            }

            if (Object.keys(updateData).length > 0) {
                await courseApi.patch(id, updateData);
            }

            await fetchCourseData();
            setIsEditing(false);
            setHasChanges(false);
        } catch (err) {
            console.error("Failed to update course:", err);
            setError("Не удалось сохранить изменения");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;

        setIsDeleting(true);
        try {
            await courseApi.delete(id);
            navigate("/");
        } catch (err) {
            console.error("Failed to delete course:", err);
            setError("Не удалось удалить курс");
            setIsDeleteModalOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreateModule = () => {
        navigate(`/courses/${id}/modules/create`);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Загрузка...</p>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="error-container">
                <p className="error-message">{error || "Курс не найден"}</p>
                <button onClick={() => navigate("/")} className="back-button">Вернуться на главную</button>
            </div>
        );
    }

    const isTeacher = user?.role === "teacher";
    const isPublished = !!course.published_at;

    return (
        <div className="course-page-content">
            <div className="course-header">
                <div className="course-header-main">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="course-title-input"
                            placeholder="Название курса"
                        />
                    ) : (
                        <h1 className="course-page-title">{course.title}</h1>
                    )}
                </div>

                <div className="course-info">
                    {isEditing ? (
                        <textarea
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                            className="course-description-input"
                            placeholder="Описание курса"
                            rows={6}
                        />
                    ) : (
                        <div className="course-description-full">
                            {formatDescription(course.description).split('\n').map((line, idx, arr) => (
                                <span key={idx}>
                                    {line}
                                    {idx < arr.length - 1 && <br />}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="course-meta-info">
                        <div className="meta-item">
                            <span className="meta-label">Тип доступа:</span>
                            {isEditing ? (
                                <select
                                    value={editedAccessType}
                                    onChange={(e) => setEditedAccessType(e.target.value as "public" | "group_only")}
                                    className="access-type-select"
                                >
                                    <option value="public">Для всех</option>
                                    <option value="group_only">Для определенных групп</option>
                                </select>
                            ) : (
                                <span className={`access-badge ${course.access_type === 'public' ? 'public' : 'private'}`}>
                                    {course.access_type === 'public' ? 'Публичный' : 'Приватный'}
                                </span>
                            )}
                        </div>

                        {owner && (
                            <div className="meta-item">
                                <span className="meta-label">Создатель:</span>
                                <span className="meta-value">{owner.full_name}</span>
                            </div>
                        )}

                        {isPublished && (
                            <div className="meta-item">
                                <span className="meta-label">Опубликован:</span>
                                <span className="meta-value">
                                    {new Date(course.published_at).toLocaleDateString('ru-RU')}
                                </span>
                            </div>
                        )}
                    </div>

                    {isTeacher && (
                        <div className="course-actions">
                            {!isPublished && !isEditing && (
                                <button
                                    onClick={handlePublish}
                                    disabled={publishing}
                                    className="publish-button"
                                >
                                    {publishing ? "Публикация..." : "Опубликовать"}
                                </button>
                            )}

                            {!isEditing ? (
                                <>
                                    <button onClick={handleEdit} className="edit-button">
                                        Редактировать курс
                                    </button>
                                    <button
                                        onClick={() => setIsDeleteModalOpen(true)}
                                        className="delete-button"
                                    >
                                        Удалить курс
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving || !hasChanges}
                                        className="save-button"
                                    >
                                        {isSaving ? "Сохранение..." : "Сохранить"}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="cancel-edit-button"
                                    >
                                        Отмена
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="modules-section">
                <div className="section-header">
                    <h2 className="section-title">Модули курса</h2>
                    {isTeacher && (
                        <button onClick={handleCreateModule} className="create-module-button">
                            Создать модуль
                        </button>
                    )}
                </div>

                {modules.length === 0 ? (
                    <div className="empty-state">
                        <p className="empty-message">В данный момент модули не найдены</p>
                    </div>
                ) : (
                    <div className="modules-grid">
                        {modules.map((module) => (
                            <div key={module.id} className="module-card">
                                <div className="module-position">
                                    Модуль #{module.position}
                                </div>
                                <h3 className="module-title">{module.title}</h3>

                                <div className="module-description">
                                    {formatDescription(module.description).split('\n').map((line, idx, arr) => (
                                        <span key={idx}>
                                            {line}
                                            {idx < arr.length - 1 && <br />}
                                        </span>
                                    ))}
                                </div>

                                <div className="module-stats">
                                    <div className="stat-item">
                                        <span className="stat-icon">📝</span>
                                        <span className="stat-value">
                                            {module.amount_of_lessons || 0} уроков
                                        </span>
                                    </div>
                                </div>

                                <button
                                    className="module-button"
                                    onClick={() => navigate(`/modules/${module.id}`)}
                                >
                                    Подробнее
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default CoursePage;