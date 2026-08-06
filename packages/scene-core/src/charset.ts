/** RPG Maker / Essentials charset layout: 4 directions × 4 walk frames per row. */
export type Facing = "down" | "left" | "right" | "up";

const DIRECTION_ROW: Record<Facing, number> = {
	down: 0,
	left: 1,
	right: 2,
	up: 3,
};

export type CharsetLayout = {
	frameWidth: number;
	frameHeight: number;
	columns: number;
	rows: number;
};

export const DEFAULT_CHARSET: CharsetLayout = {
	frameWidth: 32,
	frameHeight: 48,
	columns: 4,
	rows: 4,
};

/** Crop rect for a charset frame (idle = frame 0). */
export function charsetFrame(
	facing: Facing,
	walkFrame: number,
	layout: CharsetLayout = DEFAULT_CHARSET,
): { x: number; y: number; width: number; height: number } {
	const row = DIRECTION_ROW[facing];
	const col = Math.max(0, Math.min(layout.columns - 1, walkFrame));
	return {
		x: col * layout.frameWidth,
		y: row * layout.frameHeight,
		width: layout.frameWidth,
		height: layout.frameHeight,
	};
}

/** Direction from tile delta (dx, dy). */
export function facingFromDelta(dx: number, dy: number): Facing | null {
	if (dx === 0 && dy === 0) return null;
	if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
	return dy > 0 ? "down" : "up";
}
