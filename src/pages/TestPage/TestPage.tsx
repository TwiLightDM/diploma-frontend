// TestPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { type UserResponse, userApi } from "@/shared/api/user";
import { taskApi, type TaskResponse, type TaskOption } from "@/shared/api/task";
import { taskAttemptApi, type TaskAttemptResponse, type TaskAttemptAnswerRequest } from "@/shared/api/taskAttempt";
import "./TestPage.css";
import {completedModuleApi} from "@/shared/api/completedModule.ts";
import {completedTheoryCourseApi} from "@/shared/api/completedTheoryCourse.ts";

interface EditedQuestion {
    id: string;
    title: string;
    type: "text_answer" | "single_choice" | "multiple_choice";
    correctTextAnswer: string;
    options: TaskOption[];
}

const getQuestionType = (question: TaskResponse): "text_answer" | "single_choice" | "multiple_choice" => {
    if (!question.options || question.options.length === 0) {
        return "text_answer";
    }
    const correctCount = question.options.filter(opt => opt.is_correct).length;
    if (correctCount <= 1) return "single_choice";
    return "multiple_choice";
};

const getQuestionTypeLabel = (question: TaskResponse): string => {
    const type = getQuestionType(question);
    switch (type) {
        case "text_answer": return "Текстовый ответ";
        case "single_choice": return "Один ответ";
        case "multiple_choice": return "Несколько ответов";
    }
};

// Расчет максимального количества допустимых ошибок
const getAllowedErrors = (totalQuestions: number): number => {
    if (totalQuestions <= 5) return 1;
    if (totalQuestions <= 10) return 2;
    if (totalQuestions <= 15) return 3;
    if (totalQuestions <= 20) return 4;
    return Math.floor(totalQuestions / 5);
};

// Проверка, пройден ли тест
const isTestPassed = (correctAnswers: number, totalQuestions: number): boolean => {
    const errors = totalQuestions - correctAnswers;
    const allowedErrors = getAllowedErrors(totalQuestions);
    return errors <= allowedErrors;
};

