import { useRef, useState, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useCursor, Edges, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../store/useStore';
import AsyncModel from './AsyncModel';

const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ROOM_SIZE = 6; // 房间长宽
const ROOM_HALF = ROOM_SIZE / 2;

interface DraggableFurnitureProps {
  initialPosition?: [number, number, number];
  rotation?: [number, number, number];
  instanceId: string;
  model_id: string;
}

export default function DraggableFurniture({
  initialPosition = [0, 0, 0],
  rotation = [0, 0, 0],
  instanceId,
  model_id,
}: DraggableFurnitureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { raycaster } = useThree();

  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hoverRotate, setHoverRotate] = useState(false); // 旋转手柄的悬浮状态
  const [draggingRotate, setDraggingRotate] = useState(false); // 是否正在旋转

  const [modelSize, setModelSize] = useState<[number, number, number]>([
    1, 1, 1,
  ]);
  const dragOffset = useRef({ x: 0, z: 0 });

  // 🌟 局部状态：分别驱动“移动”和“旋转”的丝滑渲染
  const [livePos, setLivePos] =
    useState<[number, number, number]>(initialPosition);
  const [liveRotY, setLiveRotY] = useState<number>(rotation[1] || 0);

  // 当外部数据源更新时同步
  useEffect(() => {
    setLivePos(initialPosition);
  }, [initialPosition]);
  useEffect(() => {
    setLiveRotY(rotation[1] || 0);
  }, [rotation[1]]);

  const setIsDragging = useStore((state) => state.setIsDragging);
  const updateItemPosition = useStore((state) => state.updateItemPosition);
  const updateItemSize = useStore((state) => state.updateItemSize);
  const updateItemRotation = useStore((state) => state.updateItemRotation);
  const placedItems = useStore((state) => state.placedItems);
  const selectedItemId = useStore((state) => state.selectedItemId);
  const setSelectedItemId = useStore((state) => state.setSelectedItemId);

  const isSelected = selectedItemId === instanceId;

  useCursor(hovered, 'grab', 'auto');
  useCursor(dragging, 'grabbing', 'auto');
  useCursor(hoverRotate, 'pointer', 'auto');

  const handleModelLoad = useCallback(
    (size: [number, number, number]) => {
      setModelSize(size);
      updateItemSize(instanceId, size);
    },
    [instanceId, updateItemSize],
  );

  const bind = useDrag(({ active, event, first }) => {
    setDragging(active);
    setIsDragging(active);
    event.stopPropagation();

    if (active && groupRef.current) {
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(floorPlane, intersection);

      if (intersection) {
        if (first) {
          dragOffset.current = {
            x: groupRef.current.position.x - intersection.x,
            z: groupRef.current.position.z - intersection.z,
          };
        }

        let targetX = intersection.x + dragOffset.current.x;
        let targetZ = intersection.z + dragOffset.current.z;

        // 计算世界对齐的包围盒 (防穿模)
        const rotY = rotation[1] || 0;
        const wX =
          Math.abs(Math.cos(rotY) * modelSize[0]) +
          Math.abs(Math.sin(rotY) * modelSize[2]);
        const wZ =
          Math.abs(Math.sin(rotY) * modelSize[0]) +
          Math.abs(Math.cos(rotY) * modelSize[2]);

        const maxBoundX = ROOM_HALF - wX / 2;
        const maxBoundZ = ROOM_HALF - wZ / 2;
        const minBoundX = -(ROOM_HALF - wX / 2);
        const minBoundZ = -(ROOM_HALF - wZ / 2);

        targetX = THREE.MathUtils.clamp(targetX, minBoundX + 0.05, maxBoundX);
        targetZ = THREE.MathUtils.clamp(targetZ, minBoundZ + 0.05, maxBoundZ);

        let isColliding = false;
        for (const other of placedItems) {
          if (other.instanceId === instanceId || !other.size) continue;

          const oRotY = other.rotation ? other.rotation[1] : 0;
          const oWx =
            Math.abs(Math.cos(oRotY) * other.size[0]) +
            Math.abs(Math.sin(oRotY) * other.size[2]);
          const oWz =
            Math.abs(Math.sin(oRotY) * other.size[0]) +
            Math.abs(Math.cos(oRotY) * other.size[2]);

          const gapX = Math.abs(targetX - other.position[0]);
          const gapZ = Math.abs(targetZ - other.position[2]);

          if (gapX < (wX + oWx) / 2 && gapZ < (wZ + oWz) / 2) {
            isColliding = true;
            break;
          }
        }

        if (!isColliding) {
          groupRef.current.position.x = targetX;
          groupRef.current.position.z = targetZ;
          setLivePos([targetX, initialPosition[1], targetZ]);
        }
      }
    } else if (!active && groupRef.current) {
      const { x, y, z } = groupRef.current.position;
      updateItemPosition(instanceId, [x, y, z]);
    }
  });

  // ================= 🌟 2. 自由旋转拖拽逻辑 (核心魔法) =================
  const bindRotate = useDrag(({ active, event }) => {
    event.stopPropagation(); // 阻止触发平移
    setIsDragging(active);
    setDraggingRotate(active);

    if (active && groupRef.current) {
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(floorPlane, intersection);

      if (intersection) {
        // 计算鼠标当前位置与家具中心点的 X 和 Z 差值
        const dx = intersection.x - groupRef.current.position.x;
        const dz = intersection.z - groupRef.current.position.z;

        // 核心公式：利用反正切求出鼠标围绕家具的精确弧度
        const angle = Math.atan2(dx, dz);

        // 实时更新局部状态，画面立刻响应
        setLiveRotY(angle);
      }
    } else if (!active && groupRef.current) {
      // 鼠标松开时，将最终的旋转角度持久化到 Zustand
      updateItemRotation(instanceId, [rotation[0], liveRotY, rotation[2]]);
    }
  });

  // 动态尺寸线数学计算 (依据实时的 liveRotY 计算动态包围盒 wX 和 wZ)
  const wX =
    Math.abs(Math.cos(liveRotY) * modelSize[0]) +
    Math.abs(Math.sin(liveRotY) * modelSize[2]);
  const wZ =
    Math.abs(Math.sin(liveRotY) * modelSize[0]) +
    Math.abs(Math.cos(liveRotY) * modelSize[2]);

  const distLeft = livePos[0] - wX / 2 - -ROOM_HALF;
  const distRight = ROOM_HALF - (livePos[0] + wX / 2);
  const distBack = livePos[2] - wZ / 2 - -ROOM_HALF;
  const distFront = ROOM_HALF - (livePos[2] + wZ / 2);

  return (
    <group
      ref={groupRef}
      position={initialPosition}
      rotation={[rotation[0], liveRotY, rotation[2]]}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedItemId(instanceId);
      }}
    >
      <AsyncModel modelId={model_id} onLoadSize={handleModelLoad} />

      <mesh
        {...(bind() as any)}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        position={[0, modelSize[1] / 2, 0]}
      >
        <boxGeometry args={[modelSize[0], modelSize[1], modelSize[2]]} />
        <meshBasicMaterial transparent opacity={0} />
        {isSelected && <Edges linewidth={1} color="white" />}
      </mesh>

      {/* ================= 🌟 3. 自由旋转 UI 控制手柄 ================= */}
      {isSelected && (
        <group>
          {/* 连着手柄的线：从家具正前方往外伸 0.6米 */}
          <Line
            points={[
              [0, 0.1, modelSize[2] / 2],
              [0, 0.1, modelSize[2] / 2 + 0.4],
            ]}
            color="white"
            lineWidth={1.5}
          />
          {/* 拖拽手柄圆盘 */}
          <mesh
            position={[0, 0.1, modelSize[2] / 2 + 0.4]}
            {...(bindRotate() as any)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoverRotate(true);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHoverRotate(false);
            }}
          >
            <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
            <meshBasicMaterial
              color={hoverRotate || draggingRotate ? '#888888' : 'white'}
            />
          </mesh>
        </group>
      )}

      {/* ================= 🌟 动态尺寸线渲染层 ================= */}
      {isSelected && (
        //反向旋转抵消 liveRotY，让标尺线永远平行于房间墙壁
        <group rotation={[0, -liveRotY, 0]}>
          {/* 1. 左侧：一条完美的连续实/虚线从家具边缘连到墙壁 */}
          <Line
            points={[
              [-wX / 2, 0.1, 0],
              [-wX / 2 - distLeft, 0.1, 0],
            ]}
            color="#ffffff"
            lineWidth={1.5}
          />
          {/* 纯文本数字：无背景框，加了 text-shadow 确保穿线时依然清晰 */}
          <Html
            position={[-wX / 2 - distLeft / 2, 0.15, 0]}
            center
            zIndexRange={[100, 0]}
          >
            <div className="text-white text-xs font-normal pointer-events-none select-none whitespace-nowrap">
              {distLeft.toFixed(2)} m
            </div>
          </Html>

          {/* 2. 右侧线与文本 */}
          <Line
            points={[
              [wX / 2, 0.1, 0],
              [wX / 2 + distRight, 0.1, 0],
            ]}
            color="#ffffff"
            lineWidth={1.5}
          />
          <Html
            position={[wX / 2 + distRight / 2, 0.15, 0]}
            center
            zIndexRange={[100, 0]}
          >
            <div className="text-white text-xs font-normal pointer-events-none select-none whitespace-nowrap">
              {distRight.toFixed(2)} m
            </div>
          </Html>

          {/* 3. 后侧线与文本 */}
          <Line
            points={[
              [0, 0.1, -wZ / 2],
              [0, 0.1, -wZ / 2 - distBack],
            ]}
            color="#ffffff"
            lineWidth={1.5}
          />
          <Html
            position={[0, 0.15, -wZ / 2 - distBack / 2]}
            center
            zIndexRange={[100, 0]}
          >
            <div className="text-white text-xs font-normal pointer-events-none select-none whitespace-nowrap">
              {' '}
              {distBack.toFixed(2)} m
            </div>
          </Html>

          {/* 4. 前侧线与文本 */}
          <Line
            points={[
              [0, 0.1, wZ / 2],
              [0, 0.1, wZ / 2 + distFront],
            ]}
            color="#ffffff"
            lineWidth={1.5}
          />
          <Html
            position={[0, 0.15, wZ / 2 + distFront / 2]}
            center
            zIndexRange={[100, 0]}
          >
            <div className="text-white text-xs font-normal pointer-events-none select-none whitespace-nowrap">
              {distFront.toFixed(2)} m
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
