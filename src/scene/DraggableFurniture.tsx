import { useRef, useState, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useCursor, Edges, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../store/useStore';
import AsyncModel from './AsyncModel';

const ROOM_HEIGHT = 2.8;
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ceilingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), ROOM_HEIGHT);

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

  // 局部状态：分别驱动“移动”和“旋转”的丝滑渲染
  const [livePos, setLivePos] =
    useState<[number, number, number]>(initialPosition);
  const [liveRotY, setLiveRotY] = useState<number>(rotation[1] || 0);

  // 通过初始高度判断它属于哪个“物理图层”
  const isCeilingItem = initialPosition[1] >= ROOM_HEIGHT - 0.5;

  // 智能计算模型与碰撞盒的 Y 轴偏移量
  // 1. 模型偏移：天上家具往下移动自身高度(倒挂)，地上家具不移动(坐落)
  const modelOffsetY = isCeilingItem ? -modelSize[1] : 0;
  // 2. 盒子偏移：天上家具盒子中心在负半轴，地上家具盒子中心在正半轴
  const boxOffsetY = isCeilingItem ? -modelSize[1] / 2 : modelSize[1] / 2;

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

      // 动态切换射线检测平面：如果是吊灯，就射向天花板
      const activePlane = isCeilingItem ? ceilingPlane : floorPlane;
      raycaster.ray.intersectPlane(activePlane, intersection);

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

          //  物理隔离：天上和地下的东西互不干涉，绝不碰撞
          const isOtherCeiling = other.position[1] >= ROOM_HEIGHT - 0.5;
          if (isCeilingItem !== isOtherCeiling) continue;

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

  // ================= 🌟 自由旋转拖拽逻辑 =================
  const bindRotate = useDrag(({ active, event }) => {
    event.stopPropagation(); // 阻止触发平移
    setIsDragging(active);
    setDraggingRotate(active);

    if (active && groupRef.current) {
      const intersection = new THREE.Vector3();
      // 旋转时也用对应的平面
      const activePlane = isCeilingItem ? ceilingPlane : floorPlane;
      raycaster.ray.intersectPlane(activePlane, intersection);

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

  // ================= 🌟 智能尺寸线距离计算 (防家具遮挡) =================
  // 1. 先计算当前拖拽家具(A)的占据边界
  const wX =
    Math.abs(Math.cos(liveRotY) * modelSize[0]) +
    Math.abs(Math.sin(liveRotY) * modelSize[2]);
  const wZ =
    Math.abs(Math.sin(liveRotY) * modelSize[0]) +
    Math.abs(Math.cos(liveRotY) * modelSize[2]);

  const aLeft = livePos[0] - wX / 2;
  const aRight = livePos[0] + wX / 2;
  const aBack = livePos[2] - wZ / 2;
  const aFront = livePos[2] + wZ / 2;

  // 2. 默认的距离（到四面墙壁）
  let distLeft = aLeft - -ROOM_HALF;
  let distRight = ROOM_HALF - aRight;
  let distBack = aBack - -ROOM_HALF;
  let distFront = ROOM_HALF - aFront;

  // 3. 遍历寻找距离当前家具最近的障碍物
  placedItems.forEach((other) => {
    if (other.instanceId === instanceId || !other.size) return;

    // 尺寸测量的隔离：吊灯的测量线不应该被地上的沙发挡住
    const isOtherCeiling = other.position[1] >= ROOM_HEIGHT - 0.5;
    if (isCeilingItem !== isOtherCeiling) return;

    // 计算其他家具(B)的真实占据边界
    const oRotY = other.rotation ? other.rotation[1] : 0;
    const oWx =
      Math.abs(Math.cos(oRotY) * other.size[0]) +
      Math.abs(Math.sin(oRotY) * other.size[2]);
    const oWz =
      Math.abs(Math.sin(oRotY) * other.size[0]) +
      Math.abs(Math.cos(oRotY) * other.size[2]);

    const bLeft = other.position[0] - oWx / 2;
    const bRight = other.position[0] + oWx / 2;
    const bBack = other.position[2] - oWz / 2;
    const bFront = other.position[2] + oWz / 2;

    // 判断在 Z 轴或 X 轴上是否存在交集 (也就是判断是否位于正左/正前/等方向上)
    const overlapZ = bBack < aFront && bFront > aBack; // 在水平射线上有遮挡
    const overlapX = bLeft < aRight && bRight > aLeft; // 在垂直射线上有遮挡

    // 检查左侧：如果 B 在 A 的左侧，且存在 Z轴重叠
    if (overlapZ && bRight <= aLeft) {
      const d = aLeft - bRight;
      if (d < distLeft) distLeft = d; // 取最近的距离
    }
    // 检查右侧：如果 B 在 A 的右侧，且存在 Z轴重叠
    if (overlapZ && bLeft >= aRight) {
      const d = bLeft - aRight;
      if (d < distRight) distRight = d;
    }
    // 检查后侧：如果 B 在 A 的后侧，且存在 X轴重叠
    if (overlapX && bFront <= aBack) {
      const d = aBack - bFront;
      if (d < distBack) distBack = d;
    }
    // 检查前侧：如果 B 在 A 的前侧，且存在 X轴重叠
    if (overlapX && bBack >= aFront) {
      const d = bBack - aFront;
      if (d < distFront) distFront = d;
    }
  });

  const lineY = isCeilingItem ? -0.1 : 0.1;

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
      <group position={[0, modelOffsetY, 0]}>
        <AsyncModel modelId={model_id} onLoadSize={handleModelLoad} />
      </group>

      <mesh
        {...(bind() as any)}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        position={[0, boxOffsetY, 0]}
      >
        <boxGeometry args={[modelSize[0], modelSize[1], modelSize[2]]} />
        <meshBasicMaterial transparent opacity={0} />
        {isSelected && <Edges linewidth={1} color="white" />}
      </mesh>

      {/* ================= 🌟 自由旋转 UI 控制手柄 ================= */}
      {isSelected && (
        <group>
          {/* 连着手柄的线：从家具正前方往外伸 0.6米 */}
          <Line
            points={[
              [0, lineY, modelSize[2] / 2],
              [0, lineY, modelSize[2] / 2 + 0.4],
            ]}
            color="white"
            lineWidth={1.5}
          />
          {/* 拖拽手柄圆盘 */}
          <mesh
            position={[0, lineY, modelSize[2] / 2 + 0.4]}
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
          {/* 1. 左侧线 */}
          <Line
            points={[
              [-wX / 2, lineY, 0],
              [-wX / 2 - distLeft, lineY, 0],
            ]}
            color="#ffffff"
            lineWidth={1.5}
          />
          <Html
            position={[-wX / 2 - distLeft / 2, lineY + 0.05, 0]}
            center
            zIndexRange={[100, 0]}
          >
            <div className="text-white text-xs font-normal pointer-events-none select-none whitespace-nowrap">
              {distLeft.toFixed(2)} m
            </div>
          </Html>

          {/* 2. 右侧线 */}
          <Line
            points={[
              [wX / 2, lineY, 0],
              [wX / 2 + distRight, lineY, 0],
            ]}
            color="#ffffff"
            lineWidth={1.5}
          />
          <Html
            position={[wX / 2 + distRight / 2, lineY + 0.05, 0]}
            center
            zIndexRange={[100, 0]}
          >
            <div className="text-white text-xs font-normal pointer-events-none select-none whitespace-nowrap">
              {distRight.toFixed(2)} m
            </div>
          </Html>

          {/* 3. 后侧线 */}
          <Line
            points={[
              [0, lineY, -wZ / 2],
              [0, lineY, -wZ / 2 - distBack],
            ]}
            color="#ffffff"
            lineWidth={1.5}
          />
          <Html
            position={[0, lineY + 0.05, -wZ / 2 - distBack / 2]}
            center
            zIndexRange={[100, 0]}
          >
            <div className="text-white text-xs font-normal pointer-events-none select-none whitespace-nowrap">
              {distBack.toFixed(2)} m
            </div>
          </Html>

          {/* 4. 前侧线 */}
          <Line
            points={[
              [0, lineY, wZ / 2],
              [0, lineY, wZ / 2 + distFront],
            ]}
            color="#ffffff"
            lineWidth={1.5}
          />
          <Html
            position={[0, lineY + 0.05, wZ / 2 + distFront / 2]}
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
