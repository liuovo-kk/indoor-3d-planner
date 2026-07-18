import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export default function BathroomTest() {
  const { scene } = useGLTF('./assets/models/Bathroom_downstairs.glb');
  const [texturesOk, setTexturesOk] = React.useState(false);
  const [testMesh, setTestMesh] = React.useState<THREE.Mesh | null>(null);
  const groupRef = React.useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const g = new THREE.Group();

    // Try rendering each mesh that has a texture, but disable vertexColors
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.map) {
          const c = child.clone();
          (c.material as THREE.MeshStandardMaterial) = mat.clone();
          (c.material as THREE.MeshStandardMaterial).vertexColors = false;
          c.position.set(0, 2, 0);
          g.add(c);
        }
      }
    });

    groupRef.current.add(g);
    return () => { groupRef.current?.remove(g); };
  }, [scene]);

  return <group ref={groupRef} />;
}
