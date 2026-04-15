// src/store/useStore.ts
import { create } from 'zustand';
import { FurnitureData, PlacedFurniture } from '../types';

// 定义整个 Store 的数据结构
interface AppState {
  // --- UI 状态 ---
  furnitureList: FurnitureData[];
  setFurnitureList: (list: FurnitureData[]) => void;

  cameraMode: 'dollhouse' | 'top' | 'side';
  setCameraMode: (mode: 'dollhouse' | 'top' | 'side') => void;

  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // --- 3D 场景状态 ---
  placedItems: PlacedFurniture[];
  addPlacedItem: (item: PlacedFurniture) => void;
  removeLastItem: () => void;
  updateItemPosition: (
    instanceId: string,
    newPosition: [number, number, number],
  ) => void;

  updateItemSize: (instanceId: string, size: [number, number, number]) => void;

  //全局拖拽状态(解决 OrbitControls 冲突)
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;

  //视角状态
  viewMode: 'dollhouse' | 'top' | 'front' | 'back' | 'left' | 'right';
  setViewMode: (
    mode: 'dollhouse' | 'top' | 'front' | 'back' | 'left' | 'right',
  ) => void;
}

// 创建 Store
const useStore = create<AppState>((set) => ({
  furnitureList: [],
  setFurnitureList: (list) => set({ furnitureList: list }),

  cameraMode: 'dollhouse',
  setCameraMode: (mode) => set({ cameraMode: mode }),

  isDragging: false,
  setIsDragging: (dragging) => set({ isDragging: dragging }),

  viewMode: 'dollhouse', // 默认是轴测图
  setViewMode: (mode) => set({ viewMode: mode }),

  isSidebarOpen: true,
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  placedItems: [],
  addPlacedItem: (item) =>
    set((state) => ({
      placedItems: [...state.placedItems, item],
    })),
  removeLastItem: () =>
    set((state) => ({
      placedItems: state.placedItems.slice(0, -1),
    })),
  updateItemPosition: (instanceId, newPosition) =>
    set((state) => ({
      placedItems: state.placedItems.map((item) =>
        item.instanceId === instanceId
          ? { ...item, position: [newPosition[0], 0, newPosition[2]] }
          : item,
      ),
    })),
  // 🌟 新增：实现更新尺寸的具体逻辑
  // 遍历所有已放置的家具，找到那个 ID 匹配的，把测量出来的真实 size 塞给它
  updateItemSize: (instanceId, size) =>
    set((state) => ({
      placedItems: state.placedItems.map((item) =>
        item.instanceId === instanceId ? { ...item, size } : item,
      ),
    })),
}));

export default useStore;
