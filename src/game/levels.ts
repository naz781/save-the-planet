import * as THREE from 'three';
import {
  createBirdModel,
  createBridgeModel,
  createDeadTreeModel,
  createForestDeerModel,
  createGarbageModel,
  createKarachiBuildingModel,
  createOceanDebrisModel,
  createPlanetCoreModel,
  createPlantSpotModel,
  createPollutionMachineModel,
  createRecyclingBinModel,
  createRickshawModel,
  createRiverPollutionModel,
  createSeaAnimalModel,
  createSeedModel,
  createStreetLampModel,
  createTreeModel,
  createUrbanWasteModel,
  createWaterfallModel,
} from './models';
import { ProceduralTextures } from './textures';
import { LevelId } from './types';

export interface InteractableEntity {
  id: string;
  type: 'collect' | 'plant' | 'river' | 'seed' | 'rescue' | 'recycle' | 'shutdown' | 'core';
  label: string;
  actionText: string;
  position: THREE.Vector3;
  radius: number;
  mesh: THREE.Group;
  completed: boolean;
  sproutTree?: THREE.Group;
  sproutProgress?: number;
  ringMesh?: THREE.Mesh;
  solidCollider?: ObstacleCollider;
  animalGroup?: THREE.Group;
  netGroup?: THREE.Group;
  rescueTime?: number;
  machineFan?: THREE.Group;
  machineBeacon?: THREE.Mesh;
  solarWings?: THREE.Group;
  coreCrystal?: THREE.Mesh;
  coreRing1?: THREE.Mesh;
  coreRing2?: THREE.Mesh;
  baseY: number;
  phaseOffset: number;
}

export interface ObstacleCollider {
  x: number;
  z: number;
  radius: number;
  active?: boolean;
}

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY?: number;
}

export interface BuiltLevel {
  levelId: LevelId;
  root: THREE.Group;
  interactables: InteractableEntity[];
  colliders: ObstacleCollider[];
  boxColliders: BoxCollider[];
  deadTreeColliders: ObstacleCollider[];
  spawnPoint: THREE.Vector3;
  playableRadius: number;
  waterMesh?: THREE.Mesh;
  waterMaterial?: THREE.MeshStandardMaterial;
  waterfallMat?: THREE.MeshStandardMaterial;
  waterfallFoam?: THREE.Mesh;
  waterfallPos?: THREE.Vector3;
  skyColors: { polluted: THREE.Color; restored: THREE.Color };
  fogColors: { polluted: THREE.Color; restored: THREE.Color };
  fogDensity: { polluted: number; restored: number };
  waterColors?: { polluted: THREE.Color; restored: THREE.Color };
  smokeSources: THREE.Vector3[];
  butterflies: THREE.Group[];
  birds: THREE.Group[];
  deerList: { group: THREE.Group; center: THREE.Vector3; radius: number; speed: number; phase: number }[];
  deadTrees: THREE.Group[];
  grassClumps?: THREE.InstancedMesh;
  windUniforms: { uTime: { value: number } };
  waterUniforms?: { uTime: { value: number } };
  dispose: () => void;
}

// Bridge placement helper in Level 1
export const L1_BRIDGE_Z = 4.0;
export const L1_BRIDGE_X = Math.sin(L1_BRIDGE_Z * 0.08) * 6 + 4;

export function groundHeightAt(x: number, z: number, levelId: LevelId): number {
  if (levelId === 1) {
    const riverCenter = Math.sin(z * 0.08) * 6 + 4;
    const distToRiver = Math.abs(x - riverCenter);
    let h =
      Math.sin(x * 0.055) * Math.cos(z * 0.055) * 1.25 +
      Math.sin(x * 0.12 + z * 0.08) * 0.42;

    if (distToRiver < 5.8) {
      const t = distToRiver / 5.8;
      h -= (1 - t * t) * 2.25;
    }

    const dist = Math.hypot(x, z);
    if (dist > 36) {
      const ridge = (dist - 36) * 0.42 + Math.sin(Math.atan2(z, x) * 7) * 1.8;
      h += Math.max(0, ridge);
    }
    return h;
  }

  if (levelId === 2) {
    const islands = [
      { cx: 0, cz: 0, r: 9.5, peak: 1.8 },
      { cx: -21, cz: -14, r: 8.5, peak: 2.3 },
      { cx: 20, cz: 15, r: 8.0, peak: 2.2 },
    ];
    let maxH = -0.2;
    for (const isl of islands) {
      const d = Math.hypot(x - isl.cx, z - isl.cz);
      if (d < isl.r) {
        const norm = 1 - d / isl.r;
        const h = Math.pow(norm, 0.75) * isl.peak;
        if (h > maxH) maxH = h;
      }
    }
    return Math.max(0, maxH);
  }

  const distCenter = Math.hypot(x, z);
  if (distCenter < 7.6) return 0.24;
  // Raised concrete median curbs in Karachi Metro Boulevard
  if (
    (Math.abs(x + 19.5) <= 7.1 && Math.abs(z) <= 0.72) ||
    (Math.abs(x - 19.5) <= 7.1 && Math.abs(z) <= 0.72) ||
    (Math.abs(x) <= 0.72 && Math.abs(z - 19.5) <= 7.1)
  ) {
    return 0.24;
  }
  return 0;
}

