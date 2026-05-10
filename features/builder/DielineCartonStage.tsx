"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import {
  BufferAttribute,
  DoubleSide,
  Matrix4,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  TextureLoader,
  Vector3,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { buildFoldedModel, type FoldedFace3D, type FoldedModel3D } from "@/domain/dieline/fold3d";
import type { DielineGraph } from "@/domain/dieline/types";
import { getFaceKeyFromGraphFaceId } from "@/domain/dieline/compat";
import type { FaceKey } from "@/domain/packaging";

type DielineCartonStageProps = {
  graph: DielineGraph;
  faces: Partial<Record<FaceKey, string>>;
  artworkByFaceId?: Partial<Record<string, string>>;
  className?: string;
};

const CAMERA_TARGET = new Vector3(0, 0, 0);
const DEFAULT_CAMERA_POSITION = new Vector3(4.8, 3.6, 5.8);
const VIEW_DIRECTION = DEFAULT_CAMERA_POSITION.clone().sub(CAMERA_TARGET).normalize();
const CAMERA_FOV = 40;
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 1.16;

export function DielineCartonStage({
  graph,
  faces,
  artworkByFaceId,
  className = "",
}: DielineCartonStageProps) {
  const [zoomPercent, setZoomPercent] = useState(100);
  const [resetSignal, setResetSignal] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const model = useMemo(() => buildFoldedModel(graph), [graph]);
  const cameraFrame = useMemo(() => getCameraFrame(model), [model]);
  const shadowScale = Math.max(2.6, model.bounds.size[0], model.bounds.size[2]) * 1.35;
  const shadowY = model.bounds.min[1] - 0.045;

  useEffect(() => {
    function handleFsChange() {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    }

    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  function zoom(direction: "in" | "out") {
    setZoomPercent((current) =>
      clamp(direction === "in" ? current * ZOOM_STEP : current / ZOOM_STEP, MIN_ZOOM, MAX_ZOOM),
    );
  }

  function reset() {
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
      <Canvas
        camera={{ position: cameraFrame.position.toArray(), fov: CAMERA_FOV }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#f6f1e6"]} />
        <ambientLight intensity={0.75} />
        <hemisphereLight color="#ffffff" groundColor="#d8d1c5" intensity={0.55} />
        <directionalLight castShadow intensity={1.8} position={[3.5, 4.5, 4.5]} />
        <directionalLight intensity={0.6} position={[-4, 2, -2]} />
        <Suspense fallback={null}>
          <DielineModel
            artworkByFaceId={artworkByFaceId}
            faces={faces}
            model={model}
          />
        </Suspense>
        <ContactShadows
          blur={2.8}
          far={Math.max(6, shadowScale * 2)}
          opacity={0.28}
          position={[cameraFrame.target.x, shadowY, cameraFrame.target.z]}
          scale={shadowScale}
        />
        <CameraSync
          cameraFrame={cameraFrame}
          resetSignal={resetSignal}
          zoomPercent={zoomPercent}
          onZoomChange={setZoomPercent}
        />
      </Canvas>

      <div className="stage-toolbox" aria-label="Canvas tools">
        <button className="stage-tool" disabled={zoomPercent <= MIN_ZOOM} title="Zoom out" type="button" onClick={() => zoom("out")}>
          <ZoomOut aria-hidden size={17} />
        </button>
        <span className="stage-zoom-readout">{Math.round(zoomPercent)}%</span>
        <button className="stage-tool" disabled={zoomPercent >= MAX_ZOOM} title="Zoom in" type="button" onClick={() => zoom("in")}>
          <ZoomIn aria-hidden size={17} />
        </button>
        <button className="stage-tool" title="Reset view" type="button" onClick={reset}>
          <RotateCcw aria-hidden size={17} />
        </button>
        <button className="stage-tool" title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} type="button" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 aria-hidden size={17} /> : <Maximize2 aria-hidden size={17} />}
        </button>
      </div>
    </div>
  );
}

function DielineModel({
  artworkByFaceId,
  faces,
  model,
}: {
  artworkByFaceId?: Partial<Record<string, string>>;
  faces: Partial<Record<FaceKey, string>>;
  model: FoldedModel3D;
}) {
  return (
    <group rotation={[0, -0.18, 0]}>
      {model.faces.map((face) => (
        <SolvedFaceMesh
          face={face}
          key={face.faceId}
          textureUrl={getTextureUrl(face.faceId, faces, artworkByFaceId)}
        />
      ))}
    </group>
  );
}

function SolvedFaceMesh({
  face,
  textureUrl,
}: {
  face: FoldedFace3D;
  textureUrl?: string;
}) {
  const matrix = useMemo(() => new Matrix4().fromArray(face.worldMatrix), [face.worldMatrix]);
  const geometry = useMemo(() => {
    const shape = new Shape();

    if (face.localVertices.length < 3) {
      return new ShapeGeometry(new Shape());
    }

    shape.moveTo(face.localVertices[0].x, face.localVertices[0].y);

    for (let index = 1; index < face.localVertices.length; index += 1) {
      shape.lineTo(face.localVertices[index].x, face.localVertices[index].y);
    }

    shape.closePath();

    const nextGeometry = new ShapeGeometry(shape);
    const positions = nextGeometry.getAttribute("position");
    const width = face.localBounds.width || 1;
    const height = face.localBounds.height || 1;
    const uvs = new Float32Array(positions.count * 2);

    for (let index = 0; index < positions.count; index += 1) {
      uvs[index * 2] = positions.getX(index) / width;
      uvs[index * 2 + 1] = 1 - positions.getY(index) / height;
    }

    nextGeometry.setAttribute("uv", new BufferAttribute(uvs, 2));
    return nextGeometry;
  }, [face.localBounds.height, face.localBounds.width, face.localVertices]);

  const texture = useMemo(() => {
    if (!textureUrl) return null;

    const loader = new TextureLoader();
    const nextTexture = loader.load(textureUrl);
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.anisotropy = 8;
    return nextTexture;
  }, [textureUrl]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      texture?.dispose();
    };
  }, [geometry, texture]);

  const color = face.role === "flap" ? "#f0ede4" : face.role === "glue" ? "#e8ede9" : "#fbfaf4";

  return (
    <mesh geometry={geometry} matrix={matrix} matrixAutoUpdate={false}>
      {texture ? (
        <meshStandardMaterial map={texture} side={DoubleSide} toneMapped={false} roughness={0.7} />
      ) : (
        <meshStandardMaterial color={color} side={DoubleSide} toneMapped={false} roughness={0.7} />
      )}
    </mesh>
  );
}

