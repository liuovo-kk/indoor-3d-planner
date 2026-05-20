// src/types/index.ts

// 1. 对应你后端返回的原始家具数据结构 (参照你给的 JSON)
export interface FurnitureCategory {
  category: string;
  style: string;
  material: string | null;
  model_id: string;
  'super-category': string;
  theme: string | null;
}

export interface FurnitureData {
  model_id: string;
  image: string;
  category: FurnitureCategory;
  // 为了严谨，后端返回的 material/style 等嵌套对象我们先忽略，主要用 category 里的信息
}

// 2. 对应我们在 3D 场景中“放置”的实例数据结构
// 它继承了后端的原始数据，并增加了 3D 特有的属性
export interface PlacedFurniture extends FurnitureData {
  instanceId: string; // 唯一实例ID（因为同一个沙发可以放多个）
  size?: [number, number, number]; //长宽高
  position: [number, number, number]; // [x, y, z] 坐标
  rotation?: [number, number, number]; // [x, y, z] 旋转角度（欧拉角）
  // 协作同步字段
  objectId?: string; // 服务器端 objectId（UUID）
  ownerId?: string; // 创建者的 clientId
  isRemote?: boolean; // 是否来自远程用户
}

// 3. 服务端家具数据格式（用于 WebSocket 消息）
export interface CollabFurniture {
  objectId: string;
  prefab: string;
  pos: { x: number; y: number; z: number };
  rot: { x: number; y: number; z: number; w?: number };
  scale: { x: number; y: number; z: number };
  version: number;
}

// 4. WebSocket 消息类型
export type CollabMessage =
  | { type: 'join' }
  | { type: 'ping' }
  | { type: 'welcome'; userId: string }
  | { type: 'pong'; ts: number }
  | { type: 'sync_full'; state: CollabFurniture[]; srvTs: number }
  | { type: 'user_online'; userId: string }
  | { type: 'user_offline'; userId: string }
  | {
      type: 'create_furniture';
      from: string;
      payload: CollabFurniture;
      srvTs: number;
    }
  | {
      type: 'drag_update';
      from: string;
      payload: {
        objectId: string;
        pos: { x: number; y: number; z: number };
        rot: { x: number; y: number; z: number; w?: number };
        scale: { x: number; y: number; z: number };
        version: number;
      };
      srvTs: number;
    }
  | {
      type: 'delete_furniture';
      from: string;
      payload: { objectId: string };
      srvTs: number;
    }
  | { type: 'error'; message: string };
