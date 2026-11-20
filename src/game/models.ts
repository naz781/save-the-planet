import * as THREE from 'three';
import { ProceduralTextures } from './textures';

export interface HeroRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  torsoPivot: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
  scarf: THREE.Mesh;
  coreGem: THREE.Mesh;
  hoverboard: THREE.Group;
  shadowPlane: THREE.Mesh;
  jacketMat: THREE.MeshStandardMaterial;
  vestMat: THREE.MeshStandardMaterial;
  scarfMat: THREE.MeshStandardMaterial;
}

export function createContactShadow(
  textures: ProceduralTextures,
  radius = 1.0,
  opacity = 0.45,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.03;
  return mesh;
}

export function createHeroModel(textures: ProceduralTextures): HeroRig {
  const group = new THREE.Group();

  const shadowPlane = createContactShadow(textures, 0.9, 0.46);
  group.add(shadowPlane);

  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  // Realistic outdoor explorer materials with clear roughness/metalness contrast
  const jacketMat = new THREE.MeshStandardMaterial({
    color: 0x1f6f50, // deep forest ranger green
    roughness: 0.72,
    metalness: 0.05,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0xc28e52, // warm canvas khaki vest
    roughness: 0.82,
    metalness: 0.02,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // charcoal cargo pants
    roughness: 0.85,
    metalness: 0.04,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x5c3720,
    roughness: 0.58,
    metalness: 0.08,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.28,
    metalness: 0.82,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xf1bfa0,
    roughness: 0.65,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x3b2618,
    roughness: 0.88,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    roughness: 0.12,
    metalness: 0.88,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x10b981,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.35,
  });

  // Articulated Legs (hip -> thigh -> knee -> shin -> boot)
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.84, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.26, 6, 10), pantsMat);
    thigh.position.y = -0.2;
    thigh.castShadow = true;
    legPivot.add(thigh);

    const kneePad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.12), leatherMat);
    kneePad.position.set(0, -0.38, 0.08);
    legPivot.add(kneePad);

    const shinPivot = new THREE.Group();
    shinPivot.position.set(0, -0.4, 0);
    legPivot.add(shinPivot);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.26, 6, 10), pantsMat);
    shin.position.y = -0.18;
    shin.castShadow = true;
    shinPivot.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.18, 0.33), leatherMat);
    boot.position.set(0, -0.36, 0.05);
    boot.castShadow = true;
    shinPivot.add(boot);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.35), pantsMat);
    sole.position.set(0, -0.43, 0.05);
    shinPivot.add(sole);

    return { legPivot, shinPivot };
  };

  const leftL = makeLeg(-0.15);
  const rightL = makeLeg(0.15);
  const leftLeg = leftL.legPivot;
  const rightLeg = rightL.legPivot;
  const leftShin = leftL.shinPivot;
  const rightShin = rightL.shinPivot;
  bodyPivot.add(leftLeg, rightLeg);

  // Torso Pivot at waist (y = 0.84)
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.84, 0);
  bodyPivot.add(torsoPivot);

  // Pelvis / Belt
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.2, 12), pantsMat);
  hips.position.y = 0.06;
  hips.castShadow = true;
  torsoPivot.add(hips);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.09, 12), leatherMat);
  belt.position.y = 0.12;
  torsoPivot.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.08), metalMat);
  buckle.position.set(0, 0.12, 0.24);
  torsoPivot.add(buckle);

  // Field Jacket & Utility Vest
  const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.56, 12), jacketMat);
  jacket.position.y = 0.42;
  jacket.castShadow = true;
  torsoPivot.add(jacket);

  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.46, 0.38), vestMat);
  vest.position.set(0, 0.44, 0.01);
  vest.castShadow = true;
  torsoPivot.add(vest);

  // Chest Bio-Core Emblem
  const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), coreMat);
  coreGem.position.set(0.12, 0.52, 0.22);
  torsoPivot.add(coreGem);

  // Detailed Hiking / Eco-Explorer Backpack
  const packGroup = new THREE.Group();
  packGroup.position.set(0, 0.44, -0.26);

  const mainPack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.24), vestMat);
  mainPack.castShadow = true;
  packGroup.add(mainPack);

  const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.26), leatherMat);
  packFlap.position.y = 0.22;
  packGroup.add(packFlap);

  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 10), jacketMat);
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 0.34, 0);
  packGroup.add(bedroll);

  const canteen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 }),
  );
  canteen.position.set(-0.24, -0.05, 0.02);
  packGroup.add(canteen);

  const bioTank = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 10), coreMat);
  bioTank.position.set(0, 0.02, -0.14);
  packGroup.add(bioTank);

  const solarStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.18, 0.03),
    new THREE.MeshStandardMaterial({ map: textures.solarPanel, roughness: 0.2, metalness: 0.65 }),
  );
  solarStrip.position.set(0, 0.06, -0.13);
  packGroup.add(solarStrip);

  torsoPivot.add(packGroup);

  // Flowing Trail Scarf
  const scarfShape = new THREE.Shape();
  scarfShape.moveTo(-0.14, 0);
  scarfShape.lineTo(0.14, 0);
  scarfShape.lineTo(0.22, -0.78);
  scarfShape.lineTo(-0.22, -0.78);
  scarfShape.closePath();
  const scarfMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const scarf = new THREE.Mesh(
    new THREE.ShapeGeometry(scarfShape),
    scarfMat,
  );
  scarf.position.set(0, 0.7, -0.14);
  scarf.rotation.x = 0.28;
  scarf.castShadow = true;
  torsoPivot.add(scarf);

  // Articulated Arms (shoulder -> upper arm -> forearm -> gloved hand)
  const makeArm = (xOffset: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 0.66, 0);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), jacketMat);
    armPivot.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 6, 10), jacketMat);
    upperArm.position.y = -0.16;
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.32, 0);
    armPivot.add(forearmPivot);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.2, 6, 10), skinMat);
    forearm.position.y = -0.14;
    forearm.castShadow = true;
    forearmPivot.add(forearm);

    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), leatherMat);
    glove.position.y = -0.29;
    forearmPivot.add(glove);

    return { armPivot, forearmPivot };
  };

  const leftA = makeArm(-0.34);
  const rightA = makeArm(0.34);
  const leftArm = leftA.armPivot;
  const rightArm = rightA.armPivot;
  const leftForearm = leftA.forearmPivot;
  const rightForearm = rightA.forearmPivot;
  torsoPivot.add(leftArm, rightArm);

  // Sculpted Head + Explorer Hat + Trail Goggles
  const head = new THREE.Group();
  head.position.set(0, 0.78, 0);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.12, 10), skinMat);
  neck.position.y = 0.04;
  head.add(neck);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), skinMat);
  cranium.position.y = 0.23;
  cranium.castShadow = true;
  head.add(cranium);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat,
  );
  hair.position.set(0, 0.24, -0.02);
  hair.rotation.x = -0.2;
  head.add(hair);

  // Eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
  [-0.075, 0.075].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), eyeMat);
    eye.position.set(ex, 0.24, 0.2);
    head.add(eye);
  });

  // Explorer Hat
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.38, 0.04, 16),
    vestMat,
  );
  hatBrim.position.y = 0.36;
  hatBrim.rotation.x = -0.08;
  hatBrim.castShadow = true;
  head.add(hatBrim);

  const hatCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.23, 0.17, 14),
    vestMat,
  );
  hatCrown.position.y = 0.44;
  hatCrown.rotation.x = -0.08;
  hatCrown.castShadow = true;
  head.add(hatCrown);

  const hatBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.225, 0.235, 0.045, 14),
    leatherMat,
  );
  hatBand.position.y = 0.39;
  hatBand.rotation.x = -0.08;
  head.add(hatBand);

  // Explorer Goggles resting on hat front
  [-0.08, 0.08].forEach((gx) => {
    const goggle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 10), lensMat);
    goggle.rotation.x = Math.PI / 2;
    goggle.position.set(gx, 0.4, 0.22);
    head.add(goggle);
  });

  torsoPivot.add(head);

  // Level 2 Eco-Hoverboard
  const hoverboard = new THREE.Group();
  hoverboard.visible = false;
  const boardHull = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.1, 1.65),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.28, metalness: 0.55 }),
  );
  boardHull.position.y = 0.08;
  hoverboard.add(boardHull);

  const boardTrim = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.05, 1.15), metalMat);
  boardTrim.position.y = 0.09;
  hoverboard.add(boardTrim);

  const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.28, 10), coreMat);
  thruster.rotation.x = Math.PI / 2;
  thruster.position.set(0, 0.08, -0.84);
  hoverboard.add(thruster);
  group.add(hoverboard);

  return {
    group,
    bodyPivot,
    torsoPivot,
    head,
    leftArm,
    rightArm,
    leftForearm,
    rightForearm,
    leftLeg,
    rightLeg,
    leftShin,
    rightShin,
    scarf,
    coreGem,
    hoverboard,
    shadowPlane,
    jacketMat,
    vestMat,
    scarfMat,
  };
}

