import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTutorDock, TutorDockProvider } from './lib/tutor-dock';
import { Sidebar } from './components/Sidebar';
import { TutorDock } from './components/TutorDock';
import { Dashboard } from './pages/Dashboard';
import { Interview } from './pages/Interview';
import { LessonPage } from './pages/LessonPage';
import { Notes } from './pages/Notes';
import { Practice } from './pages/Practice';
import { PracticePage } from './pages/PracticePage';
import { Projects } from './pages/Projects';
import { Roadmap } from './pages/Roadmap';
import { Settings } from './pages/Settings';
import { Tutor } from './pages/Tutor';
import { WrongBook } from './pages/WrongBook';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('页面渲染出错', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl p-10">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-100">页面出错了</h2>
            <p className="mt-2 text-sm text-slate-400">{String(this.state.error.message)}</p>
            <button type="button" className="btn-ghost mt-4" onClick={() => this.setState({ error: null })}>
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <TutorDockProvider>
      <Shell />
    </TutorDockProvider>
  );
}

function Shell() {
  const { open } = useTutorDock();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* 抽屉展开时给内容区让出宽度，避免被盖住 */}
      <main className={`min-w-0 flex-1 transition-[padding] duration-300 ${open ? 'lg:pr-[392px]' : ''}`}>
        <div className="mx-auto max-w-[1180px] px-6 py-8 lg:px-10">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/roadmap" element={<Roadmap />} />
              {/* 知识点清单与课程列表已合并进学习路线，保留旧路径重定向 */}
              <Route path="/checklist" element={<Navigate to="/roadmap" replace />} />
              <Route path="/learn" element={<Navigate to="/roadmap" replace />} />
              <Route path="/learn/:stageSlug/:lessonSlug" element={<LessonPage />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/practice/:stageSlug/:lessonSlug" element={<PracticePage />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/tutor" element={<Tutor />} />
              <Route path="/interview" element={<Interview />} />
              <Route path="/wrong" element={<WrongBook />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </main>
      <TutorDock />
    </div>
  );
}
