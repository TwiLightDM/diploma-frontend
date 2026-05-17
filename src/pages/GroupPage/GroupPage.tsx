// GroupPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { groupApi, type GroupResponse } from "@/shared/api/group";
import { groupMemberApi } from "@/shared/api/groupMember";
import { userApi, type UserResponse } from "@/shared/api/user";
import "./GroupPage.css";

interface ApiError {
    response?: {
        status: number;
        data?: {
            detail?: string;
        };
    };
    message?: string;
}

interface GroupWithMembers {
    group: GroupResponse;
    members: UserResponse[];
    loadingMembers: boolean;
}

// Модальное окно подтверждения удаления группы
const DeleteGroupModal = ({
                              isOpen,
                              groupTitle,
                              onClose,
                              onConfirm,
                              isDeleting
                          }: {
    isOpen: boolean;
    groupTitle: string;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal-title">Подтверждение удаления</h3>
                <p className="modal-text">
                    Вы точно уверены, что хотите удалить группу <strong>"{groupTitle}"</strong>?
                </p>
                <div className="modal-actions">
                    <button onClick={onClose} className="modal-cancel-button" disabled={isDeleting}>
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

const GroupPage = ({ user }: { user: UserResponse }) => {
    const navigate = useNavigate();
    const [groups, setGroups] = useState<GroupWithMembers[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Состояния для добавления участника
    const [addingMemberGroupId, setAddingMemberGroupId] = useState<string | null>(null);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [addingMember, setAddingMember] = useState(false);
    const [memberError, setMemberError] = useState<string | null>(null);

    // Состояния для редактирования группы
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editedTitle, setEditedTitle] = useState("");
    const [editedDescription, setEditedDescription] = useState("");
    const [savingGroup, setSavingGroup] = useState(false);

    // Состояния для модального окна удаления
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingGroup, setDeletingGroup] = useState<{ id: string; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isTeacher = user?.role === "teacher";

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        setLoading(true);
        setError(null);

        try {
            if (isTeacher) {
                const groupsRes = await groupApi.getMy();
                const fetchedGroups = groupsRes.data.groups || [];

                setGroups(
                    fetchedGroups.map(group => ({
                        group,
                        members: [],
                        loadingMembers: false,
                    }))
                );
            } else {
                const membersRes = await groupMemberApi.getAllByUserId();
                const groupMembers = membersRes.data.group_members || [];

                if (groupMembers.length === 0) {
                    setGroups([]);
                    setLoading(false);
                    return;
                }

                const uniqueGroupIds = [...new Set(groupMembers.map(gm => gm.group_id))];

                const groupPromises = uniqueGroupIds.map(groupId =>
                    groupApi.getById(groupId)
                        .then(res => res.data)
                        .catch(err => {
                            console.error(`Failed to fetch group ${groupId}:`, err);
                            return null;
                        })
                );

                const fetchedGroups = (await Promise.all(groupPromises)).filter((g): g is GroupResponse => g !== null);

                setGroups(
                    fetchedGroups.map(group => ({
                        group,
                        members: [],
                        loadingMembers: false,
                    }))
                );
            }
        } catch (err) {
            console.error("Failed to fetch groups:", err);
            setError("Не удалось загрузить группы");
        } finally {
            setLoading(false);
        }
    };

    const loadMembers = async (groupId: string) => {
        setGroups(prev =>
            prev.map(item =>
                item.group.id === groupId
                    ? { ...item, loadingMembers: true }
                    : item
            )
        );

        try {
            const membersRes = await groupMemberApi.getAllByGroupId(groupId);
            const groupMembers = membersRes.data.group_members || [];

            const userPromises = groupMembers.map(member =>
                userApi.getById(member.user_id)
                    .then(res => res.data)
                    .catch(err => {
                        console.error(`Failed to fetch user ${member.user_id}:`, err);
                        return null;
                    })
            );

            const users = (await Promise.all(userPromises)).filter((u): u is UserResponse => u !== null);

            setGroups(prev =>
                prev.map(item =>
                    item.group.id === groupId
                        ? { ...item, members: users, loadingMembers: false }
                        : item
                )
            );
        } catch (err) {
            console.error("Failed to load members:", err);
            setGroups(prev =>
                prev.map(item =>
                    item.group.id === groupId
                        ? { ...item, loadingMembers: false }
                        : item
                )
            );
        }
    };

    const handleStartEditGroup = (groupId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const group = groups.find(g => g.group.id === groupId);
        if (group) {
            setEditedTitle(group.group.title);
            setEditedDescription(group.group.description || "");
            setEditingGroupId(groupId);
        }
    };

    const handleCancelEditGroup = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingGroupId(null);
        setEditedTitle("");
        setEditedDescription("");
    };

    const handleSaveGroup = async (groupId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!editedTitle.trim()) {
            setError("Название группы обязательно");
            return;
        }

        setSavingGroup(true);
        setError(null);

        try {
            await groupApi.patch(
                groupId,
                editedTitle.trim(),
                editedDescription.trim()
            );

            setGroups(prev =>
                prev.map(item =>
                    item.group.id === groupId
                        ? {
                            ...item,
                            group: {
                                ...item.group,
                                title: editedTitle.trim(),
                                description: editedDescription.trim(),
                            },
                        }
                        : item
                )
            );

            setEditingGroupId(null);
            setSuccessMessage("Группа обновлена");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Failed to update group:", err);
            setError("Не удалось обновить группу");
        } finally {
            setSavingGroup(false);
        }
    };

    const handleAddMember = async (groupId: string) => {
        if (!newMemberEmail.trim()) {
            setMemberError("Введите email участника");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newMemberEmail.trim())) {
            setMemberError("Введите корректный email");
            return;
        }

        setAddingMember(true);
        setMemberError(null);

        try {
            await groupMemberApi.post(newMemberEmail.trim(), groupId);
            await loadMembers(groupId);

            setNewMemberEmail("");
            setAddingMemberGroupId(null);
            setSuccessMessage("Участник успешно добавлен");

            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Failed to add member:", err);

            const apiError = err as ApiError;

            if (apiError.response?.status === 404) {
                setMemberError("Пользователь с таким email не найден");
            } else if (apiError.response?.status === 409) {
                setMemberError("Этот пользователь уже в группе");
            } else {
                setMemberError("Не удалось добавить участника");
            }
        } finally {
            setAddingMember(false);
        }
    };

    const handleRemoveMember = async (groupId: string, userId: string) => {
        try {
            const membersRes = await groupMemberApi.getAllByGroupId(groupId);
            const groupMember = membersRes.data.group_members.find(
                gm => gm.user_id === userId
            );

            if (groupMember) {
                await groupMemberApi.delete(groupMember.id);
                await loadMembers(groupId);
                setSuccessMessage("Участник удален из группы");
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (err) {
            console.error("Failed to remove member:", err);
            setError("Не удалось удалить участника");
        }
    };

    // Открытие модального окна удаления
    const handleOpenDeleteModal = (groupId: string, groupTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeletingGroup({ id: groupId, title: groupTitle });
        setDeleteModalOpen(true);
    };

    // Закрытие модального окна удаления
    const handleCloseDeleteModal = () => {
        setDeleteModalOpen(false);
        setDeletingGroup(null);
    };

    // Подтверждение удаления группы
    const handleConfirmDelete = async () => {
        if (!deletingGroup) return;

        setIsDeleting(true);

        try {
            await groupApi.delete(deletingGroup.id);
            setGroups(prev => prev.filter(g => g.group.id !== deletingGroup.id));
            setExpandedGroups(prev => {
                const newSet = new Set(prev);
                newSet.delete(deletingGroup.id);
                return newSet;
            });
            setSuccessMessage("Группа удалена");
            setTimeout(() => setSuccessMessage(null), 3000);
            handleCloseDeleteModal();
        } catch (err) {
            console.error("Failed to delete group:", err);
            setError("Не удалось удалить группу");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCreateGroup = () => {
        navigate("/groups/create");
    };

    const handleToggleGroup = async (groupId: string) => {
        const isCurrentlyExpanded = expandedGroups.has(groupId);

        if (isCurrentlyExpanded) {
            const newExpanded = new Set(expandedGroups);
            newExpanded.delete(groupId);
            setExpandedGroups(newExpanded);
        } else {
            const newExpanded = new Set(expandedGroups);
            newExpanded.add(groupId);
            setExpandedGroups(newExpanded);
            await loadMembers(groupId);
        }
    };

    return (
        <div className="group-page">
            <div className="group-page-header">
                <h2 className="group-page-title">Мои группы</h2>
                {isTeacher && (
                    <button onClick={handleCreateGroup} className="create-group-button">
                        + Создать
                    </button>
                )}
            </div>

            <div className="group-page-content">
                {error && <div className="form-error">{error}</div>}
                {successMessage && <div className="form-success">{successMessage}</div>}

                {loading ? (
                    <div className="groups-loading">Загрузка групп...</div>
                ) : groups.length === 0 ? (
                    <div className="groups-empty">
                        {isTeacher ? (
                            <>
                                <p>У вас пока нет групп</p>
                                <p className="groups-empty-hint">Создайте группу, чтобы добавлять участников</p>
                            </>
                        ) : (
                            <p>В настоящий момент нет групп, в которых вы состоите. При необходимости обратитесь к преподавателю</p>
                        )}
                    </div>
                ) : (
                    <div className="groups-list">
                        {groups.map(({ group, members, loadingMembers }) => {
                            const isExpanded = expandedGroups.has(group.id);
                            const isEditingThis = editingGroupId === group.id;

                            return (
                                <div key={group.id} className="group-card">
                                    {isEditingThis ? (
                                        <div className="group-edit-form" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={editedTitle}
                                                onChange={(e) => setEditedTitle(e.target.value)}
                                                placeholder="Название группы"
                                                className="group-edit-input"
                                            />
                                            <textarea
                                                value={editedDescription}
                                                onChange={(e) => setEditedDescription(e.target.value)}
                                                placeholder="Описание группы"
                                                className="group-edit-textarea"
                                                rows={2}
                                            />
                                            <div className="group-edit-actions">
                                                <button
                                                    onClick={(e) => handleSaveGroup(group.id, e)}
                                                    className="group-save-button"
                                                    disabled={savingGroup}
                                                >
                                                    {savingGroup ? "..." : "Сохранить"}
                                                </button>
                                                <button
                                                    onClick={handleCancelEditGroup}
                                                    className="group-cancel-button"
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className="group-header"
                                                onClick={() => handleToggleGroup(group.id)}
                                            >
                                                <div className="group-header-info">
                                                    <span className="group-icon">👥</span>
                                                    <div className="group-header-text">
                                                        <h3 className="group-name">{group.title}</h3>
                                                        {group.description && (
                                                            <p className="group-description">
                                                                {group.description.length > 40
                                                                    ? group.description.substring(0, 40) + '...'
                                                                    : group.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="group-header-actions" onClick={(e) => e.stopPropagation()}>
                                                    {isTeacher && (
                                                        <>
                                                            <button
                                                                className="edit-group-button"
                                                                onClick={(e) => handleStartEditGroup(group.id, e)}
                                                                title="Редактировать группу"
                                                            >
                                                                ✎
                                                            </button>
                                                            <button
                                                                className="delete-group-button"
                                                                onClick={(e) => handleOpenDeleteModal(group.id, group.title, e)}
                                                                title="Удалить группу"
                                                            >
                                                                ✕
                                                            </button>
                                                        </>
                                                    )}
                                                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                                                        ▼
                                                    </span>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="group-content">
                                                    {isTeacher && (
                                                        <div className="add-member-section">
                                                            {addingMemberGroupId === group.id ? (
                                                                <div className="add-member-form">
                                                                    <input
                                                                        type="email"
                                                                        value={newMemberEmail}
                                                                        onChange={(e) => {
                                                                            setNewMemberEmail(e.target.value);
                                                                            setMemberError(null);
                                                                        }}
                                                                        placeholder="Email участника"
                                                                        className="member-email-input"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                handleAddMember(group.id);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button
                                                                        onClick={() => handleAddMember(group.id)}
                                                                        className="add-member-submit"
                                                                        disabled={addingMember}
                                                                    >
                                                                        {addingMember ? "..." : "+"}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setAddingMemberGroupId(null);
                                                                            setNewMemberEmail("");
                                                                            setMemberError(null);
                                                                        }}
                                                                        className="add-member-cancel"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setAddingMemberGroupId(group.id)}
                                                                    className="add-member-button"
                                                                >
                                                                    + Добавить участника
                                                                </button>
                                                            )}
                                                            {memberError && addingMemberGroupId === group.id && (
                                                                <div className="member-error">{memberError}</div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="members-section">
                                                        <h4 className="members-title">
                                                            Участники ({members.length})
                                                        </h4>
                                                        {loadingMembers ? (
                                                            <div className="members-loading">Загрузка...</div>
                                                        ) : members.length === 0 ? (
                                                            <div className="members-empty">
                                                                <p>В группе пока нет участников</p>
                                                            </div>
                                                        ) : (
                                                            <div className="members-list">
                                                                {members.map(member => (
                                                                    <div key={member.id} className="member-item">
                                                                        <div className="member-info">
                                                                            <div className="member-avatar">
                                                                                {member.full_name.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div className="member-details">
                                                                                <span className="member-name">{member.full_name}</span>
                                                                                <span className="member-email">{member.email}</span>
                                                                            </div>
                                                                        </div>
                                                                        {isTeacher && (
                                                                            <button
                                                                                onClick={() => handleRemoveMember(group.id, member.id)}
                                                                                className="remove-member-button"
                                                                                title="Удалить участника"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <DeleteGroupModal
                isOpen={deleteModalOpen}
                groupTitle={deletingGroup?.title || ""}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default GroupPage;