type CameraFrame = {
  target: Vector3;
  position: Vector3;
  distance: number;
};

function getCameraFrame(model: FoldedModel3D): CameraFrame {
  const target = new Vector3(...model.bounds.center);
  const fovRadians = (CAMERA_FOV * Math.PI) / 180;
  const distance = Math.max(2.7, (model.bounds.radius / Math.sin(fovRadians / 2)) * 1.08);
  const position = target.clone().add(VIEW_DIRECTION.clone().multiplyScalar(distance));

  return { target, position, distance };
}

function CameraSync({
  cameraFrame,
  resetSignal,
  zoomPercent,
  onZoomChange,
}: {
  cameraFrame: CameraFrame;
  resetSignal: number;
  zoomPercent: number;
  onZoomChange: (z: number) => void;
}) {
  const ref = useRef<OrbitControlsImpl>(null);
  const lastReset = useRef(resetSignal);
  const lastFrame = useRef(cameraFrame);
  const { camera } = useThree();

  useEffect(() => {
    const frameChanged = cameraFrame !== lastFrame.current;
    const shouldResetAngle = resetSignal !== lastReset.current || frameChanged;
    const distance = cameraFrame.distance * (100 / clamp(zoomPercent, MIN_ZOOM, MAX_ZOOM));
    const direction = shouldResetAngle
      ? cameraFrame.position.clone().sub(cameraFrame.target).normalize()
      : camera.position.clone().sub(cameraFrame.target).normalize();

    if (direction.lengthSq() === 0) {
      direction.copy(VIEW_DIRECTION);
    }

    camera.position.copy(cameraFrame.target).add(direction.multiplyScalar(distance));
    camera.lookAt(cameraFrame.target);
    ref.current?.target.copy(cameraFrame.target);
    ref.current?.update();
    lastReset.current = resetSignal;
    lastFrame.current = cameraFrame;
  }, [camera, cameraFrame, resetSignal, zoomPercent]);

  function handleChange() {
    onZoomChange(clamp((cameraFrame.distance / camera.position.distanceTo(cameraFrame.target)) * 100, MIN_ZOOM, MAX_ZOOM));
  }

  return (
    <OrbitControls
      ref={ref}
      enableDamping
      enablePan={false}
      maxDistance={cameraFrame.distance * (100 / MIN_ZOOM)}
      maxPolarAngle={Math.PI * 0.82}
      minDistance={cameraFrame.distance * (100 / MAX_ZOOM)}
      target={cameraFrame.target.toArray()}
      onChange={handleChange}
    />
  );
}

function getTextureUrl(
  faceId: string,
  faces: Partial<Record<FaceKey, string>>,
  artworkByFaceId?: Partial<Record<string, string>>,
): string | undefined {
  const directArtwork = artworkByFaceId?.[faceId];
  if (directArtwork) return directArtwork;

  const faceKey = getFaceKeyFromGraphFaceId(faceId);
  return faceKey ? faces[faceKey] : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, Number.isFinite(value) ? value : 100)));
}
