// src/components/Toolbar.tsx
import React from 'react';
import {
  Plus,
  Minus,
  Box,
  PanelsTopLeft,
  FolderKanban,
  ChevronDown,
  Footprints,
} from 'lucide-react';
import useStore from '../store/useStore';
import { useState } from 'react';

// 🌟 1. 依然保留我们优秀的组件化思维，但样式全换成了 Tailwind 类名！
interface ToolBtnProps {
  icon: React.ReactNode;
  text: React.ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}

function ToolbarButton({
  icon,
  text,
  isActive,
  isDisabled,
  onClick,
}: ToolBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-colors
        ${isActive ? 'bg-[#e5e5e5] text-black' : 'bg-transparent text-black hover:bg-gray-100'}
        ${isDisabled ? 'text-gray-400 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer'}
      `}
    >
      {icon}
      {text}
    </button>
  );
}

export default function Toolbar() {
  const [showSideMenu, setShowSideMenu] = useState(false);
  const { viewMode, setViewMode } = useStore();
  const sideOptions = [
    { label: 'front', mode: 'front' },
    { label: 'left', mode: 'left' },
    { label: 'back', mode: 'back' },
    { label: 'right', mode: 'right' },
  ];
  return (
    <>
      {/* 🌟 2. 右侧缩放控制：绝对定位、背景白、圆角、阴影，一行 class 搞定！ */}
      <div className="absolute top-6 right-6 bg-white rounded-3xl flex flex-col shadow-sm overflow-hidden z-10">
        <button className="p-3 border-b border-gray-100 hover:bg-gray-50 flex justify-center items-center">
          <Plus size={20} color="#111" strokeWidth={2.5} />
        </button>
        <button className="p-3 hover:bg-gray-50 flex justify-center items-center">
          <Minus size={20} color="#111" strokeWidth={2.5} />
        </button>
      </div>

      {/* 底部悬浮操作栏 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        {/* 弹出菜单 */}
        {showSideMenu && (
          <div className="bg-white rounded-2xl shadow-xl p-2 flex gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2 translate-x-14">
            {sideOptions.map((opt) => (
              <button
                key={opt.mode}
                onClick={() => {
                  setViewMode(opt.mode as any);
                  setShowSideMenu(false);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  viewMode === opt.mode ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        {/* 主工具栏 */}
        <div className="bg-white rounded-full flex items-center px-6 py-2 shadow-md gap-6 z-10">
          <ToolbarButton
            icon={<Box size={18} strokeWidth={2.5} />}
            text="Dollhouse"
            isActive={viewMode === 'dollhouse'}
            onClick={() => setViewMode('dollhouse')}
          />
          <ToolbarButton
            icon={<PanelsTopLeft size={18} strokeWidth={2.5} />}
            text="Top view"
            isActive={viewMode === 'top'}
            onClick={() => setViewMode('top')}
          />

          <ToolbarButton
            icon={<FolderKanban size={18} strokeWidth={2.5} />}
            text={
              <span className="flex items-center gap-1">
                Side views
                <ChevronDown
                  size={18}
                  strokeWidth={2.5}
                  className="opacity-60"
                />
              </span>
            }
            isActive={['front', 'back', 'left', 'right'].includes(viewMode)}
            onClick={() => setShowSideMenu(!showSideMenu)}
          />

          {/* 分割线 */}
          <div className="w-[1px] h-5 bg-gray-200 mx-2"></div>

          <ToolbarButton
            icon={<Footprints size={18} color="#ccc" strokeWidth={2.5} />}
            text="Move to"
            isDisabled={true}
          />
        </div>
      </div>
    </>
  );
}
