import "server-only";

// courses modülü — sunucu public girişi (öğrenci takibi kurs, oturum ve kayıt bilgisini buradan alır)
export { coursesPermissions, courseSessionsPermissions, courseFeesPermissions, courseTeachersPermissions } from "./permissions";
export { getCourseRoster, listCourseOptions } from "./queries/courses";
export { teacherCourseScope, canAccessCourse } from "./services/teacher-scope";
export type { CourseRoster } from "./types";
export { getCourseStats } from "./queries/stats";
export { getCourse } from "./queries/courses";
export { createCourseAction, updateCourseAction, deleteCourseAction } from "./actions/course-actions";
