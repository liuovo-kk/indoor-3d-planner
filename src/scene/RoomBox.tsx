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
  roomRotation = [0, 0, 0],
}: RoomBoxProps) {
  const mountTime = useRef(Date.now());
  const { scene } = useGLTF(glbUrl);

  log(`useGLTF returned for ${glbUrl}`, { meshCount: scene.children.length });

  const groupRef = useRef<THREE.Group>(null);
  const setRoomSize = useStore((s) => s.setRoomSize);
  const setStaticObstacles = useStore((s) => s.setStaticObstacles);

  const clone = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = true;
        child.castShadow = true;
        const orig = child.material as THREE.MeshStandardMaterial;
        if (glbUrl.includes('Bathroom_downstairs') && orig.map) {
          const m = new THREE.MeshStandardMaterial({
            map: orig.map,
            normalMap: orig.normalMap,
            roughnessMap: orig.roughnessMap,
            metalnessMap: orig.metalnessMap,
            color: orig.color,
            roughness: orig.roughness,
            metalness: orig.metalness,
          });
          child.material = m;
        }
      }
    });
    return c;
  }, [scene, glbUrl]);

  const floorInfo = useMemo(() => {
    const floorMeshes: THREE.Mesh[] = [];
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name.toLowerCase().includes('floor')) {
        floorMeshes.push(child);
      }
    });
    const floorBox = floorMeshes.length > 0 ? new THREE.Box3().setFromObject(floorMeshes[0]) : null;
    const roomBox3 = new THREE.Box3().setFromObject(clone);
    const roomSize = new THREE.Vector3();
    roomBox3.getSize(roomSize);
    const roomCenter = new THREE.Vector3();
    roomBox3.getCenter(roomCenter);

    const floorSize = floorBox ? floorBox.getSize(new THREE.Vector3()) : null;
    const info = {
      width: floorSize ? floorSize.x : roomSize.x,
      depth: floorSize ? floorSize.z : roomSize.z,
      height: roomSize.y,
      cx: roomCenter.x,
      cy: roomBox3.min.y,
      cz: roomCenter.z,
    };
    log(`floorInfo computed for ${glbUrl}`, info);
    return info;
  }, [clone, glbUrl]);

  useLayoutEffect(() => {
    log(`${glbUrl} mounted, visible=${visible}`);
    if (floorInfo.width > 0.5 && floorInfo.depth > 0.5) {
      setRoomSize(floorInfo.width, floorInfo.depth, floorInfo.height);
    }
  }, [floorInfo, setRoomSize, glbUrl, visible]);

  useEffect(() => {
    if (!visible || !groupRef.current) return;

    groupRef.current.updateMatrixWorld(true);
    const obstacles: any[] = [];

    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = child.name.toLowerCase();
        if (
          name.includes('floor') ||
          name.includes('wall') ||
          name.includes('ceiling') ||
          name.includes('room')
        ) {
          return;
        }
        const box = new THREE.Box3().setFromObject(child);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        obstacles.push({
          id: child.name || Math.random().toString(36).substring(7),
          x: center.x,
          y: center.y,
          z: center.z,
          w: size.x,
          h: size.y,
          d: size.z,
        });
      }
    });
    setStaticObstacles(obstacles);
    log(`扫描出 ${obstacles.length} 个内置障碍物`);
  }, [clone, visible, setStaticObstacles]);

  return (
    <group visible={visible} rotation={roomRotation}>
      <group
        ref={groupRef}
        visible={visible}
        position={[-floorInfo.cx, -floorInfo.cy, -floorInfo.cz]}
      >
        <primitive object={clone} />
      </group>
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
