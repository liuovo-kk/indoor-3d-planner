// 家具智能放置工具：在房间内找到不碰撞的空位

export interface CollisionBox {
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
}

export interface RoomBounds {
  width: number;
  depth: number;
  height: number;
}

function rotAwareExtents(
  w: number,
  d: number,
  rotY: number,
): { wX: number; wZ: number } {
  const cos = Math.abs(Math.cos(rotY));
  const sin = Math.abs(Math.sin(rotY));
  return {
    wX: cos * w + sin * d,
    wZ: sin * w + cos * d,
  };
}

/**
 * 检查候选位置是否与已有物品、障碍物、房间边界发生碰撞。
 * 碰撞逻辑与 DraggableFurniture 拖拽检测保持一致。
 */
function hasCollision(
  cx: number,
  cy: number,
  cz: number,
  size: [number, number, number],
  isCeiling: boolean,
  room: RoomBounds,
  existingItems: CollisionBox[],
  staticObstacles: CollisionBox[],
): boolean {
  const [w, h, d] = size;
  const { wX, wZ } = rotAwareExtents(w, d, 0); // 新放置物品默认 rotation=0

  // 1. 房间边界检测
  const halfW = room.width / 2;
  const halfD = room.depth / 2;
  if (
    cx - wX / 2 < -halfW + 0.05 ||
    cx + wX / 2 > halfW - 0.05 ||
    cz - wZ / 2 < -halfD + 0.05 ||
    cz + wZ / 2 > halfD - 0.05
  ) {
    return true;
  }

  // 天花板物品 Y 中心 = posY - h/2，地面物品 Y 中心 = posY + h/2
  const newCenterY = isCeiling ? cy - h / 2 : cy + h / 2;

  // 2. 已有家具碰撞检测
  for (const item of existingItems) {
    const [ix, iy, iz] = item.position;
    const [iw, ih, id] = item.size;
    const iRotY = item.rotation ? item.rotation[1] : 0;

    const isOtherCeiling = iy >= room.height - 0.5;
    const otherCenterY = isOtherCeiling ? iy - ih / 2 : iy + ih / 2;

    // Y 轴重叠检测
    const gapY = Math.abs(newCenterY - otherCenterY);
    if (gapY >= (h + ih) / 2) continue;

    // XZ 轴旋转感知碰撞
    const otherExtents = rotAwareExtents(iw, id, iRotY);
    const gapX = Math.abs(cx - ix);
    const gapZ = Math.abs(cz - iz);

    if (
      gapX < (wX + otherExtents.wX) / 2 &&
      gapZ < (wZ + otherExtents.wZ) / 2
    ) {
      return true;
    }
  }

  // 3. 静态障碍物碰撞检测
  for (const obs of staticObstacles) {
    const obsH = obs.size[1] || room.height;
    const obsCenterY = obs.size[1]
      ? obs.position[1] // 障碍物有尺寸就用它的 Y 中心
      : 0;

    const gapY = Math.abs(newCenterY - obsCenterY);
    if (gapY >= (h + obsH) / 2) continue;

    const gapX = Math.abs(cx - obs.position[0]);
    const gapZ = Math.abs(cz - obs.position[2]);

    if (
      gapX < (wX + obs.size[0]) / 2 &&
      gapZ < (wZ + obs.size[2]) / 2
    ) {
      return true;
    }
  }

  return false;
}

/**
 * 在房间内找一个不碰撞的空位放置家具。
 *
 * 使用网格扫描算法：从房间后左角 (back-left) 逐行向前面扫描，
 * 返回第一个合法坐标。如果房间已满，回退到中心小随机偏移。
 *
 * @param furnitureSize - 家具尺寸 [宽, 高, 深]
 * @param isCeiling     - 是否天花板物品（灯具等）
 * @param room          - 房间尺寸
 * @param existingItems - 已放置的家具列表
 * @param staticObstacles - 房间内置障碍物
 * @param stepSize      - 扫描步长，默认 0.4m
 * @returns 合法放置坐标 [x, y, z]
 */
export function findValidPlacement(
  furnitureSize: [number, number, number],
  isCeiling: boolean,
  room: RoomBounds,
  existingItems: CollisionBox[],
  staticObstacles: CollisionBox[],
  stepSize: number = 0.4,
): [number, number, number] {
  const [fw, fh, fd] = furnitureSize;
  const { wX, wZ } = rotAwareExtents(fw, fd, 0);
  const halfW = room.width / 2;
  const halfD = room.depth / 2;
  const y = isCeiling ? room.height - fh : 0;

  // 优先尝试房间正中，视觉上最自然
  if (
    !hasCollision(0, y, 0, furnitureSize, isCeiling, room, existingItems, staticObstacles)
  ) {
    return [0, y, 0];
  }

  // 中间放不下，从中心向外螺旋扩散找空位
  // 先生成所有合法网格点，按距中心距离排序，优先尝试近的
  const candidates: [number, number][] = [];
  const startX = -halfW + wX / 2;
  const endX = halfW - wX / 2;
  const startZ = -halfD + wZ / 2;
  const endZ = halfD - wZ / 2;

  for (let x = startX; x <= endX; x += stepSize) {
    for (let z = startZ; z <= endZ; z += stepSize) {
      candidates.push([x, z]);
    }
  }
  candidates.sort((a, b) => a[0] ** 2 + a[1] ** 2 - (b[0] ** 2 + b[1] ** 2));

  for (const [x, z] of candidates) {
    if (
      !hasCollision(x, y, z, furnitureSize, isCeiling, room, existingItems, staticObstacles)
    ) {
      return [Number(x.toFixed(4)), y, Number(z.toFixed(4))];
    }
  }

  // 回退：房间已满，放在中心附近带小随机偏移
  return [
    Number((Math.random() - 0.5).toFixed(4)),
    y,
    Number((Math.random() - 0.5).toFixed(4)),
  ];
}
