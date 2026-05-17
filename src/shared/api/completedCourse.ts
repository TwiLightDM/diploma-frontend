import api from "@/shared/api/axios.ts";

const COMPLETED_COURSES: string = "/completed-courses";

export interface CompletedCourseResponse {
    user_id: string;
    course_id: string;
}

export interface CompletedCourseListResponse {
    completed_courses: CompletedCourseResponse[];
}

export const completedCourseApi = {
    post: (course_id: string) =>
        api.post<CompletedCourseResponse>(`${COMPLETED_COURSES}`, {
                course_id,
            },
        ),

    getMy: () =>
        api.get<CompletedCourseListResponse>(`${COMPLETED_COURSES}/my`,
        ),

    getAllByCourseId: (course_id: string) =>
        api.get<CompletedCourseListResponse>(`${COMPLETED_COURSES}/courses/${course_id}`,
        ),
};