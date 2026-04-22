import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import useStore from '../store/useStore';
import RoomBase from './RoomBase';
import CameraRig from './CameraRig';
import DraggableFurniture from './DraggableFurniture';
import * as THREE from 'three';

export default function RoomScene() {
  // 从 Store 获取 3D 场景需要的数据和方法
  const placedItems = useStore((state) => state.placedItems);
  // const addPlacedItem = useStore((state) => state.addPlacedItem);
  const viewMode = useStore((state) => state.viewMode);

  const isDragging = useStore((state) => state.isDragging);

  return (
    <Canvas orthographic camera={{ position: [15, 15, 15], zoom: 50 }} shadows>
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

      <RoomBase onFloorClick={() => {}} />

      <Suspense fallback={null}>
        <Environment files="/assets/indoor.hdr" />
        {/* 渲染所有已放置的家具 */}
        {placedItems.map((item) => (
          <DraggableFurniture
            key={item.instanceId}
            instanceId={item.instanceId}
            initialPosition={item.position}
            model_id={item.model_id}
          />
        ))}
      </Suspense>
    </Canvas>
  );
}
