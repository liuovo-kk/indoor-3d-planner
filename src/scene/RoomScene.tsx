import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import useStore from '../store/useStore';
import RoomBase from './RoomBase';
import CameraRig from './CameraRig';
import DraggableFurniture from './DraggableFurniture';
import * as THREE from 'three';
import RightToolbar from '../components/RightToolbar';

export default function RoomScene() {
  // 从 Store 获取 3D 场景需要的数据和方法
  const placedItems = useStore((state) => state.placedItems);
  // const addPlacedItem = useStore((state) => state.addPlacedItem);
  const viewMode = useStore((state) => state.viewMode);

  const isDragging = useStore((state) => state.isDragging);

  //  获取删除和取消选中的方法
  const selectedItemId = useStore((state) => state.selectedItemId);
  const removePlacedItem = useStore((state) => state.removePlacedItem);
  const setSelectedItemId = useStore((state) => state.setSelectedItemId);

  //  监听全局键盘 Delete 和 Backspace 键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避坑：如果用户正在输入框里打字，绝对不要触发家具删除！
      const target = e.target as HTMLElement;
      if (['input', 'textarea'].includes(target.tagName.toLowerCase())) {
        return;
      }

      // 如果按了删除键/退格键，并且有选中的家具，就干掉它
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

        {/*  点击空白地板时，取消选中状态 */}
        <RoomBase
          onFloorClick={() => {
            setSelectedItemId(null);
          }}
        />

        <Suspense fallback={null}>
          <Environment files="/assets/indoor.hdr" />
          {/* 渲染所有已放置的家具 */}
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
      </Canvas>
      <RightToolbar />
    </div>
  );
}
