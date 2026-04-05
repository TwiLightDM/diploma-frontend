import api from "./axios.ts";

const USERS: string = "/users";

export interface UserResponse {
    id: string;
    full_name: string;
    role: "student" | "teacher";
    email: string;
}

export const userApi = {
    getMe: () =>
        api.get<UserResponse>(`${USERS}/me`),

    getById: (id: string) =>
        api.get<UserResponse>(`${USERS}/${id}`),

    patch: (full_name: string, email: string) =>
        api.patch<UserResponse>(`${USERS}`,{
            full_name,
            email,
        }),

    patchPassword: (password: string) =>
        api.patch<UserResponse>(`${USERS}/password`, {
            password,
        })
};