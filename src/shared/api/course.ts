import api from "./axios.ts";

const COURSES = "/courses";

export interface CourseResponse {
    id: string;
    title: string;
    description: string;
    access_type: "public" | "group_only";
    published_at: string;
    owner_id: string;
    amount_of_modules: number;
    amount_of_lessons: number;
}

export interface CourseListResponse {
    courses: CourseResponse[];
}

export const courseApi = {
    post: (title: string, description: string, access_type: string) =>
        api.post<CourseResponse>(`${COURSES}`, {
            title,
            description,
            access_type,
        }),

    getAll: () =>
        api.get<CourseListResponse>(`${COURSES}`),

    getMy: () =>
        api.get<CourseListResponse>(`${COURSES}/my`),

    getById: (id: string) =>
        api.get<CourseResponse>(`${COURSES}/${id}`),

    patch: (id: string, data: Partial<{
        title: string;
        description: string;
        access_type: string
    }>) =>
        api.patch<CourseResponse>(`${COURSES}/${id}`, data),

    patchPublish: (id: string) =>
        api.patch<CourseResponse>(`${COURSES}/${id}/publish`),

    delete: (id: string) =>
        api.delete<void>(`${COURSES}/${id}`),
}