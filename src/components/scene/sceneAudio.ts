/** Essentials SFX copied by `pnpm import:essentials` → public/scene-assets/essentials/audio/ */
export const SCENE_AUDIO_BASE = "/scene-assets/essentials/audio";

export const SCENE_SFX = {
	bump: "player-bump",
	menuOpen: "gui-menu-open",
	doorEnter: "door-enter",
} as const;

export type SceneSfxId = (typeof SCENE_SFX)[keyof typeof SCENE_SFX];

/** In-game SFX loaded by Phaser (not panel UI). */
export const SCENE_GAME_SFX = {
	bump: SCENE_SFX.bump,
	doorEnter: SCENE_SFX.doorEnter,
} as const;

export type SceneGameSfxId = (typeof SCENE_GAME_SFX)[keyof typeof SCENE_GAME_SFX];

export function sceneSfxUrl(id: SceneSfxId): string {
	return `${SCENE_AUDIO_BASE}/${id}.ogg`;
}

const UI_VOLUME = 0.55;
const uiAudio = new Map<SceneSfxId, HTMLAudioElement>();

/** Panel open — HTML Audio so it works from React UI handlers. */
export function playSceneSfx(id: SceneSfxId): void {
	let audio = uiAudio.get(id);
	if (!audio) {
		audio = new Audio(sceneSfxUrl(id));
		audio.volume = UI_VOLUME;
		uiAudio.set(id, audio);
	}
	audio.currentTime = 0;
	void audio.play().catch(() => {
		// Browser may block until a user gesture; safe to ignore.
	});
}
