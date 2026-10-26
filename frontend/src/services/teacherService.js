/**
 * teacherService.js
 * -----------------
 * Teacher data access layer. The backend provides real data when available;
 * when the API is unavailable we return empty values rather than fabricated
 * statistics or records.
 */

import api from './api';

async function safeGet(endpoint, fallback = null, params = {}) {
  try {
    const res = await api.get(endpoint, { params });
    return res.data?.data ?? res.data ?? fallback;
  } catch (error) {
    console.warn(`[teacherService] API unavailable for ${endpoint}:`, error.message);
    return fallback;
  }
}

async function safePost(method, endpoint, payload, fallback = { success: false, message: 'Feature unavailable' }) {
  try {
    const res = await api[method](endpoint, payload);
    return res.data?.data ?? res.data ?? fallback;
  } catch (error) {
    console.warn(`[teacherService] ${method.toUpperCase()} ${endpoint} failed:`, error.message);
    return fallback;
  }
}

async function safeDelete(endpoint, fallback = { success: false, message: 'Feature unavailable' }) {
  try {
    const res = await api.delete(endpoint);
    return res.data?.data ?? res.data ?? fallback;
  } catch (error) {
    console.warn(`[teacherService] DELETE ${endpoint} failed:`, error.message);
    return fallback;
  }
}

export async function getTeacherDashboardData(signal) {
  const response = await api.get('/teacher/dashboard', { signal });
  const data = response.data?.data ?? response.data;

  return {
    summary: data?.summary ?? null,
    upcomingExams: Array.isArray(data?.upcomingExams) ? data.upcomingExams : [],
  };
}

export async function getTeacherStats() {
  return safeGet('/teacher/dashboard');
}

export async function getTeacherCourses() {
  return safeGet('/teacher/courses');
}

export async function getCourseStudents(courseId) {
  return safeGet(`/teacher/courses/${courseId}/students`);
}

export async function getTeacherExams() {
  return safeGet('/teacher/exams');
}

export async function getCourseNotes(courseId) {
  return safeGet(`/teacher/courses/${courseId}/notes`);
}

export async function uploadNote(courseId, formData) {
  return safePost('post', `/teacher/courses/${courseId}/notes`, formData, {
    success: false,
    message: 'Study note upload is not yet enabled on the backend.',
  });
}

export async function deleteNote(noteId) {
  return safeDelete(`/teacher/notes/${noteId}`);
}

export async function getStudentPerformance(params = {}) {
  return safeGet('/teacher/performance', [], params);
}

export async function createExam(data) {
  return safePost('post', '/teacher/exams', data, {
    success: false,
    message: 'Exam creation is not yet available on the backend.',
  });
}

export async function updateExam(id, data) {
  return safePost('put', `/teacher/exams/${id}`, data, {
    success: false,
    message: 'Exam update is not yet available on the backend.',
  });
}

export async function deleteExam(id) {
  return safeDelete(`/teacher/exams/${id}`);
}
