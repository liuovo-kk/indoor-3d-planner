// src/App.tsx
import Sidebar from './components/sidebar/Sidebar';
import RightHeader from './components/RightHeader';
import Toolbar from './components/Toolbar';
import RoomScene from './scene/RoomScene';
import AuthModal from './components/AuthModal';

export default function App() {
  return (
    <div className="flex w-screen h-screen overflow-hidden font-sans text-[#111] bg-white">
      <Sidebar />

      {/* 去掉了这里的 overflow-hidden（防止按钮被切），并加上 z-30（确保整体层级碾压左侧的 z-20） 加上 min-w-0！打破 Flexbox 的默认最小宽度限制，允许它被侧边栏挤压缩小  */}
      <div className="flex-1 flex flex-col relative bg-[#e5e5e5] z-30 min-w-0">
        <RightHeader />

        {/* 🌟 修复 2：把 overflow-hidden 转移到了这里，确保 3D 场景不会溢出屏幕 */}
        <main className="flex-1 relative overflow-hidden">
          <RoomScene />
          <Toolbar />
        </main>
      </div>
      <AuthModal />
    </div>
  );
}
