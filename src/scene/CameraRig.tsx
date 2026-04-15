import { useFrame } from '@react-three/fiber';
import useStore from '../store/useStore';
import * as THREE from 'three';

export default function CameraRig() {
  // 订阅 Zustand 里的视角状态
  const viewMode = useStore((state) => state.viewMode);
  useFrame((state) => {
    // 根据当前模式，设定摄像机应该飞往的“目标坐标”
    let targetPosition = new THREE.Vector3(15, 15, 15);

    if (viewMode === 'top') {
      // 如果 x,z 都是 0，相机会产生万向节死锁(Gimbal Lock)导致画面翻转
      // 所以给 z 加上 0.1，用人类肉眼看不出来的倾斜来避开死锁
      targetPosition.set(0, 20, 0.1);
    } else if (viewMode === 'front') {
      targetPosition.set(0, 5, 20);
    }

    // 在 CameraRig 的 useFrame 循环中增加判断
    if (viewMode === 'front') targetPosition.set(0, 5, 20);
    if (viewMode === 'back') targetPosition.set(0, 5, -20);
    if (viewMode === 'left') targetPosition.set(-20, 5, 0);
    if (viewMode === 'right') targetPosition.set(20, 5, 0);

    // 使用 Lerp (线性插值) 让相机丝滑地“飞”过去
    // 0.05 是移动阻尼速度，数值越小越丝滑缓慢，越大越干脆
    state.camera.position.lerp(targetPosition, 0.1);

    //摄像机永远盯着房间正中心
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}
