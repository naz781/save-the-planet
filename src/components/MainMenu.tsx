import { motion } from 'motion/react';
import {
  Compass,
  Factory,
  Play,
  Sliders,
  Sparkles,
  TreePine,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import { LEVELS, LevelId } from '../game/types';

interface MainMenuProps {
  selectedLevel: LevelId;
  onSelectLevel: (id: LevelId) => void;
  onStartGame: (id: LevelId) => void;
  onOpenOptions: () => void;
  audioMuted: boolean;
  onToggleMute: () => void;
}

const LEVEL_ICONS: Record<LevelId, typeof TreePine> = {
  1: TreePine,
  2: Waves,
  3: Factory,
};

export function MainMenu({
  selectedLevel,
  onSelectLevel,
  onStartGame,
  onOpenOptions,
  audioMuted,
  onToggleMute,
}: MainMenuProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 md:p-10 bg-gradient-to-b from-slate-950/75 via-slate-950/45 to-slate-950/85 pointer-events-auto overflow-y-auto">
      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between gap-4 max-w-6xl w-full mx-auto"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg">
            <Compass className="w-6 h-6" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
            Save the Planet
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenOptions}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Options</span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{audioMuted ? 'Sound Off' : 'Sound On'}</span>
          </button>
        </div>
      </motion.div>

      {/* Center Hero & Mission Select */}
      <div className="max-w-5xl w-full mx-auto my-auto py-6 flex flex-col gap-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="max-w-2xl"
        >
          <p className="text-sm font-semibold text-emerald-400 tracking-wide mb-2">
            3D Environmental Adventure
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
            Save the Planet: The Last Chance
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl">
            Step into the boots of an environmental explorer. Purify polluted rivers, plant new
            forests, rescue marine wildlife, and restore clean green energy across Earth.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onStartGame(selectedLevel)}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-base shadow-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-300"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Play Game</span>
            </button>
            <button
              type="button"
              onClick={onOpenOptions}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-display font-semibold text-base shadow-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Options</span>
            </button>
            <div className="text-sm text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>WASD Move</span>
              <span aria-hidden="true">·</span>
              <span>Shift Sprint</span>
              <span aria-hidden="true">·</span>
              <span>Space Jump</span>
              <span aria-hidden="true">·</span>
              <span>Drag Mouse Look</span>
              <span aria-hidden="true">·</span>
              <span>E Interact</span>
            </div>
          </div>
        </motion.div>

        {/* 3 Mission Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {([1, 2, 3] as LevelId[]).map((id) => {
            const lvl = LEVELS[id];
            const Icon = LEVEL_ICONS[id];
            const isSelected = selectedLevel === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectLevel(id)}
                className={`text-left p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-900/95 border-emerald-400 shadow-xl -translate-y-0.5'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-slate-400">
                      Chapter 0{id} · {lvl.subtitle}
                    </span>
                    <Icon
                      className="w-5 h-5 shrink-0"
                      style={{ color: lvl.accentColor }}
                    />
                  </div>
                  <h2 className="font-display text-lg font-bold text-white">
                    {lvl.title.replace(`Chapter ${id}: `, '')}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                    {lvl.storyBrief}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-medium">
                  <span className="text-emerald-400">Real-Time 3D Restoration</span>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-white">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Selected
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between text-xs text-slate-400">
        <span>Explore · Clean · Plant · Restore</span>
        <span>Press E near glowing targets to interact</span>
      </div>
    </div>
  );
}
