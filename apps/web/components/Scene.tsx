// @ts-nocheck
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Stars } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh } from "three";

function CoreOrb() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.18;
    ref.current.rotation.y += delta * 0.28;
  });

  return (
    <Float speed={2.2} rotationIntensity={0.7} floatIntensity={1.2}>
      <mesh ref={ref} position={[0, 0.2, 0]}>
        <icosahedronGeometry args={[1.8, 5]} />
        <MeshDistortMaterial
          color="#7c3aed"
          emissive="#00d4ff"
          emissiveIntensity={0.25}
          roughness={0.28}
          metalness={0.72}
          distort={0.32}
          speed={1.8}
        />
      </mesh>
    </Float>
  );
}

export function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 5.3], fov: 45 }}>
      <ambientLight intensity={0.35} />
      <pointLight position={[3, 2, 4]} intensity={18} color="#00d4ff" />
      <pointLight position={[-3, -2, 3]} intensity={14} color="#ff2bd6" />
      <Stars radius={60} depth={32} count={900} factor={3.4} fade speed={1} />
      <CoreOrb />
    </Canvas>
  );
}
