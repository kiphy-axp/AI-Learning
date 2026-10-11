export type QuizChoice = {
  id: string;
  type: 'choice';
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
};

export type QuizShort = {
  id: string;
  type: 'short';
  prompt: string;
  answer: string;
  keywords: string[];
  explanation?: string;
};

export type QuizCode = {
  id: string;
  type: 'code';
  prompt: string;
  starterCode: string;
  solution: string;
  checks: string[];
};

export type QuizQuestion = QuizChoice | QuizShort | QuizCode;

export type CodeExample = {
  lang?: string;
  filename?: string;
  code: string;
};

export type Resource = { title: string; url: string };

export type Lesson = {
  slug: string;
  title: string;
  order: number;
  module: string;
  difficulty: string;
  estimatedMinutes: number;
  summary: string;
  intuition: string;
  formal: string;
  formula: string;
  aiConnection: string;
  codeExample: CodeExample;
  mistakes: string[];
  interviewPoints: string[];
  resources: Resource[];
  quiz: QuizQuestion[];
};

export type Stage = {
  stage: number;
  stageSlug: string;
  stageTitle: string;
  stageEmoji: string;
  stageDesc: string;
  category: string;
  lessons: Lesson[];
};

export type LessonRef = { stage: Stage; lesson: Lesson };

export type ProgressRow = {
  lesson_slug: string;
  stage_slug: string;
  status: string;
  attempts: number;
  correct_count: number;
  question_count: number;
  best_score: number;
  seconds_spent: number;
  visited_at: string | null;
  updated_at: string;
};

export type AttemptRow = {
  id: number;
  lesson_slug: string;
  question_id: string;
  question_type: string;
  correct: number;
  answer: string | null;
  answered_at: string;
};

export type Note = {
  id: number;
  title: string;
  body: string;
  lesson_slug: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type ProjectTask = { project_id: string; task_index: number; done: number; updated_at: string };

export type StudyDay = { day: string; seconds: number; updated_at: string };

export type TutorConfig = {
  provider: string;
  baseUrl: string;
  model: string;
  hasKey: boolean;
  source?: 'database' | 'env' | 'none';
};

export type AppState = {
  progress: ProgressRow[];
  attempts: AttemptRow[];
  studyDays: StudyDay[];
  notesCount: number;
  projectTasks: ProjectTask[];
  bookmarks: string[];
  tutor: TutorConfig;
};
