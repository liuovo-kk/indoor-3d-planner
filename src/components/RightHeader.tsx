// src/components/RightHeader.tsx
import {
  ChevronLeft,
  ChevronRight,
  Headset,
  Camera,
  Save,
  ShoppingBasket,
  ArrowRight,
} from 'lucide-react';
import useStore from '../store/useStore';

export default function RightHeader() {
  const { isSidebarOpen, toggleSidebar } = useStore();

  return (
    <header
      className={`h-16 bg-white border-b border-gray-100 flex items-center justify-between shrink-0 z-30 relative transition-all duration-300 ${isSidebarOpen ? 'px-6' : 'pr-6 pl-14'}`}
    >
      <button
        onClick={toggleSidebar}
        className={`absolute top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 z-30 cursor-pointer transition-all duration-300 ${isSidebarOpen ? '-left-5' : 'left-5'}`}
        title="Auto hide"
      >
        {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>

      {/* 标题 */}
      <div className="font-bold text-base flex items-center gap-2 cursor-pointer ml-4">
        Untitled Design
      </div>

      {/* 右侧：四大金刚图标 + 价格 + 结算按钮 */}
      <div className="flex items-center gap-6">
        {/* 一排图标组合 */}
        <div className="flex items-center gap-5 text-black">
          <div className="relative cursor-pointer hover:opacity-70">
            <Headset size={22} strokeWidth={2} />
            <span className="absolute 0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
          </div>
          <Camera
            size={22}
            strokeWidth={2}
            className="cursor-pointer hover:opacity-70"
          />
          <Save
            size={22}
            strokeWidth={2}
            className="cursor-pointer hover:opacity-70"
          />
          <ShoppingBasket
            size={22}
            strokeWidth={2}
            className="cursor-pointer hover:opacity-70"
          />
        </div>

        {/* 价格与按钮 */}
        <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
          {/* <span className="font-bold text-lg">$79.99</span> */}
          <button className="flex items-center gap-2 bg-[#0058a3] text-white border-none rounded-full px-6 py-2.5 font-bold cursor-pointer transition-colors hover:bg-blue-700 whitespace-nowrap text-base">
            Summary
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
