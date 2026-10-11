import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import type { TutorContext } from '../components/TutorPanel';
import { findLesson } from './content';

export type DockTab = 'tutor' | 'notes';

type DockValue = {
  open: boolean;
  tab: DockTab;
  setOpen: (value: boolean) => void;
  /** 打开抽屉并切到指定面板 */
  openTab: (tab: DockTab) => void;
  close: () => void;
  /** 当前页面自动带上的知识点上下文（供 AI 导师使用） */
  context: TutorContext;
  contextKey: string;
  contextLabel: string;
};

const DockContext = createContext<DockValue | null>(null);
const OPEN_KEY = 'side-dock-open';
const TAB_KEY = 'side-dock-tab';

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

function readStored<T extends string>(key: string, fallback: T, allowed: T[]): T {
  try {
    const value = window.localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function SideDockProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [open, setOpenState] = useState(() => {
    try {
      return window.localStorage.getItem(OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [tab, setTabState] = useState<DockTab>(() => readStored<DockTab>(TAB_KEY, 'tutor', ['tutor', 'notes']));

  const persist = useCallback((key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
  }, []);

  const setOpen = useCallback(
    (value: boolean) => {
      setOpenState(value);
      persist(OPEN_KEY, value ? '1' : '0');
    },
    [persist],
  );

  const openTab = useCallback(
    (next: DockTab) => {
      setTabState(next);
      persist(TAB_KEY, next);
      setOpen(true);
    },
    [persist, setOpen],
  );

  const derived = useMemo(() => deriveContext(location.pathname), [location.pathname]);

  /** 支持 ?dock=tutor / ?dock=notes 直接展开对应面板，?dock=0 收起 */
  const dockParam = new URLSearchParams(location.search).get('dock');
  useEffect(() => {
    if (dockParam === 'tutor' || dockParam === 'notes') {
      setTabState(dockParam);
      persist(TAB_KEY, dockParam);
      setOpenState(true);
      persist(OPEN_KEY, '1');
    } else if (dockParam === '0') {
      setOpenState(false);
      persist(OPEN_KEY, '0');
    }
  }, [dockParam, persist]);

  const value: DockValue = {
    open,
    tab,
    setOpen,
    openTab,
    close: () => setOpen(false),
    ...derived,
  };

  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

export function useSideDock(): DockValue {
  const ctx = useContext(DockContext);
  if (!ctx) throw new Error('useSideDock 必须在 SideDockProvider 内使用');
  return ctx;
}
