import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { GLTFExporter } from 'three-stdlib';
import useStore from '../store/useStore';
import RoomBox from './RoomBox';
import CameraRig from './CameraRig';
import DraggableFurniture from './DraggableFurniture';
import * as THREE from 'three';
import RightToolbar from '../components/RightToolbar';
import { useCollabSync } from '../hooks/useCollabSync';
import rooms, { DEFAULT_ROOM } from './rooms';

const log = (msg: string, data?: unknown) =>
  console.log(
    `[RoomScene] ${msg}`,
    data ?? '',
    `+${Date.now() - performance.now()}ms`,
  );

export default function RoomScene() {
  useCollabSync();
  // 从 Store 获取 3D 场景需要的数据和方法
  const placedItems = useStore((state) => state.placedItems);
  const currentScene = useStore((state) => state.currentScene);
  const viewMode = useStore((state) => state.viewMode);

  const isDragging = useStore((state) => state.isDragging);

  //  获取删除和取消选中的方法
  const selectedItemId = useStore((state) => state.selectedItemId);
  const removePlacedItem = useStore((state) => state.removePlacedItem);
  const setSelectedItemId = useStore((state) => state.setSelectedItemId);

  useEffect(() => {
    log(`currentScene changed to "${currentScene}"`);
  }, [currentScene]);

  //  监听全局键盘 Delete 和 Backspace 键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['input', 'textarea'].includes(target.tagName.toLowerCase())) {
        return;
      }

      // 如果按了删除键/退格键，并且有选中的家具，就删除
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId) {
        removePlacedItem(selectedItemId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, removePlacedItem]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Canvas
        orthographic
        camera={{ position: [15, 15, 15], zoom: 50 }}
        shadows
      >
        <CameraRig />

        <SceneExporter />

        {/* <DebugObstacles /> */}

        {/* ==================== 🌟 绝对保底层 (永远秒出，绝不黑屏) ==================== */}
        {/* 把背景色、雾效、灯光、地板、控制器全部移出 Suspense！ */}
        <color attach="background" args={['#efefef']} />
        <fog attach="fog" args={['#ececec', 20, 60]} />

        <ambientLight intensity={0.4} />
        <hemisphereLight args={['#ffffff', '#888888', 1]} />
        <directionalLight
          position={[12, 15, 8]}
          intensity={1.5}
          color="#ffffff"
          castShadow={viewMode !== 'top'}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
        />
        <pointLight
          position={[0, 4, 0]}
          intensity={1.5}
          color="#fff4e6"
          distance={15}
          decay={2}
        />

        <OrbitControls
          makeDefault
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
          maxPolarAngle={Math.PI / 2 + 0.1}
          minDistance={3}
          maxDistance={24}
          enabled={!isDragging}
        />

        {/* 主场景（默认房间 + 环境 + 家具）同一个 Suspense */}
        <Suspense fallback={null}>
          {rooms
            .filter((r) => r.id === DEFAULT_ROOM)
            .map((room) => (
              <RoomBox
                key={room.id}
                glbUrl={`/models/${room.glbFile}`}
                visible={currentScene === room.id}
                onFloorClick={() => setSelectedItemId(null)}
              />
            ))}
          <Environment files="/assets/indoor.hdr" />
          {placedItems.map((item) => (
            <DraggableFurniture
              key={item.instanceId}
              instanceId={item.instanceId}
              initialPosition={item.position}
              model_id={item.model_id}
              rotation={item.rotation}
            />
          ))}
        </Suspense>

        {/* ==================== 渲染其他独立场景 ==================== */}
        {rooms.filter((r) => r.id !== DEFAULT_ROOM).map((room) => (
          <Suspense key={room.id} fallback={null}>
            <RoomBox
              glbUrl={`/models/${room.glbFile}`}
              visible={currentScene === room.id}
              onFloorClick={() => setSelectedItemId(null)}
              // 💡 同样去掉了 roomRotation 补丁
            />
          </Suspense>
        ))}
      </Canvas>
      <RightToolbar />
      {/* <Minimap /> */}
    </div>
  );
}

// 调试的红色线框组件
function DebugObstacles() {
  const staticObstacles = useStore((state) => state.staticObstacles);

  return (
    <group>
      {staticObstacles.map((obs, index) => (
        // 因为我们只存了 X 和 Z，Y 轴暂时悬空放在 1 米的高度，高度设为 2 米
        <mesh key={index} position={[obs.x, 1, obs.z]}>
          <boxGeometry args={[obs.w, 2, obs.d]} />
          {/* wireframe: true 会让它变成透明红框，方便你看清里面的模型 */}
          <meshBasicMaterial wireframe color="red" />
        </mesh>
      ))}
    </group>
  );
}

// 🌟 核心引擎：监听事件并导出 GLB 的隐形组件
function SceneExporter() {
  const { scene } = useThree(); // 获取当前 3D 场景的所有数据

  useEffect(() => {
    const handleExport = () => {
      // 显示提示，防止导出大场景时卡顿让用户以为死机
      console.log('正在打包 3D 场景，请稍候...');

      const exporter = new GLTFExporter();

      // parse 方法会把 scene 里的所有网格、材质、贴图全部抓取出来
      exporter.parse(
        scene,
        (result) => {
          // 因为配置了 binary: true，这里的 result 是一个二进制流 (ArrayBuffer)
          const blob = new Blob([result as ArrayBuffer], {
            type: 'application/octet-stream',
          });
          const url = URL.createObjectURL(blob);

          // 创建一个隐藏的 a 标签模拟点击下载
          const link = document.createElement('a');
          link.style.display = 'none';
          link.href = url;
          link.download = `my_room_design_${Date.now()}.glb`; // 自动生成带时间戳的文件名

          document.body.appendChild(link);
          link.click(); // 触发浏览器下载

          document.body.removeChild(link);
          URL.revokeObjectURL(url); // 释放内存
          console.log('导出成功！');
        },
        (error) => {
          console.error('导出 GLB 失败:', error);
          alert('导出失败，请检查控制台报错');
        },
        { binary: true }, // 🌟 必须为 true：打包为单文件 .glb (包含图片)，而不是分离的 .gltf
      );
    };

    // 监听 Header 发来的导出指令
    document.addEventListener('export-scene-to-glb', handleExport);
    return () =>
      document.removeEventListener('export-scene-to-glb', handleExport);
  }, [scene]);

  return null; // 这个组件在画面上什么都不渲染
}
