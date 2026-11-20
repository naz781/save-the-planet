export type GamePhase =
  | 'menu'
  | 'intro'
  | 'playing'
  | 'paused'
  | 'restoring'
  | 'level_complete'
  | 'gameover'
  | 'victory';

export type LevelId = 1 | 2 | 3;

export interface MissionObjective {
  id: string;
  label: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface NearbyInteraction {
  id: string;
  label: string;
  actionText: string;
  type: 'collect' | 'plant' | 'river' | 'seed' | 'rescue' | 'recycle' | 'shutdown' | 'core';
}

export interface HudSnapshot {
  phase: GamePhase;
  levelId: LevelId;
  levelTitle: string;
  levelSubtitle: string;
  ecoPoints: number;
  levelEcoPoints: number;
  planetEnergy: number; // 0 to 100
  elapsedSeconds: number;
  restorationPercent: number; // 0 to 100
  treesPlanted: number;
  rubbishCollected: number;
  seedsCollected: number;
  objectives: MissionObjective[];
  missionHint: string;
  nearbyInteraction: NearbyInteraction | null;
  carriedWaste: number;
  audioMuted: boolean;
  toastMessage: string | null;
  introCaption: string;
  finalCoreReady: boolean;
}

export interface LevelDefinition {
  id: LevelId;
  title: string;
  subtitle: string;
  storyBrief: string;
  introCaption: string;
  accentColor: string;
}

export const LEVELS: Record<LevelId, LevelDefinition> = {
  1: {
    id: 1,
    title: 'Chapter 1: Save the Forest',
    subtitle: 'Emerald Valley',
    storyBrief:
      'Toxic waste and murky runoff have blighted Emerald Valley. Clear realistic rubbish, purify the river, gather golden seeds, and plant 5 trees.',
    introCaption:
      'Emerald Valley is suffering under pollution. Cross the bridge, clean the river, clear the rubbish, and plant new life.',
    accentColor: '#10b981',
  },
  2: {
    id: 2,
    title: 'Chapter 2: Save the Ocean',
    subtitle: 'Clifton Coast & Bay',
    storyBrief:
      'Plastic waste drifts along the Arabian Sea coast while turtles and dolphins are tangled in nets. Skim the waves to clean and rescue.',
    introCaption:
      'Coastal waters are choked with drifting plastic. Glide across the waves to remove debris and rescue trapped marine life.',
    accentColor: '#0ea5e9',
  },
  3: {
    id: 3,
    title: 'Chapter 3: Clean Karachi',
    subtitle: 'Karachi Metro Boulevard',
    storyBrief:
      'Overflowing roadside garbage heaps, polythene bags, and smog generators choke the busy Karachi streets. Clean the city, recycle waste, and power the Green Core.',
    introCaption:
      'Karachi’s bustling avenues are buried in roadside garbage and smog. Collect the waste, sort it into green bins, shut down smog units, and restore clean energy.',
    accentColor: '#f59e0b',
  },
};

export type GraphicsQuality = 'low' | 'balanced' | 'ultra';
export type DifficultyMode = 'relaxed' | 'standard' | 'challenge';
export type SuitTheme = 'ranger' | 'karachi' | 'ocean';
export type CameraViewMode = 'close' | 'standard' | 'wide';

export interface GameOptions {
  graphicsQuality: GraphicsQuality;
  difficulty: DifficultyMode;
  suitTheme: SuitTheme;
  cameraView: CameraViewMode;
  cameraSensitivity: number; // 0.5 to 2.0
  invertCameraY: boolean;
  musicVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  autoCollect: boolean;
}

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  graphicsQuality: 'balanced',
  difficulty: 'standard',
  suitTheme: 'ranger',
  cameraView: 'standard',
  cameraSensitivity: 1.0,
  invertCameraY: false,
  musicVolume: 0.75,
  sfxVolume: 0.85,
  autoCollect: false,
};

const OPTIONS_STORAGE_KEY = 'save_the_planet_options_v1';

export function loadSavedOptions(): GameOptions {
  try {
    const raw = window.localStorage.getItem(OPTIONS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GAME_OPTIONS };
    const parsed = JSON.parse(raw) as Partial<GameOptions>;
    return {
      ...DEFAULT_GAME_OPTIONS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_GAME_OPTIONS };
  }
}

export function saveOptions(options: GameOptions): void {
  try {
    window.localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options));
  } catch {
    // ignore storage failures in private iframes
  }
}

