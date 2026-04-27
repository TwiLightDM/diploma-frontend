// CreateModulePage.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { moduleApi } from "@/shared/api/module";
import "./CreateModulePage.css";

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

const CreateModulePage = () => {
    const { id: courseId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError("Название модуля обязательно");
            return;
        }

        if (!description.trim()) {
            setError("Описание модуля обязательно");
            return;
        }

        if (!courseId) {
            setError("ID курса не найден");
            return;
        }

        setLoading(true);

        try {
            const response = await moduleApi.post(
                title.trim(),
                description.trim(),
                courseId
            );

            // После успешного создания перенаправляем на страницу модуля
            navigate(`/modules/${response.data.id}`);
        } catch (err) {
            console.error("Failed to create module:", err);

            const apiError = err as ApiError;

            if (apiError.response?.status === 409) {
                setError("Модуль с таким названием уже существует. Выберите другое название для модуля");
            } else {
                setError("Не удалось создать модуль. Попробуйте позже.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate(`/courses/${courseId}`);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        if (error?.includes("название")) {
            setError(null);
        }
    };

    return (
        <div className="create-module-page">
            <div className="create-module-card">
                <h1 className="create-module-title">Создание нового модуля</h1>

                <form onSubmit={handleSubmit} className="create-module-form">
                    <div className="form-group">
                        <label htmlFor="title" className="form-label">
                            Название модуля *
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="Введите название модуля"
                            className={`form-input ${error?.includes("название") ? "form-input-error" : ""}`}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description" className="form-label">
                            Описание модуля *
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
                            placeholder="Введите описание модуля"
                            className={`form-textarea ${error?.includes("Описание") ? "form-input-error" : ""}`}
                            rows={6}
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="cancel-button"
                            disabled={loading}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            className="submit-button"
                            disabled={loading}
                        >
                            {loading ? "Создание..." : "Создать модуль"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateModulePage;