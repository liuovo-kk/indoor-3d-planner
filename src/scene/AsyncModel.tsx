// src/scene/AsyncModel.tsx
import { useEffect, useState, Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { fetchGlbModel } from '../api/model';
import * as THREE from 'three';

interface AsyncModelProps {
  modelId: string;
  onLoadSize: (size: [number, number, number]) => void;
}

// 把占位用的灰盒子提取成一个小组件，方便复用
const FallbackBox = () => (
  <mesh position={[0, 0.5, 0]}>
    <boxGeometry args={[0, 0, 0]} />
    <meshStandardMaterial color="#cccccc" wireframe />
  </mesh>
);

export default function AsyncModel({ modelId, onLoadSize }: AsyncModelProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      try {
        // 直接调用方法，拿到纯粹的二进制数据
        const blobData = await fetchGlbModel(modelId);

        if (isMounted) {
          // 把二进制数据转换成浏览器内存里的临时下载链接
          const url = URL.createObjectURL(blobData as unknown as Blob);
          setBlobUrl(url);
        }
      } catch (error) {
        console.error(`模型 ${modelId} 加载失败:`, error);
      }
    };

    loadModel();

    return () => {
      isMounted = false;
      // 离开房间或删除家具时，销毁临时链接，防止浏览器内存爆炸
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [modelId]);

  if (!blobUrl) {
    return <FallbackBox />;
  }

  return (
    <Suspense fallback={<FallbackBox />}>
      <RealGLTFModel url={blobUrl} onLoad={onLoadSize} />
    </Suspense>
  );
}

function RealGLTFModel({
  url,
  onLoad,
}: {
  url: string;
  onLoad: (size: [number, number, number]) => void;
}) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(), [scene]);

  // 🌟 核心魔法：组件渲染完成时，自动测量模型的长宽高
  useEffect(() => {
    // 创建一个能包裹住整个模型的虚拟包围盒
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size); // 拿到长宽高

    // 把测量结果传给外面的父组件
    onLoad([size.x, size.y, size.z]);
  }, [clone]);

  return <primitive object={clone} />;
}
