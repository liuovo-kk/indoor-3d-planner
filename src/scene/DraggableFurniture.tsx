import { useRef, useState, useCallback, useEffect, useLayoutEffect, memo } from 'react';
import { useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useCursor, Edges, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../store/useStore';
import AsyncModel from './AsyncModel';
import { sendDragUpdate } from '../hooks/useCollabSync';

interface DraggableFurnitureProps {
  initialPosition?: [number, number, number];
  rotation?: [number, number, number];
  instanceId: string;
  model_id: string;
}

// ==================== 预分配对象池（模块级复用，消除 GC 压力） ====================
const _v3_0 = new THREE.Vector3();
const _v3_1 = new THREE.Vector3();
const _plane = new THREE.Plane();
const _intersection = new THREE.Vector3();

function DraggableFurnitureInner({
  initialPosition = [0, 0, 0],
  rotation = [0, 0, 0],
  instanceId,
  model_id,
}: DraggableFurnitureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { raycaster, camera } = useThree();

  // ==================== 房间尺寸 ====================
  const roomWidth = useStore((s) => s.roomWidth) || 6;
  const roomDepth = useStore((s) => s.roomDepth) || 6;
  const roomHeight = useStore((s) => s.roomHeight) || 2.8;
  const halfWidth = roomWidth / 2;
  const halfDepth = roomDepth / 2;

  // ==================== 轻量 UI 状态 ====================
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hoverRotate, setHoverRotate] = useState(false);
  const [draggingRotate, setDraggingRotate] = useState(false);
  const [hoverHeight, setHoverHeight] = useState(false);
  const [draggingHeight, setDraggingHeight] = useState(false);
  const [modelSize, setModelSize] = useState<[number, number, number]>([1, 1, 1]);

  // ==================== 关键优化：用 ref 驱动拖拽，避免 React 重渲染 ====================
  // 拖拽期间的实时位置/旋转存储在 ref 中，直接操作 Three.js 对象
  // React state 仅用于：初始值、外部同步、拖拽结束后的距离线渲染
  const livePosRef = useRef<[number, number, number]>([...initialPosition]);
  const liveRotYRef = useRef<number>(rotation[1] || 0);
  const [renderPos, setRenderPos] = useState<[number, number, number]>([...initialPosition]);
  const [renderRotY, setRenderRotY] = useState<number>(rotation[1] || 0);

  const dragOffset = useRef({ x: 0, y: 0, z: 0 });

  const isAnyDragging = dragging || draggingRotate || draggingHeight;
  // 用 ref 追踪拖拽状态，供 useFrame 等非 React 上下文中使用
  const isDraggingRef = useRef(false);

  const [isCeilingAnchor] = useState(() => initialPosition[1] >= roomHeight - 0.5);

  const modelOffsetY = isCeilingAnchor ? -modelSize[1] : 0;
  const boxOffsetY = isCeilingAnchor ? -modelSize[1] / 2 : modelSize[1] / 2;

  // ==================== 初始化 group 的位置（useLayoutEffect 在 paint 前执行，无闪动） ====================
  useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...initialPosition);
      groupRef.current.rotation.set(rotation[0], rotation[1] || 0, rotation[2]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== 外部数据同步（远程协作等） ====================
  useEffect(() => {
    livePosRef.current = [...initialPosition];
    liveRotYRef.current = rotation[1] || 0;
    setRenderPos([...initialPosition]);
    setRenderRotY(rotation[1] || 0);
    if (groupRef.current && !isDraggingRef.current) {
      groupRef.current.position.set(...initialPosition);
      groupRef.current.rotation.set(rotation[0], rotation[1] || 0, rotation[2]);
    }
  }, [initialPosition, rotation[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==================== Store 操作 ====================
  const setIsDragging = useStore((s) => s.setIsDragging);
  const updateItemPosition = useStore((s) => s.updateItemPosition);
  const updateItemSize = useStore((s) => s.updateItemSize);
  const updateItemRotation = useStore((s) => s.updateItemRotation);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const setSelectedItemId = useStore((s) => s.setSelectedItemId);
  const isSelected = selectedItemId === instanceId;

  useCursor(hovered, 'grab', 'auto');
  useCursor(dragging, 'grabbing', 'auto');
  useCursor(hoverRotate, 'pointer', 'auto');
  useCursor(hoverHeight, 'ns-resize', 'auto');

  const handleModelLoad = useCallback(
    (size: [number, number, number]) => {
      setModelSize(size);
      updateItemSize(instanceId, size);
    },
    [instanceId, updateItemSize],
  );

  // ==================== 碰撞检测工具函数 ====================
  // 从模块级 store 和 ref 读取最新数据，不做任何订阅
  const checkCollisionXZ = useCallback(
    (targetX: number, targetZ: number, targetCenterY: number): boolean => {
      const store = useStore.getState();
      const placedItems = store.placedItems;
      const staticObstacles = store.staticObstacles;
      const rotY = rotation[1] || 0;

      const wX =
        Math.abs(Math.cos(rotY) * modelSize[0]) +
        Math.abs(Math.sin(rotY) * modelSize[2]);
      const wZ =
        Math.abs(Math.sin(rotY) * modelSize[0]) +
        Math.abs(Math.cos(rotY) * modelSize[2]);

      // 检查动态家具
      for (const other of placedItems) {
        if (other.instanceId === instanceId || !other.size) continue;

        const isOtherCeiling = other.position[1] >= roomHeight - 0.5;
        const otherBoxOffsetY = isOtherCeiling
          ? -other.size[1] / 2
          : other.size[1] / 2;
        const otherCenterY = other.position[1] + otherBoxOffsetY;

        const gapY = Math.abs(targetCenterY - otherCenterY);
        if (gapY >= (modelSize[1] + other.size[1]) / 2) continue;

        const oRotY = other.rotation ? other.rotation[1] : 0;
        const oWx =
          Math.abs(Math.cos(oRotY) * other.size[0]) +
          Math.abs(Math.sin(oRotY) * other.size[2]);
        const oWz =
          Math.abs(Math.sin(oRotY) * other.size[0]) +
          Math.abs(Math.cos(oRotY) * other.size[2]);

        const gapX = Math.abs(targetX - other.position[0]);
        const gapZ = Math.abs(targetZ - other.position[2]);

        if (gapX < (wX + oWx) / 2 && gapZ < (wZ + oWz) / 2) return true;
      }

      // 检查静态障碍物
      for (const obs of staticObstacles) {
        const obsH = obs.h || roomHeight;
        const gapY = Math.abs(targetCenterY - (obs.y || 0));
        if (gapY >= (modelSize[1] + obsH) / 2) continue;

        const gapX = Math.abs(targetX - obs.x);
        const gapZ = Math.abs(targetZ - obs.z);
        if (gapX < (wX + obs.w) / 2 && gapZ < (wZ + obs.d) / 2) return true;
      }

      return false;
    },
    [instanceId, modelSize, roomWidth, roomDepth, roomHeight, rotation],
  );

  const checkCollisionY = useCallback(
    (targetCenterY: number): boolean => {
      const store = useStore.getState();
      const placedItems = store.placedItems;
      const staticObstacles = store.staticObstacles;
      const rotY = rotation[1] || 0;

      const wX =
        Math.abs(Math.cos(rotY) * modelSize[0]) +
        Math.abs(Math.sin(rotY) * modelSize[2]);
      const wZ =
        Math.abs(Math.sin(rotY) * modelSize[0]) +
        Math.abs(Math.cos(rotY) * modelSize[2]);

      for (const other of placedItems) {
        if (other.instanceId === instanceId || !other.size) continue;

        const isOtherCeiling = other.position[1] >= roomHeight - 0.5;
        if (isCeilingAnchor !== isOtherCeiling) continue;

        const oRotY = other.rotation ? other.rotation[1] : 0;
        const oWx =
          Math.abs(Math.cos(oRotY) * other.size[0]) +
          Math.abs(Math.sin(oRotY) * other.size[2]);
        const oWz =
          Math.abs(Math.sin(oRotY) * other.size[0]) +
          Math.abs(Math.cos(oRotY) * other.size[2]);

        const gapX = Math.abs(livePosRef.current[0] - other.position[0]);
        const gapZ = Math.abs(livePosRef.current[2] - other.position[2]);

        if (gapX < (wX + oWx) / 2 && gapZ < (wZ + oWz) / 2) {
          const otherBoxOffsetY = isOtherCeiling
            ? -other.size[1] / 2
            : other.size[1] / 2;
          const otherCenterY = other.position[1] + otherBoxOffsetY;

          const gapY = Math.abs(targetCenterY - otherCenterY);
          if (gapY < (modelSize[1] + other.size[1]) / 2) return true;
        }
      }

      for (const obs of staticObstacles) {
        const gapX = Math.abs(livePosRef.current[0] - obs.x);
        const gapZ = Math.abs(livePosRef.current[2] - obs.z);

        if (gapX < (wX + obs.w) / 2 && gapZ < (wZ + obs.d) / 2) {
          const obsH = obs.h || roomHeight;
          const gapY = Math.abs(targetCenterY - (obs.y || 0));
          if (gapY < (modelSize[1] + obsH) / 2) return true;
        }
      }

      return false;
    },
    [instanceId, modelSize, roomWidth, roomDepth, roomHeight, rotation, isCeilingAnchor],
  );

  // ==================== 水平拖拽（纯 imperative） ====================
  const bind = useDrag(({ active, event, first }) => {
    setDragging(active);
    setIsDragging(active);
    isDraggingRef.current = active;
    event.stopPropagation();

    if (active && groupRef.current) {
      // 构建水平拖拽面（位于家具当前高度），复用预分配对象
      _v3_1.set(0, livePosRef.current[1], 0);
      _plane.setFromNormalAndCoplanarPoint(_v3_0.set(0, 1, 0), _v3_1);

      raycaster.ray.intersectPlane(_plane, _intersection);

      if (_intersection) {
        if (first) {
          dragOffset.current.x = groupRef.current.position.x - _intersection.x;
          dragOffset.current.z = groupRef.current.position.z - _intersection.z;
        }

        let targetX = _intersection.x + dragOffset.current.x;
        let targetZ = _intersection.z + dragOffset.current.z;

        // 边界裁剪
        const rotY = rotation[1] || 0;
        const wX =
          Math.abs(Math.cos(rotY) * modelSize[0]) +
          Math.abs(Math.sin(rotY) * modelSize[2]);
        const wZ =
          Math.abs(Math.sin(rotY) * modelSize[0]) +
          Math.abs(Math.cos(rotY) * modelSize[2]);

        const maxBoundX = halfWidth - wX / 2;
        const maxBoundZ = halfDepth - wZ / 2;

        targetX = THREE.MathUtils.clamp(targetX, -(halfWidth - wX / 2) + 0.05, maxBoundX);
        targetZ = THREE.MathUtils.clamp(targetZ, -(halfDepth - wZ / 2) + 0.05, maxBoundZ);

        const myCenterY = livePosRef.current[1] + boxOffsetY;

        if (!checkCollisionXZ(targetX, targetZ, myCenterY)) {
          // 🔑 关键优化：只更新 Three.js 对象和 ref，不触发 React 重渲染
          groupRef.current.position.x = targetX;
          groupRef.current.position.z = targetZ;
          livePosRef.current = [targetX, livePosRef.current[1], targetZ];
        }
      }
    } else if (!active && groupRef.current) {
      // 拖拽结束：同步到 React state + zustand store
      const { x, y, z } = groupRef.current.position;
      const pos: [number, number, number] = [x, y, z];
      setRenderPos(pos);
      updateItemPosition(instanceId, pos);
      const placed = useStore.getState().placedItems.find((p) => p.instanceId === instanceId);
      const objectId = placed?.objectId || instanceId;
      sendDragUpdate(objectId, { x, y, z }, { x: 0, y: liveRotYRef.current, z: 0 });
    }
  });

  // ==================== 旋转拖拽（纯 imperative） ====================
  const bindRotate = useDrag(({ active, event }) => {
    event.stopPropagation();
    setIsDragging(active);
    setDraggingRotate(active);
    isDraggingRef.current = active;

    if (active && groupRef.current) {
      _v3_1.set(0, livePosRef.current[1], 0);
      _plane.setFromNormalAndCoplanarPoint(_v3_0.set(0, 1, 0), _v3_1);

      raycaster.ray.intersectPlane(_plane, _intersection);

      if (_intersection) {
        const dx = _intersection.x - groupRef.current.position.x;
        const dz = _intersection.z - groupRef.current.position.z;
        const newRotY = Math.atan2(dx, dz);
        liveRotYRef.current = newRotY;
        // 🔑 直接操作 Three.js 对象，零 React 渲染
        groupRef.current.rotation.y = newRotY;
      }
    } else if (!active && groupRef.current) {
      updateItemRotation(instanceId, [rotation[0], liveRotYRef.current, rotation[2]]);
      setRenderRotY(liveRotYRef.current);
      const placed = useStore.getState().placedItems.find((p) => p.instanceId === instanceId);
      const objectId = placed?.objectId || instanceId;
      sendDragUpdate(
        objectId,
        { x: livePosRef.current[0], y: livePosRef.current[1], z: livePosRef.current[2] },
        { x: 0, y: liveRotYRef.current, z: 0 },
      );
    }
  });

  // ==================== 高度拖拽（纯 imperative） ====================
  const bindHeight = useDrag(({ active, event, first }) => {
    event.stopPropagation();
    setIsDragging(active);
    setDraggingHeight(active);
    isDraggingRef.current = active;

    if (active && groupRef.current) {
      // 构建垂直于相机的垂直拖拽面
      camera.getWorldDirection(_v3_0);
      _v3_0.y = 0;
      _v3_0.normalize().negate();

      _plane.setFromNormalAndCoplanarPoint(_v3_0, groupRef.current.position);
      raycaster.ray.intersectPlane(_plane, _intersection);

      if (_intersection) {
        if (first) {
          dragOffset.current.y = groupRef.current.position.y - _intersection.y;
        }

        let targetY = _intersection.y + dragOffset.current.y;

        // 边界裁剪
        const minY = isCeilingAnchor ? modelSize[1] : 0;
        const maxY = isCeilingAnchor ? roomHeight : roomHeight - modelSize[1];
        targetY = THREE.MathUtils.clamp(targetY, minY, Math.max(minY, maxY));

        const targetCenterY = targetY + boxOffsetY;

        if (!checkCollisionY(targetCenterY)) {
          // 🔑 只更新 Three.js 对象和 ref
          groupRef.current.position.y = targetY;
          livePosRef.current = [livePosRef.current[0], targetY, livePosRef.current[2]];
        }
      }
    } else if (!active && groupRef.current) {
      const pos = livePosRef.current;
      updateItemPosition(instanceId, [pos[0], pos[1], pos[2]]);
      setRenderPos([...pos]);
      const placed = useStore.getState().placedItems.find((p) => p.instanceId === instanceId);
      const objectId = placed?.objectId || instanceId;
      sendDragUpdate(
        objectId,
        { x: pos[0], y: pos[1], z: pos[2] },
        { x: 0, y: liveRotYRef.current, z: 0 },
      );
    }
  });

  // ==================== 点击选中 ====================
  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation();
      setSelectedItemId(instanceId);
    },
    [instanceId, setSelectedItemId],
  );

  const lineY = isCeilingAnchor ? -0.1 : 0.1;

  return (
    <group ref={groupRef} onClick={handleClick}>
      {/* 模型（应用 Y 轴偏移） */}
      <group position={[0, modelOffsetY, 0]}>
        <AsyncModel modelId={model_id} onLoadSize={handleModelLoad} />
      </group>

      {/* 透明碰撞盒 + 拖拽手柄 */}
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

      {/* 手柄层：拖拽期间也显示（3D 对象，不影响性能） */}
      {isSelected && (
        <group>
          {/* 旋转手柄 */}
          <group>
            <Line
              points={[
                [0, lineY, modelSize[2] / 2],
                [0, lineY, modelSize[2] / 2 + 0.4],
              ]}
              color="white"
              lineWidth={1.5}
            />
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

          {/* 高度调节手柄 */}
          <group position={[0, boxOffsetY + modelSize[1] / 2 + 0.2, 0]}>
            <Line
              points={[
                [0, 0, 0],
                [0, 0.5, 0],
              ]}
              color="white"
              lineWidth={1.5}
            />
            <mesh
              position={[0, 0.5, 0]}
              {...(bindHeight() as any)}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoverHeight(true);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setHoverHeight(false);
              }}
            >
              <coneGeometry args={[0.15, 0.3, 32]} />
              <meshBasicMaterial
                color={hoverHeight || draggingHeight ? '#888888' : 'white'}
              />
            </mesh>
          </group>
        </group>
      )}

      {/* 距离线：拖拽期间完全隐藏（消除 Html DOM overlay 的性能开销） */}
      {isSelected && !isAnyDragging && (
        <DistanceLinesRenderer
          livePos={renderPos}
          liveRotY={renderRotY}
          modelSize={modelSize}
          roomWidth={roomWidth}
          roomDepth={roomDepth}
          roomHeight={roomHeight}
          isCeilingAnchor={isCeilingAnchor}
          instanceId={instanceId}
        />
      )}
    </group>
  );
}

