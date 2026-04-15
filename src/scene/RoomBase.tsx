import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../store/useStore';

// 🌟 TypeScript 接口定义：强制规定传给 RoomBase 的 props 格式
interface RoomBaseProps {
  onFloorClick: (event: ThreeEvent<MouseEvent>) => void;
}

export default function RoomBase({ onFloorClick }: RoomBaseProps) {
  // 获取当前的视图模式
  const viewMode = useStore((state) => state.viewMode);

  const roomWidth = 6;
  const roomDepth = 6;
  const wallHeight = 2.5;
  const thickness = 0.1;
  // const baseboardHeight = 0.1;

  const baseTexture = useTexture('/assets/img/wood_floor.jpg');

  const floorTexture = useMemo(() => {
    const cloned = baseTexture.clone();
    cloned.wrapS = cloned.wrapT = THREE.RepeatWrapping;
    cloned.repeat.set(4, 4);
    cloned.needsUpdate = true;
    return cloned;
  }, [baseTexture]);

  // 相机在哪边看，哪边的墙就消失
  const showLeftWall = viewMode !== 'left';
  const showRightWall = viewMode !== 'right' && viewMode !== 'dollhouse';
  const showBackWall = viewMode !== 'back';
  const showFrontWall = viewMode !== 'front' && viewMode !== 'dollhouse';

  return (
    <group>
      {/* 地板 */}
      <mesh
        position={[0, -thickness / 2, 0]}
        onClick={onFloorClick}
        receiveShadow
      >
        <boxGeometry args={[roomWidth, thickness, roomDepth]} />
        <meshStandardMaterial
          map={floorTexture}
          color="#bbb2ac"
          roughness={0.8}
        />
      </mesh>

      {/* 左墙 */}
      <mesh
        position={[-roomWidth / 2 - thickness / 2, wallHeight / 2, 0]}
        visible={showLeftWall} // 动态显隐
        receiveShadow
        castShadow
      >
        <boxGeometry args={[thickness, wallHeight, roomDepth]} />
        <meshStandardMaterial color="#c7ae94" roughness={1} />
      </mesh>

      {/* 2. 右墙 (+X 轴方向) */}
      <mesh
        position={[roomWidth / 2 + thickness / 2, wallHeight / 2, 0]}
        visible={showRightWall} // 动态显隐
        receiveShadow
        // 💡 提示：这里去掉了 castShadow，防止封闭的四面墙把房间内的光线彻底挡死
      >
        <boxGeometry args={[thickness, wallHeight, roomDepth]} />
        <meshStandardMaterial color="#c7ae94" roughness={1} />
      </mesh>

      {/* 后墙 */}
      <mesh
        position={[0, wallHeight / 2, -roomDepth / 2 - thickness / 2]}
        visible={showBackWall} // 动态显隐
        receiveShadow
        castShadow
      >
        <boxGeometry
          args={[roomWidth + thickness * 2, wallHeight, thickness]}
        />
        <meshStandardMaterial color="#b8a595" roughness={1} />
      </mesh>

      {/* 4. 前墙 (+Z 轴方向) */}
      <mesh
        position={[0, wallHeight / 2, roomDepth / 2 + thickness / 2]}
        visible={showFrontWall} // 动态显隐
        receiveShadow
      >
        <boxGeometry
          args={[roomWidth + thickness * 2, wallHeight, thickness]}
        />
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