export function walkableHeightAt(
  x: number,
  z: number,
  levelId: LevelId,
  playerY = 0,
): number {
  let h = groundHeightAt(x, z, levelId);
  if (levelId === 1) {
    // Allow walking cleanly over the raised arched wooden footbridge & its end ramps
    const dx = x - L1_BRIDGE_X;
    const absDx = Math.abs(dx);
    const dz = Math.abs(z - L1_BRIDGE_Z);
    if (absDx <= 5.25 && dz <= 1.38) {
      let bridgeY = 0;
      if (absDx <= 3.8) {
        const t = dx / 7.6;
        bridgeY = 0.63 + Math.cos(t * Math.PI) * 0.6;
      } else {
        const u = (5.25 - absDx) / 1.45;
        bridgeY = THREE.MathUtils.lerp(-0.22, 0.63, u);
      }
      // Only snap up onto the main span if entering via the end ramps or already on deck level
      if (absDx > 3.65 || playerY > 0.05) {
        h = Math.max(h, bridgeY);
      }
    }
  } else if (levelId === 2) {
    // Solid wooden pier deck on central island
    if (Math.abs(x) <= 1.65 && z >= 5.25 && z <= 13.75) {
      h = Math.max(h, 0.88);
    }
  }
  return h;
}

export function buildLevelScene(
  levelId: LevelId,
  textures: ProceduralTextures,
): BuiltLevel {
  const root = new THREE.Group();
  const interactables: InteractableEntity[] = [];
  const colliders: ObstacleCollider[] = [];
  const boxColliders: BoxCollider[] = [];
  const deadTreeColliders: ObstacleCollider[] = [];
  const smokeSources: THREE.Vector3[] = [];
  const butterflies: THREE.Group[] = [];
  const birds: THREE.Group[] = [];
  const deerList: BuiltLevel['deerList'] = [];
  const deadTrees: THREE.Group[] = [];
  const windUniforms = { uTime: { value: 0 } };
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  if (levelId === 1) {
    // ================= LEVEL 1: EMERALD VALLEY (UPGRADED FOREST) =================
    const terrainSize = 180;
    const terrainGeo = trackGeo(new THREE.PlaneGeometry(terrainSize, terrainSize, 128, 128));
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const colGrass = new THREE.Color(0x4ea845);
    const colMoss = new THREE.Color(0x3a7d39);
    const colDry = new THREE.Color(0x887f4f);
    const colSand = new THREE.Color(0xd7c18e);
    const colRock = new THREE.Color(0x64748b);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = groundHeightAt(x, z, 1);
      pos.setY(i, y);

      if (y < -0.35) {
        tmpCol.copy(colSand);
      } else if (y > 4.2) {
        tmpCol.copy(colRock);
      } else {
        const dryMix = THREE.MathUtils.clamp(Math.sin(x * 0.1 + z * 0.05) * 0.5 + 0.3, 0, 1);
        const mossMix = THREE.MathUtils.clamp(Math.cos(x * 0.14 - z * 0.12) * 0.5 + 0.4, 0, 1);
        tmpCol.copy(colGrass).lerp(colMoss, mossMix * 0.35).lerp(colDry, dryMix * 0.32);
      }
      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.grass,
        normalMap: textures.grassNormal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.02,
      }),
    );
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    root.add(terrainMesh);

    // Flowing Realistic Translucent River (visible sandy riverbed + ripples + surface reflections)
    const waterUniforms = { uTime: { value: 0 } };
    const riverGeo = trackGeo(new THREE.PlaneGeometry(180, 180, 72, 72));
    riverGeo.rotateX(-Math.PI / 2);
    const riverMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x4f644b, // polluted murky olive -> shifts to translucent turquoise
        normalMap: textures.waterNormal,
        normalScale: new THREE.Vector2(0.6, 0.6),
        roughness: 0.08,
        metalness: 0.25,
        envMapIntensity: 1.55,
        transparent: true,
        opacity: 0.72,
      }),
    );
    riverMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = waterUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           transformed.y += sin(position.x * 0.65 + uTime * 2.6) * 0.045 + cos(position.z * 0.42 + uTime * 2.3) * 0.045;`,
        );
    };
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.position.y = -0.35;
    riverMesh.receiveShadow = true;
    root.add(riverMesh);

    // Cascading Waterfall & Cliff at North River Source
    const wfZ = -32;
    const wfX = Math.sin(wfZ * 0.08) * 6 + 4;
    const { group: waterfallGroup, waterSheetMat, foamRing } = createWaterfallModel(textures);
    waterfallGroup.position.set(wfX, -0.35, wfZ);
    root.add(waterfallGroup);
    // Solid colliders for left cliff buttress, right cliff buttress, and back cliff face
    colliders.push({ x: wfX - 4.6, z: wfZ, radius: 4.5 });
    colliders.push({ x: wfX + 4.5, z: wfZ + 0.2, radius: 4.3 });
    boxColliders.push({
      minX: wfX - 5.6,
      maxX: wfX + 5.6,
      minZ: wfZ - 4.4,
      maxZ: wfZ - 0.1,
    });

    // Grounded Wooden Footbridge spanning cleanly above the River
    const bridge = createBridgeModel(textures);
    bridge.position.set(L1_BRIDGE_X, 0, L1_BRIDGE_Z);
    root.add(bridge);
    // Bridge handrail entrance post colliders & solid stone abutment sides
    [-4.1, 4.1].forEach((bx) => {
      [-1.55, 1.55].forEach((bz) => {
        colliders.push({ x: L1_BRIDGE_X + bx, z: L1_BRIDGE_Z + bz, radius: 0.48 });
      });
    });

    // Instanced Perimeter Pine & Oak Forest (110 trees)
    const pineTrunkGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.44, 2.6, 8));
    pineTrunkGeo.translate(0, 1.3, 0);
    const pineTrunkMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.bark,
        normalMap: textures.barkNormal,
        roughness: 0.9,
      }),
    );
    const pineCrownGeo = trackGeo(new THREE.ConeGeometry(1.9, 4.8, 9));
    pineCrownGeo.translate(0, 4.0, 0);
    const pineCrownMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.foliage,
        color: 0xffffff,
        roughness: 0.66,
      }),
    );
    pineCrownMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = windUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float sway = max(0.0, (position.y - 1.5) * 0.035);
           transformed.x += sin(uTime * 1.6 + position.y) * sway;`,
        );
    };

    const treeCount = 110;
    const trunkInst = new THREE.InstancedMesh(pineTrunkGeo, pineTrunkMat, treeCount);
    const crownInst = new THREE.InstancedMesh(pineCrownGeo, pineCrownMat, treeCount);
    trunkInst.castShadow = true;
    crownInst.castShadow = true;
    crownInst.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < treeCount; i++) {
      const ang = (i / treeCount) * Math.PI * 2 + (i % 4) * 0.09;
      const rad = 33 + (i % 6) * 4.5 + Math.sin(i * 1.9) * 2.4;
      const tx = Math.cos(ang) * rad;
      const tz = Math.sin(ang) * rad;
      // Keep north waterfall corridor clear
      if (Math.hypot(tx - wfX, tz - wfZ) < 9.5) {
        dummy.scale.setScalar(0.001);
        dummy.position.set(tx, -20, tz);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(i, dummy.matrix);
        crownInst.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const ty = groundHeightAt(tx, tz, 1);
      const sc = 0.85 + (i % 7) * 0.09;
      dummy.position.set(tx, ty - 0.15, tz);
      dummy.rotation.set(0, ang, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);
      crownInst.setMatrixAt(i, dummy.matrix);

      // Solid trunk collider for every perimeter forest tree so player never walks through trees
      if (rad <= 42) {
        colliders.push({ x: tx, z: tz, radius: 0.65 * sc });
      }

      tint.setHSL(0.34 + (i % 5) * 0.015, 0.58, 0.36 + (i % 4) * 0.05);
      crownInst.setColorAt(i, tint);
    }
    trunkInst.instanceMatrix.needsUpdate = true;
    crownInst.instanceMatrix.needsUpdate = true;
    if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    crownInst.computeBoundingSphere();
    root.add(trunkInst, crownInst);

    // 5 Mature Valley Landmark Trees (Oak & Pine) with solid trunk colliders
    const valleyTreeCoords: { x: number; z: number; variant: 'oak' | 'pine'; sc: number }[] = [
      { x: -19, z: 16, variant: 'oak', sc: 1.1 },
      { x: 22, z: 14, variant: 'pine', sc: 1.05 },
      { x: 23, z: -15, variant: 'oak', sc: 1.08 },
      { x: -22, z: -20, variant: 'pine', sc: 1.12 },
      { x: -8, z: 24, variant: 'oak', sc: 1.0 },
    ];
    valleyTreeCoords.forEach((vt, idx) => {
      const ty = groundHeightAt(vt.x, vt.z, 1);
      const tree = createTreeModel(textures, vt.variant, vt.sc);
      tree.position.set(vt.x, ty - 0.1, vt.z);
      tree.rotation.y = idx * 1.3;
      root.add(tree);
      colliders.push({ x: vt.x, z: vt.z, radius: 0.72 * vt.sc });
    });

    // Instanced Swaying Grass Tufts & Wildflowers across the Valley (520 tufts)
    const tuftGeo = trackGeo(new THREE.ConeGeometry(0.18, 0.55, 4));
    tuftGeo.translate(0, 0.27, 0);
    const tuftMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.72,
      }),
    );
    tuftMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = windUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float w = smoothstep(0.0, 0.55, position.y);
           transformed.x += sin(uTime * 2.6 + position.z * 2.0) * 0.11 * w;`,
        );
    };
    const grassCount = 520;
    const grassClumps = new THREE.InstancedMesh(tuftGeo, tuftMat, grassCount);
    for (let i = 0; i < grassCount; i++) {
      const ang = i * 2.39996; // golden angle spiral distribution
      const rad = 2.5 + Math.sqrt(i / grassCount) * 32;
      const gx = Math.cos(ang) * rad;
      const gz = Math.sin(ang) * rad;
      const gy = groundHeightAt(gx, gz, 1);
      if (gy < -0.25) {
        dummy.position.set(0, -30, 0);
        dummy.scale.setScalar(0.001);
        dummy.updateMatrix();
        grassClumps.setMatrixAt(i, dummy.matrix);
        continue;
      }
      dummy.position.set(gx, gy - 0.03, gz);
      dummy.rotation.set(0, ang, 0);
      const sc = 0.75 + (i % 5) * 0.18;
      dummy.scale.set(sc, sc * (0.9 + (i % 3) * 0.2), sc);
      dummy.updateMatrix();
      grassClumps.setMatrixAt(i, dummy.matrix);

      // Mix lush greens with occasional golden/lavender wildflower pops
      if (i % 11 === 0) {
        tint.setHex(0xfde047);
      } else if (i % 17 === 0) {
        tint.setHex(0xf472b6);
      } else {
        tint.setHSL(0.32 + (i % 4) * 0.02, 0.65, 0.42 + (i % 3) * 0.06);
      }
      grassClumps.setColorAt(i, tint);
    }
    grassClumps.instanceMatrix.needsUpdate = true;
    if (grassClumps.instanceColor) grassClumps.instanceColor.needsUpdate = true;
    grassClumps.computeBoundingSphere();
    root.add(grassClumps);

    // Instanced Scenic Boulders (36 boulders with rock normal map)
    const rockGeo = trackGeo(new THREE.DodecahedronGeometry(0.95, 1));
    const rockMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.rock,
        normalMap: textures.rockNormal,
        color: 0x8590a0,
        roughness: 0.88,
      }),
    );
    const rockCount = 36;
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rockInst.castShadow = true;
    rockInst.receiveShadow = true;
    for (let i = 0; i < rockCount; i++) {
      const ang = (i / rockCount) * Math.PI * 2 + 0.35;
      const rad = 16 + (i % 5) * 4.5;
      const rx = Math.cos(ang) * rad;
      const rz = Math.sin(ang) * rad;
      const ry = groundHeightAt(rx, rz, 1);
      const sc = 0.65 + (i % 4) * 0.28;
      dummy.position.set(rx, ry + sc * 0.25, rz);
      dummy.rotation.set(i * 0.4, i * 0.9, 0);
      dummy.scale.set(sc * 1.25, sc * 0.72, sc);
      dummy.updateMatrix();
      rockInst.setMatrixAt(i, dummy.matrix);
      if (rad <= 37) {
        colliders.push({ x: rx, z: rz, radius: sc * 1.05 });
      }
    }
    rockInst.instanceMatrix.needsUpdate = true;
    rockInst.computeBoundingSphere();
    root.add(rockInst);

    // Polluted Dead Trees (6 gnarled leafless trees with dynamic solid trunk colliders while standing)
    const deadCoords: [number, number][] = [
      [-15, 10],
      [-12, -13],
      [16, 10],
      [18, -9],
      [-5, -20],
      [13, -18],
    ];
    deadCoords.forEach(([dx, dz], idx) => {
      const dy = groundHeightAt(dx, dz, 1);
      const dt = createDeadTreeModel(textures, 0.95 + (idx % 3) * 0.15);
      dt.position.set(dx, dy, dz);
      dt.rotation.y = idx * 1.2;
      root.add(dt);
      deadTrees.push(dt);
      const dtCol: ObstacleCollider = { x: dx, z: dz, radius: 0.65, active: true };
      colliders.push(dtCol);
      deadTreeColliders.push(dtCol);
    });

    // 5 Forest Rubbish & Recycling Items (+10 Eco Points each = 50)
    const garbageCoords: [number, number][] = [
      [-9, 10],
      [14, 7],
      [-14, -7],
      [15, -12],
      [-4, -15],
    ];
    garbageCoords.forEach(([gx, gz], idx) => {
      const gy = Math.max(-0.3, groundHeightAt(gx, gz, 1));
      const mesh = createGarbageModel(textures, idx);
      mesh.position.set(gx, gy, gz);
      root.add(mesh);
      const garbageCol: ObstacleCollider = { x: gx, z: gz, radius: 0.68, active: true };
      colliders.push(garbageCol);
      interactables.push({
        id: `forest-garbage-${idx}`,
        type: 'collect',
        label: 'Forest Rubbish',
        actionText: 'Collect Rubbish',
        position: new THREE.Vector3(gx, gy, gz),
        radius: 3.1,
        mesh,
        solidCollider: garbageCol,
        completed: false,
        baseY: gy,
        phaseOffset: idx * 1.1,
      });
    });

    // 3 Interactive River Pollution Clusters floating right on the water surface (y = -0.33)
    const riverZCoords = [-18, -5, 14];
    riverZCoords.forEach((rz, idx) => {
      const rx = Math.sin(rz * 0.08) * 6 + 4;
      const mesh = createRiverPollutionModel();
      mesh.position.set(rx, -0.33, rz);
      root.add(mesh);
      interactables.push({
        id: `forest-river-${idx}`,
        type: 'river',
        label: 'River Pollution',
        actionText: 'Clean River Water',
        position: new THREE.Vector3(rx, -0.33, rz),
        radius: 3.6,
        mesh,
        completed: false,
        baseY: -0.33,
        phaseOffset: idx * 1.4,
      });
    });

    // 5 Tree Planting Mounds (+10 Eco Points each = 50)
    const plantCoords: [number, number][] = [
      [-11, 1],
      [-6, 15],
      [14, 14],
      [17, -2],
      [-16, -15],
    ];
    plantCoords.forEach(([px, pz], idx) => {
      const py = Math.max(-0.2, groundHeightAt(px, pz, 1));
      const { group, ring } = createPlantSpotModel(textures);
      group.position.set(px, py, pz);

      const sproutTree = createTreeModel(textures, idx % 2 === 0 ? 'oak' : 'pine', 1.2);
      sproutTree.scale.setScalar(0.01);
      sproutTree.visible = false;
      group.add(sproutTree);

      root.add(group);
      // Trunk collider starts disabled and activates once tree is planted!
      const treeCol: ObstacleCollider = { x: px, z: pz, radius: 0.72, active: false };
      colliders.push(treeCol);
      interactables.push({
        id: `forest-plant-${idx}`,
        type: 'plant',
        label: 'Fertile Planting Spot',
        actionText: 'Plant New Tree',
        position: new THREE.Vector3(px, py, pz),
        radius: 3.4,
        mesh: group,
        solidCollider: treeCol,
        completed: false,
        sproutTree,
        sproutProgress: 0,
        ringMesh: ring,
        baseY: py,
        phaseOffset: idx * 0.9,
      });
    });

    // 3 Collectible Golden Eco Seeds (+10 Eco Points each = 30)
    const seedCoords: [number, number][] = [
      [wfX - 3.5, wfZ + 7.5], // Near Waterfall plunge pool
      [L1_BRIDGE_X + 4.8, L1_BRIDGE_Z - 3.2], // Near Wooden Bridge
      [-21, 5], // Western ridge grove
    ];
    seedCoords.forEach(([sx, sz], idx) => {
      const sy = Math.max(-0.2, groundHeightAt(sx, sz, 1));
      const mesh = createSeedModel();
      mesh.position.set(sx, sy, sz);
      root.add(mesh);
      interactables.push({
        id: `forest-seed-${idx}`,
        type: 'seed',
        label: 'Golden Eco Seed',
        actionText: 'Collect Eco Seed',
        position: new THREE.Vector3(sx, sy, sz),
        radius: 3.1,
        mesh,
        completed: false,
        baseY: sy,
        phaseOffset: idx * 1.5,
      });
    });

    // Butterflies & Soaring Birds & Grazing Forest Deer (emerge as nature heals)
    const wingMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide }),
    );
    const wingGeo = trackGeo(new THREE.PlaneGeometry(0.24, 0.16));
    for (let i = 0; i < 14; i++) {
      const bf = new THREE.Group();
      const leftW = new THREE.Mesh(wingGeo, wingMat);
      leftW.position.x = -0.12;
      const rightW = new THREE.Mesh(wingGeo, wingMat);
      rightW.position.x = 0.12;
      bf.add(leftW, rightW);
      bf.position.set(Math.cos(i * 0.7) * 11, 2.5 + (i % 3) * 0.6, Math.sin(i * 0.7) * 11);
      bf.visible = false;
      root.add(bf);
      butterflies.push(bf);
    }

    for (let i = 0; i < 7; i++) {
      const bird = createBirdModel();
      bird.position.set(Math.cos(i) * 18, 9 + (i % 3) * 2.2, Math.sin(i) * 18);
      bird.visible = false;
      root.add(bird);
      birds.push(bird);
    }

    const deerCenters: [number, number][] = [
      [-14, 14],
      [18, 5],
    ];
    deerCenters.forEach(([cx, cz], idx) => {
      const deer = createForestDeerModel(textures);
      const dy = groundHeightAt(cx, cz, 1);
      deer.position.set(cx, dy, cz);
      deer.visible = false;
      root.add(deer);
      deerList.push({
        group: deer,
        center: new THREE.Vector3(cx, 0, cz),
        radius: 4.5,
        speed: 0.35 + idx * 0.1,
        phase: idx * 2.1,
      });
    });

    return {
      levelId: 1,
      root,
      interactables,
      colliders,
      boxColliders,
      deadTreeColliders,
      spawnPoint: new THREE.Vector3(-3, groundHeightAt(-3, 21, 1), 21),
      playableRadius: 34,
      waterMesh: riverMesh,
      waterMaterial: riverMat,
      waterfallMat: waterSheetMat,
      waterfallFoam: foamRing,
      waterfallPos: new THREE.Vector3(wfX, 0, wfZ),
      waterUniforms,
      windUniforms,
      grassClumps,
      skyColors: {
        polluted: new THREE.Color(0x9ca998),
        restored: new THREE.Color(0x67b8f7),
      },
      fogColors: {
        polluted: new THREE.Color(0xa6b2a0),
        restored: new THREE.Color(0xbae6fd),
      },
      fogDensity: { polluted: 0.0155, restored: 0.0065 },
      waterColors: {
        polluted: new THREE.Color(0x566448),
        restored: new THREE.Color(0x0ea5e9),
      },
      smokeSources,
      butterflies,
      birds,
      deerList,
      deadTrees,
      dispose: () => {
        disposableGeos.forEach((g) => g.dispose());
        disposableMats.forEach((m) => m.dispose());
      },
    };
  }

  if (levelId === 2) {
    // ================= LEVEL 2: CORAL BAY (OCEAN) =================
    const waterUniforms = { uTime: { value: 0 } };
    const oceanGeo = trackGeo(new THREE.PlaneGeometry(200, 200, 80, 80));
    oceanGeo.rotateX(-Math.PI / 2);

    const oceanMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x3b6e5c,
        normalMap: textures.waterNormal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughness: 0.09,
        metalness: 0.36,
        envMapIntensity: 1.5,
      }),
    );
    oceanMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = waterUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           transformed.y += sin(position.x * 0.28 + uTime * 1.9) * 0.16 + cos(position.z * 0.24 + uTime * 1.5) * 0.14;`,
        );
    };
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.receiveShadow = true;
    root.add(oceanMesh);

    const islandSpecs = [
      { cx: 0, cz: 0, r: 9.5, peak: 1.8, palms: 3 },
      { cx: -21, cz: -14, r: 8.5, peak: 2.3, palms: 3 },
      { cx: 20, cz: 15, r: 8.0, peak: 2.2, palms: 3 },
    ];
    const sandMat = trackMat(
      new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 0.85, metalness: 0.02 }),
    );
    islandSpecs.forEach((isl, idx) => {
      const geo = trackGeo(new THREE.PlaneGeometry(isl.r * 2.2, isl.r * 2.2, 24, 24));
      geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const lx = p.getX(i);
        const lz = p.getZ(i);
        const d = Math.hypot(lx, lz);
        const norm = Math.max(0, 1 - d / isl.r);
        p.setY(i, Math.pow(norm, 0.75) * isl.peak - 0.35);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, sandMat);
      mesh.position.set(isl.cx, 0, isl.cz);
      mesh.receiveShadow = true;
      root.add(mesh);

      for (let k = 0; k < isl.palms; k++) {
        const ang = (k / isl.palms) * Math.PI * 2 + idx;
        const px = isl.cx + Math.cos(ang) * (isl.r * 0.42);
        const pz = isl.cz + Math.sin(ang) * (isl.r * 0.42);
        const py = groundHeightAt(px, pz, 2);
        const palm = createTreeModel(textures, 'palm', 1.05);
        palm.position.set(px, py - 0.1, pz);
        palm.rotation.y = ang;
        root.add(palm);
        colliders.push({ x: px, z: pz, radius: 0.6 });
      }
    });

    const woodMat = trackMat(
      new THREE.MeshStandardMaterial({ map: textures.bark, normalMap: textures.barkNormal, roughness: 0.82 }),
    );
    const deck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 0.25, 8.5)), woodMat);
    deck.position.set(0, 0.75, 9.5);
    deck.castShadow = true;
    deck.receiveShadow = true;
    root.add(deck);

    const peakMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: textures.rock,
        normalMap: textures.rockNormal,
        color: 0x5c6775,
        roughness: 0.85,
      }),
    );
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const dist = 56 + (i % 3) * 8;
      const h = 8 + (i % 4) * 3.5;
      const peak = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(5 + (i % 3) * 2, h, 7)), peakMat);
      peak.position.set(Math.cos(ang) * dist, h * 0.38, Math.sin(ang) * dist);
      root.add(peak);
    }

    const bottleCoords: [number, number][] = [
      [-10, 11],
      [11, 8],
      [-15, -3],
      [14, -12],
      [2, -18],
      [-5, 20],
    ];
    bottleCoords.forEach(([bx, bz], idx) => {
      const mesh = createOceanDebrisModel(idx);
      mesh.position.set(bx, 0.15, bz);
      root.add(mesh);
      interactables.push({
        id: `ocean-plastic-${idx}`,
        type: 'collect',
        label: 'Floating Plastic Bottle',
        actionText: 'Collect Plastic',
        position: new THREE.Vector3(bx, 0.2, bz),
        radius: 3.3,
        mesh,
        completed: false,
        baseY: 0.15,
        phaseOffset: idx * 1.3,
      });
    });

    const animalCoords: { x: number; z: number; kind: 'turtle' | 'dolphin'; label: string }[] = [
      { x: -18, z: 12, kind: 'turtle', label: 'Trapped Sea Turtle' },
      { x: 18, z: -4, kind: 'dolphin', label: 'Tangled Dolphin' },
      { x: -9, z: -20, kind: 'dolphin', label: 'Tangled Dolphin' },
      { x: 9, z: 22, kind: 'turtle', label: 'Trapped Sea Turtle' },
    ];
    animalCoords.forEach((spec, idx) => {
      const { group, animalGroup, netGroup } = createSeaAnimalModel(spec.kind);
      group.position.set(spec.x, 0.15, spec.z);
      group.rotation.y = idx * 1.4;
      root.add(group);
      interactables.push({
        id: `ocean-animal-${idx}`,
        type: 'rescue',
        label: spec.label,
        actionText: 'Rescue Sea Animal',
        position: new THREE.Vector3(spec.x, 0.2, spec.z),
        radius: 3.6,
        mesh: group,
        completed: false,
        animalGroup,
        netGroup,
        rescueTime: 0,
        baseY: 0.15,
        phaseOffset: idx * 1.1,
      });
    });

    for (let i = 0; i < 6; i++) {
      const bird = createBirdModel();
      bird.position.set(Math.cos(i) * 20, 10 + (i % 3) * 2, Math.sin(i) * 20);
      bird.visible = false;
      root.add(bird);
      birds.push(bird);
    }

    return {
      levelId: 2,
      root,
      interactables,
      colliders,
      boxColliders,
      deadTreeColliders,
      spawnPoint: new THREE.Vector3(0, groundHeightAt(0, 3, 2), 3),
      playableRadius: 31,
      waterMesh: oceanMesh,
      waterMaterial: oceanMat,
      waterUniforms,
      windUniforms,
      skyColors: {
        polluted: new THREE.Color(0x88a4a6),
        restored: new THREE.Color(0x38bdf8),
      },
      fogColors: {
        polluted: new THREE.Color(0x8faaab),
        restored: new THREE.Color(0xbae6fd),
      },
      fogDensity: { polluted: 0.014, restored: 0.006 },
      waterColors: {
        polluted: new THREE.Color(0x3b6e5c),
        restored: new THREE.Color(0x06b6d4),
      },
      smokeSources,
      butterflies,
      birds,
      deerList,
      deadTrees,
      dispose: () => {
        disposableGeos.forEach((g) => g.dispose());
        disposableMats.forEach((m) => m.dispose());
      },
    };
  }

  // ================= LEVEL 3: KARACHI METROPOLITAN BOULEVARD =================
  const groundGeo = trackGeo(new THREE.PlaneGeometry(180, 180));
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.karachiRoad,
      roughness: 0.88,
      metalness: 0.06,
    }),
  );
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  root.add(groundMesh);

  // Outer Concrete Sidewalks surrounding the Karachi Avenue
  const sidewalkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.88 }));
  const curbYellowMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.72 }));
  const curbBlackMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));

  const sidewalkRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(27.5, 58, 48)),
    sidewalkMat,
  );
  sidewalkRing.rotation.x = -Math.PI / 2;
  sidewalkRing.position.y = 0.04;
  sidewalkRing.receiveShadow = true;
  root.add(sidewalkRing);

  // Central Karachi Roundabout Park Island (Green Core Monument)
  const plazaMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.grass,
      normalMap: textures.grassNormal,
      color: 0x5da832,
      roughness: 0.85,
    }),
  );
  const plazaRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(7.6, 7.9, 0.24, 36)), plazaMat);
  plazaRing.position.y = 0.12;
  plazaRing.receiveShadow = true;
  root.add(plazaRing);

  const roundaboutCurb = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(7.75, 0.16, 8, 40)),
    curbYellowMat,
  );
  roundaboutCurb.rotation.x = Math.PI / 2;
  roundaboutCurb.position.y = 0.18;
  root.add(roundaboutCurb);

  // Coastal Karachi Palms planted around the Central Roundabout
  for (let p = 0; p < 4; p++) {
    const ang = (p / 4) * Math.PI * 2 + Math.PI / 4;
    const px = Math.cos(ang) * 5.2;
    const pz = Math.sin(ang) * 5.2;
    const palm = createTreeModel(textures, 'palm', 0.92);
    palm.position.set(px, 0.22, pz);
    palm.rotation.y = ang;
    root.add(palm);
    colliders.push({ x: px, z: pz, radius: 0.55 });
  }

  // Divided Median Strips with Yellow-Black Curbs & Karachi Streetlamps
  const medianSpecs: [number, number, number, number][] = [
    [-19.5, 0, 14, 1.3],
    [19.5, 0, 14, 1.3],
    [0, 19.5, 1.3, 14],
  ];
  medianSpecs.forEach(([mx, mz, mw, md]) => {
    const med = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(mw, 0.24, md)), sidewalkMat);
    med.position.set(mx, 0.12, mz);
    med.receiveShadow = true;
    root.add(med);
    for (let k = -2; k <= 2; k++) {
      const isHoriz = mw > md;
      const cx = isHoriz ? mx + k * 2.6 : mx;
      const cz = isHoriz ? mz : mz + k * 2.6;
      const curb = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(isHoriz ? 1.3 : 1.42, 0.27, isHoriz ? 1.42 : 1.3)),
        k % 2 === 0 ? curbYellowMat : curbBlackMat,
      );
      curb.position.set(cx, 0.13, cz);
      root.add(curb);
    }
  });

  // White Road Lane Markings & Zebra Crossings
  const stripeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72 }));
  for (let i = -3; i <= 3; i++) {
    if (Math.abs(i) <= 1) continue;
    const dashX = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 0.03, 0.28)), stripeMat);
    dashX.position.set(i * 5.8, 0.02, 11.5);
    root.add(dashX);

    const dashX2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 0.03, 0.28)), stripeMat);
    dashX2.position.set(i * 5.8, 0.02, -11.5);
    root.add(dashX2);

    const dashZ = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.03, 2.4)), stripeMat);
    dashZ.position.set(-11.5, 0.02, i * 5.8);
    root.add(dashZ);

    const dashZ2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.03, 2.4)), stripeMat);
    dashZ2.position.set(11.5, 0.02, i * 5.8);
    root.add(dashZ2);
  }
  // Pedestrian Zebra Crossing near southern entrance
  for (let z = -3; z <= 3; z++) {
    const zebra = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.65, 0.03, 2.6)), stripeMat);
    zebra.position.set(z * 1.35, 0.02, 12.0);
    root.add(zebra);
  }

  // Karachi Boulevard Streetlamps along outer sidewalk perimeter
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + 0.18;
    const lx = Math.cos(ang) * 27.2;
    const lz = Math.sin(ang) * 27.2;
    const lamp = createStreetLampModel();
    lamp.position.set(lx, 0, lz);
    lamp.lookAt(0, 0, 0);
    lamp.rotateY(-Math.PI / 2);
    root.add(lamp);
    colliders.push({ x: lx, z: lz, radius: 0.4 });
  }

  // Iconic Pakistani Green & Yellow Auto-Rickshaws along the Karachi curbs
  const rickshawSpots: { x: number; z: number; rotY: number }[] = [
    { x: -16.5, z: 5.5, rotY: Math.PI / 2 },
    { x: 17.0, z: -5.5, rotY: -Math.PI / 2 },
    { x: -7.5, z: 22.5, rotY: 0.4 },
    { x: 9.5, z: -22.0, rotY: Math.PI - 0.2 },
    { x: -23.0, z: -12.0, rotY: 0.7 },
    { x: 23.0, z: 12.5, rotY: -2.4 },
  ];
  rickshawSpots.forEach((rs) => {
    const rMesh = createRickshawModel(textures);
    rMesh.position.set(rs.x, 0, rs.z);
    rMesh.rotation.y = rs.rotY;
    root.add(rMesh);
    // Two solid colliders along rickshaw length so front & rear bumpers cannot be clipped
    const fx = Math.sin(rs.rotY) * 0.65;
    const fz = Math.cos(rs.rotY) * 0.65;
    colliders.push({ x: rs.x + fx, z: rs.z + fz, radius: 0.8 });
    colliders.push({ x: rs.x - fx, z: rs.z - fz, radius: 0.8 });
  });

  // Dense Karachi Metropolitan Concrete Apartment & Commercial Shopfront Blocks
  const wallPalettes = [0xd6c7b2, 0xcab89d, 0xb8a38c, 0xcbd5e1, 0xd8c3a5];
  const awningPalettes = [0x15803d, 0x0284c7, 0xb91c1c, 0xd97706, 0x0f766e];
  for (let i = 0; i < 26; i++) {
    const ang = (i / 26) * Math.PI * 2;
    const dist = 33.5 + (i % 3) * 3.8;
    const bx = Math.cos(ang) * dist;
    const bz = Math.sin(ang) * dist;
    const w = 6.2 + (i % 3) * 1.4;
    const h = 11 + (i % 5) * 4.2;
    const d = 6.0 + (i % 2) * 1.2;

    const bldg = createKarachiBuildingModel(
      textures,
      w,
      h,
      d,
      wallPalettes[i % wallPalettes.length],
      awningPalettes[i % awningPalettes.length],
    );
    bldg.position.set(bx, 0, bz);
    bldg.lookAt(0, 0, 0);
    root.add(bldg);
    colliders.push({ x: bx, z: bz, radius: Math.max(w, d) * 0.58 });
  }

  // 6 Realistic Karachi Roadside Garbage Heaps & Overflowing Skips
  const wasteCoords: [number, number][] = [
    [-12.5, 13.5],
    [13.5, 13.5],
    [-14.5, -12.5],
    [14.5, -11.5],
    [-21.5, 10.5],
    [21.0, -10.5],
  ];
  wasteCoords.forEach(([wx, wz], idx) => {
    const mesh = createUrbanWasteModel(textures, idx);
    mesh.position.set(wx, 0, wz);
    mesh.rotation.y = idx * 1.1;
    root.add(mesh);
    const skipCol: ObstacleCollider = { x: wx, z: wz, radius: 0.92, active: true };
    colliders.push(skipCol);
    interactables.push({
      id: `city-waste-${idx}`,
      type: 'collect',
      label: idx % 2 === 0 ? 'Overflowing Garbage Skip' : 'Roadside Garbage Heap',
      actionText: 'Clean Up Garbage',
      position: new THREE.Vector3(wx, 0, wz),
      radius: 3.4,
      mesh,
      solidCollider: skipCol,
      completed: false,
      baseY: 0,
      phaseOffset: idx * 0.9,
    });
  });

  const binCoords: [number, number][] = [
    [-7.8, 7.8],
    [7.8, -7.8],
  ];
  binCoords.forEach(([bx, bz], idx) => {
    const { group, beacon } = createRecyclingBinModel(textures);
    group.position.set(bx, 0, bz);
    group.lookAt(0, 0, 0);
    root.add(group);
    // Side-by-side colliders matching the 3.2m wide 3-bin station
    const ang = Math.atan2(-bx, -bz) + Math.PI / 2;
    const ox = Math.sin(ang) * 0.85;
    const oz = Math.cos(ang) * 0.85;
    colliders.push({ x: bx + ox, z: bz + oz, radius: 0.92 });
    colliders.push({ x: bx - ox, z: bz - oz, radius: 0.92 });
    interactables.push({
      id: `city-bin-${idx}`,
      type: 'recycle',
      label: 'KMC Eco Recycling Station',
      actionText: 'Sort Garbage into Bins',
      position: new THREE.Vector3(bx, 0, bz),
      radius: 4.1,
      mesh: group,
      completed: false,
      ringMesh: beacon,
      baseY: 0,
      phaseOffset: idx * 1.5,
    });
  });

  const machineCoords: [number, number][] = [
    [0, -21],
    [-22, -2],
    [22, 2],
  ];
  machineCoords.forEach(([mx, mz], idx) => {
    const { group, fan, beacon, solarWings } = createPollutionMachineModel(textures);
    group.position.set(mx, 0, mz);
    group.lookAt(0, 0, 0);
    root.add(group);
    colliders.push({ x: mx, z: mz, radius: 2.0 });
    smokeSources.push(new THREE.Vector3(mx, 3.9, mz));
    interactables.push({
      id: `city-machine-${idx}`,
      type: 'shutdown',
      label: 'Diesel Smog Generator',
      actionText: 'Shut Down & Install Solar',
      position: new THREE.Vector3(mx, 0, mz),
      radius: 4.2,
      mesh: group,
      completed: false,
      machineFan: fan,
      machineBeacon: beacon,
      solarWings,
      baseY: 0,
      phaseOffset: idx * 1.2,
    });
  });

  const { group: coreGroup, crystal, ring1, ring2 } = createPlanetCoreModel(textures);
  coreGroup.position.set(0, 0.24, 0);
  root.add(coreGroup);
  colliders.push({ x: 0, z: 0, radius: 2.05 });
  interactables.push({
    id: 'city-planet-core',
    type: 'core',
    label: 'Planetary Green Energy Core',
    actionText: 'Restore Planet Green Energy!',
    position: new THREE.Vector3(0, 0.24, 0),
    radius: 4.4,
    mesh: coreGroup,
    completed: false,
    coreCrystal: crystal,
    coreRing1: ring1,
    coreRing2: ring2,
    baseY: 0.24,
    phaseOffset: 0,
  });

  for (let i = 0; i < 6; i++) {
    const bird = createBirdModel();
    bird.position.set(Math.cos(i) * 16, 10 + (i % 3) * 2, Math.sin(i) * 16);
    bird.visible = false;
    root.add(bird);
    birds.push(bird);
  }

  return {
    levelId: 3,
    root,
    interactables,
    colliders,
    boxColliders,
    deadTreeColliders,
    spawnPoint: new THREE.Vector3(0, 0, 16.5),
    playableRadius: 27,
    windUniforms,
    skyColors: {
      polluted: new THREE.Color(0x827b70),
      restored: new THREE.Color(0x54b4f8),
    },
    fogColors: {
      polluted: new THREE.Color(0x8c8478),
      restored: new THREE.Color(0xbae6fd),
    },
    fogDensity: { polluted: 0.0175, restored: 0.0055 },
    smokeSources,
    butterflies,
    birds,
    deerList,
    deadTrees,
    dispose: () => {
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
    },
  };
}
