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

  const collabEnabled = useStore((s) => s.collabEnabled);
  const collabConnected = useStore((s) => s.collabConnected);
  const onlineUsers = useStore((s) => s.onlineUsers);
  const setCollabEnabled = useStore((s) => s.setCollabEnabled);

  const handleExportVR = () => {
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

        {/* 价格与按钮 */}
        <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
          {/* <span className="font-bold text-lg">$79.99</span> */}
          <button className="flex items-center gap-2 bg-[#6c6c6c] text-white border-none rounded-full px-6 py-2.5 font-bold cursor-pointer transition-colors hover:bg-[#0058a3] whitespace-nowrap text-base">
            结算
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
