import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Pause,
  RotateCcw,
  SkipForward,
  Sliders,
  Trash2,
  TreePine,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { HudSnapshot } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  onInteract: () => void;
  onJump: () => void;
  onSkipIntro: () => void;
  onPause: () => void;
  onOpenOptions: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onVirtualMove: (x: number, y: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function GameHUD({
  hud,
  onInteract,
  onJump,
  onSkipIntro,
  onPause,
  onOpenOptions,
  onRestart,
  onToggleMute,
  onVirtualMove,
}: GameHUDProps) {
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  // Cinematic Intro Letterbox Overlay
  if (hud.phase === 'intro') {
    return (
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between">
        <div className="h-14 sm:h-16 bg-slate-950/90 border-b border-slate-800/80 px-6 flex items-center justify-between">
          <span className="font-display text-sm sm:text-base font-bold text-emerald-400">
            {hud.levelTitle} · {hud.levelSubtitle}
          </span>
          <button
            type="button"
            onClick={onSkipIntro}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Skip Intro</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-20 sm:h-24 bg-slate-950/90 border-t border-slate-800/80 px-6 flex items-center justify-center text-center">
          <p className="font-display text-sm sm:text-lg font-medium text-slate-100 max-w-2xl">
            {hud.introCaption}
          </p>
        </div>
      </div>
    );
  }

  // Cinematic Mission Transformation Sweep Overlay
  if (hud.phase === 'restoring') {
    return (
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between">
        <div className="h-12 bg-slate-950/85" />
        <div className="self-center px-6 py-3 rounded-2xl bg-slate-950/85 border border-emerald-400/60 text-center shadow-2xl">
          <p className="text-xs font-semibold text-emerald-400">Nature Restored</p>
          <p className="font-display text-xl sm:text-2xl font-bold text-white">
            {hud.levelSubtitle} is Coming Back to Life
          </p>
        </div>
        <div className="h-12 bg-slate-950/85" />
      </div>
    );
  }

  const energyStatus =
    hud.planetEnergy > 55
      ? { bar: 'bg-emerald-400', label: 'Healthy', text: 'text-emerald-300' }
      : hud.planetEnergy > 25
        ? { bar: 'bg-amber-400', label: 'At Risk', text: 'text-amber-300' }
        : { bar: 'bg-rose-500', label: 'Critical', text: 'text-rose-300' };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-5">
      {/* Top Row: Left Stats + Right Mission Checklist */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Chapter, Timer, Eco Points, Trees/Rubbish & Planet Energy */}
        <div className="pointer-events-auto bg-slate-950/85 border border-slate-800 rounded-2xl p-3.5 sm:p-4 min-w-[260px] max-w-xs shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-emerald-400">
                {hud.levelSubtitle}
              </div>
              <div className="font-display text-base font-bold text-white leading-snug">
                {hud.levelTitle}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Time</div>
              <div className="font-mono-tabular text-sm font-bold text-white">
                {formatTime(hud.elapsedSeconds)}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300">
              Eco Points:{' '}
              <strong className="font-mono-tabular text-emerald-300 text-sm">
                {hud.ecoPoints}
              </strong>
            </span>
            <div className="flex items-center gap-3 text-slate-300 font-mono-tabular">
              <span className="inline-flex items-center gap-1" title="Trees Planted">
                <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                {hud.treesPlanted}
              </span>
              <span className="inline-flex items-center gap-1" title="Rubbish Collected">
                <Trash2 className="w-3.5 h-3.5 text-amber-300" />
                {hud.rubbishCollected}
              </span>
            </div>
          </div>

          {/* Planet Energy Bar */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="inline-flex items-center gap-1 font-medium text-slate-200">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Planet Energy
              </span>
              <span className={`font-mono-tabular font-semibold ${energyStatus.text}`}>
                {hud.planetEnergy}% · {energyStatus.label}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${energyStatus.bar}`}
                style={{ width: `${hud.planetEnergy}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Right: Objectives + Action Buttons */}
        <div className="pointer-events-auto flex flex-col items-end gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              title={hud.audioMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="p-2.5 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              {hud.audioMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onOpenOptions}
              title="Game Options"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-xs font-medium whitespace-nowrap cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Options</span>
            </button>
            <button
              type="button"
              onClick={onRestart}
              title="Restart Level"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-xs font-medium whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restart</span>
            </button>
            <button
              type="button"
              onClick={onPause}
              title="Pause Game"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-xs font-medium whitespace-nowrap cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          </div>

          <div className="bg-slate-950/85 border border-slate-800 rounded-2xl p-3.5 w-64 sm:w-72 shadow-lg">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
              <span>Mission Objectives</span>
              <span className="font-mono-tabular text-emerald-400">
                {hud.restorationPercent}% Restored
              </span>
            </div>
            <ul className="space-y-1.5">
              {hud.objectives.map((obj) => (
                <li
                  key={obj.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span
                    className={`flex items-center gap-1.5 ${
                      obj.completed ? 'text-emerald-300 line-through' : 'text-slate-100'
                    }`}
                  >
                    {obj.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="truncate">{obj.label}</span>
                  </span>
                  <span className="font-mono-tabular text-slate-300 shrink-0">
                    {obj.current}/{obj.target}
                  </span>
                </li>
              ))}
            </ul>
            {hud.levelId === 3 && hud.carriedWaste > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800 text-xs font-medium text-amber-300">
                Carrying {hud.carriedWaste} waste — bring to Recycling Station
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Feedback Toast */}
      {hud.toastMessage && (
        <div className="self-center bg-slate-950/90 border border-emerald-500/60 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
          {hud.toastMessage}
        </div>
      )}

      {/* Bottom Dock */}
      <div className="flex flex-col items-center gap-2.5">
        {hud.nearbyInteraction && (
          <button
            type="button"
            onClick={onInteract}
            className="pointer-events-auto inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm shadow-xl transition-transform active:scale-95 cursor-pointer"
          >
            <span className="px-2 py-0.5 rounded bg-slate-950 text-emerald-300 font-mono-tabular text-xs">
              E
            </span>
            <span>{hud.nearbyInteraction.actionText}</span>
          </button>
        )}

        <div className="pointer-events-auto flex flex-col items-center">
          <button
            type="button"
            onClick={() => setControlsCollapsed((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-slate-950/85 border border-b-0 border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
          >
            {controlsCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide Controls</span>
              </>
            )}
          </button>

          {!controlsCollapsed && (
            <div className="bg-slate-950/85 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-300 shadow-lg max-w-3xl">
              <span className="text-slate-100 font-medium">{hud.missionHint}</span>
              <div className="flex items-center gap-3 text-slate-400">
                <span>WASD Move</span>
                <span aria-hidden="true">·</span>
                <span>Shift Run</span>
                <span aria-hidden="true">·</span>
                <span>Space Jump</span>
                <span aria-hidden="true">·</span>
                <span>Drag Mouse Look</span>
                <span aria-hidden="true">·</span>
                <span>E Interact</span>
              </div>
              <div className="flex sm:hidden items-center gap-2 pt-1">
                <button
                  type="button"
                  onPointerDown={() => onVirtualMove(0, 1)}
                  onPointerUp={() => onVirtualMove(0, 0)}
                  onPointerLeave={() => onVirtualMove(0, 0)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-white font-semibold"
                >
                  Fwd
                </button>
                <button
                  type="button"
                  onPointerDown={() => onVirtualMove(-1, 0)}
                  onPointerUp={() => onVirtualMove(0, 0)}
                  onPointerLeave={() => onVirtualMove(0, 0)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-white font-semibold"
                >
                  Left
                </button>
                <button
                  type="button"
                  onPointerDown={() => onVirtualMove(1, 0)}
                  onPointerUp={() => onVirtualMove(0, 0)}
                  onPointerLeave={() => onVirtualMove(0, 0)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-white font-semibold"
                >
                  Right
                </button>
                <button
                  type="button"
                  onClick={onJump}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold"
                >
                  Jump
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
