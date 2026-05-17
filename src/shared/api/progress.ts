import api from "@/shared/api/axios.ts";

const LESSON_PROGRESSES: string = "/lesson-progresses";
const PROGRESSES: string = "/progresses";

export interface LessonProgressResponse {
    user_id: string;
    lesson_id: string;
}

export interface LessonProgressListResponse {
    progress: LessonProgressResponse[];
}

export interface CourseProgressResponse {
    course_id: string;
    total_lessons: number;
    completed_lessons: number;
    progress_percent: number;
    completed_lesson_ids: string[];
}

export interface ModuleProgressResponse {
    module_id: string;
    total_lessons: number;
    completed_lessons: number;
    progress_percent: number;
    completed_lesson_ids: string[];
}

export interface UserCourseProgressResponse {
    user_id: string;
    completed_lessons: number;
    total_lessons: number;
    progress_percent: number;
    completed: boolean;
}

export interface CourseStatisticsResponse {
    course_id: string;
    users: UserCourseProgressResponse[];
}

export interface UserModuleProgressResponse {
    user_id: string;
    completed_lessons: number;
    total_lessons: number;
    progress_percent: number;
    completed: boolean;
}

export interface ModuleStatisticsResponse {
    module_id: string;
    users: UserModuleProgressResponse[];
}

export const lessonProgressApi = {
    post: (lesson_id: string) =>
        api.post<LessonProgressResponse>(
            `${LESSON_PROGRESSES}`, {
                lesson_id,
            },
        ),

    getMy: () =>
        api.get<LessonProgressListResponse>(
            `${LESSON_PROGRESSES}`,
        ),

    getByLessonId: (lesson_id: string) =>
        api.get<LessonProgressResponse>(
            `${LESSON_PROGRESSES}/lessons/${lesson_id}`,
        ),
};

export const courseProgressApi = {
    getByCourseId: (course_id: string) =>
        api.get<CourseProgressResponse>(
            `${PROGRESSES}/courses/${course_id}`,
        ),

    getStatistics: (course_id: string) =>
        api.get<CourseStatisticsResponse>(
            `${PROGRESSES}/courses/${course_id}/statistics`,
        ),
};

export const moduleProgressApi = {
    getByModuleId: (module_id: string) =>
        api.get<ModuleProgressResponse>(
            `${PROGRESSES}/modules/${module_id}`,
        ),

    getStatistics: (module_id: string) =>
        api.get<ModuleStatisticsResponse>(
            `${PROGRESSES}/modules/${module_id}/statistics`,
        ),
};