# 🛋️ Indoor 3D Web Planner (室内 3D 布局漫游系统)

基于 React Three Fiber 构建的高保真、高性能 Web 3D 室内布局排版系统。支持多视角切换、物理级模型拖拽碰撞，以及真实光影渲染，致力于提供接近原生客户端的 3D 室内设计体验。

## ✨ 核心特性 (Core Features)

- **🖼️ 高级 PBR 渲染与真实光影**
  - 引入本地 HDR 环境贴图，优化 WebGL Tone Mapping 与全局光照（Ambient / Hemisphere / Directional Light）。
  - 完美还原高级物理材质（皮质、木纹、金属）的漫反射与高光细节，拒绝“塑料感”。
- **👁️ 动态视线裁剪系统 (View-dependent Culling)**
  - 构建完整的“四面墙”物理结构，并结合相机状态实现**视角联动隐身**。
  - 无论切换至左/右/前/后视图，遮挡相机的墙壁会自动透明，实现极佳的室内透视与空间交互感。
- **🧱 物理级拖拽与边界碰撞**
  - **贴地重力锁**：数据层拦截脏坐标，强制 Y 轴归零，解决模型悬浮 Bug，实现真实的“落地感”。
  - **非对称 AABB 边界钳制**：精准计算墙体厚度与模型真实尺寸，防穿模、防出界，实现“指哪打哪”的拖拽手感。
- **🎥 多相机状态管控**
  - 深度集成 Zustand，实现鸟瞰图 (Dollhouse)、正交俯视图 (Top)、立面图 (Side) 的无缝切换。
- **⚡ 高性能无限滚动加载**
  - 结合 `Intersection Observer` API 实现侧边栏 3D 模型资产的懒加载。
  - 规避 React 闭包陷阱，保障海量家具数据涌入时的稳定帧率。

## 🛠️ 技术栈 (Tech Stack)

- **核心框架:** React 18, TypeScript, Vite
- **3D 引擎:** Three.js, React Three Fiber (R3F), @react-three/drei
- **状态管理:** Zustand
- **样式处理:** Tailwind CSS
- **交互手势:** @use-gesture/react

## 🚀 快速启动 (Quick Start)

```bash
# 1. 克隆项目
git clone [https://github.com/你的用户名/你的仓库名.git](https://github.com/你的用户名/你的仓库名.git)

# 2. 进入项目目录
cd 你的仓库名

# 3. 安装依赖
npm install

# 4. 启动本地开发服务器
npm run dev
```
