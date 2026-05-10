"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ContactShadows, Edges, Environment, Line, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Maximize2, Minimize2, RotateCcw, Ruler, ZoomIn, ZoomOut } from "lucide-react";
import { DoubleSide, SRGBColorSpace, Vector3, type Texture } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import {
  DEFAULT_CARTON_DIMENSIONS,
  PRINT_GUIDE_OFFSETS,
  type CartonDimensions,
  type FaceKey,
  normalizeDimensions
} from "@/lib/carton";

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
const MIN_ZOOM_PERCENT = 50;
const MAX_ZOOM_PERCENT = 200;
const ZOOM_BUTTON_FACTOR = 1.16;

export function CartonStage({ dimensions = DEFAULT_CARTON_DIMENSIONS, faces, className = "" }: CartonStageProps) {
  const safeDimensions = normalizeDimensions(dimensions);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [resetSignal, setResetSignal] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const unit = 3.35 / Math.max(safeDimensions.width, safeDimensions.height, safeDimensions.depth);
  const shadowY = -(safeDimensions.height * unit) / 2 - 0.08;

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function zoomOut() {
    setZoomPercent((current) => clampZoomPercent(current / ZOOM_BUTTON_FACTOR));
  }

  function zoomIn() {
    setZoomPercent((current) => clampZoomPercent(current * ZOOM_BUTTON_FACTOR));
  }

  function resetView() {
    setZoomPercent(100);
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
          <CartonModel dimensions={safeDimensions} faces={faces} showGuides={showGuides} />
          <Environment preset="city" />
        </Suspense>
        <ContactShadows blur={2.8} far={6} opacity={0.28} position={[0, shadowY, 0]} scale={6} />
        <CameraControls resetSignal={resetSignal} zoomPercent={zoomPercent} onZoomPercentChange={setZoomPercent} />
      </Canvas>
      <div className="stage-toolbox" aria-label="Canvas tools">
        <button className="stage-tool" disabled={zoomPercent <= MIN_ZOOM_PERCENT} title="Zoom out" type="button" onClick={zoomOut}>
          <ZoomOut aria-hidden size={17} />
        </button>
        <span className="stage-zoom-readout">{zoomPercent}%</span>
        <button className="stage-tool" disabled={zoomPercent >= MAX_ZOOM_PERCENT} title="Zoom in" type="button" onClick={zoomIn}>
          <ZoomIn aria-hidden size={17} />
        </button>
        <button className="stage-tool" title="Reset view" type="button" onClick={resetView}>
          <RotateCcw aria-hidden size={17} />
        </button>
        <button
          aria-pressed={showGuides}
          className={`stage-tool ${showGuides ? "is-active" : ""}`}
          title="3D print guides"
          type="button"
          onClick={() => setShowGuides((current) => !current)}
        >
          <Ruler aria-hidden size={17} />
        </button>
        <button className="stage-tool" title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} type="button" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 aria-hidden size={17} /> : <Maximize2 aria-hidden size={17} />}
        </button>
      </div>
    </div>
  );
}

function clampZoomPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 100;
  }

  return Math.round(Math.min(MAX_ZOOM_PERCENT, Math.max(MIN_ZOOM_PERCENT, value)));
}

function distanceFromZoomPercent(zoomPercent: number): number {
  return DEFAULT_CAMERA_DISTANCE * (100 / clampZoomPercent(zoomPercent));
}

function zoomPercentFromDistance(distance: number): number {
  return clampZoomPercent((DEFAULT_CAMERA_DISTANCE / distance) * 100);
}

function CartonModel({
  dimensions,
  faces,
  showGuides
}: {
  dimensions: CartonDimensions;
  faces: Partial<Record<FaceKey, string>>;
  showGuides: boolean;
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
      {showGuides ? <CartonGuideOverlay depth={depth} height={height} lift={lift} unit={unit} width={width} /> : null}
    </group>
  );
}

