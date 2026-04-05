import api from "@/shared/api/axios.ts";

const MODULES: string = "/modules";

export interface ModuleResponse {
    id: string;
    title: string;
    description: string;
    position: number;
    course_id: string;
}

export interface ModuleListResponse {
    modules: ModuleResponse[];
}

export const ModuleApi = {
    post: (title: string, description: string, course_id: string) =>
        api.post<ModuleResponse>(`${MODULES}`, {
            title,
            description,
            course_id,
        }),

    getAllByCourseId: (course_id: string) =>
        api.get<ModuleListResponse>(`${MODULES}/courses/${course_id}`),

    getById: (id: string) =>
        api.get<ModuleResponse>(`${MODULES}/${id}`),

    patch: (id: string, title: string, description: string, position: number) =>
        api.patch<ModuleResponse>(`${MODULES}/${id}`, {
            title,
            description,
            position,
        }),

    delete: (id: string) =>
        api.delete<void>(`${MODULES}/${id}`),
}