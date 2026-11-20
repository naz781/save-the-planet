/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { MainMenu } from './components/MainMenu';
import { ModalScreens } from './components/ModalScreens';
import { OptionsModal } from './components/OptionsModal';
import { EcoGameEngine } from './game/GameEngine';
import {
  GameOptions,
  HudSnapshot,
  LEVELS,
  LevelId,
  loadSavedOptions,
  saveOptions,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'menu',
  levelId: 1,
  levelTitle: LEVELS[1].title,
  levelSubtitle: LEVELS[1].subtitle,
  ecoPoints: 0,
  levelEcoPoints: 0,
  planetEnergy: 100,
  elapsedSeconds: 0,
  restorationPercent: 0,
  treesPlanted: 0,
  rubbishCollected: 0,
  seedsCollected: 0,
  objectives: [],
  missionHint: '',
  nearbyInteraction: null,
  carriedWaste: 0,
  audioMuted: false,
  toastMessage: null,
  introCaption: LEVELS[1].introCaption,
  finalCoreReady: false,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<EcoGameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [selectedLevel, setSelectedLevel] = useState<LevelId>(1);
  const [contextLost, setContextLost] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [options, setOptions] = useState<GameOptions>(() => loadSavedOptions());

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new EcoGameEngine(
      mount,
      (snapshot) => setHud(snapshot),
      (lost) => setContextLost(lost),
    );
    engineRef.current = engine;
    engine.applyOptions(loadSavedOptions());

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleOptionsChange = (next: GameOptions) => {
    setOptions(next);
    saveOptions(next);
    engineRef.current?.applyOptions(next);
  };

  const handleOpenOptionsInGame = () => {
    if (hud.phase === 'playing') {
      engineRef.current?.setPaused(true);
    }
    setOptionsOpen(true);
  };

  const showHud =
    hud.phase === 'playing' || hud.phase === 'intro' || hud.phase === 'restoring';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {contextLost && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 text-white p-6 text-center">
          <div className="max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <h2 className="font-display text-xl font-bold">Graphics Context Paused</h2>
            <p className="mt-2 text-sm text-slate-300">
              Your browser temporarily suspended WebGL rendering. Reload the page to restore the 3D world.
            </p>
          </div>
        </div>
      )}

      {hud.phase === 'menu' && (
        <MainMenu
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          onStartGame={(id) => engineRef.current?.startNewGame(id)}
          onOpenOptions={() => setOptionsOpen(true)}
          audioMuted={hud.audioMuted}
          onToggleMute={() => engineRef.current?.toggleMute()}
        />
      )}

      {showHud && (
        <GameHUD
          hud={hud}
          onInteract={() => engineRef.current?.triggerInteract()}
          onJump={() => engineRef.current?.jump()}
          onSkipIntro={() => engineRef.current?.skipIntro()}
          onPause={() => engineRef.current?.setPaused(true)}
          onOpenOptions={handleOpenOptionsInGame}
          onRestart={() => engineRef.current?.restartCurrentLevel()}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onVirtualMove={(x, y) => engineRef.current?.setVirtualMove(x, y)}
        />
      )}

      <ModalScreens
        hud={hud}
        onResume={() => engineRef.current?.setPaused(false)}
        onOpenOptions={() => setOptionsOpen(true)}
        onRestartLevel={() => engineRef.current?.restartCurrentLevel()}
        onNextLevel={() => engineRef.current?.startNextLevel()}
        onMainMenu={() => engineRef.current?.returnToMenu()}
        onPlayAgain={() => engineRef.current?.startNewGame(1)}
      />

      <OptionsModal
        open={optionsOpen}
        options={options}
        currentLevel={hud.levelId}
        showChapterJump={hud.phase !== 'menu'}
        onChange={handleOptionsChange}
        onJumpToLevel={(id) => engineRef.current?.jumpToLevel(id)}
        onClose={() => setOptionsOpen(false)}
      />
    </div>
  );
}
