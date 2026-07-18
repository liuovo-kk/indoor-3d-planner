import { useEffect, useRef, useState } from 'react';
import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';
import { fetchGlbModel } from '../api/model';

interface AsyncModelProps {
  modelId: string;
  onLoadSize?: (size: [number, number, number]) => void;
}

export default function AsyncModel({ modelId, onLoadSize }: AsyncModelProps) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const sizeReported = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    sizeReported.current = null;

    fetchGlbModel(modelId)
      .then(async (blob) => {
        if (cancelled) return;
        const buffer = await blob.arrayBuffer();
        const loader = new GLTFLoader();
        loader.parse(
          buffer,
          '',
          (gltf) => {
            if (cancelled) return;
            const gltfScene = gltf.scene;

            gltfScene.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.receiveShadow = true;
                child.castShadow = true;
              }
            });

            if (onLoadSize && sizeReported.current !== modelId) {
              const box = new THREE.Box3().setFromObject(gltfScene);
              const size = new THREE.Vector3();
              box.getSize(size);
              onLoadSize([size.x, size.y, size.z]);
              sizeReported.current = modelId;
            }

            setScene(gltfScene);
          },
          (err) => {
            console.error(
              `[AsyncModel] Failed to parse GLB for ${modelId}:`,
              err,
            );
          },
        );
      })
      .catch((err) => {
        console.error(`[AsyncModel] Failed to fetch GLB for ${modelId}:`, err);
      });

    return () => {
      cancelled = true;
    };
  }, [modelId, onLoadSize]);

  if (!scene) return null;

  return <primitive ref={groupRef} object={scene} />;
}
