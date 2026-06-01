// src/components/RightHeader.tsx
import {
  ChevronLeft,
  ChevronRight,
  Headset,
  Camera,
  Save,
  ShoppingBasket,
  ArrowRight,
  User,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import useStore from '../store/useStore';

export default function RightHeader() {
  const {
    isSidebarOpen,
    toggleSidebar,
    token,
    user,
    setAuthModalOpen,
    logout,
  } = useStore();

  const collabEnabled = useStore((s) => s.collabEnabled);
  const collabConnected = useStore((s) => s.collabConnected);
  const onlineUsers = useStore((s) => s.onlineUsers);
  const setCollabEnabled = useStore((s) => s.setCollabEnabled);

  const handleExportVR = () => {
    // 鉴权拦截：如果没有登录，直接弹登录框并终止保存流程
    if (!token) {
      setAuthModalOpen(true);
      return;
    }
    // 这里使用 getState() 直接获取数据，避免 RightHeader 因为家具位置变化而频繁重渲染
    const placedItems = useStore.getState().placedItems;

    if (placedItems.length === 0) {
      alert('房间里还没有家具哦，请先放置家具再导出！');
      return;
    }

    const syncData = {
      scene_id: `room_${Date.now()}`,
      timestamp: Date.now(),
      items: placedItems.map((item) => {
        const currentRotY = item.rotation ? item.rotation[1] : 0;

        return {
          instance_id: item.instanceId,
          model_id: item.model_id,
          // 核心：Z 轴取反 (适配 Unity 左手坐标系)
          position: {
            x: Number(item.position[0].toFixed(3)),
            y: Number(item.position[1].toFixed(3)),
            z: Number((-item.position[2]).toFixed(3)),
          },
          // 核心：弧度转角度，Y 轴取反
          rotation: {
            x: 0,
            y: Number((-currentRotY * (180 / Math.PI)).toFixed(3)),
            z: 0,
          },
          scale: { x: 1, y: 1, z: 1 },
        };
      }),
    };

    // 将 JSON 对象变成文件下载到本地
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(syncData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'vr_scene_sync.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    console.log('VR 同步数据已导出:', syncData);
    alert('VR 场景数据已导出！请将下载的 JSON 文件发给 Unity 端进行测试。');
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

      {/* 标题 */}
      <div className="font-bold text-base flex items-center gap-2 cursor-pointer ml-4">
        我的房间
      </div>

      {/* 右侧：四大金刚图标 + 价格 + 结算按钮 */}
      <div className="flex items-center gap-6">
        {/* 一排图标组合 */}
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
            className="cursor-pointer hover:opacity-70 text-black hover:text-blue-600 transition-colors"
            onClick={handleExportVR}
            // title="保存并导出 VR 场景 (JSON)"
          />
          <ShoppingBasket
            size={22}
            strokeWidth={2}
            className="cursor-pointer hover:opacity-70"
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
