import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from './audio';
import {
  BuiltLevel,
  InteractableEntity,
  L1_BRIDGE_X,
  L1_BRIDGE_Z,
  buildLevelScene,
  groundHeightAt,
  walkableHeightAt,
} from './levels';
import { HeroRig, createHeroModel } from './models';
import { ProceduralTextures, createProceduralTextures } from './textures';
import {
  GameOptions,
  GamePhase,
  HudSnapshot,
  LEVELS,
  LevelId,
  MissionObjective,
  NearbyInteraction,
  loadSavedOptions,
} from './types';

// Pre-allocated math helpers (Zero GC in render loop)
const _vec3 = new THREE.Vector3();
const _vec3b = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _mouse = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

interface Particle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

export class EcoGameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: ProceduralTextures;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private fog: THREE.FogExp2;
  private hero: HeroRig;
  private currentLevel: BuiltLevel | null = null;

  // Particle system
  private particleMesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private readonly maxParticles = 160;

  // Game state
  private phase: GamePhase = 'menu';
  private levelId: LevelId = 1;
  private ecoPoints = 0;
  private levelEcoPoints = 0;
  private planetEnergy = 100;
  private elapsedSeconds = 0;
  private restorationProgress = 0;
  private targetRestoration = 0;

  // Cumulative adventure stats (for HUD & Victory presentation)
  private treesPlanted = 0;
  private rubbishCollected = 0;
  private seedsCollected = 0;

  // Per-level objective counters
  private forestGarbageDone = 0;
  private forestRiverDone = 0;
  private forestTreesDone = 0;
  private forestSeedsDone = 0;
  private oceanBottlesDone = 0;
  private oceanAnimalsDone = 0;
  private cityWasteCollected = 0;
  private cityWasteCarried = 0;
  private cityWasteSorted = 0;
  private cityMachinesOff = 0;
  private cityCoreActivated = false;

  // Player physics & animation
  private playerPos = new THREE.Vector3(0, 0, 14);
  private playerVel = new THREE.Vector3();
  private playerYaw = Math.PI;
  private isGrounded = true;
  private walkCycle = 0;
  private stepTimer = 0;
  private actionAnimTimer = 0;
  private finalWaveTimer = 0;
  private introTimer = 0;
  private readonly introDuration = 4.6;
  private restoringTimer = 0;
  private readonly restoringDuration = 2.8;

  // Camera orbit state
  private camYaw = 0;
  private camPitch = 0.42;
  private camDist = 11.2;
  private isDragging = false;
  private dragMoved = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Input state
  private keys: Record<string, boolean> = {};
  private virtualMove = new THREE.Vector2(0, 0);
  private nearbyTarget: InteractableEntity | null = null;
  private toastMessage: string | null = null;
  private toastTimer = 0;
  private smokeSpawnTimer = 0;
  private mistSpawnTimer = 0;

  // Loop & HUD callback
  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private hudTimer = 0;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onContextLostChange?: (lost: boolean) => void;
  private options: GameOptions = loadSavedOptions();

  private shockwaveRing: THREE.Mesh;

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onContextLostChange?: (lost: boolean) => void,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onContextLostChange = onContextLostChange;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x67b8f7);
    this.fog = new THREE.FogExp2(0xbae6fd, 0.008);
    this.scene.fog = this.fog;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      54,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.2,
      260,
    );

    // Cinematic Sunlight + Cool Sky/Forest Fill
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3b4d37, 0.78);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.9);
    this.sunLight.position.set(26, 38, 22);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 110;
    const d = 36;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.48);
    rimLight.position.set(-22, 16, -24);
    this.scene.add(rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    this.hero = createHeroModel(this.textures);
    this.scene.add(this.hero.group);

    // Particle Pool
    const pGeo = new THREE.SphereGeometry(0.18, 7, 7);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, this.maxParticles);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        scale: 1,
        color: new THREE.Color(0x4ade80),
      });
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _color.setHex(0x4ade80));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);

    this.shockwaveRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.16, 10, 48),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.85,
      }),
    );
    this.shockwaveRing.rotation.x = Math.PI / 2;
    this.shockwaveRing.visible = false;
    this.scene.add(this.shockwaveRing);

    // Load Forest as vibrant scenic menu backdrop (partially restored look for menu allure)
    this.loadLevel(1, false);
    this.restorationProgress = 0.72;
    this.targetRestoration = 0.72;
    this.applyEnvironmentMood(0.72);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.applyOptions(this.options);
    this.bindEvents();
    this.emitHud();
    this.startLoop();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('wheel', this.handleWheel, { passive: true });
    dom.addEventListener('webglcontextlost', this.handleContextLost);
    dom.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    dom.removeEventListener('wheel', this.handleWheel);
    dom.removeEventListener('webglcontextlost', this.handleContextLost);
    dom.removeEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.onContextLostChange?.(true);
  };

  private handleContextRestored = (): void => {
    this.onContextLostChange?.(false);
  };

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;

    if (this.phase === 'intro') {
      if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        this.skipIntro();
      }
      return;
    }

    if (this.phase === 'playing') {
      if (e.code === 'Space') {
        e.preventDefault();
        this.jump();
      } else if (e.code === 'KeyE' || e.code === 'KeyF') {
        this.triggerInteract();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        this.setPaused(true);
      }
    } else if (this.phase === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) {
      this.setPaused(false);
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  private handlePointerDown = (e: PointerEvent): void => {
    soundEngine.init();
    this.isDragging = true;
    this.dragMoved = false;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDragging || this.phase !== 'playing') return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.dragMoved = true;
    }
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    const sens = this.options.cameraSensitivity;
    const ySign = this.options.invertCameraY ? -1 : 1;
    this.camYaw -= dx * 0.0065 * sens;
    this.camPitch = THREE.MathUtils.clamp(
      this.camPitch + dy * 0.005 * sens * ySign,
      0.16,
      1.08,
    );
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (this.isDragging && !this.dragMoved && this.phase === 'playing') {
      this.tryClickInteract(e);
    }
    this.isDragging = false;
  };

  private handleWheel = (e: WheelEvent): void => {
    if (this.phase !== 'playing') return;
    this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.008, 6.5, 18.5);
  };

  private tryClickInteract(e: PointerEvent): void {
    if (!this.currentLevel) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_mouse, this.camera);

    const targets = this.currentLevel.interactables
      .filter((item) => !item.completed)
      .map((item) => item.mesh);
    const hits = _raycaster.intersectObjects(targets, true);
    if (hits.length > 0 && this.nearbyTarget) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        if (obj === this.nearbyTarget.mesh) {
          this.triggerInteract();
          return;
        }
        obj = obj.parent;
      }
    }
  }

  public startNewGame(startLevel: LevelId = 1): void {
    soundEngine.init();
    this.ecoPoints = 0;
    this.elapsedSeconds = 0;
    this.planetEnergy = 100;
    this.treesPlanted = 0;
    this.rubbishCollected = 0;
    this.seedsCollected = 0;
    this.loadLevel(startLevel, true);
    this.beginIntroSequence();
    soundEngine.startMusic(startLevel);
    this.emitHud();
  }

  public startNextLevel(): void {
    soundEngine.init();
    if (this.levelId < 3) {
      const next = (this.levelId + 1) as LevelId;
      this.planetEnergy = Math.min(100, this.planetEnergy + 25);
      this.loadLevel(next, true);
      soundEngine.setLevelMusic(next);
      this.beginIntroSequence();
      this.emitHud();
    }
  }

  private beginIntroSequence(): void {
    this.phase = 'intro';
    this.introTimer = 0;
    soundEngine.setRestorationLevel(0);
  }

  public skipIntro(): void {
    if (this.phase !== 'intro') return;
    this.phase = 'playing';
    this.showToast(`Mission Active: ${LEVELS[this.levelId].subtitle}`);
    this.emitHud();
  }

  public restartCurrentLevel(): void {
    soundEngine.init();
    this.ecoPoints = Math.max(0, this.ecoPoints - this.levelEcoPoints);
    this.planetEnergy = 100;
    this.loadLevel(this.levelId, true);
    this.phase = 'playing';
    soundEngine.startMusic(this.levelId);
    this.showToast('Level Restarted');
    this.emitHud();
  }

  public returnToMenu(): void {
    this.phase = 'menu';
    soundEngine.stopMusic();
    this.loadLevel(1, false);
    this.restorationProgress = 0.72;
    this.targetRestoration = 0.72;
    this.applyEnvironmentMood(0.72);
    this.emitHud();
  }

  public setPaused(paused: boolean): void {
    if (this.phase !== 'playing' && this.phase !== 'paused') return;
    this.phase = paused ? 'paused' : 'playing';
    this.emitHud();
  }

  public toggleMute(): void {
    soundEngine.setMuted(!soundEngine.isMuted());
    this.emitHud();
  }

  public getOptions(): GameOptions {
    return { ...this.options };
  }

  public applyOptions(next: GameOptions): void {
    this.options = { ...next };

    // Audio volumes
    soundEngine.setVolumes(next.musicVolume, next.sfxVolume);

    // Graphics Quality (shadows & pixel ratio)
    const shadowsAllowed = !this.isSoftwareGl && next.graphicsQuality !== 'low';
    this.renderer.shadowMap.enabled = shadowsAllowed;
    this.sunLight.castShadow = shadowsAllowed;
    const dpr =
      this.isSoftwareGl || next.graphicsQuality === 'low'
        ? 1
        : next.graphicsQuality === 'balanced'
          ? Math.min(window.devicePixelRatio, 1.5)
          : Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.toneMappingExposure =
      next.graphicsQuality === 'ultra' ? 1.16 : next.graphicsQuality === 'balanced' ? 1.1 : 1.05;

    // Camera distance preset
    this.camDist =
      next.cameraView === 'close' ? 8.5 : next.cameraView === 'wide' ? 14.5 : 11.2;

    // Explorer Suit Theme
    if (next.suitTheme === 'karachi') {
      this.hero.jacketMat.color.setHex(0x0f766e); // deep teal-emerald
      this.hero.vestMat.color.setHex(0xf59e0b); // bright safety amber
      this.hero.scarfMat.color.setHex(0x16a34a); // Pakistan green scarf
    } else if (next.suitTheme === 'ocean') {
      this.hero.jacketMat.color.setHex(0x0284c7); // ocean cobalt
      this.hero.vestMat.color.setHex(0xe2e8f0); // coastal crisp white
      this.hero.scarfMat.color.setHex(0x06b6d4); // aqua scarf
    } else {
      this.hero.jacketMat.color.setHex(0x1f6f50); // forest ranger green
      this.hero.vestMat.color.setHex(0xc28e52); // khaki canvas vest
      this.hero.scarfMat.color.setHex(0xea580c); // trail orange scarf
    }
  }

  public jumpToLevel(id: LevelId): void {
    soundEngine.init();
    this.planetEnergy = 100;
    this.loadLevel(id, true);
    soundEngine.startMusic(id);
    soundEngine.setLevelMusic(id);
    this.beginIntroSequence();
    this.emitHud();
  }

  public setVirtualMove(x: number, y: number): void {
    this.virtualMove.set(x, y);
  }

  public jump(): void {
    if (this.phase !== 'playing') return;
    if (this.isGrounded) {
      this.playerVel.y = 9.6;
      this.isGrounded = false;
      soundEngine.playJump();
      this.spawnBurst(this.playerPos, 0xe2e8f0, 8, 2.5);
    }
  }

  private loadLevel(id: LevelId, resetStats: boolean): void {
    if (this.currentLevel) {
      this.scene.remove(this.currentLevel.root);
      this.currentLevel.dispose();
      this.currentLevel = null;
    }

    this.levelId = id;
    this.currentLevel = buildLevelScene(id, this.textures);
    this.scene.add(this.currentLevel.root);

    if (resetStats) {
      this.levelEcoPoints = 0;
      this.forestGarbageDone = 0;
      this.forestRiverDone = 0;
      this.forestTreesDone = 0;
      this.forestSeedsDone = 0;
      this.oceanBottlesDone = 0;
      this.oceanAnimalsDone = 0;
      this.cityWasteCollected = 0;
      this.cityWasteCarried = 0;
      this.cityWasteSorted = 0;
      this.cityMachinesOff = 0;
      this.cityCoreActivated = false;
      this.restorationProgress = 0;
      this.targetRestoration = 0;
      this.finalWaveTimer = 0;
      this.restoringTimer = 0;
    }

    this.playerPos.copy(this.currentLevel.spawnPoint);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = Math.PI;
    this.camYaw = 0;
    this.camPitch = 0.4;
    this.isGrounded = true;
    this.nearbyTarget = null;
    this.hero.group.position.copy(this.playerPos);
    this.hero.group.visible = true;
    this.hero.hoverboard.visible = id === 2;
    this.shockwaveRing.visible = false;

    for (const p of this.particles) {
      p.active = false;
    }

    this.applyEnvironmentMood(0);
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastTimer = 2.6;
  }

  private spawnBurst(
    origin: THREE.Vector3,
    hexColor: number,
    count: number,
    speed = 4.5,
  ): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (!p.active) {
        p.active = true;
        p.pos.copy(origin).add(
          _vec3.set(
            (Math.random() - 0.5) * 0.6,
            0.4 + Math.random() * 0.5,
            (Math.random() - 0.5) * 0.6,
          ),
        );
        const ang = Math.random() * Math.PI * 2;
        const spd = speed * (0.5 + Math.random() * 0.8);
        p.vel.set(Math.cos(ang) * spd, 2.6 + Math.random() * speed, Math.sin(ang) * spd);
        p.life = 0;
        p.maxLife = 0.65 + Math.random() * 0.5;
        p.scale = 0.7 + Math.random() * 0.8;
        p.color.setHex(hexColor);
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  private spawnSmokePuff(origin: THREE.Vector3): void {
    for (const p of this.particles) {
      if (!p.active) {
        p.active = true;
        p.pos.copy(origin).add(
          _vec3.set((Math.random() - 0.5) * 0.9, 0.1, (Math.random() - 0.5) * 0.9),
        );
        p.vel.set(
          (Math.random() - 0.5) * 0.8,
          2.2 + Math.random() * 1.2,
          (Math.random() - 0.5) * 0.8,
        );
        p.life = 0;
        p.maxLife = 1.4;
        p.scale = 1.6 + Math.random() * 1.1;
        p.color.setHex(0x475569);
        break;
      }
    }
  }

  private spawnMistPuff(origin: THREE.Vector3): void {
    for (const p of this.particles) {
      if (!p.active) {
        p.active = true;
        p.pos.copy(origin).add(
          _vec3.set((Math.random() - 0.5) * 2.8, -0.35, 1.4 + (Math.random() - 0.5) * 1.2),
        );
        p.vel.set((Math.random() - 0.5) * 1.1, 1.2 + Math.random() * 0.9, 0.6 + Math.random() * 0.8);
        p.life = 0;
        p.maxLife = 0.95;
        p.scale = 1.1 + Math.random() * 0.9;
        p.color.setHex(0xe0f2fe);
        break;
      }
    }
  }

  private spawnWaterSplash(origin: THREE.Vector3, count = 4, speed = 2.6): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (!p.active) {
        p.active = true;
        p.pos.set(
          origin.x + (Math.random() - 0.5) * 0.65,
          -0.32,
          origin.z + (Math.random() - 0.5) * 0.65,
        );
        const ang = Math.random() * Math.PI * 2;
        const spd = speed * (0.45 + Math.random() * 0.65);
        p.vel.set(Math.cos(ang) * spd, 1.4 + Math.random() * 1.8, Math.sin(ang) * spd);
        p.life = 0;
        p.maxLife = 0.42 + Math.random() * 0.28;
        p.scale = 0.55 + Math.random() * 0.5;
        p.color.setHex(spawned % 2 === 0 ? 0xe0f2fe : 0x7dd3fc);
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  public triggerInteract(): void {
    if (this.phase !== 'playing' || !this.nearbyTarget || !this.currentLevel) return;
    const target = this.nearbyTarget;

    if (this.levelId === 1) {
      if (target.type === 'collect') {
        target.completed = true;
        target.mesh.visible = false;
        if (target.solidCollider) target.solidCollider.active = false;
        this.forestGarbageDone++;
        this.rubbishCollected++;
        this.addProgress(10, 10);
        soundEngine.playCollect();
        this.spawnBurst(target.position, 0x4ade80, 18, 5);
        this.showToast(`Rubbish cleared! +10 Eco Points (${this.forestGarbageDone}/5)`);
      } else if (target.type === 'river') {
        target.completed = true;
        target.mesh.visible = false;
        this.forestRiverDone++;
        this.rubbishCollected++;
        this.addProgress(10, 12);
        soundEngine.playRiverClean();
        this.spawnBurst(target.position, 0x38bdf8, 22, 5.5);
        this.showToast(`River purified! +10 Eco Points (${this.forestRiverDone}/3)`);
      } else if (target.type === 'plant') {
        target.completed = true;
        if (target.sproutTree) {
          target.sproutTree.visible = true;
          target.sproutProgress = 0.01;
        }
        if (target.solidCollider) {
          target.solidCollider.active = true;
          // Push explorer cleanly clear of the newly sprouted tree trunk
          const dx = this.playerPos.x - target.position.x;
          const dz = this.playerPos.z - target.position.z;
          const d = Math.hypot(dx, dz);
          const safeDist = target.solidCollider.radius + 0.65;
          if (d < safeDist) {
            const nx = d > 0.001 ? dx / d : 0;
            const nz = d > 0.001 ? dz / d : 1;
            this.playerPos.x = target.position.x + nx * safeDist;
            this.playerPos.z = target.position.z + nz * safeDist;
          }
        }
        if (target.ringMesh) target.ringMesh.visible = false;
        this.forestTreesDone++;
        this.treesPlanted++;
        this.addProgress(10, 14);
        soundEngine.playPlantTree();
        this.spawnBurst(target.position, 0x22c55e, 26, 6.2);
        this.showToast(`Tree planted! +10 Eco Points (${this.forestTreesDone}/5)`);
      } else if (target.type === 'seed') {
        target.completed = true;
        target.mesh.visible = false;
        this.forestSeedsDone++;
        this.seedsCollected++;
        this.addProgress(10, 12);
        soundEngine.playSeedCollect();
        this.spawnBurst(target.position, 0xfde047, 20, 5.2);
        this.showToast(`Golden Eco Seed found! +10 Eco Points (${this.forestSeedsDone}/3)`);
      }

      const totalDone =
        this.forestGarbageDone +
        this.forestRiverDone +
        this.forestTreesDone +
        this.forestSeedsDone;
      this.targetRestoration = totalDone / 16;

      if (
        this.forestGarbageDone >= 5 &&
        this.forestRiverDone >= 3 &&
        this.forestTreesDone >= 5 &&
        this.forestSeedsDone >= 3
      ) {
        this.beginLevelRestorationCinematic();
      }
    } else if (this.levelId === 2) {
      if (target.type === 'collect') {
        target.completed = true;
        target.mesh.visible = false;
        this.oceanBottlesDone++;
        this.rubbishCollected++;
        this.addProgress(10, 9);
        soundEngine.playCollect();
        this.spawnBurst(target.position, 0x38bdf8, 16, 4.8);
        this.showToast(`Plastic removed! +10 Eco Points (${this.oceanBottlesDone}/6)`);
      } else if (target.type === 'rescue') {
        target.completed = true;
        if (target.netGroup) target.netGroup.visible = false;
        target.rescueTime = 0.01;
        this.oceanAnimalsDone++;
        this.addProgress(10, 14);
        soundEngine.playRescue();
        this.spawnBurst(target.position, 0xfde047, 24, 6.2);
        this.showToast(`${target.label} rescued! +10 Eco Points (${this.oceanAnimalsDone}/4)`);
      }
      this.targetRestoration = (this.oceanBottlesDone + this.oceanAnimalsDone) / 10;
      if (this.oceanBottlesDone >= 6 && this.oceanAnimalsDone >= 4) {
        this.beginLevelRestorationCinematic();
      }
    } else if (this.levelId === 3) {
      if (target.type === 'collect') {
        target.completed = true;
        target.mesh.visible = false;
        if (target.solidCollider) target.solidCollider.active = false;
        this.cityWasteCollected++;
        this.cityWasteCarried++;
        this.rubbishCollected++;
        soundEngine.playCollect();
        this.spawnBurst(target.position, 0xfbbf24, 14, 4.2);
        this.showToast(
          `Cleaned Karachi garbage! Take it to a KMC Station (${this.cityWasteCarried} carried)`,
        );
      } else if (target.type === 'recycle') {
        if (this.cityWasteCarried > 0) {
          const deposited = this.cityWasteCarried;
          this.cityWasteSorted += deposited;
          this.cityWasteCarried = 0;
          this.addProgress(deposited * 10, deposited * 10);
          soundEngine.playRecycle();
          this.spawnBurst(target.position, 0x34d399, 24, 5.5);
          this.showToast(`Sorted ${deposited} waste into bins! +${deposited * 10} Eco Points`);
        } else {
          this.showToast('Collect urban waste around the plaza first!');
        }
      } else if (target.type === 'shutdown') {
        target.completed = true;
        if (target.machineBeacon) {
          const mat = target.machineBeacon.material as THREE.MeshStandardMaterial;
          mat.color.setHex(0x10b981);
          mat.emissive.setHex(0x10b981);
        }
        if (target.solarWings) {
          target.solarWings.visible = true;
        }
        this.cityMachinesOff++;
        this.addProgress(20, 16);
        soundEngine.playMachineOff();
        this.spawnBurst(target.position, 0x38bdf8, 26, 6.5);
        this.showToast(`Pollution machine shut down! +20 Eco Points (${this.cityMachinesOff}/3)`);
      } else if (target.type === 'core') {
        if (this.isFinalCoreReady()) {
          target.completed = true;
          this.cityCoreActivated = true;
          this.planetEnergy = 100;
          this.targetRestoration = 1;
          this.finalWaveTimer = 0.01;
          this.shockwaveRing.visible = true;
          this.shockwaveRing.position.set(0, 0.8, 0);
          this.shockwaveRing.scale.setScalar(1);
          soundEngine.playCoreRestore();
          this.spawnBurst(target.position, 0xfde047, 45, 9);
          this.showToast('PLANET GREEN ENERGY RESTORED!');
        } else {
          this.showToast('Recycle all 6 garbage heaps & shut down all 3 smog generators first!');
        }
      }

      if (!this.cityCoreActivated) {
        this.targetRestoration = (this.cityWasteSorted + this.cityMachinesOff * 2) / 12;
      }
    }

    this.actionAnimTimer = 0.45;
    this.emitHud();
  }

  private addProgress(points: number, energyBoost: number): void {
    this.ecoPoints += points;
    this.levelEcoPoints += points;
    this.planetEnergy = Math.min(100, this.planetEnergy + energyBoost);
  }

  private isFinalCoreReady(): boolean {
    return this.cityWasteSorted >= 6 && this.cityMachinesOff >= 3;
  }

  private beginLevelRestorationCinematic(): void {
    this.targetRestoration = 1;
    this.planetEnergy = Math.min(100, this.planetEnergy + 20);
    this.phase = 'restoring';
    this.restoringTimer = 0;
    soundEngine.playLevelComplete();
    this.showToast(`${LEVELS[this.levelId].subtitle} Transformed!`);
    this.emitHud();
  }

  private enterVictoryShowcase(): void {
    // Load the restored Forest as the live 3D background for the Victory screen!
    this.loadLevel(1, false);
    this.hero.group.visible = false;
    this.restorationProgress = 1;
    this.targetRestoration = 1;
    this.applyEnvironmentMood(1);
    // Reveal all planted trees in the background forest showcase
    if (this.currentLevel) {
      for (const item of this.currentLevel.interactables) {
        if (item.type === 'plant' && item.sproutTree) {
          item.completed = true;
          item.sproutTree.visible = true;
          item.sproutTree.scale.setScalar(1);
          item.sproutProgress = 1;
          if (item.ringMesh) item.ringMesh.visible = false;
        } else if (item.type === 'collect' || item.type === 'river' || item.type === 'seed') {
          item.completed = true;
          item.mesh.visible = false;
        }
      }
      this.currentLevel.deadTrees.forEach((dt) => {
        dt.visible = false;
      });
    }
    this.phase = 'victory';
    soundEngine.playVictory();
    this.emitHud();
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.08);
      this.lastTime = now;

      this.update(dt, now / 1000);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number, elapsed: number): void {
    if (!this.currentLevel) return;

    // Update shader & flowing texture uniforms
    if (this.currentLevel.waterUniforms) {
      this.currentLevel.waterUniforms.uTime.value = elapsed;
    }
    this.currentLevel.windUniforms.uTime.value = elapsed;
    this.textures.waterNormal.offset.x += dt * 0.04;
    this.textures.waterNormal.offset.y += dt * 0.075;
    this.textures.waterfall.offset.y += dt * 1.15;

    // Smooth environmental restoration
    this.restorationProgress = THREE.MathUtils.damp(
      this.restorationProgress,
      this.targetRestoration,
      2.4,
      dt,
    );
    this.applyEnvironmentMood(this.restorationProgress);
    soundEngine.setRestorationLevel(this.restorationProgress);

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.toastMessage = null;
        this.emitHud();
      }
    }

    // Intro Camera Sequence
    if (this.phase === 'intro') {
      this.introTimer += dt;
      const u = THREE.MathUtils.clamp(this.introTimer / this.introDuration, 0, 1);
      const smooth = u * u * (3 - 2 * u);
      const startAngle = -Math.PI * 0.65;
      const endAngle = 0;
      const ang = THREE.MathUtils.lerp(startAngle, endAngle, smooth);
      const rad = THREE.MathUtils.lerp(28, this.camDist, smooth);
      const height = THREE.MathUtils.lerp(13.5, 5.2, smooth);

      _camDesired.set(
        this.playerPos.x + Math.sin(ang) * rad * (1 - smooth * 0.25),
        height,
        this.playerPos.z * smooth + Math.cos(ang) * rad * (1 - smooth * 0.15) - (1 - smooth) * 10,
      );
      this.camera.position.lerp(_camDesired, 1 - Math.exp(-5 * dt));
      _camTarget.set(
        THREE.MathUtils.lerp(0, this.playerPos.x, smooth),
        THREE.MathUtils.lerp(2.2, this.playerPos.y + 1.6, smooth),
        THREE.MathUtils.lerp(-10, this.playerPos.z, smooth),
      );
      this.camera.lookAt(_camTarget);
      this.animateWorldProps(dt, elapsed);
      this.updateParticles(dt);

      if (this.introTimer >= this.introDuration) {
        this.skipIntro();
      }
      return;
    }

    // Cinematic Level Restoration Sweep
    if (this.phase === 'restoring') {
      this.restoringTimer += dt;
      const ang = this.camYaw + this.restoringTimer * 0.75;
      _camDesired.set(
        this.playerPos.x + Math.sin(ang) * 16,
        this.playerPos.y + 8.5,
        this.playerPos.z + Math.cos(ang) * 16,
      );
      this.camera.position.lerp(_camDesired, 1 - Math.exp(-3.5 * dt));
      _camTarget.set(0, 2.0, 0);
      this.camera.lookAt(_camTarget);
      this.animateWorldProps(dt, elapsed);
      this.updateParticles(dt);

      if (this.restoringTimer >= this.restoringDuration) {
        this.phase = 'level_complete';
        this.emitHud();
      }
      return;
    }

    // Menu / Paused / Complete / Victory scenic orbit
    if (this.phase !== 'playing') {
      const orbitAngle = elapsed * 0.2;
      const radius = this.phase === 'menu' || this.phase === 'victory' ? 25 : 17;
      _camDesired.set(
        Math.sin(orbitAngle) * radius,
        this.phase === 'menu' || this.phase === 'victory' ? 11.5 : 8,
        Math.cos(orbitAngle) * radius,
      );
      this.camera.position.lerp(_camDesired, 1 - Math.exp(-3 * dt));
      _camTarget.set(0, 1.8, 0);
      this.camera.lookAt(_camTarget);
      this.animateWorldProps(dt, elapsed);
      this.updateParticles(dt);
      return;
    }

    // Active Gameplay
    this.elapsedSeconds += dt;

    if (this.targetRestoration < 0.99 && !this.cityCoreActivated) {
      const diffMult =
        this.options.difficulty === 'relaxed'
          ? 0.35
          : this.options.difficulty === 'challenge'
            ? 1.55
            : 1.0;
      const drainRate = (1 - this.restorationProgress * 0.55) * 0.65 * diffMult;
      this.planetEnergy = Math.max(0, this.planetEnergy - drainRate * dt);
      if (this.planetEnergy <= 0) {
        this.phase = 'gameover';
        soundEngine.playGameOver();
        this.emitHud();
        return;
      }
    }

    if (this.finalWaveTimer > 0) {
      this.finalWaveTimer += dt;
      const s = 1 + this.finalWaveTimer * 24;
      this.shockwaveRing.scale.setScalar(s);
      const ringMat = this.shockwaveRing.material as THREE.MeshBasicMaterial;
      ringMat.opacity = Math.max(0, 0.9 - this.finalWaveTimer * 0.46);
      if (this.finalWaveTimer > 1.9) {
        this.shockwaveRing.visible = false;
        this.finalWaveTimer = 0;
        this.enterVictoryShowcase();
        return;
      }
    }

    this.updatePlayer(dt, elapsed);
    this.updateCamera(dt);
    this.animateWorldProps(dt, elapsed);
    this.updateParticles(dt);
    this.findNearbyInteractable();

    // Optional Auto-Collect for nearby rubbish, bottles, and golden seeds
    if (
      this.options.autoCollect &&
      this.nearbyTarget &&
      (this.nearbyTarget.type === 'collect' || this.nearbyTarget.type === 'seed')
    ) {
      const d = Math.hypot(
        this.playerPos.x - this.nearbyTarget.position.x,
        this.playerPos.z - this.nearbyTarget.position.z,
      );
      if (d <= 2.35) {
        this.triggerInteract();
      }
    }

    this.hudTimer += dt;
    if (this.hudTimer >= 0.1) {
      this.hudTimer = 0;
      this.emitHud();
    }
  }

  private applyEnvironmentMood(t: number): void {
    if (!this.currentLevel) return;
    _color
      .copy(this.currentLevel.skyColors.polluted)
      .lerp(this.currentLevel.skyColors.restored, t);
    (this.scene.background as THREE.Color).copy(_color);

    _color
      .copy(this.currentLevel.fogColors.polluted)
      .lerp(this.currentLevel.fogColors.restored, t);
    this.fog.color.copy(_color);
    this.fog.density = THREE.MathUtils.lerp(
      this.currentLevel.fogDensity.polluted,
      this.currentLevel.fogDensity.restored,
      t,
    );

    if (this.currentLevel.waterMaterial && this.currentLevel.waterColors) {
      this.currentLevel.waterMaterial.color
        .copy(this.currentLevel.waterColors.polluted)
        .lerp(this.currentLevel.waterColors.restored, t);
    }

    // Dead polluted trees shrink/sink away smoothly as the forest recovers!
    if (this.currentLevel.deadTrees.length > 0) {
      const deadScale = THREE.MathUtils.clamp(1 - t * 1.15, 0.001, 1);
      this.currentLevel.deadTrees.forEach((dtMesh, idx) => {
        dtMesh.visible = deadScale > 0.02;
        dtMesh.scale.setScalar(deadScale);
        if (this.currentLevel?.deadTreeColliders[idx]) {
          this.currentLevel.deadTreeColliders[idx].active = dtMesh.visible;
        }
      });
    }

    this.sunLight.intensity = THREE.MathUtils.lerp(1.4, 2.15, t);
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.6, 0.88, t);
  }

  private updatePlayer(dt: number, elapsed: number): void {
    if (!this.currentLevel) return;

    if (this.keys['KeyQ']) this.camYaw += 1.85 * dt;
    if (this.keys['KeyC']) this.camYaw -= 1.85 * dt;

    let forwardInput = 0;
    let rightInput = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) forwardInput += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forwardInput -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) rightInput += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) rightInput -= 1;

    forwardInput += this.virtualMove.y;
    rightInput += this.virtualMove.x;

    const bdx = this.playerPos.x - L1_BRIDGE_X;
    const bdz = this.playerPos.z - L1_BRIDGE_Z;
    const onBridge =
      this.levelId === 1 &&
      Math.abs(bdx) <= 5.25 &&
      Math.abs(bdz) <= 1.38 &&
      this.playerPos.y > -0.15;
    const inRiverWater =
      this.levelId === 1 && !onBridge && this.playerPos.y < -0.38;

    const inputLen = Math.hypot(forwardInput, rightInput);
    const sprinting = Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const waterDrag = inRiverWater ? 0.68 : 1.0;
    const speed = (sprinting ? 12.4 : 9.4) * waterDrag;

    if (inputLen > 0.05) {
      const nf = forwardInput / Math.max(1, inputLen);
      const nr = rightInput / Math.max(1, inputLen);

      const sinY = Math.sin(this.camYaw);
      const cosY = Math.cos(this.camYaw);
      const moveX = -sinY * nf + cosY * nr;
      const moveZ = -cosY * nf - sinY * nr;

      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, moveX * speed, 12, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, moveZ * speed, 12, dt);

      const targetYaw = Math.atan2(moveX, moveZ);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * (1 - Math.exp(-14 * dt));
    } else {
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, 0, 12, dt);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, 0, 12, dt);
    }

    this.playerVel.y -= 24 * dt;
    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.z += this.playerVel.z * dt;
    this.playerPos.y += this.playerVel.y * dt;

    const playerRadius = 0.52;
    // Multi-iteration solver prevents ever passing or tunneling through trees, boulders, rickshaws, or buildings
    for (let iter = 0; iter < 3; iter++) {
      const distFromCenter = Math.hypot(this.playerPos.x, this.playerPos.z);
      if (distFromCenter > this.currentLevel.playableRadius) {
        const clampRatio = this.currentLevel.playableRadius / distFromCenter;
        this.playerPos.x *= clampRatio;
        this.playerPos.z *= clampRatio;
      }

      for (const col of this.currentLevel.colliders) {
        if (col.active === false) continue;
        const dx = this.playerPos.x - col.x;
        const dz = this.playerPos.z - col.z;
        const d = Math.hypot(dx, dz);
        const minD = col.radius + playerRadius;
        if (d < minD) {
          const nx = d > 0.0001 ? dx / d : 1;
          const nz = d > 0.0001 ? dz / d : 0;
          this.playerPos.x = col.x + nx * minD;
          this.playerPos.z = col.z + nz * minD;
          const vn = this.playerVel.x * nx + this.playerVel.z * nz;
          if (vn < 0) {
            this.playerVel.x -= vn * nx;
            this.playerVel.z -= vn * nz;
          }
        }
      }

      for (const box of this.currentLevel.boxColliders) {
        if (box.maxY !== undefined && this.playerPos.y >= box.maxY) continue;
        const closestX = THREE.MathUtils.clamp(this.playerPos.x, box.minX, box.maxX);
        const closestZ = THREE.MathUtils.clamp(this.playerPos.z, box.minZ, box.maxZ);
        const dx = this.playerPos.x - closestX;
        const dz = this.playerPos.z - closestZ;
        const d = Math.hypot(dx, dz);
        if (d < playerRadius) {
          if (d > 0.0001) {
            const nx = dx / d;
            const nz = dz / d;
            this.playerPos.x = closestX + nx * playerRadius;
            this.playerPos.z = closestZ + nz * playerRadius;
            const vn = this.playerVel.x * nx + this.playerVel.z * nz;
            if (vn < 0) {
              this.playerVel.x -= vn * nx;
              this.playerVel.z -= vn * nz;
            }
          } else {
            const dLeft = Math.abs(this.playerPos.x - box.minX);
            const dRight = Math.abs(box.maxX - this.playerPos.x);
            const dTop = Math.abs(this.playerPos.z - box.minZ);
            const dBot = Math.abs(box.maxZ - this.playerPos.z);
            const minEdge = Math.min(dLeft, dRight, dTop, dBot);
            if (minEdge === dLeft) this.playerPos.x = box.minX - playerRadius;
            else if (minEdge === dRight) this.playerPos.x = box.maxX + playerRadius;
            else if (minEdge === dTop) this.playerPos.z = box.minZ - playerRadius;
            else this.playerPos.z = box.maxZ + playerRadius;
          }
        }
      }
    }

    // Physical bridge handrail corridor (walk cleanly OVER bridge via ramps, or AROUND bridge beside piers)
    if (this.levelId === 1) {
      const curDx = this.playerPos.x - L1_BRIDGE_X;
      const curDz = this.playerPos.z - L1_BRIDGE_Z;
      if (Math.abs(curDx) < 4.25) {
        const deckH = 0.63 + Math.cos((curDx / 7.6) * Math.PI) * 0.6;
        if (this.playerPos.y > 0.25 && Math.abs(curDz) < 1.38) {
          // Inside bridge rails — prevent walking or jumping sideways off the bridge
          this.playerPos.z =
            L1_BRIDGE_Z + THREE.MathUtils.clamp(curDz, -1.02, 1.02);
        } else if (this.playerPos.y < deckH + 1.05 && Math.abs(curDz) < 1.92) {
          // Outside/below handrails — keep player cleanly outside bridge side walls even while jumping
          const side = curDz >= 0 ? 1 : -1;
          this.playerPos.z = L1_BRIDGE_Z + side * 1.92;
        }
      }
    }

    let groundY = walkableHeightAt(
      this.playerPos.x,
      this.playerPos.z,
      this.levelId,
      this.playerPos.y,
    );
    if (this.levelId === 1) {
      groundY = Math.max(-1.18, groundY);
    } else if (this.levelId === 2 && groundY <= 0.05) {
      groundY = Math.sin(elapsed * 3.2) * 0.08 + 0.06;
    }

    const wasGrounded = this.isGrounded;
    if (this.playerPos.y <= groundY) {
      this.playerPos.y = groundY;
      this.playerVel.y = 0;
      this.isGrounded = true;
      if (!wasGrounded && this.levelId === 1 && groundY < -0.38) {
        this.spawnWaterSplash(this.playerPos, 10, 3.6);
        soundEngine.playWaterStep();
      }
    } else {
      this.isGrounded = false;
    }

    this.hero.group.position.copy(this.playerPos);
    this.hero.group.rotation.y = this.playerYaw;

    // Articulated Explorer Stride, Jump, & Kneel-Reach Collect Animation
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (this.actionAnimTimer > 0) {
      this.actionAnimTimer -= dt;
      const p = Math.sin((this.actionAnimTimer / 0.45) * Math.PI);
      this.hero.torsoPivot.rotation.x = p * 0.55;
      this.hero.rightArm.rotation.x = -p * 1.45;
      this.hero.rightForearm.rotation.x = -p * 0.5;
      this.hero.leftArm.rotation.x = p * 0.4;
      this.hero.bodyPivot.position.y = -p * 0.18;
    } else if (horizSpeed > 0.55 && this.isGrounded && this.levelId !== 2) {
      this.walkCycle += dt * horizSpeed * 1.35;
      this.stepTimer += dt * horizSpeed;
      if (this.stepTimer > 3.2) {
        this.stepTimer = 0;
        if (inRiverWater) {
          soundEngine.playWaterStep();
          this.spawnWaterSplash(this.playerPos, 5, 2.4);
        } else {
          soundEngine.playStep();
        }
      }
      const swing = Math.sin(this.walkCycle) * (sprinting ? 0.85 : 0.68);
      this.hero.leftLeg.rotation.x = swing;
      this.hero.rightLeg.rotation.x = -swing;
      this.hero.leftShin.rotation.x = Math.max(0, -Math.cos(this.walkCycle) * 0.55);
      this.hero.rightShin.rotation.x = Math.max(0, Math.cos(this.walkCycle) * 0.55);

      this.hero.leftArm.rotation.x = -swing * 0.78;
      this.hero.rightArm.rotation.x = swing * 0.78;
      this.hero.leftForearm.rotation.x = -0.35 - Math.max(0, -swing * 0.35);
      this.hero.rightForearm.rotation.x = -0.35 - Math.max(0, swing * 0.35);

      this.hero.torsoPivot.rotation.x = THREE.MathUtils.damp(
        this.hero.torsoPivot.rotation.x,
        sprinting ? 0.16 : 0.08,
        10,
        dt,
      );
      this.hero.bodyPivot.position.y = Math.abs(Math.sin(this.walkCycle)) * 0.07;
      this.hero.scarf.rotation.x =
        0.35 + Math.min(0.65, horizSpeed * 0.06) + Math.sin(elapsed * 12) * 0.1;
    } else if (!this.isGrounded) {
      this.hero.leftLeg.rotation.x = 0.42;
      this.hero.rightLeg.rotation.x = -0.28;
      this.hero.leftShin.rotation.x = 0.55;
      this.hero.rightShin.rotation.x = 0.2;
      this.hero.leftArm.rotation.x = -2.0;
      this.hero.rightArm.rotation.x = -2.0;
      this.hero.torsoPivot.rotation.x = 0.1;
      this.hero.scarf.rotation.x = 0.95;
    } else {
      this.hero.leftLeg.rotation.x = THREE.MathUtils.damp(this.hero.leftLeg.rotation.x, 0, 10, dt);
      this.hero.rightLeg.rotation.x = THREE.MathUtils.damp(this.hero.rightLeg.rotation.x, 0, 10, dt);
      this.hero.leftShin.rotation.x = THREE.MathUtils.damp(this.hero.leftShin.rotation.x, 0, 10, dt);
      this.hero.rightShin.rotation.x = THREE.MathUtils.damp(this.hero.rightShin.rotation.x, 0, 10, dt);
      this.hero.leftArm.rotation.x = THREE.MathUtils.damp(this.hero.leftArm.rotation.x, 0, 10, dt);
      this.hero.rightArm.rotation.x = THREE.MathUtils.damp(this.hero.rightArm.rotation.x, 0, 10, dt);
      this.hero.leftForearm.rotation.x = THREE.MathUtils.damp(this.hero.leftForearm.rotation.x, -0.12, 10, dt);
      this.hero.rightForearm.rotation.x = THREE.MathUtils.damp(this.hero.rightForearm.rotation.x, -0.12, 10, dt);
      this.hero.torsoPivot.rotation.x = THREE.MathUtils.damp(this.hero.torsoPivot.rotation.x, 0, 10, dt);
      this.hero.bodyPivot.position.y =
        this.levelId === 2 ? 0.14 : Math.sin(elapsed * 2.2) * 0.025;
      this.hero.scarf.rotation.x = 0.22 + horizSpeed * 0.04 + Math.sin(elapsed * 4) * 0.06;
    }

    this.hero.coreGem.rotation.y += dt * 2.2;
  }

  private updateCamera(dt: number): void {
    const horizDist = Math.cos(this.camPitch) * this.camDist;
    const vertDist = Math.sin(this.camPitch) * this.camDist;

    _camDesired.set(
      this.playerPos.x + Math.sin(this.camYaw) * horizDist,
      this.playerPos.y + 1.85 + vertDist,
      this.playerPos.z + Math.cos(this.camYaw) * horizDist,
    );

    // Camera terrain & collider clearance so camera never clips through ground or objects!
    const camGround = groundHeightAt(_camDesired.x, _camDesired.z, this.levelId);
    if (_camDesired.y < camGround + 1.1) {
      _camDesired.y = camGround + 1.1;
    }
    if (this.currentLevel) {
      for (const col of this.currentLevel.colliders) {
        if (col.active === false || col.radius < 0.7) continue;
        const dx = _camDesired.x - col.x;
        const dz = _camDesired.z - col.z;
        const d = Math.hypot(dx, dz);
        const minR = col.radius + 1.2;
        if (d < minR && d > 0.001) {
          _camDesired.x = col.x + (dx / d) * minR;
          _camDesired.z = col.z + (dz / d) * minR;
        }
      }
    }

    const dampFactor = 1 - Math.exp(-10 * dt);
    this.camera.position.lerp(_camDesired, dampFactor);

    _camTarget.set(this.playerPos.x, this.playerPos.y + 1.6, this.playerPos.z);
    this.camera.lookAt(_camTarget);

    this.sunLight.position.set(
      this.playerPos.x + 24,
      this.playerPos.y + 36,
      this.playerPos.z + 20,
    );
    this.sunLight.target.position.copy(this.playerPos);
  }

  private animateWorldProps(dt: number, elapsed: number): void {
    if (!this.currentLevel) return;

    for (const item of this.currentLevel.interactables) {
      if (item.type === 'seed' && !item.completed) {
        item.mesh.position.y =
          item.baseY + Math.sin(elapsed * 2.6 + item.phaseOffset) * 0.14;
        item.mesh.rotation.y += dt * 1.8;
      } else if (item.type === 'collect' && !item.completed) {
        if (this.levelId === 2) {
          // Only ocean floating plastic bobs on waves; land/street garbage heaps stay grounded
          item.mesh.position.y =
            item.baseY + Math.sin(elapsed * 2.4 + item.phaseOffset) * 0.11;
          item.mesh.rotation.y += dt * 0.7;
        }
      } else if (item.type === 'river' && !item.completed) {
        item.mesh.position.y =
          item.baseY + Math.sin(elapsed * 2.2 + item.phaseOffset) * 0.045;
        item.mesh.rotation.y += dt * 0.28;
      } else if (item.type === 'plant') {
        if (item.ringMesh && !item.completed) {
          item.ringMesh.rotation.z += dt * 1.5;
          const pulse = 1 + Math.sin(elapsed * 4 + item.phaseOffset) * 0.08;
          item.ringMesh.scale.setScalar(pulse);
        }
        if (
          item.completed &&
          item.sproutTree &&
          item.sproutProgress !== undefined &&
          item.sproutProgress < 1
        ) {
          item.sproutProgress = Math.min(1, item.sproutProgress + dt * 1.35);
          const t = item.sproutProgress;
          const spring = 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 2.4);
          item.sproutTree.scale.setScalar(Math.max(0.04, spring));
        }
      } else if (item.type === 'rescue') {
        if (!item.completed) {
          item.mesh.position.y = item.baseY + Math.sin(elapsed * 2.2 + item.phaseOffset) * 0.12;
          if (item.netGroup) item.netGroup.rotation.y += dt * 0.6;
        } else if (item.animalGroup && item.rescueTime !== undefined) {
          item.rescueTime += dt;
          const leap = Math.abs(Math.sin(item.rescueTime * 2.4)) * 1.8;
          item.animalGroup.position.y = leap;
          item.animalGroup.rotation.y += dt * 1.3;
        }
      } else if (item.type === 'shutdown') {
        if (!item.completed && item.machineFan) {
          item.machineFan.rotation.z += dt * 7.5;
        } else if (item.completed && item.solarWings) {
          const s = THREE.MathUtils.damp(item.solarWings.scale.x, 1, 6, dt);
          item.solarWings.scale.setScalar(s);
        }
      } else if (item.type === 'core') {
        if (item.coreCrystal && item.coreRing1 && item.coreRing2) {
          item.coreCrystal.rotation.y += dt * (this.cityCoreActivated ? 3.5 : 1.0);
          item.coreCrystal.position.y = 2.0 + Math.sin(elapsed * 2.4) * 0.15;
          item.coreRing1.rotation.y += dt * 1.4;
          item.coreRing1.rotation.x += dt * 0.6;
          item.coreRing2.rotation.z -= dt * 1.2;
          const coreMat = item.coreCrystal.material as THREE.MeshStandardMaterial;
          coreMat.emissiveIntensity = this.isFinalCoreReady() ? 1.4 : 0.35;
        }
      }
    }

    // Waterfall mist & foam animation (Level 1)
    if (this.currentLevel.waterfallFoam && this.currentLevel.waterfallPos) {
      const s = 1 + Math.sin(elapsed * 4.5) * 0.12;
      this.currentLevel.waterfallFoam.scale.setScalar(s);
      this.mistSpawnTimer += dt;
      if (this.mistSpawnTimer >= 0.16) {
        this.mistSpawnTimer = 0;
        this.spawnMistPuff(this.currentLevel.waterfallPos);
      }
    }

    // Active smoke puffs from un-stopped machines (Level 3)
    if (this.levelId === 3) {
      this.smokeSpawnTimer += dt;
      if (this.smokeSpawnTimer >= 0.22) {
        this.smokeSpawnTimer = 0;
        this.currentLevel.interactables.forEach((item) => {
          if (item.type === 'shutdown' && !item.completed) {
            _vec3b.copy(item.position).add(_vec3.set(0, 3.9, 0));
            this.spawnSmokePuff(_vec3b);
          }
        });
      }
    }

    // Butterflies
    if (this.currentLevel.butterflies.length > 0) {
      const visibleCount = Math.floor(
        this.restorationProgress * this.currentLevel.butterflies.length,
      );
      this.currentLevel.butterflies.forEach((bf, idx) => {
        bf.visible = idx < visibleCount;
        if (bf.visible) {
          const ang = elapsed * 0.85 + idx * 0.8;
          bf.position.x = Math.cos(ang) * (7 + (idx % 4) * 3.2);
          bf.position.z = Math.sin(ang * 0.8) * (7 + (idx % 3) * 3.2);
          bf.position.y = 2.3 + Math.sin(elapsed * 3.5 + idx) * 0.6;
          bf.rotation.y = -ang;
          const flap = Math.sin(elapsed * 18 + idx) * 0.65;
          bf.children[0].rotation.z = flap;
          bf.children[1].rotation.z = -flap;
        }
      });
    }

    // Soaring Birds
    if (this.currentLevel.birds.length > 0) {
      const visibleBirds = Math.max(
        this.phase === 'menu' || this.phase === 'victory' ? 5 : 0,
        Math.floor(this.restorationProgress * this.currentLevel.birds.length),
      );
      this.currentLevel.birds.forEach((bird, idx) => {
        bird.visible = idx < visibleBirds;
        if (bird.visible) {
          const ang = elapsed * (0.42 + (idx % 3) * 0.08) + idx * 1.1;
          const rad = 14 + (idx % 3) * 5;
          bird.position.x = Math.cos(ang) * rad;
          bird.position.z = Math.sin(ang) * rad;
          bird.position.y = 9.5 + Math.sin(elapsed * 1.8 + idx) * 1.5;
          bird.rotation.y = -ang;
          const lw = bird.userData.leftWing as THREE.Group;
          const rw = bird.userData.rightWing as THREE.Group;
          const flap = Math.sin(elapsed * 10 + idx * 1.5) * 0.55;
          if (lw && rw) {
            lw.rotation.z = flap;
            rw.rotation.z = -flap;
          }
        }
      });
    }

    // Forest Deer Wildlife (emerge above 35% forest restoration)
    if (this.currentLevel.deerList.length > 0) {
      const showDeer = this.restorationProgress > 0.35 || this.phase === 'victory';
      this.currentLevel.deerList.forEach((d) => {
        d.group.visible = showDeer;
        if (showDeer) {
          const ang = elapsed * d.speed + d.phase;
          const nx = d.center.x + Math.cos(ang) * d.radius;
          const nz = d.center.z + Math.sin(ang) * d.radius;
          const ny = groundHeightAt(nx, nz, 1);
          d.group.position.set(nx, ny, nz);
          d.group.rotation.y = -ang;
        }
      });
    }
  }

  private updateParticles(dt: number): void {
    let anyActive = false;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) {
        _dummy.position.set(0, -999, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      anyActive = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.pos.addScaledVector(p.vel, dt);
      const t = p.life / p.maxLife;
      const sc = p.scale * (1 - t);
      _dummy.position.copy(p.pos);
      _dummy.scale.setScalar(Math.max(0.01, sc));
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, p.color);
    }
    if (anyActive) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private findNearbyInteractable(): void {
    if (!this.currentLevel) {
      this.nearbyTarget = null;
      return;
    }
    let best: InteractableEntity | null = null;
    let bestDist = Infinity;

    for (const item of this.currentLevel.interactables) {
      if (item.completed) continue;
      if (item.type === 'recycle' && this.cityWasteCarried === 0) continue;
      if (item.type === 'core' && !this.isFinalCoreReady()) continue;

      const dist = Math.hypot(
        this.playerPos.x - item.position.x,
        this.playerPos.z - item.position.z,
      );
      if (dist <= item.radius && dist < bestDist) {
        best = item;
        bestDist = dist;
      }
    }

    if (best?.id !== this.nearbyTarget?.id) {
      this.nearbyTarget = best;
      this.emitHud();
    } else {
      this.nearbyTarget = best;
    }
  }

  private buildObjectives(): {
    objectives: MissionObjective[];
    hint: string;
  } {
    if (this.levelId === 1) {
      return {
        objectives: [
          {
            id: 'l1-garbage',
            label: 'Collect forest rubbish',
            current: this.forestGarbageDone,
            target: 5,
            completed: this.forestGarbageDone >= 5,
          },
          {
            id: 'l1-river',
            label: 'Purify river pollution',
            current: this.forestRiverDone,
            target: 3,
            completed: this.forestRiverDone >= 3,
          },
          {
            id: 'l1-trees',
            label: 'Plant 5 trees',
            current: this.forestTreesDone,
            target: 5,
            completed: this.forestTreesDone >= 5,
          },
          {
            id: 'l1-seeds',
            label: 'Gather golden eco seeds',
            current: this.forestSeedsDone,
            target: 3,
            completed: this.forestSeedsDone >= 3,
          },
        ],
        hint: 'Cross the bridge, purify the river, gather golden seeds, and plant 5 trees to heal Emerald Valley.',
      };
    }

    if (this.levelId === 2) {
      return {
        objectives: [
          {
            id: 'l2-bottles',
            label: 'Collect plastic bottles',
            current: this.oceanBottlesDone,
            target: 6,
            completed: this.oceanBottlesDone >= 6,
          },
          {
            id: 'l2-animals',
            label: 'Rescue trapped sea animals',
            current: this.oceanAnimalsDone,
            target: 4,
            completed: this.oceanAnimalsDone >= 4,
          },
        ],
        hint: 'Surf across Coral Bay on your eco-hoverboard to collect floating bottles and free marine animals.',
      };
    }

    const coreReady = this.isFinalCoreReady();
    return {
      objectives: [
        {
          id: 'l3-waste',
          label: 'Clean & recycle Karachi garbage',
          current: this.cityWasteSorted,
          target: 6,
          completed: this.cityWasteSorted >= 6,
        },
        {
          id: 'l3-machines',
          label: 'Shut down smog generators',
          current: this.cityMachinesOff,
          target: 3,
          completed: this.cityMachinesOff >= 3,
        },
        {
          id: 'l3-core',
          label: 'Activate Planetary Green Core',
          current: this.cityCoreActivated ? 1 : 0,
          target: 1,
          completed: this.cityCoreActivated,
        },
      ],
      hint: coreReady
        ? 'Karachi streets are spotless! Head to the central roundabout and press E on the Green Core!'
        : this.cityWasteCarried > 0
          ? `Carrying ${this.cityWasteCarried} garbage — bring it to a KMC Recycling Station!`
          : 'Clean Karachi roadside garbage heaps, sort them at KMC Bins, and shut down the 3 smog generators.',
    };
  }

  private emitHud(): void {
    const def = LEVELS[this.levelId];
    const { objectives, hint } = this.buildObjectives();
    const nearby: NearbyInteraction | null = this.nearbyTarget
      ? {
          id: this.nearbyTarget.id,
          label: this.nearbyTarget.label,
          actionText: this.nearbyTarget.actionText,
          type: this.nearbyTarget.type,
        }
      : null;

    this.onHudUpdate({
      phase: this.phase,
      levelId: this.levelId,
      levelTitle: def.title,
      levelSubtitle: def.subtitle,
      ecoPoints: this.ecoPoints,
      levelEcoPoints: this.levelEcoPoints,
      planetEnergy: Math.round(this.planetEnergy),
      elapsedSeconds: Math.floor(this.elapsedSeconds),
      restorationPercent: Math.round(this.restorationProgress * 100),
      treesPlanted: this.treesPlanted,
      rubbishCollected: this.rubbishCollected,
      seedsCollected: this.seedsCollected,
      objectives,
      missionHint: hint,
      nearbyInteraction: nearby,
      carriedWaste: this.cityWasteCarried,
      audioMuted: soundEngine.isMuted(),
      toastMessage: this.toastMessage,
      introCaption: def.introCaption,
      finalCoreReady: this.levelId === 3 && this.isFinalCoreReady(),
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    if (this.currentLevel) {
      this.currentLevel.dispose();
    }
    this.textures.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.shockwaveRing.geometry.dispose();
    (this.shockwaveRing.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
