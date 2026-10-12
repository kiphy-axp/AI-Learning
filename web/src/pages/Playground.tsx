import { PlaygroundPanel } from '../components/PlaygroundPanel';
import { PageHeader } from '../components/ui';

export function Playground() {
  return (
    <>
      <PageHeader
        eyebrow="代码试验场"
        title="随便写点什么，跑起来看看"
        description="不绑题目的自由编辑器：代码在你本机执行，支持 Python 3 与 Bash，⌘/Ctrl + Enter 运行。代码按语言分别存在浏览器本地，刷新不丢。"
      />
      <div className="card flex h-[76vh] flex-col overflow-hidden !p-0">
        <PlaygroundPanel expanded />
      </div>
    </>
  );
}
