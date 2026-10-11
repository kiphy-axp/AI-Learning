import { NotesPanel } from '../components/NotesPanel';
import { PageHeader } from '../components/ui';

export function Notes() {
  return (
    <>
      <PageHeader
        eyebrow="学习笔记"
        title="把想通的东西写下来"
        description="笔记保存在本地数据库，支持 Markdown 与 LaTeX 公式。也可以随时点右缘的「学习笔记」标签在侧栏里边看边记，不用离开当前页面。"
      />
      <div className="card flex h-[72vh] flex-col overflow-hidden !p-0">
        <NotesPanel />
      </div>
    </>
  );
}
