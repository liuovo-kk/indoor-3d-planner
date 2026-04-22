import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

// 🌟 TypeScript 接口定义：强制规定传给 RoomBase 的 props 格式
interface RoomBaseProps {
  onFloorClick: (event: ThreeEvent<MouseEvent>) => void;
}

export default function RoomBase({ onFloorClick }: RoomBaseProps) {
  const roomWidth = 6;
  const roomDepth = 6;
  const wallHeight = 2.8;
  // const baseboardHeight = 0.1;

  const baseTexture = useTexture('/assets/img/wood_floor.jpg');

  const floorTexture = useMemo(() => {
    const cloned = baseTexture.clone();
    cloned.wrapS = cloned.wrapT = THREE.RepeatWrapping;
    cloned.repeat.set(4, 4);
    cloned.needsUpdate = true;
    return cloned;
  }, [baseTexture]);

  return (
    <group>
      {/* 地板 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={onFloorClick}
        receiveShadow
      >
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial
          map={floorTexture}
          color="#bbb2ac"
          roughness={0.8}
        />
      </mesh>

      {/* ========================================== */}
      {/* 👇 🌟 新增：会隐身的屋顶 */}
      {/* 我们用一个 Plane (平面) 即可，放在墙的高度上 */}
      <mesh
        position={[0, wallHeight, 0]}
        rotation={[Math.PI / 2, 0, 0]} // 让它平躺
        receiveShadow // 接受灯光投影
      >
        {/* 长宽参考房间尺寸 */}
        <planeGeometry args={[roomWidth, roomDepth]} />

        <meshStandardMaterial
          color="#eeeeee" // 屋顶颜色浅一点
          roughness={1}
        />
      </mesh>

      {/* 左墙 */}
      <mesh
        position={[-roomWidth / 2, wallHeight / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[roomDepth, wallHeight]} />
        <meshStandardMaterial color="#c7ae94" roughness={1} />
      </mesh>

      {/* 2. 右墙 (+X 轴方向) */}
      <mesh
        position={[roomWidth / 2, wallHeight / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[roomDepth, wallHeight]} />
        <meshStandardMaterial color="#c7ae94" roughness={1} />
      </mesh>

      {/* 后墙 */}
      <mesh position={[0, wallHeight / 2, -roomDepth / 2]}>
        <planeGeometry args={[roomWidth, wallHeight]} />
        <meshStandardMaterial color="#c3ac93" roughness={1} />
      </mesh>

      {/* 4. 前墙 (+Z 轴方向) */}
      <mesh
        position={[0, wallHeight / 2, roomDepth / 2]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[roomWidth, wallHeight]} />
        <meshStandardMaterial color="#b8a595" roughness={1} />
      </mesh>

      {/* 左踢脚线 */}
      {/*<mesh
        position={[-roomWidth / 2 + 0.02, baseboardHeight / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[0.04, baseboardHeight, roomDepth]} />
        <meshStandardMaterial color="#bba28b" roughness={0.5} />
      </mesh>*/}

      {/* 后踢脚线 */}
      {/*<mesh
        position={[0, baseboardHeight / 2, -roomDepth / 2 + 0.02]}
        receiveShadow
      >
        <boxGeometry args={[roomWidth, baseboardHeight, 0.04]} />
        <meshStandardMaterial color="#bba28b" roughness={0.5} />
      </mesh>*/}
    </group>
  );
}