const TestPage = () => {
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const { courseId, moduleId } = useParams<{ courseId?: string; moduleId?: string }>();
    const navigate = useNavigate();
    const { user } = useOutletContext<{ user: UserResponse; refreshUser: () => Promise<void> }>();

    const [questions, setQuestions] = useState<TaskResponse[]>([]);
    const [attempts, setAttempts] = useState<TaskAttemptResponse[]>([]);
    const [usersMap, setUsersMap] = useState<Record<string, UserResponse>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [isTakingTest, setIsTakingTest] = useState(false);
    const [currentAnswers, setCurrentAnswers] = useState<Record<string, { textAnswer: string; selectedOptionIds: string[] }>>({});
    const [submitting, setSubmitting] = useState(false);
    const [lastAttempt, setLastAttempt] = useState<TaskAttemptResponse | null>(null);
    const [testPassed, setTestPassed] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editedQuestions, setEditedQuestions] = useState<EditedQuestion[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});

    const [expandedAttempts, setExpandedAttempts] = useState<Set<string>>(new Set());
    const [expandedAttemptUsers, setExpandedAttemptUsers] = useState<Record<string, UserResponse>>({});

    const isTeacher = user?.role === "teacher";
    const parentId = moduleId || courseId;
    const isModule = !!moduleId;

    const formatScore = (score: number): number => {
        return Math.round(score);
    };

    const taskToEditedQuestion = (task: TaskResponse): EditedQuestion => ({
        id: task.id,
        title: task.title,
        type: getQuestionType(task),
        correctTextAnswer: task.correct_text_answer || "",
        options: task.options && task.options.length > 0
            ? task.options.map(opt => ({ ...opt }))
            : [
                { id: crypto.randomUUID(), text: "", is_correct: false },
                { id: crypto.randomUUID(), text: "", is_correct: false },
            ],
    });

    const CancelTestModal = ({
                                 isOpen,
                                 onClose,
                                 onConfirm
                             }: {
        isOpen: boolean;
        onClose: () => void;
        onConfirm: () => void;
    }) => {
        if (!isOpen) return null;

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3 className="modal-title">Прервать тест?</h3>
                    <p className="modal-text">
                        Вы уверены, что хотите прервать тест? Все ответы будут потеряны.
                    </p>
                    <div className="modal-actions">
                        <button onClick={onClose} className="modal-cancel-button">
                            Продолжить тест
                        </button>
                        <button onClick={onConfirm} className="modal-confirm-button">
                            Прервать тест
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const fetchData = useCallback(async () => {
        if (!parentId) return;

        setLoading(true);
        setError(null);

        try {
            let tasksRes;
            if (isModule) {
                tasksRes = await taskApi.getAllByModuleId(parentId);
            } else {
                tasksRes = await taskApi.getAllByCourseId(parentId);
            }
            const fetchedQuestions = tasksRes.data.tasks || [];
            setQuestions(fetchedQuestions);
            setEditedQuestions(fetchedQuestions.map(taskToEditedQuestion));

            let attemptsRes;
            if (isTeacher) {
                if (isModule) {
                    attemptsRes = await taskAttemptApi.getByModuleId(parentId);
                } else {
                    attemptsRes = await taskAttemptApi.getByCourseId(parentId);
                }
            } else {
                if (isModule) {
                    attemptsRes = await taskAttemptApi.getMyByModuleId(parentId);
                } else {
                    attemptsRes = await taskAttemptApi.getMyByCourseId(parentId);
                }
            }

            const fetchedAttempts = attemptsRes.data.task_attempts || [];
            setAttempts(fetchedAttempts);

            // Проверяем, был ли тест уже пройден успешно
            if (!isTeacher && fetchedAttempts.length > 0) {
                const lastAttempt = fetchedAttempts[fetchedAttempts.length - 1];
                const passed = isTestPassed(lastAttempt.correct_answers, lastAttempt.total_questions);
                setTestPassed(passed);
            }

            if (isTeacher && fetchedAttempts.length > 0) {
                const uniqueUserIds = [...new Set(fetchedAttempts.map(a => a.user_id))];
                const usersData: Record<string, UserResponse> = {};

                for (const userId of uniqueUserIds) {
                    try {
                        const userRes = await userApi.getById(userId);
                        usersData[userId] = userRes.data;
                    } catch (err) {
                        console.error(`Failed to fetch user ${userId}:`, err);
                    }
                }
                setUsersMap(usersData);
            }
        } catch (err) {
            console.error("Failed to fetch test data:", err);
            setError("Не удалось загрузить данные теста");
        } finally {
            setLoading(false);
        }
    }, [parentId, isModule, isTeacher]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleStartTest = () => {
        setIsTakingTest(true);
        setLastAttempt(null);
        setTestPassed(false);

        const initialAnswers: Record<string, { textAnswer: string; selectedOptionIds: string[] }> = {};
        questions.forEach(q => {
            initialAnswers[q.id] = {
                textAnswer: "",
                selectedOptionIds: [],
            };
        });
        setCurrentAnswers(initialAnswers);
    };

    const handleAnswerChange = (questionId: string, field: "textAnswer" | "selectedOptionIds", value: string | string[]) => {
        setCurrentAnswers(prev => ({
            ...prev,
            [questionId]: { ...prev[questionId], [field]: value },
        }));
    };

    const handleCompleteModuleOrCourse = async () => {
        if (!parentId) return;

        try {
            if (isModule) {
                await completedModuleApi.post(parentId);
                setSuccessMessage("Модуль успешно завершен!");
            } else {
                await completedTheoryCourseApi.post(parentId);
                setSuccessMessage("Теоретическая часть курса успешно завершена!");
            }
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Failed to complete:", err);
        }
    };

    const handleSubmitTest = async () => {
        if (!parentId || !user) return;

        setSubmitting(true);
        setError(null);

        try {
            const answers: TaskAttemptAnswerRequest[] = questions.map(q => ({
                task_id: q.id,
                text_answer: currentAnswers[q.id]?.textAnswer || "",
                selected_option_ids: currentAnswers[q.id]?.selectedOptionIds || [],
            }));

            const response = await taskAttemptApi.submit(
                user.id,
                courseId || "",
                moduleId || "",
                answers
            );

            const attempt = response.data;
            setLastAttempt(attempt);
            setIsTakingTest(false);

            // Проверяем, пройден ли тест
            const passed = isTestPassed(attempt.correct_answers, attempt.total_questions);
            setTestPassed(passed);

            if (passed) {
                if (isModule) {
                    setSuccessMessage("Тест пройден успешно! Модуль завершен!");
                } else {
                    setSuccessMessage("Тест пройден успешно! Теоретическая часть завершена!");
                }
                await handleCompleteModuleOrCourse();
            } else {
                const errors = attempt.total_questions - attempt.correct_answers;
                const allowedErrors = getAllowedErrors(attempt.total_questions);
                setError(`Тест не пройден. Допустимо ошибок: ${allowedErrors}, у вас: ${errors}. Попробуйте еще раз.`);
            }

            await fetchData();
        } catch (err) {
            console.error("Failed to submit test:", err);
            setError("Не удалось отправить тест");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelTest = () => {
        setIsCancelModalOpen(true);
    };

    const handleConfirmCancelTest = () => {
        setIsCancelModalOpen(false);
        setIsTakingTest(false);
        setCurrentAnswers({});
    };

    const handleCloseCancelModal = () => {
        setIsCancelModalOpen(false);
    };

    const handleToggleAttempt = async (key: string, userId?: string) => {
        const isCurrentlyExpanded = expandedAttempts.has(key);

        if (isCurrentlyExpanded) {
            const newExpanded = new Set(expandedAttempts);
            newExpanded.delete(key);
            setExpandedAttempts(newExpanded);
        } else {
            const newExpanded = new Set(expandedAttempts);
            newExpanded.add(key);
            setExpandedAttempts(newExpanded);

            if (userId && !expandedAttemptUsers[key]) {
                try {
                    const userRes = await userApi.getById(userId);
                    setExpandedAttemptUsers(prev => ({ ...prev, [key]: userRes.data }));
                } catch (err) {
                    console.error(`Failed to fetch user ${userId}:`, err);
                }
            }
        }
    };

    const handleEdit = () => {
        setEditedQuestions(questions.map(taskToEditedQuestion));
        setIsEditing(true);
        setQuestionErrors({});
    };

    const handleCancelEdit = () => {
        setEditedQuestions(questions.map(taskToEditedQuestion));
        setIsEditing(false);
        setQuestionErrors({});
    };

    const handleAddQuestion = () => {
        if (editedQuestions.length >= 20) {
            setError("Максимальное количество вопросов: 20");
            return;
        }
        setEditedQuestions([...editedQuestions, {
            id: crypto.randomUUID(),
            title: "",
            type: "single_choice",
            correctTextAnswer: "",
            options: [
                { id: crypto.randomUUID(), text: "", is_correct: false },
                { id: crypto.randomUUID(), text: "", is_correct: false },
            ],
        }]);
    };

    const handleRemoveQuestion = (questionId: string) => {
        if (editedQuestions.length <= 1) {
            setError("Должен быть хотя бы один вопрос");
            return;
        }
        setEditedQuestions(editedQuestions.filter(q => q.id !== questionId));
        const newErrors = { ...questionErrors };
        delete newErrors[questionId];
        setQuestionErrors(newErrors);
    };

    const handleQuestionTitleChange = (questionId: string, title: string) => {
        setEditedQuestions(prev => prev.map(q => q.id === questionId ? { ...q, title } : q));
        if (questionErrors[questionId]?.includes("название")) {
            const newErrors = { ...questionErrors };
            delete newErrors[questionId];
            setQuestionErrors(newErrors);
        }
    };

    const handleQuestionTypeChange = (questionId: string, type: "text_answer" | "single_choice" | "multiple_choice") => {
        setEditedQuestions(prev => prev.map(q => {
            if (q.id === questionId) {
                return {
                    ...q,
                    type,
                    options: type !== "text_answer" && q.options.length < 2
                        ? [
                            { id: crypto.randomUUID(), text: "", is_correct: false },
                            { id: crypto.randomUUID(), text: "", is_correct: false },
                        ]
                        : q.options,
                };
            }
            return q;
        }));
        const newErrors = { ...questionErrors };
        delete newErrors[questionId];
        setQuestionErrors(newErrors);
    };

    const handleCorrectTextAnswerChange = (questionId: string, text: string) => {
        setEditedQuestions(prev => prev.map(q => q.id === questionId ? { ...q, correctTextAnswer: text } : q));
    };

    const handleOptionTextChange = (questionId: string, optionIndex: number, text: string) => {
        setEditedQuestions(prev => prev.map(q => {
            if (q.id === questionId) {
                const newOptions = [...q.options];
                newOptions[optionIndex] = { ...newOptions[optionIndex], text };
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const handleOptionCorrectChange = (questionId: string, optionIndex: number, isCorrect: boolean) => {
        setEditedQuestions(prev => prev.map(q => {
            if (q.id === questionId) {
                const newOptions = [...q.options];
                if (q.type === "single_choice" && isCorrect) {
                    newOptions.forEach(opt => opt.is_correct = false);
                }
                newOptions[optionIndex] = { ...newOptions[optionIndex], is_correct: isCorrect };
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const handleAddOption = (questionId: string) => {
        setEditedQuestions(prev => prev.map(q => {
            if (q.id === questionId) {
                if (q.options.length >= 10) {
                    setError("Максимальное количество вариантов: 10");
                    return q;
                }
                return { ...q, options: [...q.options, { id: crypto.randomUUID(), text: "", is_correct: false }] };
            }
            return q;
        }));
    };

    const handleRemoveOption = (questionId: string, optionIndex: number) => {
        setEditedQuestions(prev => prev.map(q => {
            if (q.id === questionId) {
                if (q.options.length <= 2) {
                    setError("Минимальное количество вариантов: 2");
                    return q;
                }
                return { ...q, options: q.options.filter((_, i) => i !== optionIndex) };
            }
            return q;
        }));
    };

    const handleSaveEdit = async () => {
        setQuestionErrors({});
        let hasErrors = false;
        const errors: Record<string, string> = {};

        editedQuestions.forEach((question, index) => {
            if (!question.title.trim()) {
                errors[question.id] = `Вопрос ${index + 1}: название обязательно`;
                hasErrors = true;
                return;
            }
            const validOptions = question.options.filter(opt => opt.text.trim());
            if (question.type !== "text_answer" && validOptions.length < 2) {
                errors[question.id] = `Вопрос ${index + 1}: минимум 2 варианта ответа`;
                hasErrors = true;
                return;
            }
            if (question.type === "single_choice") {
                const correctCount = validOptions.filter(opt => opt.is_correct).length;
                if (correctCount !== 1) {
                    errors[question.id] = `Вопрос ${index + 1}: должен быть ровно один правильный ответ`;
                    hasErrors = true;
                    return;
                }
            }
            if (question.type === "multiple_choice") {
                const correctCount = validOptions.filter(opt => opt.is_correct).length;
                if (correctCount < 1) {
                    errors[question.id] = `Вопрос ${index + 1}: должен быть хотя бы один правильный ответ`;
                    hasErrors = true;
                    return;
                }
            }
            if (question.type === "text_answer" && !question.correctTextAnswer.trim()) {
                errors[question.id] = `Вопрос ${index + 1}: введите правильный ответ`;
                hasErrors = true;
                return;
            }
        });

        if (hasErrors) {
            setQuestionErrors(errors);
            setError("Исправьте ошибки в вопросах");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const existingIds = questions.map(q => q.id);
            const promises = editedQuestions.map(q => {
                const validOptions = q.options.filter(opt => opt.text.trim());

                if (existingIds.includes(q.id)) {
                    return taskApi.patch(
                        q.id,
                        q.title.trim(),
                        q.type === "text_answer" ? q.correctTextAnswer.trim() : "",
                        q.type !== "text_answer" ? validOptions : [],
                    );
                } else {
                    return taskApi.post(
                        q.title.trim(),
                        courseId || "",
                        moduleId || "",
                        q.type,
                        q.type === "text_answer" ? q.correctTextAnswer.trim() : "",
                        q.type !== "text_answer" ? validOptions : [],
                    );
                }
            });

            await Promise.all(promises);
            await fetchData();
            setIsEditing(false);
            setQuestionErrors({});
            setSuccessMessage("Тест обновлен");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Failed to update test:", err);
            setError("Не удалось сохранить изменения");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        if (moduleId) navigate(`/modules/${moduleId}`);
        else if (courseId) navigate(`/courses/${courseId}`);
        else navigate("/");
    };

    const getScoreColor = (correct: number, total: number): string => {
        if (total === 0) return "score-average";
        const percentage = (correct / total) * 100;
        if (percentage >= 80) return "score-excellent";
        if (percentage >= 60) return "score-good";
        if (percentage >= 40) return "score-average";
        return "score-poor";
    };

    const handleTestOptionToggle = (questionId: string, optionId: string, type: string) => {
        setCurrentAnswers(prev => {
            const current = prev[questionId];
            if (!current) return prev;

            if (type === "single_choice") {
                return {
                    ...prev,
                    [questionId]: { ...current, selectedOptionIds: [optionId] },
                };
            } else {
                const isSelected = current.selectedOptionIds.includes(optionId);
                const newSelected = isSelected
                    ? current.selectedOptionIds.filter(id => id !== optionId)
                    : [...current.selectedOptionIds, optionId];
                return {
                    ...prev,
                    [questionId]: { ...current, selectedOptionIds: newSelected },
                };
            }
        });
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
        <div className="test-page">
            <div className="test-page-content">

                {error && <div className={`form-message ${testPassed ? 'form-success' : 'form-error'}`}>{error}</div>}
                {successMessage && <div className="form-success">{successMessage}</div>}

                <div className="test-main-block">
                    <div className="test-main-header">
                        <div className="test-page-header">
                            <button onClick={handleBack} className="back-button">← Назад</button>
                        </div>
                        <h1 className="test-title">Тест</h1>
                        <p className="test-info">Количество вопросов: {questions.length}</p>
                        {!isTeacher && (
                            <p className="test-rules">
                                Допустимо ошибок: {getAllowedErrors(questions.length)}
                            </p>
                        )}
                    </div>

                    <div className="test-divider"></div>

                    <div className="test-questions-section">
                        <h2 className="section-subtitle">Вопросы теста</h2>

                        {isEditing ? (
                            <div className="edit-questions-list">
                                {editedQuestions.map((question, qIndex) => (
                                    <div key={question.id} className="edit-question-card">
                                        <div className="question-header">
                                            <span className="question-number">Вопрос {qIndex + 1}</span>
                                            <button type="button" onClick={() => handleRemoveQuestion(question.id)} className="question-remove-button" disabled={editedQuestions.length <= 1}>✕</button>
                                        </div>
                                        <div className="question-body">
                                            <input type="text" value={question.title} onChange={(e) => handleQuestionTitleChange(question.id, e.target.value)} placeholder="Введите текст вопроса" className={`form-input ${questionErrors[question.id] ? "form-input-error" : ""}`} />
                                            <div className="type-selector">
                                                <button type="button" className={`type-button ${question.type === "single_choice" ? "active" : ""}`} onClick={() => handleQuestionTypeChange(question.id, "single_choice")}>Один ответ</button>
                                                <button type="button" className={`type-button ${question.type === "multiple_choice" ? "active" : ""}`} onClick={() => handleQuestionTypeChange(question.id, "multiple_choice")}>Несколько ответов</button>
                                                <button type="button" className={`type-button ${question.type === "text_answer" ? "active" : ""}`} onClick={() => handleQuestionTypeChange(question.id, "text_answer")}>Текстовый ответ</button>
                                            </div>
                                            {question.type === "text_answer" ? (
                                                <input type="text" value={question.correctTextAnswer} onChange={(e) => handleCorrectTextAnswerChange(question.id, e.target.value)} placeholder="Введите правильный ответ" className={`form-input ${questionErrors[question.id] ? "form-input-error" : ""}`} />
                                            ) : (
                                                <div className="question-options">
                                                    {question.options.map((option, oIndex) => (
                                                        <div key={option.id} className="option-item">
                                                            <div className="option-select">
                                                                {question.type === "single_choice" ? (
                                                                    <input type="radio" name={`correct-${question.id}`} checked={option.is_correct} onChange={() => handleOptionCorrectChange(question.id, oIndex, true)} className="option-radio" />
                                                                ) : (
                                                                    <input type="checkbox" checked={option.is_correct} onChange={(e) => handleOptionCorrectChange(question.id, oIndex, e.target.checked)} className="option-checkbox" />
                                                                )}
                                                            </div>
                                                            <input type="text" value={option.text} onChange={(e) => handleOptionTextChange(question.id, oIndex, e.target.value)} placeholder={`Вариант ${oIndex + 1}`} className="option-input" />
                                                            <button type="button" onClick={() => handleRemoveOption(question.id, oIndex)} className="option-remove-button" disabled={question.options.length <= 2}>✕</button>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => handleAddOption(question.id)} className="add-option-button" disabled={question.options.length >= 10}>+ Добавить вариант</button>
                                                </div>
                                            )}
                                            {questionErrors[question.id] && <div className="question-error">{questionErrors[question.id]}</div>}
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddQuestion} className="add-question-button" disabled={editedQuestions.length >= 20}>+ Добавить вопрос</button>
                            </div>
                        ) : isTakingTest ? (
                            <div>
                                {questions.map((question, index) => {
                                    const qType = getQuestionType(question);
                                    const currentAnswer = currentAnswers[question.id];
                                    return (
                                        <div key={question.id} className="test-question-card">
                                            <div className="question-header">
                                                <span className="question-number">Вопрос {index + 1}</span>
                                                <span className="question-type-badge">{getQuestionTypeLabel(question)}</span>
                                            </div>
                                            <p className="question-text">{question.title}</p>
                                            {qType === "text_answer" && (
                                                <input type="text" value={currentAnswer?.textAnswer || ""} onChange={(e) => handleAnswerChange(question.id, "textAnswer", e.target.value)} placeholder="Введите ответ" className="test-input" />
                                            )}
                                            {qType !== "text_answer" && question.options && (
                                                <div className="test-options">
                                                    {question.options.map(option => {
                                                        const isSelected = (currentAnswer?.selectedOptionIds || []).includes(option.id);
                                                        return (
                                                            <div key={option.id} className={`test-option ${isSelected ? 'selected' : ''}`} onClick={() => handleTestOptionToggle(question.id, option.id, qType)}>
                                                                <div className={`option-indicator ${qType === "single_choice" ? 'radio' : 'checkbox'}`}>
                                                                    {isSelected && (qType === "single_choice" ? <div className="radio-inner" /> : <span className="checkbox-inner">✓</span>)}
                                                                </div>
                                                                <span className="option-text">{option.text}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : isTeacher ? (
                            <div className="view-questions-list">
                                {questions.map((question, index) => (
                                    <div key={question.id} className="view-question-card">
                                        <div className="question-card-header">
                                            <span className="question-number">Вопрос {index + 1}</span>
                                            <span className="question-type-badge">{getQuestionTypeLabel(question)}</span>
                                        </div>
                                        <p className="question-card-text">{question.title}</p>
                                        {getQuestionType(question) !== "text_answer" && question.options && (
                                            <div className="question-card-options">
                                                {question.options.map(option => (
                                                    <div key={option.id} className={`question-card-option ${option.is_correct ? 'correct' : ''}`}>
                                                        <span className="option-marker">{option.is_correct ? "✓" : "○"}</span>
                                                        <span>{option.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {getQuestionType(question) === "text_answer" && (
                                            <div className="question-card-answer">
                                                <span className="answer-label">Правильный ответ: </span>
                                                <strong>{question.correct_text_answer}</strong>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="questions-hidden-info">
                                <div className="questions-hidden-icon">🔒</div>
                                <p className="questions-hidden-text">Вопросы теста скрыты. Нажмите "Начать тест", чтобы приступить к прохождению.</p>
                                <p className="questions-hidden-count">Всего вопросов: {questions.length}</p>
                            </div>
                        )}
                    </div>

                    <div className="test-divider"></div>

                    <div className="test-actions-section">
                        {isEditing ? (
                            <div className="edit-actions">
                                <button onClick={handleSaveEdit} className="save-test-button" disabled={isSaving}>{isSaving ? "Сохранение..." : "Сохранить"}</button>
                                <button onClick={handleCancelEdit} className="cancel-test-edit-button">Отмена</button>
                            </div>
                        ) : isTakingTest ? (
                            <div className="test-submit-actions">
                                <button onClick={handleCancelTest} className="cancel-test-button">Прервать тест</button>
                                <button onClick={handleSubmitTest} className="submit-test-button" disabled={submitting}>{submitting ? "Отправка..." : "Отправить тест"}</button>
                            </div>
                        ) : (
                            <>
                                {isTeacher && <button onClick={handleEdit} className="edit-test-button">Редактировать тест</button>}
                                {!isTeacher && !testPassed && (
                                    <button onClick={handleStartTest} className="start-test-button">
                                        {lastAttempt && !testPassed ? "Пройти тест повторно" : "Начать тест"}
                                    </button>
                                )}
                                {testPassed && !isTeacher && (
                                    <div className="test-passed-badge">
                                        <span className="passed-icon">🎉</span>
                                        <span className="passed-text">Тест успешно пройден!</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {lastAttempt && (
                        <>
                            <div className="test-divider"></div>
                            <div className="test-result-section">
                                <h2 className="section-subtitle">Результат</h2>
                                <div className="result-stats">
                                    <div className="result-stat">
                                        <span className="result-label">Правильных ответов:</span>
                                        <span className="result-value">{lastAttempt.correct_answers} из {lastAttempt.total_questions}</span>
                                    </div>
                                    <div className="result-stat">
                                        <span className="result-label">Ошибок:</span>
                                        <span className="result-value">{lastAttempt.total_questions - lastAttempt.correct_answers} (допустимо {getAllowedErrors(lastAttempt.total_questions)})</span>
                                    </div>
                                    <div className="result-stat">
                                        <span className="result-label">Оценка:</span>
                                        <span className={`result-score ${getScoreColor(lastAttempt.correct_answers, lastAttempt.total_questions)}`}>{formatScore(lastAttempt.score)}%</span>
                                    </div>
                                </div>
                                <div className="result-status">
                                    {testPassed ? (
                                        <span className="status-passed">✅ Тест пройден</span>
                                    ) : (
                                        <span className="status-failed">❌ Тест не пройден. Попробуйте еще раз.</span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {!isTakingTest && (
                        <>
                            <div className="test-divider"></div>
                            <div className="test-attempts-section">
                                <h2 className="section-subtitle">{isTeacher ? "Попытки студентов" : "Мои попытки"} ({attempts.length})</h2>
                                {attempts.length === 0 ? (
                                    <div className="attempts-empty"><p>На данный момент тест никто не проходил</p></div>
                                ) : isTeacher ? (
                                    <div className="attempts-grouped">
                                        {Object.entries(
                                            attempts.reduce((acc, attempt) => {
                                                const userId = attempt.user_id;
                                                if (!acc[userId]) {
                                                    acc[userId] = { user: usersMap[userId], attempts: [], isExpanded: expandedAttempts.has(`user-${userId}`) };
                                                }
                                                acc[userId].attempts.push(attempt);
                                                return acc;
                                            }, {} as Record<string, { user: UserResponse | undefined; attempts: TaskAttemptResponse[]; isExpanded: boolean }>)
                                        ).map(([userId, data]) => (
                                            <div key={userId} className="student-group">
                                                <div className="student-group-header" onClick={() => handleToggleAttempt(`user-${userId}`, userId)}>
                                                    <div className="student-group-info">
                                                        {data.user && (
                                                            <>
                                                                <div className="student-avatar">{data.user.full_name.charAt(0).toUpperCase()}</div>
                                                                <div className="student-details">
                                                                    <span className="student-name">{data.user.full_name}</span>
                                                                    <span className="student-email">{data.user.email}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="student-group-meta">
                                                        <span className="student-attempts-count">{data.attempts.length} {data.attempts.length === 1 ? 'попытка' : data.attempts.length < 5 ? 'попытки' : 'попыток'}</span>
                                                        <span className={`expand-icon ${data.isExpanded ? 'expanded' : ''}`}>▼</span>
                                                    </div>
                                                </div>
                                                {data.isExpanded && (
                                                    <div className="student-attempts-list">
                                                        {data.attempts.sort((a, b) => b.attempt_number - a.attempt_number).map(attempt => {
                                                            const isAttemptExpanded = expandedAttempts.has(attempt.id);
                                                            const passed = isTestPassed(attempt.correct_answers, attempt.total_questions);
                                                            return (
                                                                <div key={attempt.id} className="student-attempt-card">
                                                                    <div className="student-attempt-header" onClick={() => handleToggleAttempt(attempt.id)}>
                                                                        <span className="attempt-number">Попытка #{attempt.attempt_number} {passed ? '✅' : '❌'}</span>
                                                                        <div className="attempt-header-score">
                                                                            <span className={`attempt-score ${getScoreColor(attempt.correct_answers, attempt.total_questions)}`}>{attempt.correct_answers}/{attempt.total_questions} ({formatScore(attempt.score)}%)</span>
                                                                            <span className={`expand-icon ${isAttemptExpanded ? 'expanded' : ''}`}>▼</span>
                                                                        </div>
                                                                    </div>
                                                                    {isAttemptExpanded && (
                                                                        <div className="attempt-content">
                                                                            {attempt.answers.map((answer, index) => {
                                                                                const question = questions.find(q => q.id === answer.task_id);
                                                                                if (!question) return null;
                                                                                const qType = getQuestionType(question);
                                                                                return (
                                                                                    <div key={answer.task_id} className="attempt-answer">
                                                                                        <div className="answer-header">
                                                                                            <span className="answer-number">Вопрос {index + 1}</span>
                                                                                            <span className={`answer-status ${answer.is_correct ? 'correct' : 'incorrect'}`}>{answer.is_correct ? "✓ Правильно" : "✗ Неправильно"}</span>
                                                                                        </div>
                                                                                        <p className="answer-question">{question.title}</p>
                                                                                        {qType === "text_answer" && (
                                                                                            <div className="answer-details">
                                                                                                <p className="answer-your">Ответ студента: <strong>{answer.text_answer || "—"}</strong></p>
                                                                                                <p className="answer-correct">Правильный ответ: <strong>{question.correct_text_answer}</strong></p>
                                                                                            </div>
                                                                                        )}
                                                                                        {qType !== "text_answer" && question.options && (
                                                                                            <div className="answer-options">
                                                                                                {question.options.map(option => {
                                                                                                    const isSelected = answer.selected_option_ids.includes(option.id);
                                                                                                    let optionClass = "";
                                                                                                    if (option.is_correct && isSelected) optionClass = "option-correct-selected";
                                                                                                    else if (option.is_correct) optionClass = "option-correct";
                                                                                                    else if (isSelected) optionClass = "option-incorrect";
                                                                                                    return (
                                                                                                        <div key={option.id} className={`answer-option ${optionClass}`}>
                                                                                                            <span className="option-marker">{isSelected ? "✓" : "○"}</span>
                                                                                                            <span>{option.text}</span>
                                                                                                            {option.is_correct && <span className="option-correct-badge">✓</span>}
                                                                                                        </div>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="attempts-list">
                                        {attempts.map(attempt => {
                                            const isExpanded = expandedAttempts.has(attempt.id);
                                            const passed = isTestPassed(attempt.correct_answers, attempt.total_questions);
                                            return (
                                                <div key={attempt.id} className="attempt-card">
                                                    <div className="attempt-header" onClick={() => handleToggleAttempt(attempt.id)}>
                                                        <div className="attempt-header-info">
                                                            <span className="attempt-number">Попытка #{attempt.attempt_number} {passed ? '✅' : '❌'}</span>
                                                        </div>
                                                        <div className="attempt-header-score">
                                                            <span className={`attempt-score ${getScoreColor(attempt.correct_answers, attempt.total_questions)}`}>{attempt.correct_answers}/{attempt.total_questions} ({formatScore(attempt.score)}%)</span>
                                                            <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
                                                        </div>
                                                    </div>
                                                    {isExpanded && (
                                                        <div className="attempt-content">
                                                            <div className="attempt-summary">
                                                                <p>Правильных ответов: <strong>{attempt.correct_answers} из {attempt.total_questions}</strong></p>
                                                                <p>Ошибок: <strong>{attempt.total_questions - attempt.correct_answers}</strong> (допустимо {getAllowedErrors(attempt.total_questions)})</p>
                                                                <p>Процент: <strong className={`result-score ${getScoreColor(attempt.correct_answers, attempt.total_questions)}`}>{formatScore(attempt.score)}%</strong></p>
                                                                <p>Статус: <strong className={passed ? 'status-passed' : 'status-failed'}>{passed ? '✅ Пройден' : '❌ Не пройден'}</strong></p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <CancelTestModal
                isOpen={isCancelModalOpen}
                onClose={handleCloseCancelModal}
                onConfirm={handleConfirmCancelTest}
            />
        </div>
    );
};

export default TestPage;