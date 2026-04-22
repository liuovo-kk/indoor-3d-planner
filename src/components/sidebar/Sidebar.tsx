// src/components/sidebar/Sidebar.tsx
import React, { useState } from 'react';
import useStore from '../../store/useStore';
import { PlusCircle, Wand2, Heart } from 'lucide-react';

import AddPanel from './AddPanel';
import AILayoutPanel from './AILayoutPanel';
import FavoritesPanel from './FavoritesPanel';

interface NavItemProps {
  icon: React.ReactNode;
  text: string;
  isActive?: boolean;
  onClick: () => void; //接收点击事件
}

function NavItem({ icon, text, isActive, onClick }: NavItemProps) {
  return (
    <div
      onClick={onClick} // 触发外层传入的切换事件
      className={`
      flex-1 flex justify-center items-center gap-2 h-full cursor-pointer font-bold transition-all whitespace-nowrap text-base
      ${isActive ? 'border-b-[3px] border-black text-black' : 'text-[#767676] hover:text-black hover:bg-gray-50'}
    `}
    >
      {icon} {text}
    </div>
  );
}

export default function Sidebar() {
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  // 管理当前激活的 Tab 状态
  const [activeTab, setActiveTab] = useState<'add' | 'ai' | 'favorites'>('add');

  return (
    <aside
      className={`
      shrink-0 bg-white border-gray-200 transition-all duration-300 ease-in-out flex flex-col z-20 overflow-hidden
      ${isSidebarOpen ? 'w-125 border-r' : 'w-0 border-none'}
    `}
    >
      <div className="w-125 flex flex-col h-full">
        {/* ================= 头部导航 ================= */}
        <div className="h-17.5 flex items-center px-2 border-b border-gray-200 shrink-0">
          <NavItem
            icon={<PlusCircle size={20} strokeWidth={2.5} />}
            text="Add"
            isActive={activeTab === 'add'}
            onClick={() => setActiveTab('add')}
          />
          <NavItem
            icon={<Wand2 size={20} strokeWidth={2.5} />}
            text="AI Layout"
            isActive={activeTab === 'ai'}
            onClick={() => setActiveTab('ai')}
          />
          <NavItem
            icon={<Heart size={20} strokeWidth={2.5} />}
            text="Favorites"
            isActive={activeTab === 'favorites'}
            onClick={() => setActiveTab('favorites')}
          />
        </div>

        {/* ================= 内容路由面板 ================= */}
        {/* 根据 activeTab 的值，挂载对应的组件 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'add' && <AddPanel />}
          {activeTab === 'ai' && <AILayoutPanel />}
          {activeTab === 'favorites' && <FavoritesPanel />}
        </div>
      </div>
    </aside>
  );
}
