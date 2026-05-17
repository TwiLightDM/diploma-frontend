import api from "@/shared/api/axios.ts";

const COMPLETED_THEORY_COURSES: string = "/completed-theory-courses";

export interface CompletedTheoryCourseResponse {
    user_id: string;
    course_id: string;
}

export interface CompletedTheoryCourseListResponse {
    completed_theory_courses: CompletedTheoryCourseResponse[];
}

export const completedTheoryCourseApi = {
    post: (course_id: string) =>
        api.post<CompletedTheoryCourseResponse>(`${COMPLETED_THEORY_COURSES}`, {
                course_id,
            },
        ),

    getMy: () =>
        api.get<CompletedTheoryCourseListResponse>(`${COMPLETED_THEORY_COURSES}/my`,
        ),

    getAllByCourseId: (course_id: string) =>
        api.get<CompletedTheoryCourseListResponse>(`${COMPLETED_THEORY_COURSES}/courses/${course_id}`,
        ),

};