import api from "./axios.ts";

const COURSES = "/courses";

export interface CourseResponse {
    id: string;
    title: string;
    description: string;
    access_type: string;
    published_at: string;
    owner_id: string;
}

export interface CourseListResponse {
    courses: CourseResponse[];
}

export const courseApi = {
    post: (title: string, description: string, access_type: string) =>
        api.post<CourseResponse>(`${COURSES}/create`, {
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

    patch: (id: string, title: string, description: string, access_type: string) =>
        api.patch<CourseResponse>(`${COURSES}/${id}`, {
            title,
            description,
            access_type,
        }),

    patchPublish: (id: string) =>
        api.patch<CourseResponse>(`${COURSES}/${id}`),

    delete: (id: string) =>
        api.delete<void>(`${COURSES}/${id}`),
}