export function createTreeModel(
  textures: ProceduralTextures,
  variant: 'oak' | 'pine' | 'palm' = 'oak',
  scale = 1,
): THREE.Group {
  const tree = new THREE.Group();
  tree.add(createContactShadow(textures, 1.65 * scale, 0.38));

  const trunkMat = new THREE.MeshStandardMaterial({
    map: textures.bark,
    normalMap: textures.barkNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    color: variant === 'palm' ? 0x9c724d : 0x7b4c2d,
    roughness: 0.9,
    metalness: 0.02,
  });

  if (variant === 'pine') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.44, 2.5, 9), trunkMat);
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const pineMat1 = new THREE.MeshStandardMaterial({
      map: textures.foliage,
      color: 0x1e824c,
      roughness: 0.65,
    });
    const pineMat2 = new THREE.MeshStandardMaterial({
      map: textures.foliage,
      color: 0x2aa85c,
      roughness: 0.6,
    });

    const tiers = [
      { r: 1.85, h: 2.4, y: 2.6, m: pineMat1 },
      { r: 1.45, h: 2.1, y: 3.9, m: pineMat2 },
      { r: 1.0, h: 1.8, y: 5.1, m: pineMat1 },
      { r: 0.55, h: 1.2, y: 6.0, m: pineMat2 },
    ];
    tiers.forEach((t) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 10), t.m);
      cone.position.y = t.y;
      cone.castShadow = true;
      cone.receiveShadow = true;
      tree.add(cone);
    });
  } else if (variant === 'palm') {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.28, 1.6, 0.1),
      new THREE.Vector3(0.6, 3.3, 0.15),
    ]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.24, 8, false), trunkMat);
    trunk.castShadow = true;
    tree.add(trunk);

    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 7; i++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 5), frondMat);
      frond.position.set(0.6, 3.35, 0.15);
      frond.rotation.z = -Math.PI * 0.42;
      frond.rotation.y = (i / 7) * Math.PI * 2;
      frond.translateY(1.0);
      frond.castShadow = true;
      tree.add(frond);
    }

    const coconutMat = new THREE.MeshStandardMaterial({ color: 0x6b3e1b, roughness: 0.8 });
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), coconutMat);
      const ang = (i / 3) * Math.PI * 2;
      c.position.set(0.6 + Math.cos(ang) * 0.22, 3.15, 0.15 + Math.sin(ang) * 0.22);
      tree.add(c);
    }
  } else {
    // Detailed Oak with flared root buttresses & multi-cluster crown
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.54, 2.6, 10), trunkMat);
    trunk.position.y = 1.3;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    for (let r = 0; r < 4; r++) {
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 0.85, 6), trunkMat);
      const ang = (r / 4) * Math.PI * 2 + 0.4;
      root.position.set(Math.cos(ang) * 0.36, 0.3, Math.sin(ang) * 0.36);
      root.rotation.z = -Math.cos(ang) * 0.65;
      root.rotation.x = Math.sin(ang) * 0.65;
      tree.add(root);
    }

    const canopyMat = new THREE.MeshStandardMaterial({
      map: textures.foliage,
      color: 0x22a854,
      roughness: 0.62,
    });
    const canopyAccentMat = new THREE.MeshStandardMaterial({
      map: textures.foliage,
      color: 0x4ade80,
      roughness: 0.54,
    });

    const puffs = [
      { pos: [0, 3.3, 0], r: 1.5, m: canopyMat },
      { pos: [-0.95, 2.8, 0.45], r: 1.1, m: canopyAccentMat },
      { pos: [0.95, 2.85, -0.35], r: 1.15, m: canopyMat },
      { pos: [0.15, 4.05, 0.25], r: 1.0, m: canopyAccentMat },
      { pos: [-0.25, 2.95, -0.85], r: 0.95, m: canopyMat },
    ];
    puffs.forEach((p) => {
      const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(p.r, 1), p.m);
      sphere.position.set(p.pos[0], p.pos[1], p.pos[2]);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      tree.add(sphere);
    });
  }

  tree.scale.setScalar(scale);
  return tree;
}

export function createDeadTreeModel(textures: ProceduralTextures, scale = 1): THREE.Group {
  const tree = new THREE.Group();
  tree.add(createContactShadow(textures, 1.1 * scale, 0.32));

  const deadMat = new THREE.MeshStandardMaterial({
    map: textures.bark,
    color: 0x4b433c,
    roughness: 0.95,
    metalness: 0.02,
  });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.38, 3.1, 8), deadMat);
  trunk.position.y = 1.55;
  trunk.rotation.z = 0.08;
  trunk.castShadow = true;
  tree.add(trunk);

  const branches = [
    { pos: [-0.45, 2.2, 0.1], rz: 0.85, ry: 0.2, len: 1.2 },
    { pos: [0.48, 2.55, -0.1], rz: -0.78, ry: -0.3, len: 1.35 },
    { pos: [0.1, 2.8, 0.4], rz: 0.55, ry: 1.4, len: 0.95 },
  ];
  branches.forEach((b) => {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, b.len, 6), deadMat);
    br.position.set(b.pos[0], b.pos[1], b.pos[2]);
    br.rotation.z = b.rz;
    br.rotation.y = b.ry;
    br.castShadow = true;
    tree.add(br);
  });

  tree.scale.setScalar(scale);
  return tree;
}

export function createWaterfallModel(textures: ProceduralTextures): {
  group: THREE.Group;
  waterSheetMat: THREE.MeshStandardMaterial;
  foamRing: THREE.Mesh;
} {
  const group = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({
    map: textures.rock,
    normalMap: textures.rockNormal,
    color: 0x6b7280,
    roughness: 0.88,
  });

  // Left & Right Cliff Buttresses
  const cliffLeft = new THREE.Mesh(new THREE.DodecahedronGeometry(4.8, 1), rockMat);
  cliffLeft.position.set(-4.6, 3.8, 0);
  cliffLeft.scale.set(1.1, 1.45, 1.0);
  cliffLeft.castShadow = true;
  cliffLeft.receiveShadow = true;
  group.add(cliffLeft);

  const cliffRight = new THREE.Mesh(new THREE.DodecahedronGeometry(4.6, 1), rockMat);
  cliffRight.position.set(4.5, 3.6, 0.2);
  cliffRight.scale.set(1.1, 1.4, 1.0);
  cliffRight.castShadow = true;
  cliffRight.receiveShadow = true;
  group.add(cliffRight);

  const backCliff = new THREE.Mesh(new THREE.BoxGeometry(11, 9.2, 4.2), rockMat);
  backCliff.position.set(0, 4.0, -2.2);
  backCliff.castShadow = true;
  backCliff.receiveShadow = true;
  group.add(backCliff);

  // Cascading Waterfall Sheet
  const waterSheetMat = new THREE.MeshStandardMaterial({
    map: textures.waterfall,
    color: 0x7dd3fc,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.88,
  });
  const waterSheet = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 8.6, 8, 16), waterSheetMat);
  waterSheet.position.set(0, 3.5, 0.15);
  waterSheet.rotation.x = -0.14;
  group.add(waterSheet);

  // Plunge Pool Mist & Foam Ring
  const foamRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.36, 8, 28),
    new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.7,
    }),
  );
  foamRing.rotation.x = Math.PI / 2;
  foamRing.position.set(0, -0.45, 1.5);
  group.add(foamRing);

  return { group, waterSheetMat, foamRing };
}

export function createBridgeModel(textures: ProceduralTextures): THREE.Group {
  const bridge = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.bark,
    normalMap: textures.barkNormal,
    color: 0xa47148,
    roughness: 0.82,
  });
  const postMat = new THREE.MeshStandardMaterial({
    map: textures.bark,
    color: 0x5c3a21,
    roughness: 0.88,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.rock,
    normalMap: textures.rockNormal,
    color: 0x6b7280,
    roughness: 0.9,
  });

  // Heavy Stone Abutment Piers anchored deep into both riverbanks
  [-4.35, 4.35].forEach((ax) => {
    const abutment = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.25, 3.3), stoneMat);
    abutment.position.set(ax, -0.58, 0);
    abutment.castShadow = true;
    abutment.receiveShadow = true;
    bridge.add(abutment);
  });

  // Support Timber Pilings in riverbed beneath main span
  [-2.2, 2.2].forEach((px) => {
    [-1.15, 1.15].forEach((pz) => {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 2.4, 8), postMat);
      piling.position.set(px, -0.55, pz);
      piling.castShadow = true;
      bridge.add(piling);
    });
  });

  // Grounded Approach Ramps on both banks (x = -5.2..-3.8 and +3.8..+5.2)
  // Connects seamlessly from ground (-0.22) up onto raised bridge deck (+0.55)
  [-1, 1].forEach((side) => {
    for (let r = 0; r < 4; r++) {
      const u = (r + 0.5) / 4; // 0 = outer bank, 1 = abutment edge
      const rx = side * THREE.MathUtils.lerp(5.2, 3.8, u);
      const ry = THREE.MathUtils.lerp(-0.22, 0.55, u);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 2.95), woodMat);
      plank.position.set(rx, ry, 0);
      plank.rotation.z = side * -0.5;
      plank.castShadow = true;
      plank.receiveShadow = true;
      bridge.add(plank);
    }
  });

  // Elevated Arched Main Deck (x = -3.8..+3.8, well above water level y = -0.35)
  const plankCount = 13;
  const span = 7.6;
  for (let i = 0; i < plankCount; i++) {
    const t = i / (plankCount - 1) - 0.5; // -0.5..0.5
    const x = t * span;
    const archY = 0.55 + Math.cos(t * Math.PI) * 0.6;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 2.95), woodMat);
    plank.position.set(x, archY, 0);
    plank.rotation.z = -Math.sin(t * Math.PI) * 0.22;
    plank.castShadow = true;
    plank.receiveShadow = true;
    bridge.add(plank);
  }

  // Side Stringers, Vertical Posts & Double Handrails
  [-1.42, 1.42].forEach((z) => {
    const postXs = [-3.8, -1.9, 0, 1.9, 3.8];
    postXs.forEach((px) => {
      const t = px / 7.6;
      const py = 0.55 + Math.cos(t * Math.PI) * 0.6;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.15, 8), postMat);
      post.position.set(px, py + 0.5, z);
      post.castShadow = true;
      bridge.add(post);
    });

    // Arched handrail segments
    for (let s = 0; s < 4; s++) {
      const x0 = postXs[s];
      const x1 = postXs[s + 1];
      const y0 = 0.55 + Math.cos((x0 / 7.6) * Math.PI) * 0.6 + 0.98;
      const y1 = 0.55 + Math.cos((x1 / 7.6) * Math.PI) * 0.6 + 0.98;
      const len = Math.hypot(x1 - x0, y1 - y0);
      const ang = Math.atan2(y1 - y0, x1 - x0);

      const topRail = new THREE.Mesh(new THREE.BoxGeometry(len + 0.08, 0.1, 0.1), postMat);
      topRail.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
      topRail.rotation.z = ang;
      topRail.castShadow = true;
      bridge.add(topRail);

      const midRail = new THREE.Mesh(new THREE.BoxGeometry(len + 0.08, 0.07, 0.08), woodMat);
      midRail.position.set((x0 + x1) / 2, (y0 + y1) / 2 - 0.42, z);
      midRail.rotation.z = ang;
      bridge.add(midRail);
    }
  });

  return bridge;
}

export function createRiverPollutionModel(): THREE.Group {
  const group = new THREE.Group();

  const slick = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 22),
    new THREE.MeshStandardMaterial({
      color: 0x3f4a24,
      roughness: 0.18,
      metalness: 0.35,
      transparent: true,
      opacity: 0.72,
    }),
  );
  slick.rotation.x = -Math.PI / 2;
  slick.position.y = 0.02;
  group.add(slick);

  // Floating knotted black & white polythene shopper bags
  const bagColors = [0x1e293b, 0xe2e8f0, 0x3b82f6];
  [
    [-0.38, 0.08, 0.25, 0.3],
    [0.32, 0.06, -0.22, 0.26],
    [0.05, 0.07, 0.48, 0.24],
  ].forEach(([bx, by, bz, r], i) => {
    const bagMat = new THREE.MeshStandardMaterial({
      color: bagColors[i],
      roughness: 0.42,
      metalness: 0.06,
    });
    const bag = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), bagMat);
    bag.scale.set(1.25, 0.6, 1.0);
    bag.position.set(bx, by, bz);
    bag.castShadow = true;
    group.add(bag);
  });

  // Floating crushed PET plastic bottles
  [-0.55, 0.58].forEach((xPos, i) => {
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.46, 10),
      new THREE.MeshStandardMaterial({
        color: i === 0 ? 0x93c5fd : 0xd1fae5,
        roughness: 0.2,
        transparent: true,
        opacity: 0.85,
      }),
    );
    bottle.rotation.z = Math.PI / 2;
    bottle.rotation.y = i * 1.1 + 0.4;
    bottle.position.set(xPos, 0.08, i === 0 ? -0.35 : 0.3);
    group.add(bottle);
  });

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.48, 1.62, 28),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  return group;
}

export function createSeedModel(): THREE.Group {
  const group = new THREE.Group();

  const seedCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 1),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.5,
    }),
  );
  seedCore.scale.set(0.85, 1.25, 0.85);
  seedCore.position.y = 0.65;
  seedCore.castShadow = true;
  group.add(seedCore);

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x16a34a,
    emissiveIntensity: 0.3,
    roughness: 0.45,
  });
  [-1, 1].forEach((side) => {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.48, 5), leafMat);
    leaf.position.set(side * 0.28, 0.78, 0);
    leaf.rotation.z = -side * 0.9;
    group.add(leaf);
  });

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.68, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.68,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  group.add(ring);

  return group;
}

export function createBirdModel(): THREE.Group {
  const bird = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.55 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8), bodyMat);
  body.rotation.x = Math.PI / 2;
  bird.add(body);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 5), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0, 0.28);
  bird.add(beak);

  const leftWing = new THREE.Group();
  const lwMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 0.18), wingMat);
  lwMesh.position.x = -0.24;
  leftWing.add(lwMesh);
  bird.add(leftWing);

  const rightWing = new THREE.Group();
  const rwMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.03, 0.18), wingMat);
  rwMesh.position.x = 0.24;
  rightWing.add(rwMesh);
  bird.add(rightWing);

  bird.userData.leftWing = leftWing;
  bird.userData.rightWing = rightWing;
  return bird;
}

export function createForestDeerModel(textures: ProceduralTextures): THREE.Group {
  const deer = new THREE.Group();
  deer.add(createContactShadow(textures, 0.75, 0.35));

  const coatMat = new THREE.MeshStandardMaterial({ color: 0xb87644, roughness: 0.78 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf3e5d0, roughness: 0.8 });
  const antlerMat = new THREE.MeshStandardMaterial({ color: 0xe2d5c3, roughness: 0.7 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.75, 6, 10), coatMat);
  torso.rotation.x = Math.PI / 2;
  torso.position.y = 0.82;
  torso.castShadow = true;
  deer.add(torso);

  const legOffsets = [
    [-0.16, 0.36],
    [0.16, 0.36],
    [-0.16, -0.36],
    [0.16, -0.36],
  ];
  legOffsets.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.75, 6), coatMat);
    leg.position.set(lx, 0.38, lz);
    leg.castShadow = true;
    deer.add(leg);
  });

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.55, 8), coatMat);
  neck.position.set(0, 1.15, 0.42);
  neck.rotation.x = 0.35;
  deer.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.36), coatMat);
  head.position.set(0, 1.4, 0.58);
  head.castShadow = true;
  deer.add(head);

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), bellyMat);
  tail.position.set(0, 0.9, -0.52);
  deer.add(tail);

  [-0.1, 0.1].forEach((ax) => {
    const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.38, 6), antlerMat);
    antler.position.set(ax, 1.62, 0.52);
    antler.rotation.z = -ax * 2.5;
    deer.add(antler);
  });

  return deer;
}

export function createPlantSpotModel(textures: ProceduralTextures): {
  group: THREE.Group;
  ring: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.add(createContactShadow(textures, 1.15, 0.34));

  const mound = new THREE.Mesh(
    new THREE.SphereGeometry(0.88, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: 0x5c3d24, roughness: 0.92 }),
  );
  mound.scale.set(1.15, 0.42, 1.15);
  mound.receiveShadow = true;
  group.add(mound);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.08, 8, 28),
    new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      emissive: 0x22c55e,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.3,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.14;
  group.add(ring);

  const stake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.95, 6),
    new THREE.MeshStandardMaterial({ color: 0xb48453, roughness: 0.85 }),
  );
  stake.position.set(0.3, 0.48, 0);
  stake.rotation.z = -0.15;
  group.add(stake);

  return { group, ring };
}

function addRealisticTrashHeapDetails(
  group: THREE.Group,
  textures: ProceduralTextures,
  seed: number,
  scale = 1,
): void {
  const heapMat = new THREE.MeshStandardMaterial({
    map: textures.garbageHeap,
    roughness: 0.92,
    metalness: 0.04,
  });

  // Base compacted garbage mound
  const mound = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72 * scale, 1), heapMat);
  mound.scale.set(1.25, 0.42, 1.15);
  mound.position.y = 0.16 * scale;
  mound.castShadow = true;
  mound.receiveShadow = true;
  group.add(mound);

  // Knotted polythene shopper bags (black, milky-white, faded blue)
  const bagCols = [0x1c2128, 0xe5e7eb, 0x3b82f6, 0x262b33];
  const bagOffsets: [number, number, number, number][] = [
    [-0.36, 0.26, 0.18, 0.34],
    [0.32, 0.24, -0.14, 0.31],
    [0.02, 0.38, -0.05, 0.3],
    [-0.08, 0.21, 0.42, 0.25],
  ];
  bagOffsets.forEach(([bx, by, bz, r], i) => {
    const col = bagCols[(i + seed) % bagCols.length];
    const bagMat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.38,
      metalness: 0.06,
    });
    const bag = new THREE.Mesh(new THREE.DodecahedronGeometry(r * scale, 1), bagMat);
    bag.scale.set(1.12, 0.85, 0.96);
    bag.position.set(bx * scale, by * scale, bz * scale);
    bag.rotation.set(i * 0.4, seed + i * 0.9, 0.2);
    bag.castShadow = true;
    group.add(bag);

    // Pinched knot on top of polythene bag
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.11 * scale, 0.18 * scale, 6), bagMat);
    knot.position.set(bx * scale, (by + r * 0.82) * scale, bz * scale);
    knot.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.35;
    group.add(knot);
  });

  // Torn wet cardboard carton
  const carton = new THREE.Mesh(
    new THREE.BoxGeometry(0.55 * scale, 0.28 * scale, 0.42 * scale),
    new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.92 }),
  );
  carton.position.set(0.46 * scale, 0.14 * scale, 0.36 * scale);
  carton.rotation.set(0.15, 0.65 + seed * 0.3, -0.18);
  carton.castShadow = true;
  group.add(carton);

  // Crushed PET bottles & flattened soda cans
  const bottleMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.18,
    transparent: true,
    opacity: 0.82,
  });
  [
    [-0.56, 0.08, -0.35, 0.8],
    [0.58, 0.09, -0.38, -0.5],
  ].forEach(([px, py, pz, ry]) => {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.09 * scale, 0.36 * scale, 8), bottleMat);
    bottle.position.set(px * scale, py * scale, pz * scale);
    bottle.rotation.set(0, ry, Math.PI / 2);
    group.add(bottle);
  });

  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075 * scale, 0.075 * scale, 0.2 * scale, 10),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.28, metalness: 0.72 }),
  );
  can.position.set(-0.48 * scale, 0.07 * scale, 0.45 * scale);
  can.rotation.set(Math.PI / 2, 0.5, 0.2);
  group.add(can);
}

export function createGarbageModel(
  textures: ProceduralTextures,
  variant: number,
): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(textures, 1.15, 0.42));

  if (variant % 3 === 1) {
    // Discarded worn rubber tires + spilled polythene garbage heap
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x181b20,
      roughness: 0.92,
      metalness: 0.05,
    });
    const tire1 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 10, 18), tireMat);
    tire1.rotation.x = Math.PI / 2;
    tire1.position.set(-0.35, 0.15, -0.2);
    tire1.castShadow = true;
    group.add(tire1);

    const tire2 = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.14, 10, 18), tireMat);
    tire2.rotation.set(Math.PI / 2 + 0.45, 0.3, 0);
    tire2.position.set(-0.22, 0.35, -0.25);
    tire2.castShadow = true;
    group.add(tire2);

    addRealisticTrashHeapDetails(group, textures, variant, 0.95);
  } else {
    addRealisticTrashHeapDetails(group, textures, variant, 1.05);
  }

  return group;
}

export function createOceanDebrisModel(variant: number): THREE.Group {
  const group = new THREE.Group();

  const bottleMat = new THREE.MeshStandardMaterial({
    color: variant % 2 === 0 ? 0x38bdf8 : 0xe0f2fe,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.86,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: variant % 2 === 0 ? 0xef4444 : 0xf59e0b,
    roughness: 0.5,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.72, 12), bottleMat);
  body.rotation.z = Math.PI / 2 - 0.15;
  body.position.y = 0.18;
  body.castShadow = true;
  group.add(body);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.22, 10), bottleMat);
  neck.rotation.z = Math.PI / 2 - 0.15;
  neck.position.set(-0.42, 0.25, 0);
  group.add(neck);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 10), capMat);
  cap.rotation.z = Math.PI / 2 - 0.15;
  cap.position.set(-0.56, 0.27, 0);
  group.add(cap);

  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.26, 12), capMat);
  label.rotation.z = Math.PI / 2 - 0.15;
  label.position.set(0.02, 0.18, 0);
  group.add(label);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.68, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  return group;
}

export function createSeaAnimalModel(kind: 'turtle' | 'dolphin'): {
  group: THREE.Group;
  animalGroup: THREE.Group;
  netGroup: THREE.Group;
} {
  const group = new THREE.Group();
  const animalGroup = new THREE.Group();
  const netGroup = new THREE.Group();

  if (kind === 'turtle') {
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.45 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.65 });

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      shellMat,
    );
    shell.scale.set(1, 0.65, 1.2);
    shell.position.y = 0.22;
    shell.castShadow = true;
    animalGroup.add(shell);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), skinMat);
    head.position.set(0, 0.28, 0.96);
    animalGroup.add(head);

    const flipperCoords = [
      [-0.75, 0.18, 0.45, 0.4],
      [0.75, 0.18, 0.45, -0.4],
      [-0.65, 0.15, -0.55, -0.35],
      [0.65, 0.15, -0.55, 0.35],
    ];
    flipperCoords.forEach(([x, y, z, rz]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.28), skinMat);
      f.position.set(x, y, z);
      f.rotation.y = rz;
      animalGroup.add(f);
    });
  } else {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.15,
    });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.35 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.3, 8, 12), bodyMat);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.35;
    body.castShadow = true;
    animalGroup.add(body);

    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 10), bellyMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.32, 1.05);
    animalGroup.add(snout);

    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6), bodyMat);
    dorsal.position.set(0, 0.72, -0.05);
    dorsal.rotation.x = -0.35;
    animalGroup.add(dorsal);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.32), bodyMat);
    tail.position.set(0, 0.35, -0.95);
    animalGroup.add(tail);
  }

  const netMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xbe123c,
    emissiveIntensity: 0.45,
    roughness: 0.5,
    wireframe: true,
  });
  const netCage = new THREE.Mesh(new THREE.TorusKnotGeometry(0.92, 0.12, 36, 6, 2, 3), netMat);
  netCage.position.y = 0.35;
  netGroup.add(netCage);

  const alertRing = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.32, 28),
    new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    }),
  );
  alertRing.rotation.x = -Math.PI / 2;
  alertRing.position.y = 0.08;
  netGroup.add(alertRing);

  group.add(animalGroup, netGroup);
  return { group, animalGroup, netGroup };
}

export function createUrbanWasteModel(
  textures: ProceduralTextures,
  variant: number,
): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(textures, 1.35, 0.44));

  if (variant % 2 === 0) {
    // Overflowing rusted municipal garbage skip (kachra kundi) + spilled roadside bags
    const skipMat = new THREE.MeshStandardMaterial({
      color: 0x2f4838,
      roughness: 0.72,
      metalness: 0.45,
    });
    const rustMat = new THREE.MeshStandardMaterial({
      color: 0x7c3f1d,
      roughness: 0.86,
      metalness: 0.25,
    });

    const skipBody = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.88, 0.95), skipMat);
    skipBody.position.set(0, 0.44, -0.1);
    skipBody.castShadow = true;
    skipBody.receiveShadow = true;
    group.add(skipBody);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.1, 1.04), rustMat);
    rim.position.set(0, 0.88, -0.1);
    group.add(rim);

    // Overflowing trash mound inside skip
    const overflow = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.58, 1),
      new THREE.MeshStandardMaterial({ map: textures.garbageHeap, roughness: 0.9 }),
    );
    overflow.scale.set(1.1, 0.55, 0.78);
    overflow.position.set(0, 0.92, -0.1);
    group.add(overflow);

    // Spilled bags & litter around the skip base
    const spillGroup = new THREE.Group();
    spillGroup.position.set(0.1, 0, 0.52);
    addRealisticTrashHeapDetails(spillGroup, textures, variant, 0.88);
    group.add(spillGroup);
  } else {
    // Dense Karachi roadside garbage heap + old rubber tire
    addRealisticTrashHeapDetails(group, textures, variant, 1.2);
    const tire = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.13, 10, 16),
      new THREE.MeshStandardMaterial({ color: 0x181b20, roughness: 0.92 }),
    );
    tire.rotation.set(Math.PI / 2 - 0.35, 0.4, 0);
    tire.position.set(-0.68, 0.22, 0.15);
    tire.castShadow = true;
    group.add(tire);
  }

  // Subtle ground marker so players clearly spot collectable garbage piles on dark asphalt
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(1.38, 1.5, 28),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.42,
    }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.03;
  group.add(marker);

  return group;
}

export function createRecyclingBinModel(textures: ProceduralTextures): {
  group: THREE.Group;
  beacon: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.add(createContactShadow(textures, 1.8, 0.42));

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.22, 1.3),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.25 }),
  );
  base.position.y = 0.11;
  base.receiveShadow = true;
  group.add(base);

  const binColors = [0x3b82f6, 0x10b981, 0xf59e0b];
  binColors.forEach((col, i) => {
    const x = (i - 1) * 0.96;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 1.3, 0.88),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.2 }),
    );
    body.position.set(x, 0.87, 0);
    body.castShadow = true;
    group.add(body);

    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(0.84, 0.34, 0.96),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.3 }),
    );
    hood.position.set(x, 1.65, 0);
    hood.castShadow = true;
    group.add(hood);
  });

  const signPost = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.55, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x10b981,
      emissiveIntensity: 0.35,
      roughness: 0.35,
    }),
  );
  signPost.position.set(0, 2.35, -0.2);
  group.add(signPost);

  const beacon = new THREE.Mesh(
    new THREE.RingGeometry(1.85, 2.05, 32),
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    }),
  );
  beacon.rotation.x = -Math.PI / 2;
  beacon.position.y = 0.08;
  group.add(beacon);

  return { group, beacon };
}

export function createPollutionMachineModel(textures: ProceduralTextures): {
  group: THREE.Group;
  fan: THREE.Group;
  beacon: THREE.Mesh;
  solarWings: THREE.Group;
} {
  const group = new THREE.Group();
  group.add(createContactShadow(textures, 2.3, 0.5));

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.45,
    metalness: 0.72,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.5,
    metalness: 0.3,
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 2.4), steelMat);
  chassis.position.y = 0.8;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(3.32, 0.28, 2.52), hazardMat);
  trim.position.y = 0.25;
  group.add(trim);

  [-0.85, 0.85].forEach((x) => {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 2.4, 12), steelMat);
    stack.position.set(x, 2.6, -0.4);
    stack.castShadow = true;
    group.add(stack);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 8, 16), hazardMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, 3.8, -0.4);
    group.add(rim);
  });

  const fan = new THREE.Group();
  fan.position.set(0, 0.95, 1.24);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 10), hazardMat);
  hub.rotation.x = Math.PI / 2;
  fan.add(hub);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.06), steelMat);
    blade.rotation.z = (i / 4) * Math.PI;
    fan.add(blade);
  }
  group.add(fan);

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), beaconMat);
  beacon.position.set(0, 1.95, 0.65);
  group.add(beacon);

  const solarWings = new THREE.Group();
  solarWings.position.set(0, 1.7, 0);
  solarWings.scale.setScalar(0.01);
  solarWings.visible = false;
  const solarMat = new THREE.MeshStandardMaterial({
    map: textures.solarPanel,
    roughness: 0.2,
    metalness: 0.6,
  });
  [-2.2, 2.2].forEach((x) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.4), solarMat);
    wing.position.set(x, 0.2, 0);
    solarWings.add(wing);
  });
  group.add(solarWings);

  return { group, fan, beacon, solarWings };
}

export function createPlanetCoreModel(textures: ProceduralTextures): {
  group: THREE.Group;
  crystal: THREE.Mesh;
  ring1: THREE.Mesh;
  ring2: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.add(createContactShadow(textures, 2.4, 0.42));

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.1, 0.7, 16),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.45 }),
  );
  pedestal.position.y = 0.35;
  pedestal.receiveShadow = true;
  pedestal.castShadow = true;
  group.add(pedestal);

  const crystal = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 1),
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.55,
    }),
  );
  crystal.position.y = 2.0;
  crystal.castShadow = true;
  group.add(crystal);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.85,
  });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.07, 10, 32), ringMat);
  ring1.position.y = 2.0;
  group.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.06, 10, 32), ringMat);
  ring2.position.y = 2.0;
  ring2.rotation.x = Math.PI / 3;
  group.add(ring2);

  return { group, crystal, ring1, ring2 };
}

export function createRickshawModel(textures: ProceduralTextures): THREE.Group {
  const rickshaw = new THREE.Group();
  rickshaw.add(createContactShadow(textures, 1.5, 0.42));

  const greenBodyMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.42,
    metalness: 0.32,
  });
  const yellowTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.38,
    metalness: 0.22,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.82,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.72,
  });

  // Chassis base
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.22, 2.35), greenBodyMat);
  chassis.position.set(0, 0.38, 0);
  chassis.castShadow = true;
  rickshaw.add(chassis);

  // Tapered front nose cowl + yellow bumper
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.72, 0.68), yellowTrimMat);
  nose.position.set(0, 0.74, 0.96);
  nose.castShadow = true;
  rickshaw.add(nose);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.48, 0.06), glassMat);
  windshield.position.set(0, 1.32, 0.88);
  windshield.rotation.x = -0.22;
  rickshaw.add(windshield);

  // Headlight
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.1, 10),
    new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfde047,
      emissiveIntensity: 0.65,
    }),
  );
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(0, 0.78, 1.32);
  rickshaw.add(lamp);

  // Passenger cab side panels (green & yellow Pakistani rickshaw styling)
  [-0.64, 0.64].forEach((sx) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 1.55), greenBodyMat);
    panel.position.set(sx, 0.76, -0.22);
    panel.castShadow = true;
    rickshaw.add(panel);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 1.55), yellowTrimMat);
    stripe.position.set(sx, 0.96, -0.22);
    rickshaw.add(stripe);
  });

  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.82, 0.12), greenBodyMat);
  backPanel.position.set(0, 0.82, -1.04);
  backPanel.castShadow = true;
  rickshaw.add(backPanel);

  // Decorative bright rear bumper accent
  const rearArt = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.18, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.45 }),
  );
  rearArt.position.set(0, 0.64, -1.06);
  rickshaw.add(rearArt);

  // Roof Canopy + Yellow Crown Trim
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.14, 1.95), canopyMat);
  roof.position.set(0, 1.66, -0.08);
  roof.castShadow = true;
  rickshaw.add(roof);

  const yellowRoof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.1, 0.45), yellowTrimMat);
  yellowRoof.position.set(0, 1.7, 0.68);
  rickshaw.add(yellowRoof);

  // Canopy pillars
  [
    [-0.6, 0.7],
    [0.6, 0.7],
    [-0.6, -0.95],
    [0.6, -0.95],
  ].forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.76, 6), rimMat);
    pillar.position.set(px, 1.32, pz);
    rickshaw.add(pillar);
  });

  // 3 Wheels (1 front + 2 rear)
  const wheelPositions: [number, number, number][] = [
    [0, 0.24, 1.05],
    [-0.68, 0.24, -0.72],
    [0.68, 0.24, -0.72],
  ];
  wheelPositions.forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 14), tireMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    w.castShadow = true;
    rickshaw.add(w);
  });

  return rickshaw;
}

export function createKarachiBuildingModel(
  textures: ProceduralTextures,
  width: number,
  height: number,
  depth: number,
  wallColor: number,
  awningColor: number,
): THREE.Group {
  const bldg = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    map: textures.buildingFacade,
    color: wallColor,
    roughness: 0.82,
    metalness: 0.05,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.86,
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.55,
    metalness: 0.45,
  });
  const awningMat = new THREE.MeshStandardMaterial({
    color: awningColor,
    roughness: 0.65,
  });

  // Main multi-story Karachi residential/commercial tower
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  bldg.add(body);

  // Rooftop parapet rim
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(width + 0.25, 0.45, depth + 0.25), concreteMat);
  parapet.position.y = height + 0.18;
  bldg.add(parapet);

  // Ground-floor commercial shops + sloped fabric awnings facing center
  const shopBase = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.88, 2.2, 0.22),
    shutterMat,
  );
  shopBase.position.set(0, 1.1, depth / 2 + 0.04);
  bldg.add(shopBase);

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.94, 0.18, 1.05),
    awningMat,
  );
  awning.position.set(0, 2.45, depth / 2 + 0.48);
  awning.rotation.x = 0.24;
  awning.castShadow = true;
  bldg.add(awning);

  // Protruding concrete balconies on upper floors
  const floors = Math.max(2, Math.floor((height - 3) / 3.4));
  for (let f = 1; f <= floors; f++) {
    const by = 2.6 + f * 3.1;
    if (by > height - 1.2) break;
    const balcony = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.72, 0.22, 0.75),
      concreteMat,
    );
    balcony.position.set(0, by, depth / 2 + 0.35);
    bldg.add(balcony);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.72, 0.55, 0.08),
      concreteMat,
    );
    rail.position.set(0, by + 0.35, depth / 2 + 0.68);
    bldg.add(rail);
  }

  // Iconic Karachi rooftop overhead water tank
  const tankMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.65 });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.35, 10), tankMat);
  tank.position.set(width * 0.2, height + 0.95, -depth * 0.15);
  tank.castShadow = true;
  bldg.add(tank);

  return bldg;
}

export function createStreetLampModel(): THREE.Group {
  const lamp = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.45,
    metalness: 0.75,
  });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 5.2, 8), poleMat);
  pole.position.y = 2.6;
  pole.castShadow = true;
  lamp.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.09, 0.09), poleMat);
  arm.position.set(0.55, 5.1, 0);
  lamp.add(arm);

  const bulb = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.12, 0.24),
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    }),
  );
  bulb.position.set(1.08, 5.02, 0);
  lamp.add(bulb);

  return lamp;
}
