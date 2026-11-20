import { motion } from 'motion/react';
import {
  Camera,
  Check,
  Compass,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import {
  CameraViewMode,
  DEFAULT_GAME_OPTIONS,
  DifficultyMode,
  GameOptions,
  GraphicsQuality,
  LEVELS,
  LevelId,
  SuitTheme,
} from '../game/types';

interface OptionsModalProps {
  open: boolean;
  options: GameOptions;
  currentLevel?: LevelId;
  showChapterJump?: boolean;
  onChange: (next: GameOptions) => void;
  onJumpToLevel?: (id: LevelId) => void;
  onClose: () => void;
}

export function OptionsModal({
  open,
  options,
  currentLevel,
  showChapterJump = false,
  onChange,
  onJumpToLevel,
  onClose,
}: OptionsModalProps) {
  if (!open) return null;

  const update = <K extends keyof GameOptions>(key: K, val: GameOptions[K]) => {
    onChange({ ...options, [key]: val });
  };

  const difficulties: { id: DifficultyMode; label: string; desc: string }[] = [
    { id: 'relaxed', label: 'Relaxed', desc: 'Slow energy drain' },
    { id: 'standard', label: 'Standard', desc: 'Balanced' },
    { id: 'challenge', label: 'Challenge', desc: 'Fast drain' },
  ];

  const graphicsLevels: { id: GraphicsQuality; label: string }[] = [
    { id: 'low', label: 'Eco (Fast)' },
    { id: 'balanced', label: 'Balanced' },
    { id: 'ultra', label: 'Ultra' },
  ];

  const cameraViews: { id: CameraViewMode; label: string }[] = [
    { id: 'close', label: 'Close' },
    { id: 'standard', label: 'Standard' },
    { id: 'wide', label: 'Wide' },
  ];

  const suits: { id: SuitTheme; label: string; swatch: string }[] = [
    { id: 'ranger', label: 'Forest Ranger', swatch: '#1f6f50' },
    { id: 'karachi', label: 'Karachi Eco-Hero', swatch: '#f59e0b' },
    { id: 'ocean', label: 'Ocean Guardian', swatch: '#0284c7' },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white leading-tight">
                Game Options
              </h2>
              <p className="text-xs text-slate-400">
                Customize controls, graphics, audio, suit &amp; difficulty
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Options"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Gameplay & Difficulty */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Shield className="w-4 h-4" />
              <span>Gameplay &amp; Difficulty</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {difficulties.map((d) => {
                const active = options.difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => update('difficulty', d.id)}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-400 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center justify-between">
                      <span>{d.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{d.desc}</div>
                  </button>
                );
              })}
            </div>

            <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
              <div>
                <div className="font-medium text-white">Auto-Collect Nearby Rubbish &amp; Seeds</div>
                <div className="text-xs text-slate-400">
                  Automatically pick up garbage, bottles &amp; seeds when walking close
                </div>
              </div>
              <input
                type="checkbox"
                checked={options.autoCollect}
                onChange={(e) => update('autoCollect', e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </label>
          </section>

          {/* Explorer Suit Theme */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>Explorer Suit Theme</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {suits.map((suit) => {
                const active = options.suitTheme === suit.id;
                return (
                  <button
                    key={suit.id}
                    type="button"
                    onClick={() => update('suitTheme', suit.id)}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors cursor-pointer ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-400 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 border border-white/30"
                      style={{ backgroundColor: suit.swatch }}
                    />
                    <span className="font-medium text-xs sm:text-sm truncate">{suit.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Graphics & Camera */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Camera className="w-4 h-4" />
              <span>Graphics &amp; Camera</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-medium text-slate-300">Graphics Quality</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {graphicsLevels.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => update('graphicsQuality', g.id)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        options.graphicsQuality === g.id
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-medium text-slate-300">Camera Distance</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {cameraViews.map((cv) => (
                    <button
                      key={cv.id}
                      type="button"
                      onClick={() => update('cameraView', cv.id)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        options.cameraView === cv.id
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {cv.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">Mouse Look Sensitivity</span>
                <span className="font-mono-tabular text-emerald-400">
                  {options.cameraSensitivity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={options.cameraSensitivity}
                onChange={(e) => update('cameraSensitivity', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <label className="flex items-center justify-between text-xs text-slate-300 pt-1 cursor-pointer">
                <span>Invert Camera Vertical Look</span>
                <input
                  type="checkbox"
                  checked={options.invertCameraY}
                  onChange={(e) => update('invertCameraY', e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </label>
            </div>
          </section>

          {/* Audio */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Volume2 className="w-4 h-4" />
              <span>Audio Levels</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium">Music Volume</span>
                  <span className="font-mono-tabular text-emerald-400">
                    {Math.round(options.musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={options.musicVolume}
                  onChange={(e) => update('musicVolume', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium">Nature &amp; SFX Volume</span>
                  <span className="font-mono-tabular text-emerald-400">
                    {Math.round(options.sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={options.sfxVolume}
                  onChange={(e) => update('sfxVolume', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </section>

          {/* Quick Chapter Switcher when in-game */}
          {showChapterJump && onJumpToLevel && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <Compass className="w-4 h-4" />
                <span>Jump to Chapter</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {([1, 2, 3] as LevelId[]).map((id) => {
                  const def = LEVELS[id];
                  const isCurrent = currentLevel === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onJumpToLevel(id);
                        onClose();
                      }}
                      className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-500/15 border-emerald-400 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-semibold text-slate-400">Chapter 0{id}</div>
                      <div className="font-display font-bold text-sm text-white truncate">
                        {def.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_GAME_OPTIONS })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save &amp; Close</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
