import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import { LESSONS, STAGES } from './content';
import type { AppState, AttemptRow, Note, ProgressRow, TutorConfig } from './types';

type StoreValue = {
  ready: boolean;
  progress: Map<string, ProgressRow>;
  attempts: AttemptRow[];
  notes: Note[];
  bookmarks: Set<string>;
  projectTasks: AppState['projectTasks'];
  studyDays: AppState['studyDays'];
  tutor: TutorConfig;
  error: string | null;
  stats: {
    mastered: number;
    learning: number;
    totalSeconds: number;
    todaySeconds: number;
    streak: number;
    accuracy: number;
    stageProgress: Map<string, { done: number; total: number; percent: number }>;
    overallPercent: number;
  };
  wrongQuestions: { questionId: string; lessonSlug: string; attempts: number; lastAnswer: string }[];
  weakLessons: { lessonSlug: string; stageSlug: string; accuracy: number; attempts: number }[];
  refresh: () => Promise<void>;
  setStatus: (lessonSlug: string, stageSlug: string, status: string) => Promise<void>;
  submitAnswer: (payload: {
    lessonSlug: string;
    questionId: string;
    questionType: string;
    correct: boolean;
    answer?: string;
  }) => Promise<void>;
  toggleBookmark: (lessonSlug: string) => Promise<void>;
  toggleProjectTask: (projectId: string, taskIndex: number, done: boolean) => Promise<void>;
  saveNote: (payload: {
    id?: number;
    title: string;
    body: string;
    lessonSlug?: string | null;
    tags?: string[];
  }) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
  saveSettings: (payload: { provider?: string; baseUrl?: string; model?: string; apiKey?: string }) => Promise<void>;
};

const StoreContext = createContext<StoreValue | null>(null);

const key = (stageSlug: string, lessonSlug: string) => `${stageSlug}/${lessonSlug}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await api.state();
      setState(next);
      setError(null);
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    api
      .notes()
      .then((r) => setNotes(r.notes))
      .catch(() => undefined);
  }, [refresh]);

  /* 学习时长心跳：页面可见时每 60 秒上报一次 */
  const visibleRef = useRef(true);
  useEffect(() => {
    const onVisibility = () => {
      visibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(() => {
      if (visibleRef.current) void api.heartbeat(60).catch(() => undefined);
    }, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, []);

  const progress = useMemo(() => {
    const map = new Map<string, ProgressRow>();
    for (const row of state?.progress ?? []) map.set(row.lesson_slug, row);
    return map;
  }, [state]);

  const bookmarks = useMemo(() => new Set(state?.bookmarks ?? []), [state]);

  const stats = useMemo(() => {
    const stageProgress = new Map<string, { done: number; total: number; percent: number }>();
    let mastered = 0;
    let learning = 0;
    let percentSum = 0;

    for (const stage of STAGES) {
      let done = 0;
      let stagePercentSum = 0;
      for (const lesson of stage.lessons) {
        const row = progress.get(key(stage.stageSlug, lesson.slug));
        const status = row?.status ?? 'not-started';
        if (status === 'mastered') {
          done += 1;
          mastered += 1;
          stagePercentSum += 1;
        } else if (status === 'learning' || status === 'review') {
          learning += 1;
          stagePercentSum += status === 'review' ? 0.6 : 0.4;
        }
      }
      const total = stage.lessons.length;
      const percent = total ? Math.round((stagePercentSum / total) * 100) : 0;
      stageProgress.set(stage.stageSlug, { done, total, percent });
      percentSum += stagePercentSum;
    }

    const totalSeconds = (state?.studyDays ?? []).reduce((sum, d) => sum + d.seconds, 0);
    const today = new Date().toISOString().slice(0, 10);
    const todaySeconds = (state?.studyDays ?? []).find((d) => d.day === today)?.seconds ?? 0;

    const days = new Set((state?.studyDays ?? []).filter((d) => d.seconds > 60).map((d) => d.day));
    let streak = 0;
    const cursor = new Date();
    for (;;) {
      const dayKey = cursor.toISOString().slice(0, 10);
      if (days.has(dayKey)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else if (streak === 0 && dayKey === today) {
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    const attempts = state?.attempts ?? [];
    const accuracy = attempts.length
      ? Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100)
      : 0;

    return {
      mastered,
      learning,
      totalSeconds,
      todaySeconds,
      streak,
      accuracy,
      stageProgress,
      overallPercent: LESSONS.length ? Math.round((percentSum / LESSONS.length) * 100) : 0,
    };
  }, [progress, state]);

  const wrongQuestions = useMemo(() => {
    const latest = new Map<string, AttemptRow>();
    for (const attempt of state?.attempts ?? []) {
      if (!latest.has(attempt.question_id)) latest.set(attempt.question_id, attempt);
    }
    const counts = new Map<string, number>();
    for (const attempt of state?.attempts ?? []) {
      counts.set(attempt.question_id, (counts.get(attempt.question_id) ?? 0) + 1);
    }
    return [...latest.values()]
      .filter((a) => !a.correct)
      .map((a) => ({
        questionId: a.question_id,
        lessonSlug: a.lesson_slug,
        attempts: counts.get(a.question_id) ?? 1,
        lastAnswer: a.answer ?? '',
      }));
  }, [state]);

  const weakLessons = useMemo(() => {
    const rows = (state?.progress ?? []).filter((r) => r.question_count >= 2);
    return rows
      .map((r) => {
        // lesson_slug 存的是「阶段slug/知识点slug」复合键，这里拆开
        const [stageSlug, ...rest] = r.lesson_slug.split('/');
        return {
          lessonSlug: rest.length ? rest.join('/') : r.lesson_slug,
          stageSlug: rest.length ? stageSlug : r.stage_slug,
          accuracy: r.question_count ? Math.round((r.correct_count / r.question_count) * 100) : 0,
          attempts: r.question_count,
        };
      })
      .filter((r) => r.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 8);
  }, [state]);

  const setStatus = useCallback(
    async (lessonSlug: string, stageSlug: string, status: string) => {
      // 统一使用「阶段slug/知识点slug」作为主键，与读取端一致
      const composite = lessonSlug.includes('/') ? lessonSlug : `${stageSlug}/${lessonSlug}`;
      setState((prev) =>
        prev
          ? {
              ...prev,
              progress: prev.progress.some((p) => p.lesson_slug === composite)
                ? prev.progress.map((p) => (p.lesson_slug === composite ? { ...p, status } : p))
                : [
                    ...prev.progress,
                    {
                      lesson_slug: composite,
                      stage_slug: stageSlug,
                      status,
                      attempts: 0,
                      correct_count: 0,
                      question_count: 0,
                      best_score: 0,
                      seconds_spent: 0,
                      visited_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                  ],
            }
          : prev,
      );
      await api.setStatus(composite, stageSlug, status);
      await refresh();
    },
    [refresh],
  );

  const submitAnswer = useCallback<StoreValue['submitAnswer']>(
    async (payload) => {
      await api.recordAttempt(payload);
      await refresh();
    },
    [refresh],
  );

  const toggleBookmark = useCallback(
    async (lessonSlug: string) => {
      const res = await api.toggleBookmark(lessonSlug);
      setState((prev) => (prev ? { ...prev, bookmarks: res.bookmarks } : prev));
    },
    [],
  );

  const toggleProjectTask = useCallback(
    async (projectId: string, taskIndex: number, done: boolean) => {
      const res = await api.toggleProjectTask(projectId, taskIndex, done);
      setState((prev) => (prev ? { ...prev, projectTasks: res.projectTasks } : prev));
    },
    [],
  );

  const saveNote = useCallback<StoreValue['saveNote']>(async (payload) => {
    const res = payload.id
      ? await api.updateNote(payload.id, {
          title: payload.title,
          body: payload.body,
          tags: payload.tags,
          lessonSlug: payload.lessonSlug ?? null,
        })
      : await api.createNote({
          title: payload.title,
          body: payload.body,
          tags: payload.tags,
          lessonSlug: payload.lessonSlug ?? null,
        });
    setNotes(res.notes);
  }, []);

  const deleteNote = useCallback(async (id: number) => {
    const res = await api.deleteNote(id);
    setNotes(res.notes);
  }, []);

  const saveSettings = useCallback<StoreValue['saveSettings']>(async (payload) => {
    const res = await api.saveSettings(payload);
    setState((prev) => (prev ? { ...prev, tutor: res.tutor } : prev));
  }, []);

  const value: StoreValue = {
    ready,
    progress,
    attempts: state?.attempts ?? [],
    notes,
    bookmarks,
    projectTasks: state?.projectTasks ?? [],
    studyDays: state?.studyDays ?? [],
    tutor: state?.tutor ?? { provider: '', baseUrl: '', model: '', hasKey: false },
    error,
    stats,
    wrongQuestions,
    weakLessons,
    refresh,
    setStatus,
    submitAnswer,
    toggleBookmark,
    toggleProjectTask,
    saveNote,
    deleteNote,
    saveSettings,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore 必须在 StoreProvider 内使用');
  return ctx;
}
