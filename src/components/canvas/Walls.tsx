import { useAtom, useAtomValue } from 'jotai';
import { useRef } from 'react';
import {
  Line2,
  LineGeometry,
  LineMaterial,
} from 'three/examples/jsm/Addons.js';
import { Layer } from '../../Constants';
import {
  panelTabAtom,
  setWallHighlightAtom,
  threeExportsAtom,
  wallHighlightAtom,
  wallOptionAtom,
} from '../../scripts/atoms';
import { getWallPoint } from '../../scripts/utils';
import * as THREE from '../../scripts/vthree/VTHREE';
import { WallCreateOption } from '../../types';

const WALL_LAYER = new THREE.Layers();
WALL_LAYER.disableAll();
WALL_LAYER.enable(Layer.Wall);

function WallCreating({ wallInfo }: { wallInfo: WallCreateOption }) {
  const creating = wallInfo.creating;
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const XZPlaneRef = useRef<THREE.Plane>(
    new THREE.Plane(new THREE.Vector3(0, 1, 0)),
  );
  const threeExports = useAtomValue(threeExportsAtom);

  if (!creating || !threeExports || !creating.mouse) {
    return null;
  }

  const { mouse: mouseEvent, cmd } = creating;

  const raycaster = raycasterRef.current;
  const XZPlane = XZPlaneRef.current;

  const calcPlaneIntersection = () => {
    const { scene, camera } = threeExports;
    const mouse = new THREE.Vector2();
    const rect = mouseEvent.rect;
    const xRatio = (mouseEvent.x - rect.left) / rect.width;
    const yRatio = (mouseEvent.y - rect.top) / rect.height;

    mouse.x = xRatio * 2 - 1;
    mouse.y = -yRatio * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(XZPlane, intersection);

    // Return ray origin and intersection point
    return intersection;
  };

  const planeIntersection = calcPlaneIntersection();

  return (
    <>
      <mesh position={planeIntersection} renderOrder={999} layers={WALL_LAYER}>
        <sphereGeometry args={[0.03, 32, 32]}></sphereGeometry>
        <meshBasicMaterial
          color={0xff0000}
          depthTest={false}
        ></meshBasicMaterial>
      </mesh>
    </>
  );

  // const sphere = new THREE.Mesh(
  //   new THREE.SphereGeometry(0.1, 32, 32),
  //   new THREE.MeshBasicMaterial({ color: 0xff0000 }),
  // );
  // sphere.position.copy(planeIntersectionPoint);
}

function Walls() {
  const threeExports = useAtomValue(threeExportsAtom);
  const [wallInfo, setWalls] = useAtom(wallOptionAtom);
  const { wallHighlights, pointHighlights } = useAtomValue(wallHighlightAtom);

  const tab = useAtomValue(panelTabAtom);
  const isWallTab = tab === 'wall';

  if (!isWallTab) {
    return null;
  }

  if (!threeExports) {
    return;
  }

  const creating = wallInfo.creating;

  return (
    <>
      {creating && <WallCreating wallInfo={wallInfo}></WallCreating>}
      {wallInfo.points
        .filter(p => p.show)
        .map((pointView, i) => {
          const { point, color, id, show } = pointView;
          const pos = new THREE.Vector3(point.x, 0, point.y);

          const size = pointHighlights.includes(id) ? 0.05 : 0.02;

          return (
            <mesh
              layers={WALL_LAYER}
              key={`wall-point-view-${id}`}
              position={pos}
              renderOrder={999}
              onPointerOver={() => {
                setWallHighlightAtom(prev => ({
                  ...prev,
                  pointHighlights: [id],
                }));
              }}
              onPointerOut={() => {
                setWallHighlightAtom(prev => ({
                  ...prev,
                  pointHighlights: [],
                }));
              }}
            >
              <sphereGeometry args={[size, 32, 32]}></sphereGeometry>
              <meshBasicMaterial
                depthTest={false}
                color={color}
              ></meshBasicMaterial>
            </mesh>
          );
        })}
      {wallInfo.walls
        .filter(wall => wall.show)
        .map((wallView, i, walls) => {
          const points = wallInfo.points;
          const { start: _start, end: _end, color, id, show } = wallView;
          const startPoint = getWallPoint(_start, points)!;
          const endPoint = getWallPoint(_end, points)!;
          if (!startPoint || !endPoint) {
            debugger;
          }
          const start = startPoint.point;
          const end = endPoint.point;

          const posStart = new THREE.Vector3(start.x, 0, start.y);
          const posEnd = new THREE.Vector3(end.x, 0, end.y);

          // draw a line
          const geometry = new LineGeometry();
          // geometry.setAttribute(
          //   'position',
          //   new THREE.BufferAttribute(
          //     new Float32Array([...posStart.toArray(), ...posEnd.toArray()]),
          //     3,
          //   ),
          // );
          geometry.setPositions([...posStart.toArray(), ...posEnd.toArray()]);

          const pointHighlight = points
            .filter(p => p.show)
            .filter(p => pointHighlights.includes(p.id));
          const highlightedPointNeighbouringWalls = walls.filter(w =>
            pointHighlight.some(
              point => point.id === w.start || point.id === w.end,
            ),
          );
          pointHighlight;

          const thisHighlight =
            wallHighlights.includes(id) ||
            highlightedPointNeighbouringWalls.some(w => w.id === id);

          const material = new LineMaterial({
            color,
            linewidth: thisHighlight ? 4.0 : 1.0,
          });
          material.depthTest = false;

          const line = new Line2(geometry, material);
          // line stroke
          line.computeLineDistances();
          line.scale.set(1, 1, 1);
          line.renderOrder = 99999;
          return (
            <primitive
              layer={WALL_LAYER}
              object={line}
              key={`canvas-wall-${id}`}
              // onPointerOver={() => {
              //   setWallHighlightAtom(prev => ({
              //     ...prev,
              //     wallHighlights: [id],
              //   }));
              // }}
              // onPointerOut={() => {
              //   setWallHighlightAtom(prev => ({
              //     ...prev,
              //     wallHighlights: [],
              //   }));
              // }}
            ></primitive>
          );
        })}
    </>
  );
}

export default Walls;
