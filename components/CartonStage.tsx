"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ContactShadows, Edges, Environment, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { DoubleSide, SRGBColorSpace, Vector3, type Texture } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { DEFAULT_CARTON_DIMENSIONS, type CartonDimensions, type FaceKey, normalizeDimensions } from "@/lib/carton";

type CartonStageProps = {
  dimensions?: CartonDimensions;
  faces: Partial<Record<FaceKey, string>>;
  className?: string;
};

type FacePlaneProps = {
  size: [number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  textureUrl?: string;
};

const CAMERA_TARGET = new Vector3(0, 0.03, 0);
const DEFAULT_CAMERA_POSITION = new Vector3(4.9, 3.7, 6.1);
const DEFAULT_CAMERA_DISTANCE = DEFAULT_CAMERA_POSITION.distanceTo(CAMERA_TARGET);
const MIN_ZOOM_LEVEL = -2;
const MAX_ZOOM_LEVEL = 4;

export function CartonStage({ dimensions = DEFAULT_CARTON_DIMENSIONS, faces, className = "" }: CartonStageProps) {
  const safeDimensions = normalizeDimensions(dimensions);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const unit = 3.35 / Math.max(safeDimensions.width, safeDimensions.height, safeDimensions.depth);
  const shadowY = -(safeDimensions.height * unit) / 2 - 0.08;
  const zoomPercent = Math.round(100 * Math.pow(1.16, zoomLevel));

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function zoomOut() {
    setZoomLevel((current) => Math.max(MIN_ZOOM_LEVEL, current - 1));
  }

  function zoomIn() {
    setZoomLevel((current) => Math.min(MAX_ZOOM_LEVEL, current + 1));
  }

  function resetView() {
    setZoomLevel(0);
    setResetSignal((current) => current + 1);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await shellRef.current?.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  }

  return (
    <div className={`stage-shell ${className}`} ref={shellRef}>
      <Canvas camera={{ position: DEFAULT_CAMERA_POSITION.toArray(), fov: 40 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
        <color attach="background" args={["#f6f1e6"]} />
        <ambientLight intensity={0.75} />
        <directionalLight castShadow intensity={1.8} position={[3.5, 4.5, 4.5]} />
        <directionalLight intensity={0.6} position={[-4, 2, -2]} />
        <Suspense fallback={null}>
          <CartonModel dimensions={safeDimensions} faces={faces} />
          <Environment preset="city" />
        </Suspense>
        <ContactShadows blur={2.8} far={6} opacity={0.28} position={[0, shadowY, 0]} scale={6} />
        <CameraControls resetSignal={resetSignal} zoomLevel={zoomLevel} />
      </Canvas>
      <div className="stage-toolbox" aria-label="Canvas tools">
        <button className="stage-tool" disabled={zoomLevel <= MIN_ZOOM_LEVEL} title="Zoom out" type="button" onClick={zoomOut}>
          <ZoomOut aria-hidden size={17} />
        </button>
        <span className="stage-zoom-readout">{zoomPercent}%</span>
        <button className="stage-tool" disabled={zoomLevel >= MAX_ZOOM_LEVEL} title="Zoom in" type="button" onClick={zoomIn}>
          <ZoomIn aria-hidden size={17} />
        </button>
        <button className="stage-tool" title="Reset view" type="button" onClick={resetView}>
          <RotateCcw aria-hidden size={17} />
        </button>
        <button className="stage-tool" title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} type="button" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 aria-hidden size={17} /> : <Maximize2 aria-hidden size={17} />}
        </button>
      </div>
    </div>
  );
}

function CartonModel({
  dimensions,
  faces
}: {
  dimensions: CartonDimensions;
  faces: Partial<Record<FaceKey, string>>;
}) {
  const unit = 3.35 / Math.max(dimensions.width, dimensions.height, dimensions.depth);
  const width = dimensions.width * unit;
  const height = dimensions.height * unit;
  const depth = dimensions.depth * unit;
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

function CameraControls({ resetSignal, zoomLevel }: { resetSignal: number; zoomLevel: number }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  useEffect(() => {
    const distance = DEFAULT_CAMERA_DISTANCE * Math.pow(0.86, zoomLevel);
    const direction =
      resetSignal > 0
        ? DEFAULT_CAMERA_POSITION.clone().sub(CAMERA_TARGET).normalize()
        : camera.position.clone().sub(CAMERA_TARGET).normalize();

    if (direction.lengthSq() === 0) {
      direction.copy(DEFAULT_CAMERA_POSITION).sub(CAMERA_TARGET).normalize();
    }

    camera.position.copy(CAMERA_TARGET).add(direction.multiplyScalar(distance));
    camera.lookAt(CAMERA_TARGET);
    controlsRef.current?.target.copy(CAMERA_TARGET);
    controlsRef.current?.update();
  }, [camera, resetSignal, zoomLevel]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      enablePan={false}
      maxDistance={8.4}
      maxPolarAngle={Math.PI * 0.82}
      minDistance={3.6}
      target={CAMERA_TARGET.toArray()}
    />
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
