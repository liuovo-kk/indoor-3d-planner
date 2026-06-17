// src/components/RightHeader.tsx
import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Headset,
  ShoppingBasket,
  Save,
  Download,
  User,
  ChevronDown,
  LogOut,
  Map,
} from 'lucide-react';
import useStore from '../store/useStore';

import rooms, { floorOrder } from '../scene/rooms';

export default function RightHeader() {
  const {
    isSidebarOpen,
    toggleSidebar,
    token,
    user,
    setAuthModalOpen,
    logout,
    currentScene,
    setCurrentScene,
    saveCurrentScene,
  } = useStore();

  const collabEnabled = useStore((s) => s.collabEnabled);
  const collabConnected = useStore((s) => s.collabConnected);
  const onlineUsers = useStore((s) => s.onlineUsers);
  const setCollabEnabled = useStore((s) => s.setCollabEnabled);

  const [isSceneMenuOpen, setIsSceneMenuOpen] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>(
    {},
  );

  // 动态获取当前场景的 Label，如果找不到就显示“未命名场景”
  const currentSceneName =
    rooms.find((r) => r.id === currentScene)?.label || '未命名场景';

  // 展开/收起楼层的函数（阻止事件冒泡，防止点击时关闭整个菜单）
  const toggleFloor = (e: React.MouseEvent, floor: string) => {
    e.stopPropagation();
    setExpandedFloors((prev) => ({ ...prev, [floor]: !prev[floor] }));
  };

  // 点击具体房间的函数
  const handleSelectRoom = (roomId: string) => {
    setCurrentScene(roomId);
    setIsSceneMenuOpen(false); // 切换后自动关闭菜单
  };

  const handleSaveAndExport = () => {
    // 鉴权拦截
    if (!token) {
      setAuthModalOpen(true);
      return;
    }
    // 这里使用 getState() 直接获取数据，避免 RightHeader 因为家具位置变化而频繁重渲染
    const placedItems = useStore.getState().placedItems;

    if (placedItems.length === 0) {
      alert('房间里还没有家具哦，请先放置家具再保存！');
      return;
    }

    // 将当前家具快照保存到此场景专属字典里
    saveCurrentScene();

    alert(`【${currentSceneName}】已成功保存！`);
  };

  const handleExportModel = () => {
    const placedItems = useStore.getState().placedItems;
    if (placedItems.length === 0) {
      alert('房间为空，无需导出！');
      return;
    }

    // 触发全局自定义事件，让 3D 画布内部的组件去捕获并执行导出
    document.dispatchEvent(new CustomEvent('export-scene-to-glb'));
  };

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

      <div className="flex items-center gap-2 ml-4">
        <div className="relative flex items-center h-full py-4 ml-2">
          {/* 触发按钮 */}
          <div
            onClick={() => setIsSceneMenuOpen(!isSceneMenuOpen)}
            className={`flex items-center gap-2 text-sm font-bold transition-colors px-4 py-2 rounded-lg border cursor-pointer select-none
              ${isSceneMenuOpen ? 'bg-blue-50 border-blue-200 text-[#0058a3]' : 'bg-gray-50 border-gray-100 text-gray-700 hover:text-[#0058a3]'}`}
          >
            <Map
              size={16}
              className={isSceneMenuOpen ? 'text-[#0058a3]' : 'text-gray-400'}
            />
            {currentSceneName}
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ml-1 ${isSceneMenuOpen ? 'rotate-180 text-[#0058a3]' : 'text-gray-400'}`}
            />
          </div>

          {/* 下拉菜单与隐形遮罩 */}
          {isSceneMenuOpen && (
            <>
              {/* 隐形全屏遮罩：点击菜单外部任意区域即可关闭菜单 */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsSceneMenuOpen(false)}
              />

              {/* 真正的下拉树状菜单 */}
              <div className="absolute top-[85%] left-0 pt-2 w-64 z-50">
                <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 max-h-[60vh] overflow-y-auto flex flex-col custom-scrollbar">
                  <div className="font-bold text-xs mb-3 text-gray-400 uppercase tracking-widest pl-2">
                    House Structure
                  </div>

                  {/* 遍历渲染楼层与房间 */}
                  {floorOrder.map((floor) => {
                    const floorRooms = rooms.filter((r) => r.floor === floor);
                    if (floorRooms.length === 0) return null;

                    const floorLabel = floorRooms[0]?.floorLabel || floor;
                    const isExpanded = expandedFloors[floor] ?? true; // 默认展开
                    const floorHasActive = floorRooms.some(
                      (r) => r.id === currentScene,
                    );

                    return (
                      <div key={floor} className="mb-1">
                        {/* 楼层标题按钮 */}
                        <button
                          onClick={(e) => toggleFloor(e, floor)}
                          className={`flex items-center gap-1.5 w-full text-left py-2 px-2 rounded-lg text-sm font-bold transition-colors hover:bg-gray-50 cursor-pointer ${
                            floorHasActive ? 'text-black' : 'text-gray-400'
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                          {floor} {floorLabel}
                        </button>

                        {/* 楼层下的房间列表 */}
                        {isExpanded && (
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            {floorRooms.map((room) => (
                              <button
                                key={room.id}
                                onClick={() => handleSelectRoom(room.id)}
                                className={`flex items-center gap-2 w-full text-left py-2 pl-8 pr-2 rounded-lg text-sm transition-colors cursor-pointer
                                  ${
                                    room.id === currentScene
                                      ? 'bg-blue-50 text-[#157fe2] font-bold'
                                      : 'hover:bg-gray-50 text-gray-600'
                                  }`}
                              >
                                {room.id === currentScene ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#157fe2] shrink-0" />
                                ) : (
                                  <span className="w-1.5 h-1.5 shrink-0" />
                                )}
                                <span className="truncate">{room.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-5 text-black">
          <div
            className="relative cursor-pointer hover:opacity-70 group"
            onClick={() => setCollabEnabled(!collabEnabled)}
            title={
              collabEnabled
                ? collabConnected
                  ? `已连接，在线 ${onlineUsers} 人`
                  : '连接中...'
                : '点击开启协作'
            }
          >
            <Headset size={22} strokeWidth={2} />
            <span
              className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${collabEnabled ? (collabConnected ? 'bg-green-500' : 'bg-yellow-400') : 'bg-gray-300'}`}
            ></span>
            {collabEnabled && collabConnected && onlineUsers > 0 && (
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-green-600 whitespace-nowrap">
                {onlineUsers}
              </span>
            )}
          </div>
          <ShoppingBasket
            size={22}
            strokeWidth={2}
            className="cursor-pointer hover:opacity-70"
          />
          <Save
            size={22}
            strokeWidth={2}
            className="cursor-pointer hover:opacity-70 text-black hover:text-blue-600 transition-colors"
            onClick={handleSaveAndExport}
            // title="保存当前场景"
          />
          <Download
            size={22}
            strokeWidth={2}
            className="cursor-pointer hover:opacity-70 text-black hover:text-blue-600 transition-colors"
            onClick={handleExportModel}
            // title="导出为 3D 模型文件 (GLB)"
          />
        </div>

        {/* 🌟 登录与头像区域 */}
        <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
          {token && user ? (
            // 已登录状态：悬浮下拉框设计
            <div className="relative group flex items-center cursor-pointer h-full py-4">
              {/* 触发区域：你好，用户名 + 箭头 */}
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800 hover:text-[#0058a3] transition-colors">
                你好，{user.username}
                {/* 鼠标悬浮时，箭头会丝滑地旋转 180 度 */}
                <ChevronDown
                  size={14}
                  className="text-gray-400 group-hover:rotate-180 transition-transform duration-200"
                />
              </div>

              {/* 悬浮菜单占位层 (包含 top 的间距 pt-2，防止鼠标移出触发区域时菜单消失) */}
              <div className="absolute top-full right-0 pt-2 w-36 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                {/* 真正的菜单白底容器 */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-3 text-sm text-gray-600 hover:text-[#157fe2] flex items-center gap-2 font-bold transition-colors"
                  >
                    <LogOut size={16} />
                    退出登录
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // 未登录状态：显示登录按钮
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 bg-[#d1e9ff] text-black border border-gray-200 rounded-full px-5 py-2 font-bold cursor-pointer transition-colors hover:bg-[#95bee6] text-sm"
            >
              <User size={16} /> Login
            </button>
          )}

          {/* 价格与按钮 */}
          {/* <button className="flex items-center gap-2 bg-[#6c6c6c] text-white border-none rounded-full px-6 py-2.5 font-bold cursor-pointer transition-colors hover:bg-[#0058a3] whitespace-nowrap text-base">
            结算
            <ArrowRight size={18} strokeWidth={2.5} />
          </button> */}
        </div>
      </div>
    </header>
  );
}
