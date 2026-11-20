import { motion } from 'motion/react';
import {
  Award,
  Clock,
  Home,
  Play,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Trash2,
  TreePine,
  Trophy,
} from 'lucide-react';
import { HudSnapshot, LEVELS, LevelId } from '../game/types';

interface ModalScreensProps {
  hud: HudSnapshot;
  onResume: () => void;
  onOpenOptions: () => void;
  onRestartLevel: () => void;
  onNextLevel: () => void;
  onMainMenu: () => void;
  onPlayAgain: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ModalScreens({
  hud,
  onResume,
  onOpenOptions,
  onRestartLevel,
  onNextLevel,
  onMainMenu,
  onPlayAgain,
}: ModalScreensProps) {
  if (hud.phase === 'paused') {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/75 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl p-7 max-w-md w-full shadow-2xl text-center"
        >
          <h2 className="font-display text-2xl font-bold text-white">Game Paused</h2>
          <p className="mt-2 text-sm text-slate-300">
            {hud.levelTitle} · {hud.restorationPercent}% Restored
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onResume}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Mission</span>
            </button>
            <button
              type="button"
              onClick={onOpenOptions}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Options &amp; Chapters</span>
            </button>
            <button
              type="button"
              onClick={onRestartLevel}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart Chapter</span>
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-200 font-medium text-sm cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Main Menu</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (hud.phase === 'level_complete') {
    const nextId = Math.min(3, hud.levelId + 1) as LevelId;
    const nextDef = LEVELS[nextId];
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/65 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28 }}
          className="bg-slate-900/95 border border-emerald-500/60 rounded-2xl p-8 max-w-lg w-full shadow-2xl text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mb-4">
            <Award className="w-8 h-8" />
          </div>
          <p className="text-xs font-semibold text-emerald-400">Chapter Complete</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold text-white">
            {hud.levelSubtitle} Restored!
          </h2>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            You earned{' '}
            <strong className="text-emerald-300 font-mono-tabular">
              +{hud.levelEcoPoints} Eco Points
            </strong>{' '}
            and revitalized {hud.levelSubtitle}. Next destination:{' '}
            <strong>{nextDef.title}</strong>.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3 text-left bg-slate-950/75 border border-slate-800 rounded-xl p-4">
            <div>
              <div className="text-xs text-slate-400">Eco Points</div>
              <div className="font-mono-tabular text-xl font-bold text-emerald-400">
                {hud.ecoPoints}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Trees Planted</div>
              <div className="font-mono-tabular text-xl font-bold text-white">
                {hud.treesPlanted}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Rubbish Cleared</div>
              <div className="font-mono-tabular text-xl font-bold text-amber-300">
                {hud.rubbishCollected}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={onNextLevel}
              className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Continue to Chapter {nextId}</span>
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Main Menu</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (hud.phase === 'gameover') {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22 }}
          className="bg-slate-900 border border-rose-500/60 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center text-rose-400 mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="font-display text-3xl font-extrabold text-white">
            Planet Energy Depleted
          </h2>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Earth&apos;s energy reached zero before {hud.levelSubtitle} could be fully restored.
            Try again — every cleanup restores Planet Energy!
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onRestartLevel}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Chapter {hud.levelId}</span>
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Main Menu</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (hud.phase === 'victory') {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/45 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="bg-slate-950/90 border border-emerald-400/80 rounded-3xl p-8 max-w-2xl w-full shadow-2xl text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 mb-4">
            <Trophy className="w-9 h-9" />
          </div>
          <p className="text-sm font-semibold text-emerald-400">
            The Forest, Ocean &amp; City Are Alive Again
          </p>
          <h1 className="mt-1 font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            YOU SAVED THE PLANET!
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-200 leading-relaxed max-w-xl mx-auto">
            Look behind you — Emerald Valley&apos;s rivers gleam crystal clear, wildlife roams
            among newly planted trees, Coral Bay thrives, and Earth runs on clean green energy.
          </p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <div className="p-2">
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Eco Points</span>
              </div>
              <div className="mt-1 font-mono-tabular text-2xl font-bold text-emerald-400">
                {hud.ecoPoints}
              </div>
            </div>
            <div className="p-2">
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                <span>Trees Planted</span>
              </div>
              <div className="mt-1 font-mono-tabular text-2xl font-bold text-white">
                {hud.treesPlanted}
              </div>
            </div>
            <div className="p-2">
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Trash2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Rubbish Cleared</span>
              </div>
              <div className="mt-1 font-mono-tabular text-2xl font-bold text-amber-300">
                {hud.rubbishCollected}
              </div>
            </div>
            <div className="p-2">
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-300" />
                <span>Total Time</span>
              </div>
              <div className="mt-1 font-mono-tabular text-2xl font-bold text-white">
                {formatTime(hud.elapsedSeconds)}
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={onPlayAgain}
              className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Main Menu</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