// ==================== 距离线独立组件（React.memo 防止级联渲染） ====================
interface DistanceLinesRendererProps {
  livePos: [number, number, number];
  liveRotY: number;
  modelSize: [number, number, number];
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  isCeilingAnchor: boolean;
  instanceId: string;
}

const DistanceLinesRenderer = memo(function DistanceLinesRenderer({
  livePos,
  liveRotY,
  modelSize,
  roomWidth,
  roomDepth,
  roomHeight,
  isCeilingAnchor,
  instanceId,
}: DistanceLinesRendererProps) {
  // 仅订阅 placedItems（距离线需要遍历所有家具）
  const placedItems = useStore((s) => s.placedItems);

  const halfWidth = roomWidth / 2;
  const halfDepth = roomDepth / 2;
  const boxOffsetY = isCeilingAnchor ? -modelSize[1] / 2 : modelSize[1] / 2;
  const myCenterY = livePos[1] + boxOffsetY;

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

  let distLeft = aLeft - -halfWidth;
  let distRight = halfWidth - aRight;
  let distBack = aBack - -halfDepth;
  let distFront = halfDepth - aFront;

  for (const other of placedItems) {
    if (other.instanceId === instanceId || !other.size) continue;

    const isOtherCeiling = other.position[1] >= roomHeight - 0.5;
    const otherBoxOffsetY = isOtherCeiling ? -other.size[1] / 2 : other.size[1] / 2;
    const otherCenterY = other.position[1] + otherBoxOffsetY;

    const gapY = Math.abs(myCenterY - otherCenterY);
    if (gapY >= (modelSize[1] + other.size[1]) / 2) continue;

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

    const overlapZ = bBack < aFront && bFront > aBack;
    const overlapX = bLeft < aRight && bRight > aLeft;

    if (overlapZ && bRight <= aLeft) distLeft = Math.min(distLeft, aLeft - bRight);
    if (overlapZ && bLeft >= aRight) distRight = Math.min(distRight, bLeft - aRight);
    if (overlapX && bFront <= aBack) distBack = Math.min(distBack, aBack - bFront);
    if (overlapX && bBack >= aFront) distFront = Math.min(distFront, bBack - aFront);
  }

  const lineY = isCeilingAnchor ? -0.1 : 0.1;

  return (
    <group rotation={[0, -liveRotY, 0]}>
      {/* 左 */}
      <Line points={[[-wX / 2, lineY, 0], [-wX / 2 - distLeft, lineY, 0]]} color="#ffffff" lineWidth={1.5} />
      <Html position={[-wX / 2 - distLeft / 2, lineY + 0.05, 0]} center zIndexRange={[100, 0]}>
        <div className="text-white text-xs font-normal pointer-events-none select-none whitespace-nowrap">
          {distLeft.toFixed(2)} m
        </div>
      </Html>

      {/* 右 */}
      <Line points={[[wX / 2, lineY, 0], [wX / 2 + distRight, lineY, 0]]} color="#ffffff" lineWidth={1.5} />
      <Html position={[wX / 2 + distRight / 2, lineY + 0.05, 0]} center zIndexRange={[100, 0]}>
        <div className="text-white text-xs font-normal pointer-events-none select-none whitespace-nowrap">
          {distRight.toFixed(2)} m
        </div>
      </Html>

      {/* 后 */}
      <Line points={[[0, lineY, -wZ / 2], [0, lineY, -wZ / 2 - distBack]]} color="#ffffff" lineWidth={1.5} />
      <Html position={[0, lineY + 0.05, -wZ / 2 - distBack / 2]} center zIndexRange={[100, 0]}>
        <div className="text-white text-xs font-normal pointer-events-none select-none whitespace-nowrap">
          {distBack.toFixed(2)} m
        </div>
      </Html>

      {/* 前 */}
      <Line points={[[0, lineY, wZ / 2], [0, lineY, wZ / 2 + distFront]]} color="#ffffff" lineWidth={1.5} />
      <Html position={[0, lineY + 0.05, wZ / 2 + distFront / 2]} center zIndexRange={[100, 0]}>
        <div className="text-white text-xs font-normal pointer-events-none select-none whitespace-nowrap">
          {distFront.toFixed(2)} m
        </div>
      </Html>
    </group>
  );
});

// ==================== 导出：memo 包裹 + 自定义比较函数 ====================
export default memo(DraggableFurnitureInner, (prev, next) => {
  return (
    prev.instanceId === next.instanceId &&
    prev.model_id === next.model_id &&
    prev.initialPosition?.[0] === next.initialPosition?.[0] &&
    prev.initialPosition?.[1] === next.initialPosition?.[1] &&
    prev.initialPosition?.[2] === next.initialPosition?.[2] &&
    prev.rotation?.[0] === next.rotation?.[0] &&
    prev.rotation?.[1] === next.rotation?.[1] &&
    prev.rotation?.[2] === next.rotation?.[2]
  );
});
