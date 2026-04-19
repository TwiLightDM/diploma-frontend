import api from "./axios.ts";
import type {UserResponse} from "@/shared/api/user.ts";

const AUTH = "/auth"

export interface AuthResponse {
    user: UserResponse;
    access_token: string;
    refresh_token: string;
}

export const authApi = {
    login: (email: string, password: string) =>
        api.post<AuthResponse>(`${AUTH}/login`, { email, password }),

    signup: (full_name: string, email: string, password: string) =>
        api.post<AuthResponse>(`${AUTH}/signup`, {
            full_name,
            email,
            password,
        }),

    refresh: () =>
        api.post<void>(`${AUTH}/refresh`),
};
