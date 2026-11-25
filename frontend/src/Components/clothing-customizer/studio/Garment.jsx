import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
export default function Garment({ resources, scale = 2, position = [0, 0, 0], ...props }) {
  const { invalidate } = useThree();
  useEffect(() => {
    invalidate();
  }, [invalidate, resources.version, resources.trimColor]);
  return <group {...props} scale={scale} position={position} dispose={null}><group position={[0, -1.287, 0]}>
    {resources.meshes.map(mesh => <mesh key={mesh.name} geometry={mesh.geometry} castShadow receiveShadow>
      <meshStandardMaterial map={resources.textures[mesh.panel] || null} color={mesh.panel === 'trim' ? resources.trimColor : '#ffffff'} roughness={.88} metalness={0} />
    </mesh>)}
  </group></group>;
}
