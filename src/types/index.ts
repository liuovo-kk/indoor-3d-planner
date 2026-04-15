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
}
