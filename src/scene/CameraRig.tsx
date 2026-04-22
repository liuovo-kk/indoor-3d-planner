import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import useStore from '../store/useStore';
import * as THREE from 'three';

export default function CameraRig() {
  const { camera, controls } = useThree();
  // 订阅 Zustand 里的视角状态
  const viewMode = useStore((state) => state.viewMode);
  const targetPos = useRef(new THREE.Vector3(12, 12, 12));
  const isAnimating = useRef(false);
  // 当 UI 点击切换视角时触发
  useEffect(() => {
    // 只要切了视角，立刻开启“自动驾驶”动画
    isAnimating.current = true;

    if (viewMode === 'dollhouse') {
      targetPos.current.set(12, 12, 12);
    } else if (viewMode === 'top') {
      targetPos.current.set(0, 20, 0.1);
    } else if (viewMode === 'front') {
      targetPos.current.set(0, 5, 20);
    } else if (viewMode === 'back') {
      targetPos.current.set(0, 5, -20);
    } else if (viewMode === 'left') {
      targetPos.current.set(-20, 5, 0);
    } else if (viewMode === 'right') {
      targetPos.current.set(20, 5, 0);
    }

    // 每次切换时，把 OrbitControls 的观察中心强制拉回房间中央，防止视角跑偏
    if (controls) {
      // @ts-ignore
      controls.target.set(0, 0, 0);
    }
  }, [viewMode, controls]);

  // 渲染循环（每秒 60 次）
  useFrame((state) => {
    // 🌟 3. 核心放权逻辑：
    // 如果当前是 3D 漫游模式，并且【自动驾驶动画已经播完了】，立刻罢工，让鼠标接管！
    if (viewMode === 'dollhouse' && !isAnimating.current) {
      return;
    }

    // 只要没 return，就执行丝滑的飞行插值
    state.camera.position.lerp(targetPos.current, 0.1);
    state.camera.lookAt(0, 0, 0);

    // 🌟 4. 到达检测：如果当前坐标和目标坐标的距离小于 0.1（快飞到了）
    if (
      isAnimating.current &&
      state.camera.position.distanceTo(targetPos.current) < 0.1
    ) {
      // 宣布动画结束，关闭自动驾驶！
      isAnimating.current = false;
    }
  });

  return null;
}
