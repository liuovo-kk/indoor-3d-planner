import { useLayoutEffect, useEffect, useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../store/useStore';

const log = (msg: string, data?: unknown) =>
  console.log(
    `[RoomBox] ${msg}`,
    data ?? '',
    `+${Date.now() - performance.now()}ms`,
  );

interface RoomBoxProps {
  onFloorClick: (event: ThreeEvent<MouseEvent>) => void;
  glbUrl: string;
  visible?: boolean;
  roomRotation?: [number, number, number];
}

export default function RoomBox({
  onFloorClick,
  glbUrl,
  visible = true,
  roomRotation = [0, 0, 0], // 默认不旋转
}: RoomBoxProps) {
  const mountTime = useRef(Date.now());
  const { scene } = useGLTF(glbUrl);

  log(`useGLTF returned for ${glbUrl}`, { meshCount: scene.children.length });

  const groupRef = useRef<THREE.Group>(null);
  const setRoomSize = useStore((s) => s.setRoomSize);
  const setStaticObstacles = useStore((s) => s.setStaticObstacles); //静态障碍物设置

  const clone = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = true;
        child.castShadow = true;
      }
    });
    return c;
  }, [scene]);

  const floorInfo = useMemo(() => {
    let floorBox: THREE.Box3 | null = null;
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.name.toLowerCase().includes('floor')) {
          floorBox = new THREE.Box3().setFromObject(child);
        }
      }
    });
    const box = floorBox || new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const info = {
      width: size.x,
      depth: size.z,
      cx: center.x,
      cy: center.y,
      cz: center.z,
    };
    log(`floorInfo computed for ${glbUrl}`, info);
    return info;
  }, [clone, glbUrl]);

  useLayoutEffect(() => {
    log(`${glbUrl} mounted, visible=${visible}`);
    if (floorInfo.width > 0.5 && floorInfo.depth > 0.5) {
      setRoomSize(floorInfo.width, floorInfo.depth);
    }
  }, [floorInfo, setRoomSize, glbUrl, visible]);

  useEffect(() => {
    if (!visible || !groupRef.current) return;

    groupRef.current.updateMatrixWorld(true);

    const obstacles: any[] = [];

    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = child.name.toLowerCase();

        // 过滤掉不需要产生碰撞的结构
        if (
          name.includes('floor') ||
          name.includes('wall') ||
          name.includes('ceiling') ||
          name.includes('room')
        ) {
          return;
        }

        // 此时的 child 已经在被移动过的 group 里了
        // Box3.setFromObject 会自动读取世界矩阵，算出来的直接就是最终的“绝对坐标”
        const box = new THREE.Box3().setFromObject(child);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        obstacles.push({
          id: child.name || Math.random().toString(36).substring(7),
          // 💡 看这里！直接用 center.x，不需要再减去任何偏移量了！引擎全帮你算好了！
          x: center.x,
          z: center.z,
          w: size.x,
          d: size.z,
        });
      }
    });

    setStaticObstacles(obstacles);
    log(`扫描出 ${obstacles.length} 个内置障碍物`);
  }, [clone, visible, setStaticObstacles]);

  return (
    <group visible={visible} rotation={roomRotation}>
      {/* 负责视觉渲染的房间模型（被平移对齐到了世界中心） */}
      <group
        ref={groupRef}
        visible={visible}
        position={[-floorInfo.cx, -floorInfo.cy, -floorInfo.cz]}
      >
        <primitive object={clone} />
      </group>

      {/* 负责点击检测的透明地板（在中心，且跟随外层 group 一起旋转） */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onClick={onFloorClick}
      >
        <planeGeometry args={[floorInfo.width, floorInfo.depth]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}
