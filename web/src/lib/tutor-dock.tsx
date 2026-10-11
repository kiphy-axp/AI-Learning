import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import type { TutorContext } from '../components/TutorPanel';
import { findLesson } from './content';

type DockValue = {
  open: boolean;
  setOpen: (value: boolean) => void;
  toggle: () => void;
  /** 当前页面自动带上的知识点上下文 */
  context: TutorContext;
  /** 用于隔离不同知识点的对话历史 */
  contextKey: string;
  contextLabel: string;
};

const DockContext = createContext<DockValue | null>(null);
const OPEN_KEY = 'tutor-dock-open';

/** 从路由推导导师上下文：讲义页与练习页自动带上该知识点 */
function deriveContext(pathname: string): Pick<DockValue, 'context' | 'contextKey' | 'contextLabel'> {
  const match = /^\/(?:learn|practice)\/([^/]+)\/([^/]+)/.exec(pathname);
  const ref = match ? findLesson(match[1], match[2]) : undefined;
  if (!ref) {
    return {
      context: null,
      contextKey: 'tutor-free',
      contextLabel: '自由提问（未指定知识点）',
    };
  }
  const { stage, lesson } = ref;
  return {
    context: {
      title: lesson.title,
      stageTitle: stage.stageTitle,
      summary: lesson.summary,
      intuition: lesson.intuition,
      formal: lesson.formal,
      formula: lesson.formula,
      code: lesson.codeExample?.code,
      mistakes: lesson.mistakes,
    },
    contextKey: `tutor-${stage.stageSlug}/${lesson.slug}`,
    contextLabel: `${stage.stageEmoji} ${lesson.title}`,
  };
}

export function TutorDockProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [open, setOpenState] = useState(() => {
    try {
      return window.localStorage.getItem(OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value);
    try {
      window.localStorage.setItem(OPEN_KEY, value ? '1' : '0');
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
  }, []);

  const derived = useMemo(() => deriveContext(location.pathname), [location.pathname]);

  const value: DockValue = {
    open,
    setOpen,
    toggle: () => setOpen(!open),
    ...derived,
  };

  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

export function useTutorDock(): DockValue {
  const ctx = useContext(DockContext);
  if (!ctx) throw new Error('useTutorDock 必须在 TutorDockProvider 内使用');
  return ctx;
}
