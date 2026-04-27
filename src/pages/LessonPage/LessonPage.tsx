// LessonPage.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { type UserResponse } from "@/shared/api/user";
import { lessonApi, type LessonResponse } from "@/shared/api/lesson";
import "./LessonPage.css";

const formatDescription = (text: string | undefined): string => {
    if (!text) return '';
    return text.replace(/\\n/g, '\n');
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
                <p className="modal-text">Вы точно уверены, что хотите удалить урок?</p>
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

// Модальное окно для вставки таблицы
const InsertTableModal = ({
                              isOpen,
                              onClose,
                              onInsert
                          }: {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (rows: number, cols: number) => void;
}) => {
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    const [localError, setLocalError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleInsert = () => {
        if (rows < 1 || cols < 1) {
            setLocalError("Количество строк и столбцов должно быть больше 0");
            return;
        }
        if (rows > 20 || cols > 20) {
            setLocalError("Максимальное количество строк и столбцов: 20");
            return;
        }
        onInsert(rows, cols);
        setRows(3);
        setCols(3);
        setLocalError(null);
    };

    const handleClose = () => {
        setRows(3);
        setCols(3);
        setLocalError(null);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal-title">Вставка таблицы</h3>
                <p className="modal-text">Укажите размеры таблицы:</p>

                <div className="table-form">
                    <div className="table-form-group">
                        <label className="table-form-label">Количество строк:</label>
                        <input
                            type="number"
                            value={rows}
                            onChange={(e) => {
                                setRows(Number(e.target.value));
                                setLocalError(null);
                            }}
                            className="table-form-input"
                            min="1"
                            max="20"
                        />
                    </div>
                    <div className="table-form-group">
                        <label className="table-form-label">Количество столбцов:</label>
                        <input
                            type="number"
                            value={cols}
                            onChange={(e) => {
                                setCols(Number(e.target.value));
                                setLocalError(null);
                            }}
                            className="table-form-input"
                            min="1"
                            max="20"
                        />
                    </div>

                    {localError && <div className="table-form-error">{localError}</div>}

                    <div className="table-preview">
                        <table>
                            <tbody>
                            {Array.from({ length: Math.min(rows, 5) }, (_, i) => (
                                <tr key={i}>
                                    {Array.from({ length: Math.min(cols, 5) }, (_, j) => (
                                        <td key={j} className="preview-cell"></td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {(rows > 5 || cols > 5) && (
                            <p className="preview-note">
                                И ещё {rows > 5 ? rows - 5 : 0} строк{rows > 5 && cols > 5 ? ' и' : ''} {cols > 5 ? cols - 5 : 0} столбцов
                            </p>
                        )}
                    </div>
                </div>

                <div className="modal-actions">
                    <button onClick={handleClose} className="modal-cancel-button">
                        Отмена
                    </button>
                    <button onClick={handleInsert} className="modal-confirm-button insert-table-button">
                        Вставить таблицу
                    </button>
                </div>
            </div>
        </div>
    );
};

const LessonPage = () => {
    const { id: lessonId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useOutletContext<{ user: UserResponse }>();
    const [lesson, setLesson] = useState<LessonResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Состояния для редактирования
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState("");
    const [editedDescription, setEditedDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
    const [currentFontSize, setCurrentFontSize] = useState<string>("3");
    const originalContentRef = useRef<string>("");
    const savedSelectionRef = useRef<Range | null>(null);

    // Состояния для модальных окон
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);

    const fetchLessonData = async () => {
        if (!lessonId) {
            setError("ID урока не найден");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const lessonRes = await lessonApi.getById(lessonId);
            setLesson(lessonRes.data);
            setEditedTitle(lessonRes.data.title);
            setEditedDescription(lessonRes.data.description);
            originalContentRef.current = lessonRes.data.content || "";
        } catch (err) {
            console.error("Failed to fetch lesson data:", err);
            setError("Не удалось загрузить данные урока");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLessonData();
    }, [lessonId]);

    // Проверка изменений при редактировании
    const checkChanges = useCallback(() => {
        if (lesson && isEditing) {
            const titleChanged = editedTitle.trim() !== lesson.title;
            const descriptionChanged = editedDescription.trim() !== lesson.description;
            const contentChanged = contentRef.current?.innerHTML !== originalContentRef.current;
            setHasChanges(titleChanged || descriptionChanged || contentChanged);
        }
    }, [editedTitle, editedDescription, lesson, isEditing]);

    useEffect(() => {
        checkChanges();
    }, [editedTitle, editedDescription, checkChanges]);

    // Обновление активных форматов
    const updateActiveFormats = useCallback(() => {
        const formats = new Set<string>();

        if (document.queryCommandState('bold')) formats.add('bold');
        if (document.queryCommandState('italic')) formats.add('italic');
        if (document.queryCommandState('underline')) formats.add('underline');
        if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
        if (document.queryCommandState('justifyLeft')) formats.add('justifyLeft');
        if (document.queryCommandState('justifyCenter')) formats.add('justifyCenter');
        if (document.queryCommandState('justifyRight')) formats.add('justifyRight');
        if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList');
        if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList');

        const fontSize = document.queryCommandValue('fontSize');
        if (fontSize) {
            setCurrentFontSize(fontSize);
        }

        setActiveFormats(formats);
    }, []);

    const handleContentChange = useCallback(() => {
        updateActiveFormats();
        checkChanges();
    }, [updateActiveFormats, checkChanges]);

    const execCommand = (command: string, value?: string) => {
        contentRef.current?.focus();
        document.execCommand(command, false, value);
        updateActiveFormats();
        checkChanges();
    };

    const changeFontSize = (size: string) => {
        contentRef.current?.focus();
        document.execCommand('fontSize', false, size);
        setCurrentFontSize(size);
        updateActiveFormats();
        checkChanges();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    execCommand('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    execCommand('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    execCommand('underline');
                    break;
            }
        }
    };

    // Сохранение текущего выделения
    const saveSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && contentRef.current) {
            const range = selection.getRangeAt(0);
            if (contentRef.current.contains(range.commonAncestorContainer)) {
                savedSelectionRef.current = range.cloneRange();
            }
        }
    }, []);

    // Восстановление сохраненного выделения
    const restoreSelection = useCallback(() => {
        if (savedSelectionRef.current && contentRef.current) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(savedSelectionRef.current);
                contentRef.current.focus();
            }
        } else {
            contentRef.current?.focus();
            const selection = window.getSelection();
            if (selection && contentRef.current) {
                const range = document.createRange();
                range.selectNodeContents(contentRef.current);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }, []);

    const handleInsertTable = useCallback((rows: number, cols: number) => {
        restoreSelection();

        let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;">';

        for (let i = 0; i < rows; i++) {
            tableHTML += '<tr>';
            for (let j = 0; j < cols; j++) {
                tableHTML += '<td style="padding: 8px; border: 1px solid #ddd;"><br></td>';
            }
            tableHTML += '</tr>';
        }

        tableHTML += '</table><p><br></p>';

        document.execCommand('insertHTML', false, tableHTML);
        updateActiveFormats();
        checkChanges();
        setIsTableModalOpen(false);
    }, [restoreSelection, updateActiveFormats, checkChanges]);

    const handleEdit = () => {
        setIsEditing(true);
        setTimeout(() => {
            if (contentRef.current && lesson) {
                contentRef.current.innerHTML = lesson.content || "";
                contentRef.current.focus();

                // Ставим курсор в конец при начале редактирования
                const selection = window.getSelection();
                if (selection && contentRef.current) {
                    const range = document.createRange();
                    range.selectNodeContents(contentRef.current);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }, 0);
    };

    const handleCancel = () => {
        if (lesson) {
            setEditedTitle(lesson.title);
            setEditedDescription(lesson.description);
        }
        setIsEditing(false);
        setHasChanges(false);
        savedSelectionRef.current = null;
    };

    const handleSave = async () => {
        if (!lessonId || !lesson) return;

        setIsSaving(true);
        try {
            const updatedContent = contentRef.current?.innerHTML || "";

            await lessonApi.patch(
                lessonId,
                editedTitle.trim(),
                editedDescription.trim(),
                updatedContent
            );

            originalContentRef.current = updatedContent;

            await fetchLessonData();
            setIsEditing(false);
            setHasChanges(false);
            savedSelectionRef.current = null;
        } catch (err) {
            console.error("Failed to update lesson:", err);
            setError("Не удалось сохранить изменения");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!lessonId) return;

        setIsDeleting(true);
        try {
            await lessonApi.delete(lessonId);
            if (lesson?.module_id) {
                navigate(`/modules/${lesson.module_id}`);
            } else {
                navigate("/");
            }
        } catch (err) {
            console.error("Failed to delete lesson:", err);
            setError("Не удалось удалить урок");
            setIsDeleteModalOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBack = () => {
        if (lesson?.module_id) {
            navigate(`/modules/${lesson.module_id}`);
        } else {
            navigate("/");
        }
    };

    const fontSizeOptions = [
        { value: "1", label: "Маленький" },
        { value: "2", label: "Малый" },
        { value: "3", label: "Обычный" },
        { value: "4", label: "Средний" },
        { value: "5", label: "Крупный" },
        { value: "6", label: "Большой" },
        { value: "7", label: "Огромный" },
    ];

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Загрузка...</p>
            </div>
        );
    }

    if (error || !lesson) {
        return (
            <div className="error-container">
                <p className="error-message">{error || "Урок не найден"}</p>
                <button onClick={handleBack} className="back-button">Вернуться к модулю</button>
            </div>
        );
    }

    const isTeacher = user?.role === "teacher";

    return (
        <div className="lesson-page-content">
            <div className="lesson-header">
                <div className="lesson-header-top">
                    <button onClick={handleBack} className="back-button">
                        ← Назад
                    </button>
                </div>

                <div className="lesson-header-main">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="lesson-title-input"
                            placeholder="Название урока"
                        />
                    ) : (
                        <h1 className="lesson-page-title">{lesson.title}</h1>
                    )}
                </div>

                <div className="lesson-info">
                    {isEditing ? (
                        <textarea
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                            className="lesson-description-input"
                            placeholder="Описание урока"
                            rows={4}
                        />
                    ) : (
                        <div className="lesson-description-full">
                            {formatDescription(lesson.description).split('\n').map((line, idx, arr) => (
                                <span key={idx}>
                                    {line}
                                    {idx < arr.length - 1 && <br />}
                                </span>
                            ))}
                        </div>
                    )}

                    {isTeacher && (
                        <div className="lesson-actions">
                            {!isEditing ? (
                                <>
                                    <button onClick={handleEdit} className="edit-button">
                                        Редактировать урок
                                    </button>
                                    <button
                                        onClick={() => setIsDeleteModalOpen(true)}
                                        className="delete-button"
                                    >
                                        Удалить урок
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

            <div className="lesson-content-section">
                <h2 className="content-title">Содержание урока</h2>

                {isEditing && (
                    <div className="editor-toolbar">
                        <button
                            type="button"
                            className={`toolbar-button ${activeFormats.has('bold') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                execCommand('bold');
                            }}
                            title="Жирный (Ctrl+B)"
                        >
                            <strong>B</strong>
                        </button>
                        <button
                            type="button"
                            className={`toolbar-button ${activeFormats.has('italic') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                execCommand('italic');
                            }}
                            title="Курсив (Ctrl+I)"
                        >
                            <em>I</em>
                        </button>
                        <button
                            type="button"
                            className={`toolbar-button ${activeFormats.has('underline') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                execCommand('underline');
                            }}
                            title="Подчеркнутый (Ctrl+U)"
                        >
                            <u>U</u>
                        </button>
                        <button
                            type="button"
                            className={`toolbar-button ${activeFormats.has('strikeThrough') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                execCommand('strikeThrough');
                            }}
                            title="Зачеркнутый"
                        >
                            <s>S</s>
                        </button>

                        <span className="toolbar-divider"></span>

                        <select
                            className="font-size-select"
                            value={currentFontSize}
                            onChange={(e) => changeFontSize(e.target.value)}
                            title="Размер текста"
                        >
                            {fontSizeOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <span className="toolbar-divider"></span>

                        <button
                            type="button"
                            className={`toolbar-button ${activeFormats.has('justifyLeft') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                execCommand('justifyLeft');
                            }}
                            title="По левому краю"
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                                <rect x="0" y="1" width="14" height="2" rx="0.5"/>
                                <rect x="0" y="5" width="10" height="2" rx="0.5"/>
                                <rect x="0" y="9" width="12" height="2" rx="0.5"/>
                            </svg>
                        </button>
                        <button
                            type="button"
                            className={`toolbar-button ${activeFormats.has('justifyCenter') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                execCommand('justifyCenter');
                            }}
                            title="По центру"
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                                <rect x="0" y="1" width="14" height="2" rx="0.5"/>
                                <rect x="2" y="5" width="10" height="2" rx="0.5"/>
                                <rect x="1" y="9" width="12" height="2" rx="0.5"/>
                            </svg>
                        </button>
                        <button
                            type="button"
                            className={`toolbar-button ${activeFormats.has('justifyRight') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                execCommand('justifyRight');
                            }}
                            title="По правому краю"
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                                <rect x="0" y="1" width="14" height="2" rx="0.5"/>
                                <rect x="4" y="5" width="10" height="2" rx="0.5"/>
                                <rect x="2" y="9" width="12" height="2" rx="0.5"/>
                            </svg>
                        </button>

                        <span className="toolbar-divider"></span>

                        <button
                            type="button"
                            className={`toolbar-button ${activeFormats.has('insertOrderedList') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                execCommand('insertOrderedList');
                            }}
                            title="Нумерованный список"
                        >
                            1.
                        </button>
                        <button
                            type="button"
                            className={`toolbar-button ${activeFormats.has('insertUnorderedList') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                execCommand('insertUnorderedList');
                            }}
                            title="Маркированный список"
                        >
                            •
                        </button>

                        <span className="toolbar-divider"></span>

                        <button
                            type="button"
                            className="toolbar-button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                saveSelection();
                                setIsTableModalOpen(true);
                            }}
                            title="Вставить таблицу"
                        >
                            ⊞
                        </button>
                        <button
                            type="button"
                            className="toolbar-button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                execCommand('removeFormat');
                            }}
                            title="Очистить форматирование"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className="lesson-content-body">
                    {isEditing ? (
                        <div
                            ref={contentRef}
                            className="editor-content"
                            contentEditable={true}
                            onInput={handleContentChange}
                            onKeyDown={handleKeyDown}
                            onKeyUp={updateActiveFormats}
                            onClick={updateActiveFormats}
                            data-placeholder="Введите содержание урока..."
                            suppressContentEditableWarning={true}
                        />
                    ) : (
                        <div
                            className="lesson-content-html"
                            dangerouslySetInnerHTML={{ __html: lesson.content || "" }}
                        />
                    )}
                </div>
            </div>

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
            />

            <InsertTableModal
                isOpen={isTableModalOpen}
                onClose={() => setIsTableModalOpen(false)}
                onInsert={handleInsertTable}
            />
        </div>
    );
};

export default LessonPage;