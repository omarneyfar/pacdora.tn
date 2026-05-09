"use client";

import { Suspense, useEffect, useMemo } from "react";
import { ContactShadows, Edges, Environment, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { DoubleSide, SRGBColorSpace, type Texture } from "three";

import { CARTON_DIMENSIONS, type FaceKey } from "@/lib/carton";

type CartonStageProps = {
  faces: Partial<Record<FaceKey, string>>;
  className?: string;
};

type FacePlaneProps = {
  size: [number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  textureUrl?: string;
};

export function CartonStage({ faces, className = "" }: CartonStageProps) {
  return (
    <div className={`stage-shell ${className}`}>
      <Canvas camera={{ position: [3.3, 2.4, 4.4], fov: 36 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
        <color attach="background" args={["#f6f1e6"]} />
        <ambientLight intensity={0.75} />
        <directionalLight castShadow intensity={1.8} position={[3.5, 4.5, 4.5]} />
        <directionalLight intensity={0.6} position={[-4, 2, -2]} />
        <Suspense fallback={null}>
          <CartonModel faces={faces} />
          <Environment preset="city" />
        </Suspense>
        <ContactShadows blur={2.8} far={6} opacity={0.28} position={[0, -2.08, 0]} scale={6} />
        <OrbitControls
          enableDamping
          enablePan={false}
          maxDistance={7}
          maxPolarAngle={Math.PI * 0.82}
          minDistance={2.6}
          target={[0, 0.12, 0]}
        />
      </Canvas>
    </div>
  );
}

function CartonModel({ faces }: { faces: Partial<Record<FaceKey, string>> }) {
  const unit = 0.025;
  const width = CARTON_DIMENSIONS.width * unit;
  const height = CARTON_DIMENSIONS.height * unit;
  const depth = CARTON_DIMENSIONS.depth * unit;
  const lift = 0.004;

  return (
    <group rotation={[0, -0.18, 0]}>
      <FacePlane
        position={[0, 0, depth / 2 + lift]}
        rotation={[0, 0, 0]}
        size={[width, height]}
        textureUrl={faces.front}
      />
      <FacePlane
        position={[0, 0, -depth / 2 - lift]}
        rotation={[0, Math.PI, 0]}
        size={[width, height]}
        textureUrl={faces.back}
      />
      <FacePlane
        position={[-width / 2 - lift, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[depth, height]}
        textureUrl={faces.left}
      />
      <FacePlane
        position={[width / 2 + lift, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[depth, height]}
        textureUrl={faces.right}
      />
      <FacePlane
        position={[0, height / 2 + lift, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[width, depth]}
        textureUrl={faces.top}
      />
      <FacePlane
        position={[0, -height / 2 - lift, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        size={[width, depth]}
        textureUrl={faces.bottom}
      />
      <mesh>
        <boxGeometry args={[width + lift, height + lift, depth + lift]} />
        <meshBasicMaterial color="#ffffff" opacity={0} transparent />
        <Edges color="#223028" lineWidth={1.4} />
      </mesh>
    </group>
  );
}

function FacePlane({ size, position, rotation, textureUrl }: FacePlaneProps) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      {textureUrl ? <ArtworkMaterial url={textureUrl} /> : <BlankMaterial />}
    </mesh>
  );
}

function ArtworkMaterial({ url }: { url: string }) {
  const texture = useTexture(url) as Texture;
  const preparedTexture = useMemo(() => {
    const nextTexture = texture.clone();
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.anisotropy = 8;
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [texture]);

  useEffect(() => {
    return () => preparedTexture.dispose();
  }, [preparedTexture]);

  return <meshStandardMaterial color="#ffffff" map={preparedTexture} roughness={0.46} side={DoubleSide} />;
}

function BlankMaterial() {
  return <meshStandardMaterial color="#fbfaf4" roughness={0.62} side={DoubleSide} />;
}
