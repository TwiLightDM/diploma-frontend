import api from "@/shared/api/axios.ts";

const COMPLETED_MODULES: string = "/completed-modules";

export interface CompletedModuleResponse {
    user_id: string;
    module_id: string;
}

export interface CompletedModuleListResponse {
    completed_modules: CompletedModuleResponse[];
}

export const completedModuleApi = {
    post: (module_id: string) =>
        api.post<CompletedModuleResponse>(`${COMPLETED_MODULES}`, {
                module_id,
            },
        ),

    getMy: () =>
        api.get<CompletedModuleListResponse>(`${COMPLETED_MODULES}/my`,
        ),

    getAllByModuleId: (module_id: string) =>
        api.get<CompletedModuleListResponse>(`${COMPLETED_MODULES}/modules/${module_id}`,
        ),
};