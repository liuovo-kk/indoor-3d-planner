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

  duplicateItem: (id: string) => void;
  rotateItem: (id: string) => void;

  updateItemRotation: (
    instanceId: string,
    newRotation: [number, number, number],
  ) => void;

  //全局拖拽状态(解决 OrbitControls 冲突)
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;

  //视角状态
  viewMode: 'dollhouse' | 'top' | 'front' | 'back' | 'left' | 'right';
  setViewMode: (
    mode: 'dollhouse' | 'top' | 'front' | 'back' | 'left' | 'right',
  ) => void;

  // 选中与删除相关的状态
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  removePlacedItem: (id: string) => void;

  // --- 协作状态 ---
  clientId: string | null;
  setClientId: (id: string | null) => void;
  collabConnected: boolean;
  setCollabConnected: (v: boolean) => void;
  collabEnabled: boolean;
  setCollabEnabled: (v: boolean) => void;
  onlineUsers: number;
  setOnlineUsers: (n: number) => void;

  // --- 侧边栏 Tab 控制与推荐状态 ---
  activeSidebarTab: 'add' | 'recommend' | 'ai';
  setActiveSidebarTab: (tab: 'add' | 'recommend' | 'ai') => void;

  currentRecommendItem: FurnitureData | null;
  setCurrentRecommendItem: (item: FurnitureData | null) => void;
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
      placedItems: [
        ...state.placedItems,
        { ...item, rotation: item.rotation || [0, 0, 0] },
      ],
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
  // 实现更新尺寸的具体逻辑
  // 遍历所有已放置的家具，找到那个 ID 匹配的，把测量出来的真实 size 塞给它
  updateItemSize: (instanceId, size) =>
    set((state) => ({
      placedItems: state.placedItems.map((item) =>
        item.instanceId === instanceId ? { ...item, size } : item,
      ),
    })),

  // 实现更新旋转的具体逻辑
  updateItemRotation: (instanceId, newRotation) =>
    set((state) => ({
      placedItems: state.placedItems.map((item) =>
        item.instanceId === instanceId
          ? { ...item, rotation: newRotation }
          : item,
      ),
    })),

  // 复制功能的实现
  duplicateItem: (id) =>
    set((state) => {
      // 1. 找到要复制的原始家具
      const itemToCopy = state.placedItems.find((i) => i.instanceId === id);
      if (!itemToCopy) return state;

      // 2. 生成一个新对象，赋新ID，并在位置上稍微偏移一点，避免完全重叠看不出来
      const newItem = {
        ...itemToCopy,
        instanceId: Math.random().toString(36).substring(7),
        position: [
          itemToCopy.position[0] + 0.6,
          0,
          itemToCopy.position[2] + 0.6,
        ] as [number, number, number],
      };

      // 3. 将新家具加入数组，并自动选中新家具
      return {
        placedItems: [...state.placedItems, newItem],
        selectedItemId: newItem.instanceId,
      };
    }),

  // 旋转功能的实现 (每次顺时针旋转 90 度)
  rotateItem: (id) =>
    set((state) => ({
      placedItems: state.placedItems.map((item) => {
        if (item.instanceId === id) {
          // 取出当前的 Y 轴旋转角度，加上 90度 (Math.PI / 2)
          const currentRotY = item.rotation ? item.rotation[1] : 0;
          return { ...item, rotation: [0, currentRotY + Math.PI / 2, 0] };
        }
        return item;
      }),
    })),

  selectedItemId: null,

  setSelectedItemId: (id) => set({ selectedItemId: id }),

  removePlacedItem: (id) =>
    set((state) => ({
      // 过滤掉被删除的那个家具
      placedItems: state.placedItems.filter((item) => item.instanceId !== id),
      // 如果删除的正是当前选中的，就把选中状态清空
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
    })),

  // --- 协作初始值 ---
  clientId: null,
  setClientId: (id) => set({ clientId: id }),
  collabConnected: false,
  setCollabConnected: (v) => set({ collabConnected: v }),
  collabEnabled: false,
  setCollabEnabled: (v) => set({ collabEnabled: v }),
  onlineUsers: 0,
  setOnlineUsers: (n) => set({ onlineUsers: n }),

  activeSidebarTab: 'add',
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),

  currentRecommendItem: null,
  setCurrentRecommendItem: (item) => set({ currentRecommendItem: item }),
}));

export default useStore;
