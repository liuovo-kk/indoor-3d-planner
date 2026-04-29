// src/components/RightToolbar.tsx
import React from 'react';
import useStore from '../store/useStore';
import { Copy, RotateCw, Trash2, Maximize2, Edit3 } from 'lucide-react'; // 使用你项目中已有的 lucide-react 图标

export default function RightToolbar() {
  const selectedItemId = useStore((state) => state.selectedItemId);
  const removePlacedItem = useStore((state) => state.removePlacedItem);
  const duplicateItem = useStore((state) => state.duplicateItem);
  const rotateItem = useStore((state) => state.rotateItem);

  // 如果没有选中任何家具，就不渲染工具栏
  if (!selectedItemId) return null;

  return (
    // 绝对定位在屏幕右侧居中
    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
      <ToolbarButton
        icon={<Edit3 size={20} />}
        label="编辑"
        onClick={() => console.log('编辑待开发')}
      />
      <ToolbarButton
        icon={<Maximize2 size={20} />}
        label="缩放"
        onClick={() => console.log('缩放待开发')}
      />
      <ToolbarButton
        icon={<Copy size={20} />}
        label="复制"
        onClick={() => duplicateItem(selectedItemId)}
      />
      <ToolbarButton
        icon={<RotateCw size={20} />}
        label="旋转"
        onClick={() => rotateItem(selectedItemId)}
      />
      {/* 删除按钮可以用稍微不一样的颜色，或者保持统一的黑色 */}
      <ToolbarButton
        icon={<Trash2 size={20} />}
        label="删除"
        onClick={() => removePlacedItem(selectedItemId)}
      />
    </div>
  );
}

// 内部复用的小按钮组件
interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ToolbarButton({ icon, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      onClick={(e) => {
        // 🛑 核心细节：阻止事件冒泡！
        // 如果不加这个，点击按钮时会穿透点到地板上，导致选中状态被取消，按钮消失！
        e.stopPropagation();
        onClick();
      }}
      className="w-12 h-12 bg-[#1e1e1e] rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 hover:bg-black transition-all duration-200 group relative"
    >
      {icon}
      {/* 悬浮提示 Tooltip (Hover 时出现在按钮左侧) */}
      <span className="absolute right-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
        {label}
      </span>
    </button>
  );
}
