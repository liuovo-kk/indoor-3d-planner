import { useRef, useState, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useCursor, Edges, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../store/useStore';
import AsyncModel from './AsyncModel';

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
  const { raycaster, camera } = useThree();

  const roomWidth = useStore((state) => state.roomWidth) || 6;
  const roomDepth = useStore((state) => state.roomDepth) || 6;
  const roomHeight = useStore((state) => state.roomHeight) || 2.8;

  const halfWidth = roomWidth / 2;
  const halfDepth = roomDepth / 2;

  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hoverRotate, setHoverRotate] = useState(false); // 旋转手柄的悬浮状态
  const [draggingRotate, setDraggingRotate] = useState(false); // 是否正在旋转

  // 高度手柄的悬浮与拖拽状态
  const [hoverHeight, setHoverHeight] = useState(false);
  const [draggingHeight, setDraggingHeight] = useState(false);

  const [modelSize, setModelSize] = useState<[number, number, number]>([
    1, 1, 1,
  ]);
  const dragOffset = useRef({ x: 0, y: 0, z: 0 });

  // 局部状态：分别驱动“移动”和“旋转”的丝滑渲染
  const [livePos, setLivePos] =
    useState<[number, number, number]>(initialPosition);
  const [liveRotY, setLiveRotY] = useState<number>(rotation[1] || 0);

  // 通过初始高度判断它属于哪个“物理图层”
  const [isCeilingAnchor] = useState(
    () => initialPosition[1] >= roomHeight - 0.5,
  );

  // 智能计算模型与碰撞盒的 Y 轴偏移量
  // 1. 模型偏移：天上家具往下移动自身高度(倒挂)，地上家具不移动(坐落)
  const modelOffsetY = isCeilingAnchor ? -modelSize[1] : 0;
  // 2. 盒子偏移：天上家具盒子中心在负半轴，地上家具盒子中心在正半轴
  const boxOffsetY = isCeilingAnchor ? -modelSize[1] / 2 : modelSize[1] / 2;
  const myCenterY = livePos[1] + boxOffsetY;

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
  useCursor(hoverHeight, 'ns-resize', 'auto');

  const handleModelLoad = useCallback(
    (size: [number, number, number]) => {
      setModelSize(size);
      updateItemSize(instanceId, size);
    },
    [instanceId, updateItemSize],
  );

  const bind = useDrag(({ active, event, first }) => {
    const staticObstacles = useStore.getState().staticObstacles;

    setDragging(active);
    setIsDragging(active);
    event.stopPropagation();

    if (active && groupRef.current) {
      // 🌟 创建动态水平拖拽面：让玻璃板永远悬浮在家具当前的高度，彻底消除透视错位
      const horizontalPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, livePos[1], 0),
      );

      const intersection = new THREE.Vector3();

      raycaster.ray.intersectPlane(horizontalPlane, intersection);

      if (intersection) {
        if (first) {
          dragOffset.current.x = groupRef.current.position.x - intersection.x;
          dragOffset.current.z = groupRef.current.position.z - intersection.z;
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

        const maxBoundX = halfWidth - wX / 2;
        const maxBoundZ = halfDepth - wZ / 2;
        const minBoundX = -(halfWidth - wX / 2);
        const minBoundZ = -(halfDepth - wZ / 2);

        targetX = THREE.MathUtils.clamp(targetX, minBoundX + 0.05, maxBoundX);
        targetZ = THREE.MathUtils.clamp(targetZ, minBoundZ + 0.05, maxBoundZ);

        let isColliding = false;
        for (const other of placedItems) {
          if (other.instanceId === instanceId || !other.size) continue;

          const isOtherCeiling = other.position[1] >= roomHeight - 0.5;
          const otherBoxOffsetY = isOtherCeiling
            ? -other.size[1] / 2
            : other.size[1] / 2;
          const otherCenterY = other.position[1] + otherBoxOffsetY;

          const gapY = Math.abs(myCenterY - otherCenterY);
          const isYColliding = gapY < (modelSize[1] + other.size[1]) / 2;

          // 只有当高度(Y)重叠时，才去检查水平(X,Z)是否相撞
          if (isYColliding) {
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
        }

        if (!isColliding) {
          for (const obs of staticObstacles) {
            const gapY = Math.abs(myCenterY - (obs.y || 0)); // 兼容旧缓存
            const obsH = obs.h || roomHeight;
            const isYColliding = gapY < (modelSize[1] + obsH) / 2;

            if (isYColliding) {
              const gapX = Math.abs(targetX - obs.x);
              const gapZ = Math.abs(targetZ - obs.z);
              if (gapX < (wX + obs.w) / 2 && gapZ < (wZ + obs.d) / 2) {
                isColliding = true;
                break;
              }
            }
          }
        }

        if (!isColliding) {
          groupRef.current.position.x = targetX;
          groupRef.current.position.z = targetZ;
          setLivePos([targetX, livePos[1], targetZ]);
        }
      }
    } else if (!active && groupRef.current) {
      const { x, y, z } = groupRef.current.position;
      updateItemPosition(instanceId, [x, y, z]);
    }
  });

  // 自由旋转拖拽逻辑
  const bindRotate = useDrag(({ active, event }) => {
    event.stopPropagation(); // 阻止触发平移
    setIsDragging(active);
    setDraggingRotate(active);

    if (active && groupRef.current) {
      const horizontalPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, livePos[1], 0),
      );
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(horizontalPlane, intersection);

      if (intersection) {
        const dx = intersection.x - groupRef.current.position.x;
        const dz = intersection.z - groupRef.current.position.z;
        setLiveRotY(Math.atan2(dx, dz));
      }
    } else if (!active && groupRef.current) {
      updateItemRotation(instanceId, [rotation[0], liveRotY, rotation[2]]);
    }
  });

  // 垂直高度升降逻辑
  const bindHeight = useDrag(({ active, event, first }) => {
    event.stopPropagation();
    setIsDragging(active);
    setDraggingHeight(active);

    if (active && groupRef.current) {
      // 创建一个永远垂直、并正对相机的隐形拖拽检测面
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      camDir.y = 0; // 抹平相机的俯仰角，只保留水平朝向
      camDir.normalize().negate(); // 箭头指向相机

      // 这个面通过家具现在的坐标
      const verticalPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        camDir,
        groupRef.current.position,
      );

      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(verticalPlane, intersection);

      if (intersection) {
        if (first) {
          dragOffset.current.y = groupRef.current.position.y - intersection.y;
        }

        let targetY = intersection.y + dragOffset.current.y;

        // 防穿模保护：家具不能陷进地下，也不能戳破天花板
        const minY = isCeilingAnchor ? modelSize[1] : 0;
        const maxY = isCeilingAnchor ? roomHeight : roomHeight - modelSize[1];
        targetY = THREE.MathUtils.clamp(targetY, minY, Math.max(minY, maxY));

        setLivePos([livePos[0], targetY, livePos[2]]);
      }
    } else if (!active && groupRef.current) {
      // 鼠标松开，持久化高度到状态机
      updateItemPosition(instanceId, [livePos[0], livePos[1], livePos[2]]);
    }
  });

  // 智能尺寸线距离计算 (防家具遮挡)
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

  let distLeft = aLeft - -halfWidth;
  let distRight = halfWidth - aRight;
  let distBack = aBack - -halfDepth;
  let distFront = halfDepth - aFront;

  // 3. 遍历寻找距离当前家具最近的障碍物
  placedItems.forEach((other) => {
    if (other.instanceId === instanceId || !other.size) return;

    const isOtherCeiling = other.position[1] >= roomHeight - 0.5;
    const otherBoxOffsetY = isOtherCeiling
      ? -other.size[1] / 2
      : other.size[1] / 2;
    const otherCenterY = other.position[1] + otherBoxOffsetY;

    const gapY = Math.abs(myCenterY - otherCenterY);
    const isYColliding = gapY < (modelSize[1] + other.size[1]) / 2;

    if (!isYColliding) return; // 重点：高度不重叠直接放行！

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

    if (overlapZ && bRight <= aLeft)
      distLeft = Math.min(distLeft, aLeft - bRight);
    if (overlapZ && bLeft >= aRight)
      distRight = Math.min(distRight, bLeft - aRight);
    if (overlapX && bFront <= aBack)
      distBack = Math.min(distBack, aBack - bFront);
    if (overlapX && bBack >= aFront)
      distFront = Math.min(distFront, bBack - aFront);
  });

  const lineY = isCeilingAnchor ? -0.1 : 0.1;

  return (
    <group
      ref={groupRef}
      position={livePos}
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

      {/* UI 控制手柄层  */}
      {isSelected && (
        <group>
          {/* 旋转手柄  */}
          <group>
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

          {/* 高度调节手柄 (正上方) */}
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
              {/* 向上指向的圆锥体，代表拉升 */}
              <coneGeometry args={[0.15, 0.3, 32]} />
              <meshBasicMaterial
                color={hoverHeight || draggingHeight ? '#888888' : 'white'}
              />
            </mesh>
          </group>
        </group>
      )}

      {/* 动态尺寸线渲染层 */}
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
