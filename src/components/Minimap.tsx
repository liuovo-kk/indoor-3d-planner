// src/components/Minimap.tsx
import { Canvas } from '@react-three/fiber';
import useStore from '../store/useStore';
import * as THREE from 'three';

export default function Minimap() {
  const placedItems = useStore((state) => state.placedItems);
  const selectedItemId = useStore((state) => state.selectedItemId);

  // 假设房间大小为 20x20
  const roomSize = 20;

  return (
    <div className="absolute bottom-6 right-6 w-64 h-64 bg-white/95 border border-gray-200 shadow-2xl rounded-xl overflow-hidden z-40 pointer-events-none transition-all duration-300">
      {/* 标题栏 */}
      <div className="absolute top-0 left-0 w-full bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 z-10 border-b border-gray-200">
        2D 俯视图
      </div>

      <Canvas
        orthographic
        // 强制相机从 Y=50 的高空往下看，旋转 -90 度正好俯视地面
        camera={{
          position: [0, 50, 0],
          zoom: 12,
          rotation: [-Math.PI / 2, 0, 0],
        }}
      >
        <ambientLight intensity={1} />

        {/* 绘制房间的网格地板轮廓 */}
        <gridHelper args={[roomSize, roomSize, '#cbd5e1', '#f1f5f9']} />

        {/* 遍历渲染简化的 2D 家具方块 */}
        {placedItems.map((item) => {
          // 如果没有 size，给个默认大小 1x1x1
          const width = item.size ? item.size[0] : 1;
          const depth = item.size ? item.size[2] : 1;
          const isSelected = item.instanceId === selectedItemId;

          return (
            <mesh
              key={item.instanceId}
              position={[item.position[0], 0.5, item.position[2]]}
              rotation={item.rotation || [0, 0, 0]}
            >
              <boxGeometry args={[width, 1, depth]} />
              {/* 选中时显示蓝色，未选中显示深灰色 */}
              <meshBasicMaterial color={isSelected ? '#3b82f6' : '#64748b'} />

              {/* 选中的家具加一个明显的黑色边框 */}
              {isSelected && (
                <lineSegments>
                  <edgesGeometry
                    args={[new THREE.BoxGeometry(width, 1, depth)]}
                  />
                  <lineBasicMaterial color="black" linewidth={2} />
                </lineSegments>
              )}
            </mesh>
          );
        })}
      </Canvas>
    </div>
  );
}
