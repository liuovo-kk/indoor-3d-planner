import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { useMemo } from 'react';

export default function TextureTest() {
  const gltf = useLoader(GLTFLoader, './assets/models/Bathroom_downstairs.glb');

  const box = useMemo(() => {
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshStandardMaterial({ color: '#ff0000' });

    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const m = child.material as THREE.MeshStandardMaterial;
        if (m.map && !mat.map) {
          mat.map = m.map;
          mat.normalMap = m.normalMap || null;
          console.log(`[TextureTest] Using texture from ${child.name}: ${m.map.image?.width}x${m.map.image?.height}`);
        }
      }
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 2, 0);
    return mesh;
  }, [gltf]);

  return <primitive object={box} />;
}
