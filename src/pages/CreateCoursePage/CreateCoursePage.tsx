// CreateCoursePage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { courseApi } from "@/shared/api/course";
import { Button } from "@/components/ui/Button/Button";
import "./CreateCoursePage.css";

// Тип для ошибки API
interface ApiError {
    response?: {
        status: number;
        data?: {
            detail?: string;
        };
    };
    message?: string;
}

const CreateCoursePage = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [accessType, setAccessType] = useState<"public" | "group_only">("public");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError("Название курса обязательно");
            return;
        }

        if (!description.trim()) {
            setError("Описание курса обязательно");
            return;
        }

        setLoading(true);

        try {
            const response = await courseApi.post(
                title.trim(),
                description.trim(),
                accessType
            );

            // После успешного создания перенаправляем на страницу курса
            navigate(`/courses/${response.data.id}`);
        } catch (err) {
            console.error("Failed to create course:", err);

            // Проверяем, является ли ошибка API ошибкой
            const apiError = err as ApiError;

            // Обработка ошибки 409 (Conflict) - курс с таким названием уже существует
            if (apiError.response?.status === 409) {
                setError("Курс с таким названием уже существует. Выберите другое название для курса");
            } else {
                // Общая ошибка
                setError("Не удалось создать курс. Попробуйте позже.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate("/");
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        // Очищаем ошибку при изменении названия
        if (error?.includes("название")) {
            setError(null);
        }
    };

    return (
        <div className="create-course-container">
            <div className="create-course-card">
                <h1 className="create-course-title">Создание нового курса</h1>

                <form onSubmit={handleSubmit} className="create-course-form">
                    <div className="form-group">
                        <label htmlFor="title" className="form-label">
                            Название курса *
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="Введите название курса"
                            className={`form-input ${error?.includes("название") ? "form-input-error" : ""}`}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description" className="form-label">
                            Описание курса *
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                if (error?.includes("Описание")) {
                                    setError(null);
                                }
                            }}
                            placeholder="Введите описание курса"
                            className={`form-textarea ${error?.includes("Описание") ? "form-input-error" : ""}`}
                            rows={6}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="accessType" className="form-label">
                            Тип доступа
                        </label>
                        <select
                            id="accessType"
                            value={accessType}
                            onChange={(e) => setAccessType(e.target.value as "public" | "group_only")}
                            className="form-select"
                            disabled={loading}
                        >
                            <option value="public">Для всех</option>
                            <option value="group_only">Для определенных групп</option>
                        </select>
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <div className="form-actions">
                        <Button type="button" onClick={handleCancel} className="cancel-button">
                            Отмена
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Создание..." : "Создать курс"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCoursePage;