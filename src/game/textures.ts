import * as THREE from 'three';

function makeCanvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(anisotropy, 8);
  tex.needsUpdate = true;
  return tex;
}

// Convert a grayscale height array into a tileable tangent-space normal map DataTexture
function heightFieldToNormalMap(
  heights: Float32Array,
  size: number,
  strength: number,
  repeatX = 1,
  repeatY = 1,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;

      const dx = (heights[y * size + xp] - heights[y * size + xm]) * strength;
      const dy = (heights[yp * size + x] - heights[ym * size + x]) * strength;

      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz);

      const idx = (y * size + x) * 4;
      data[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralTextures {
  grass: THREE.CanvasTexture;
  grassNormal: THREE.DataTexture;
  sand: THREE.CanvasTexture;
  asphalt: THREE.CanvasTexture;
  karachiRoad: THREE.CanvasTexture;
  buildingFacade: THREE.CanvasTexture;
  garbageHeap: THREE.CanvasTexture;
  bark: THREE.CanvasTexture;
  barkNormal: THREE.DataTexture;
  foliage: THREE.CanvasTexture;
  rock: THREE.CanvasTexture;
  rockNormal: THREE.DataTexture;
  waterNormal: THREE.DataTexture;
  waterfall: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  solarPanel: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // 1. Rich Natural Forest Meadow Texture + Normal Map
  const [gCanvas, gCtx] = makeCanvas(512);
  gCtx.fillStyle = '#4f9c46';
  gCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 2 + Math.random() * 7;
    const pick = i % 4;
    gCtx.fillStyle =
      pick === 0
        ? 'rgba(130, 212, 92, 0.25)'
        : pick === 1
          ? 'rgba(34, 98, 38, 0.24)'
          : pick === 2
            ? 'rgba(96, 168, 66, 0.26)'
            : 'rgba(118, 92, 56, 0.12)';
    gCtx.beginPath();
    gCtx.arc(x, y, r, 0, Math.PI * 2);
    gCtx.fill();
  }
  // Fine grass blade strokes
  gCtx.strokeStyle = 'rgba(156, 232, 114, 0.28)';
  gCtx.lineWidth = 1.4;
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    gCtx.beginPath();
    gCtx.moveTo(x, y);
    gCtx.lineTo(x + (Math.random() - 0.5) * 5, y - 4 - Math.random() * 7);
    gCtx.stroke();
  }
  const grass = finalizeTexture(gCanvas, maxAnisotropy, true, 24, 24);

  const gHeights = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n =
        Math.sin(x * 0.22) * Math.cos(y * 0.22) * 0.5 +
        Math.sin(x * 0.45 + y * 0.35) * 0.3 +
        (Math.random() - 0.5) * 0.4;
      gHeights[y * 256 + x] = n;
    }
  }
  const grassNormal = heightFieldToNormalMap(gHeights, 256, 1.4, 24, 24);

  // 2. Warm Coastal Sand with Ripple Detail
  const [sCanvas, sCtx] = makeCanvas(512);
  sCtx.fillStyle = '#e7cf9a';
  sCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 6) {
    sCtx.fillStyle = y % 12 === 0 ? 'rgba(255,244,218,0.22)' : 'rgba(194,162,102,0.18)';
    sCtx.fillRect(0, y, 512, 3);
  }
  for (let i = 0; i < 1600; i++) {
    sCtx.fillStyle = i % 2 === 0 ? 'rgba(255,250,235,0.3)' : 'rgba(176,140,84,0.25)';
    sCtx.fillRect(Math.random() * 512, Math.random() * 512, 2.5, 2);
  }
  const sand = finalizeTexture(sCanvas, maxAnisotropy, true, 16, 16);

  // 3. Detailed City Asphalt Paver Texture
  const [aCanvas, aCtx] = makeCanvas(512);
  aCtx.fillStyle = '#334155';
  aCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i++) {
    aCtx.fillStyle = i % 2 === 0 ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.24)';
    aCtx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }
  aCtx.strokeStyle = 'rgba(255,255,255,0.12)';
  aCtx.lineWidth = 4;
  aCtx.strokeRect(2, 2, 508, 508);
  const asphalt = finalizeTexture(aCanvas, maxAnisotropy, true, 16, 16);

  // 4. Detailed Tree Bark Texture + Normal Map
  const [bCanvas, bCtx] = makeCanvas(256);
  bCtx.fillStyle = '#684228';
  bCtx.fillRect(0, 0, 256, 256);
  const bHeights = new Float32Array(256 * 256);
  for (let i = 0; i < 110; i++) {
    const x = Math.random() * 256;
    const w = 2 + Math.random() * 6;
    bCtx.fillStyle = i % 2 === 0 ? 'rgba(48, 27, 14, 0.45)' : 'rgba(140, 96, 62, 0.35)';
    bCtx.fillRect(x, 0, w, 256);
  }
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      bHeights[y * 256 + x] =
        Math.sin(x * 0.35 + Math.sin(y * 0.08) * 1.4) * 0.8 +
        Math.sin(y * 0.12) * 0.25;
    }
  }
  const bark = finalizeTexture(bCanvas, maxAnisotropy, true, 1, 2);
  const barkNormal = heightFieldToNormalMap(bHeights, 256, 2.2, 1, 2);

  // 5. Lush Leaf Canopy Texture
  const [fCanvas, fCtx] = makeCanvas(256);
  fCtx.fillStyle = '#2d9f4d';
  fCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 520; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    fCtx.fillStyle =
      i % 3 === 0
        ? 'rgba(134, 239, 130, 0.32)'
        : i % 3 === 1
          ? 'rgba(20, 100, 48, 0.34)'
          : 'rgba(74, 200, 95, 0.28)';
    fCtx.beginPath();
    fCtx.ellipse(x, y, 5 + Math.random() * 9, 3 + Math.random() * 6, Math.random() * Math.PI, 0, Math.PI * 2);
    fCtx.fill();
  }
  const foliage = finalizeTexture(fCanvas, maxAnisotropy, true, 2, 2);

  // 6. Layered Mountain & Cliff Rock Texture + Normal Map
  const [rCanvas, rCtx] = makeCanvas(256);
  rCtx.fillStyle = '#6c7785';
  rCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    rCtx.fillStyle = i % 2 === 0 ? 'rgba(148, 163, 184, 0.22)' : 'rgba(51, 65, 85, 0.28)';
    rCtx.fillRect(Math.random() * 256, Math.random() * 256, 12 + Math.random() * 28, 5 + Math.random() * 14);
  }
  const rock = finalizeTexture(rCanvas, maxAnisotropy, true, 3, 3);
  const rHeights = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      rHeights[y * 256 + x] =
        Math.sin(x * 0.14) * Math.cos(y * 0.18) * 0.7 +
        Math.sin(x * 0.4 + y * 0.25) * 0.4;
    }
  }
  const rockNormal = heightFieldToNormalMap(rHeights, 256, 2.0, 3, 3);

  // 7. Tileable Water Ripple Normal Map (for reflective shimmering river & ocean)
  const wHeights = new Float32Array(256 * 256);
  const tau = Math.PI * 2;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const u = (x / 256) * tau;
      const v = (y / 256) * tau;
      wHeights[y * 256 + x] =
        Math.sin(u * 3 + v * 2) * 0.45 +
        Math.cos(u * 5 - v * 3) * 0.35 +
        Math.sin(u * 8 + v * 7) * 0.2;
    }
  }
  const waterNormal = heightFieldToNormalMap(wHeights, 256, 1.35, 14, 14);

  // 8. Cascading Waterfall Texture (scrolling vertical foam streaks)
  const [wfCanvas, wfCtx] = makeCanvas(256);
  const wfGrad = wfCtx.createLinearGradient(0, 0, 256, 0);
  wfGrad.addColorStop(0, '#0ea5e9');
  wfGrad.addColorStop(0.5, '#7dd3fc');
  wfGrad.addColorStop(1, '#0ea5e9');
  wfCtx.fillStyle = wfGrad;
  wfCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    wfCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(224,242,254,0.28)';
    wfCtx.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 5, 22 + Math.random() * 48);
  }
  const waterfall = finalizeTexture(wfCanvas, maxAnisotropy, true, 2, 2);

  // 9. Soft Contact Shadow
  const [cCanvas, cCtx] = makeCanvas(128);
  const cGrad = cCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
  cGrad.addColorStop(0, 'rgba(6, 15, 24, 0.62)');
  cGrad.addColorStop(0.55, 'rgba(6, 15, 24, 0.25)');
  cGrad.addColorStop(1, 'rgba(6, 15, 24, 0)');
  cCtx.fillStyle = cGrad;
  cCtx.fillRect(0, 0, 128, 128);
  const contactShadow = finalizeTexture(cCanvas, maxAnisotropy, true, 1, 1);
  contactShadow.wrapS = THREE.ClampToEdgeWrapping;
  contactShadow.wrapT = THREE.ClampToEdgeWrapping;

  // 10. Solar Panel Grid
  const [pCanvas, pCtx] = makeCanvas(128);
  pCtx.fillStyle = '#0f2942';
  pCtx.fillRect(0, 0, 128, 128);
  pCtx.strokeStyle = '#38bdf8';
  pCtx.lineWidth = 2;
  for (let x = 0; x <= 128; x += 32) {
    pCtx.beginPath();
    pCtx.moveTo(x, 0);
    pCtx.lineTo(x, 128);
    pCtx.stroke();
  }
  for (let y = 0; y <= 128; y += 32) {
    pCtx.beginPath();
    pCtx.moveTo(0, y);
    pCtx.lineTo(128, y);
    pCtx.stroke();
  }
  const solarPanel = finalizeTexture(pCanvas, maxAnisotropy, true, 1, 1);

  // 11. Karachi Metropolitan Asphalt Road (dusty edges + worn tarmac)
  const [krCanvas, krCtx] = makeCanvas(512);
  krCtx.fillStyle = '#2d333b';
  krCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i++) {
    krCtx.fillStyle =
      i % 3 === 0
        ? 'rgba(148,136,118,0.16)'
        : i % 3 === 1
          ? 'rgba(15,23,42,0.28)'
          : 'rgba(100,116,139,0.14)';
    krCtx.fillRect(Math.random() * 512, Math.random() * 512, 3, 2);
  }
  const karachiRoad = finalizeTexture(krCanvas, maxAnisotropy, true, 16, 16);

  // 12. Karachi Apartment & Commercial Building Facade
  const [bfCanvas, bfCtx] = makeCanvas(256);
  bfCtx.fillStyle = '#d6c7b2';
  bfCtx.fillRect(0, 0, 256, 256);
  for (let y = 16; y < 256; y += 48) {
    bfCtx.fillStyle = 'rgba(71, 85, 105, 0.25)';
    bfCtx.fillRect(0, y - 4, 256, 4);
    for (let x = 18; x < 240; x += 56) {
      bfCtx.fillStyle = '#1e293b';
      bfCtx.fillRect(x, y + 6, 34, 26);
      bfCtx.fillStyle = '#fde68a';
      bfCtx.fillRect(x + 3, y + 9, 12, 10);
      bfCtx.fillStyle = '#94a3b8';
      bfCtx.fillRect(x - 3, y + 32, 40, 5);
    }
  }
  const buildingFacade = finalizeTexture(bfCanvas, maxAnisotropy, true, 1, 2);

  // 13. Realistic Garbage Mound Texture (soil, torn wrappers, organic waste)
  const [ghCanvas, ghCtx] = makeCanvas(256);
  ghCtx.fillStyle = '#4a3f35';
  ghCtx.fillRect(0, 0, 256, 256);
  const litterCols = ['#d9d9d9', '#1e293b', '#60a5fa', '#ca8a04', '#dc2626', '#65a30d', '#78350f'];
  for (let i = 0; i < 650; i++) {
    ghCtx.fillStyle = litterCols[i % litterCols.length];
    ghCtx.globalAlpha = 0.55;
    ghCtx.fillRect(
      Math.random() * 256,
      Math.random() * 256,
      3 + Math.random() * 9,
      2 + Math.random() * 7,
    );
  }
  ghCtx.globalAlpha = 1;
  const garbageHeap = finalizeTexture(ghCanvas, maxAnisotropy, true, 2, 2);

  return {
    grass,
    grassNormal,
    sand,
    asphalt,
    karachiRoad,
    buildingFacade,
    garbageHeap,
    bark,
    barkNormal,
    foliage,
    rock,
    rockNormal,
    waterNormal,
    waterfall,
    contactShadow,
    solarPanel,
    dispose: () => {
      grass.dispose();
      grassNormal.dispose();
      sand.dispose();
      asphalt.dispose();
      karachiRoad.dispose();
      buildingFacade.dispose();
      garbageHeap.dispose();
      bark.dispose();
      barkNormal.dispose();
      foliage.dispose();
      rock.dispose();
      rockNormal.dispose();
      waterNormal.dispose();
      waterfall.dispose();
      contactShadow.dispose();
      solarPanel.dispose();
    },
  };
}
