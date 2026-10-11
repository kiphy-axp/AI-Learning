import type { AppState, Note, TutorConfig } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const api = {
  state: () => request<AppState>('/api/state'),

  setStatus: (lessonSlug: string, stageSlug: string, status: string) =>
    request<{ ok: true }>('/api/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonSlug, stageSlug, status }),
    }),

  recordAttempt: (payload: {
    lessonSlug: string;
    questionId: string;
    questionType: string;
    correct: boolean;
    answer?: string;
  }) => request<{ ok: true }>('/api/quiz/attempt', { method: 'POST', body: JSON.stringify(payload) }),

  heartbeat: (seconds: number) =>
    request<{ ok: true }>('/api/heartbeat', { method: 'POST', body: JSON.stringify({ seconds }) }),

  toggleBookmark: (lessonSlug: string) =>
    request<{ active: boolean; bookmarks: string[] }>('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ lessonSlug }),
    }),

  notes: () => request<{ notes: Note[] }>('/api/notes'),
  createNote: (payload: { title: string; body: string; lessonSlug?: string | null; tags?: string[] }) =>
    request<{ notes: Note[] }>('/api/notes', { method: 'POST', body: JSON.stringify(payload) }),
  updateNote: (id: number, payload: { title: string; body: string; tags?: string[]; lessonSlug?: string | null }) =>
    request<{ notes: Note[] }>(`/api/notes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteNote: (id: number) => request<{ notes: Note[] }>(`/api/notes/${id}`, { method: 'DELETE' }),

  toggleProjectTask: (projectId: string, taskIndex: number, done: boolean) =>
    request<{ projectTasks: AppState['projectTasks'] }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ projectId, taskIndex, done }),
    }),

  settings: () => request<{ tutor: TutorConfig }>('/api/settings'),
  saveSettings: (payload: { provider?: string; baseUrl?: string; model?: string; apiKey?: string }) =>
    request<{ tutor: TutorConfig }>('/api/settings', { method: 'POST', body: JSON.stringify(payload) }),

  tutor: (payload: {
    message: string;
    mode: string;
    context?: unknown;
    history?: { role: string; content: string }[];
  }) =>
    request<{ ok: true; source: 'model' | 'offline'; content: string; model?: string; reason?: string }>(
      '/api/tutor',
      { method: 'POST', body: JSON.stringify(payload) },
    ),
};
