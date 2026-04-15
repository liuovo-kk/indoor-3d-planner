import { useRef, useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useCursor } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../store/useStore';
import AsyncModel from './AsyncModel';

// 🌟 核心数学魔法：在空间中创建一个高度 Y=0 的“隐形数学地板”
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

interface DraggableFurnitureProps {
  initialPosition?: [number, number, number];
  instanceId: string;
  model_id: string;
}

export default function DraggableFurniture({
  initialPosition = [0, 0, 0],
  instanceId,
  model_id,
}: DraggableFurnitureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { raycaster } = useThree();

  // UI 状态反馈
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  // 🌟 终极魔法 1：用来记录当前模型的真实尺寸 (长宽高)
  const [modelSize, setModelSize] = useState<[number, number, number]>([
    1, 1, 1,
  ]);
  // 🌟 终极魔法 2：用来记录鼠标点下去那瞬间的“抓取偏移量”
  const dragOffset = useRef({ x: 0, z: 0 });

  const setIsDragging = useStore((state) => state.setIsDragging);
  const updateItemPosition = useStore((state) => state.updateItemPosition);
  const updateItemSize = useStore((state) => state.updateItemSize);
  const placedItems = useStore((state) => state.placedItems);

  // 极致细节：鼠标悬浮变成小手，拖拽变成抓紧
  useCursor(hovered, 'grab', 'auto');
  useCursor(dragging, 'grabbing', 'auto');

  // 🌟 修复：用 useCallback 缓存回调函数，切断父子组件间的无效渲染链条
  const handleModelLoad = useCallback(
    (size: [number, number, number]) => {
      setModelSize(size);
      updateItemSize(instanceId, size);
    },
    [instanceId, updateItemSize],
  ); // 依赖项

  const bind = useDrag(({ active, event, first }) => {
    setDragging(active);
    setIsDragging(active);
    event.stopPropagation();

    if (active && groupRef.current) {
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(floorPlane, intersection);

      if (intersection) {
        // 🌟 计算偏移量：只有在刚点下去的瞬间 (first) 才计算！
        if (first) {
          dragOffset.current = {
            x: groupRef.current.position.x - intersection.x,
            z: groupRef.current.position.z - intersection.z,
          };
        }

        // 🌟 加上偏移量，实现真正的“指哪抓哪”
        let targetX = intersection.x + dragOffset.current.x;
        let targetZ = intersection.z + dragOffset.current.z;

        // ================= 终极魔法 3.1：动态防穿墙钳制 =================
        const ROOM_SIZE = 6; // 房间长宽

        // 右侧/前方 (正轴)：边界就是地板的一半
        const maxBoundX = ROOM_SIZE / 2 - modelSize[0] / 2;
        const maxBoundZ = ROOM_SIZE / 2 - modelSize[2] / 2;

        // 左侧/后方 (负轴，有墙的一边)：
        // 边界 = 地板的一半 - 踢脚线厚度(约0.04) - 甚至可以多留一点余量防止穿模
        const minBoundX = -(ROOM_SIZE / 2 - modelSize[0] / 2);
        const minBoundZ = -(ROOM_SIZE / 2 - modelSize[2] / 2);

        // 使用不同的变量分别限制正负方向
        targetX = THREE.MathUtils.clamp(targetX, minBoundX + 0.05, maxBoundX);
        targetZ = THREE.MathUtils.clamp(targetZ, minBoundZ + 0.05, maxBoundZ);

        // ================= 终极魔法 3.2：AABB 碰撞检测 =================
        let isColliding = false;

        for (const other of placedItems) {
          if (other.instanceId === instanceId) continue; // 忽略自己
          if (!other.size) continue; // 如果那个家具还没加载完尺寸，先跳过

          const [ox, oy, oz] = other.position;
          const [ow, oh, od] = other.size;

          const gapX = Math.abs(targetX - ox);
          const gapZ = Math.abs(targetZ - oz);

          // 核心算法：X 距离小于两者宽度一半之和，且 Z 距离小于两者深度一半之和 => 撞车了！
          if (
            gapX < (modelSize[0] + ow) / 2 &&
            gapZ < (modelSize[2] + od) / 2
          ) {
            isColliding = true;
            break;
          }
        }

        // 🌟 只有在没撞车的情况下，才允许模型移动！
        if (!isColliding) {
          groupRef.current.position.x = targetX;
          groupRef.current.position.z = targetZ;
        }
      }
    } else if (!active && groupRef.current) {
      // 拖拽结束：同步坐标到 Zustand Store
      const { x, y, z } = groupRef.current.position;
      updateItemPosition(instanceId, [x, y, z]);
    }
  });

  return (
    <group ref={groupRef} position={initialPosition}>
      {/* 🌟 传入 onLoadSize 接收测量结果 */}
      <AsyncModel modelId={model_id} onLoadSize={handleModelLoad} />

      {/* 🌟 隐形碰撞盒 */}
      <mesh
        {...(bind() as any)}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        // 把碰撞盒往上抬模型高度的一半，这样刚好包裹住模型全身
        position={[0, modelSize[1] / 2, 0]}
      >
        {/* 🌟 大小完全与真实模型保持一致！ */}
        <boxGeometry args={[modelSize[0], modelSize[1], modelSize[2]]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}
