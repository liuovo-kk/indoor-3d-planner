// src/scene/EmptyRoomCanvas.tsx
import { useEffect } from 'react';
import useStore from '../store/useStore';

export default function EmptyRoomCanvas() {
  const setRoomSize = useStore((s) => s.setRoomSize);
  const roomWidth = useStore((s) => s.roomWidth) || 6;
  const roomDepth = useStore((s) => s.roomDepth) || 6;
  const roomHeight = useStore((s) => s.roomHeight) || 2.8;
  const setSelectedItemId = useStore((s) => s.setSelectedItemId);

  // 初始化默认尺寸 (长6m, 宽6m, 高2.8m)
  useEffect(() => {
    setRoomSize(6, 6, 2.8);
  }, [setRoomSize]);

  // 材质颜色配置
  const floorColor = '#d6c7b5'; // 温馨的原木/米色地板
  const wallColor = '#D6C2A4'; // 干净的乳胶漆白墙
  const baseboardColor = '#F4EADC'; // 踢脚线颜色

  return (
    <group>
      {/* 1. 物理地板 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          setSelectedItemId(null);
        }}
      >
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial color={floorColor} roughness={0.8} />
      </mesh>

      {/* ================= 3. 智能隐形墙壁 ================= */}
      {/* 后墙 (北) */}
      <mesh position={[0, roomHeight / 2, -roomDepth / 2]} receiveShadow>
        <planeGeometry args={[roomWidth, roomHeight]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>

      {/* 前墙 (南) - 旋转180度朝向房内 */}
      <mesh
        position={[0, roomHeight / 2, roomDepth / 2]}
        rotation={[0, Math.PI, 0]}
        receiveShadow
      >
        <planeGeometry args={[roomWidth, roomHeight]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>

      {/* 左墙 (西) - 旋转90度朝向房内 */}
      <mesh
        position={[-roomWidth / 2, roomHeight / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[roomDepth, roomHeight]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>

      {/* 右墙 (东) - 旋转-90度朝向房内 */}
      <mesh
        position={[roomWidth / 2, roomHeight / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[roomDepth, roomHeight]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>

      {/* ================= 4. 灵魂细节：踢脚线 ================= */}
      <group>
        {/* 后踢脚线 */}
        <mesh position={[0, 0.05, -roomDepth / 2 + 0.01]}>
          <boxGeometry args={[roomWidth, 0.1, 0.02]} />
          <meshStandardMaterial color={baseboardColor} />
        </mesh>
        {/* 前踢脚线 */}
        <mesh position={[0, 0.05, roomDepth / 2 - 0.01]}>
          <boxGeometry args={[roomWidth, 0.1, 0.02]} />
          <meshStandardMaterial color={baseboardColor} />
        </mesh>
        {/* 左踢脚线 */}
        <mesh position={[-roomWidth / 2 + 0.01, 0.05, 0]}>
          <boxGeometry args={[0.02, 0.1, roomDepth]} />
          <meshStandardMaterial color={baseboardColor} />
        </mesh>
        {/* 右踢脚线 */}
        <mesh position={[roomWidth / 2 - 0.01, 0.05, 0]}>
          <boxGeometry args={[0.02, 0.1, roomDepth]} />
          <meshStandardMaterial color={baseboardColor} />
        </mesh>
      </group>
    </group>
  );
}
