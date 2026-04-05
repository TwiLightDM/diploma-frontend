import api from "@/shared/api/axios.ts";

const LESSONS = "/lessons";

export interface LessonResponse {
    id: string;
    title: string;
    description: string;
    content: string;
    position: number;
    module_id: string;
}

export interface LessonListResponse {
    lessons: LessonResponse[];
}

export const LessonApi = {
    post: (title: string, description: string, content: string) =>
        api.post<LessonResponse>(`${LESSONS}`, {
            title,
            description,
            content,
        }),

    getAllByModuleId: (module_id: string) =>
        api.get<LessonListResponse>(`${LESSONS}/modules/${module_id}`),

    getById: (id: string) =>
        api.get<LessonResponse>(`${LESSONS}/${id}`),

    patch: (id: string, title: string,  description: string, content: string, position: number) =>
        api.patch<LessonResponse>(`${LESSONS}/${id}`, {
            title,
            description,
            content,
            position,
        }),

    delete: (id: string) =>
        api.delete<void>(`${LESSONS}/${id}`),
}