function CartonGuideOverlay({
  depth,
  height,
  lift,
  unit,
  width
}: {
  depth: number;
  height: number;
  lift: number;
  unit: number;
  width: number;
}) {
  const safeInset = Math.min(width, height, depth) > 0 ? Math.min(PRINT_GUIDE_OFFSETS.safe * unit, Math.min(width, height, depth) * 0.18) : 0;
  const guideLift = lift * 4;

  return (
    <group>
      <BoxFoldGuides depth={depth} height={height} width={width} />
      <GuideFace
        position={[0, 0, depth / 2 + guideLift]}
        rotation={[0, 0, 0]}
        safeInset={safeInset}
        size={[width, height]}
      />
      <GuideFace
        position={[0, 0, -depth / 2 - guideLift]}
        rotation={[0, Math.PI, 0]}
        safeInset={safeInset}
        size={[width, height]}
      />
      <GuideFace
        position={[-width / 2 - guideLift, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        safeInset={safeInset}
        size={[depth, height]}
      />
      <GuideFace
        position={[width / 2 + guideLift, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        safeInset={safeInset}
        size={[depth, height]}
      />
      <GuideFace
        position={[0, height / 2 + guideLift, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        safeInset={safeInset}
        size={[width, depth]}
      />
      <GuideFace
        position={[0, -height / 2 - guideLift, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        safeInset={safeInset}
        size={[width, depth]}
      />
    </group>
  );
}

function BoxFoldGuides({ depth, height, width }: { depth: number; height: number; width: number }) {
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  const edges: Array<[[number, number, number], [number, number, number]]> = [
    [[-x, -y, z], [x, -y, z]],
    [[x, -y, z], [x, y, z]],
    [[x, y, z], [-x, y, z]],
    [[-x, y, z], [-x, -y, z]],
    [[-x, -y, -z], [x, -y, -z]],
    [[x, -y, -z], [x, y, -z]],
    [[x, y, -z], [-x, y, -z]],
    [[-x, y, -z], [-x, -y, -z]],
    [[-x, -y, -z], [-x, -y, z]],
    [[x, -y, -z], [x, -y, z]],
    [[x, y, -z], [x, y, z]],
    [[-x, y, -z], [-x, y, z]]
  ];

  return (
    <group>
      {edges.map((points, index) => (
        <Line color="#1677ff" key={index} lineWidth={1.25} opacity={0.88} points={points} transparent />
      ))}
    </group>
  );
}

function GuideFace({
  position,
  rotation,
  safeInset,
  size
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  safeInset: number;
  size: [number, number];
}) {
  const [width, height] = size;
  const safeWidth = Math.max(0.01, width - safeInset * 2);
  const safeHeight = Math.max(0.01, height - safeInset * 2);

  return (
    <group position={position} rotation={rotation}>
      <Line color="#d94f30" lineWidth={1.1} opacity={0.78} points={getRectPoints(width, height)} transparent />
      <Line color="#8f9a93" lineWidth={0.9} opacity={0.72} points={getRectPoints(safeWidth, safeHeight)} transparent />
    </group>
  );
}

function getRectPoints(width: number, height: number): Array<[number, number, number]> {
  const x = width / 2;
  const y = height / 2;

  return [
    [-x, -y, 0],
    [x, -y, 0],
    [x, y, 0],
    [-x, y, 0],
    [-x, -y, 0]
  ];
}

function FacePlane({ size, position, rotation, textureUrl }: FacePlaneProps) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      {textureUrl ? <ArtworkMaterial url={textureUrl} /> : <BlankMaterial />}
    </mesh>
  );
}

function CameraControls({
  resetSignal,
  zoomPercent,
  onZoomPercentChange
}: {
  resetSignal: number;
  zoomPercent: number;
  onZoomPercentChange: (zoomPercent: number) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const lastResetSignal = useRef(resetSignal);
  const { camera } = useThree();

  useEffect(() => {
    const shouldResetAngle = resetSignal !== lastResetSignal.current;
    const distance = distanceFromZoomPercent(zoomPercent);
    const direction =
      shouldResetAngle
        ? DEFAULT_CAMERA_POSITION.clone().sub(CAMERA_TARGET).normalize()
        : camera.position.clone().sub(CAMERA_TARGET).normalize();

    if (direction.lengthSq() === 0) {
      direction.copy(DEFAULT_CAMERA_POSITION).sub(CAMERA_TARGET).normalize();
    }

    camera.position.copy(CAMERA_TARGET).add(direction.multiplyScalar(distance));
    camera.lookAt(CAMERA_TARGET);
    controlsRef.current?.target.copy(CAMERA_TARGET);
    controlsRef.current?.update();
    lastResetSignal.current = resetSignal;
  }, [camera, resetSignal, zoomPercent]);

  function handleControlsChange() {
    onZoomPercentChange(zoomPercentFromDistance(camera.position.distanceTo(CAMERA_TARGET)));
  }

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      enablePan={false}
      maxDistance={distanceFromZoomPercent(MIN_ZOOM_PERCENT)}
      maxPolarAngle={Math.PI * 0.82}
      minDistance={distanceFromZoomPercent(MAX_ZOOM_PERCENT)}
      target={CAMERA_TARGET.toArray()}
      onChange={handleControlsChange}
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

  return <meshBasicMaterial map={preparedTexture} side={DoubleSide} toneMapped={false} />;
}

function BlankMaterial() {
  return <meshBasicMaterial color="#fbfaf4" side={DoubleSide} toneMapped={false} />;
}
