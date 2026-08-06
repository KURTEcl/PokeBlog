import { inBounds, tileToIndex } from "./coords.js";

export type Point = { x: number; y: number };

/** A* on a flat collision grid (1 = blocked). Returns path including start and goal. */
export function findPath(
	collisions: number[],
	width: number,
	height: number,
	start: Point,
	goal: Point,
): Point[] | null {
	if (!inBounds(start.x, start.y, width, height) || !inBounds(goal.x, goal.y, width, height)) {
		return null;
	}
	if (collisions[tileToIndex(goal.x, goal.y, width)] === 1) return null;

	const key = (p: Point) => `${p.x},${p.y}`;
	const heuristic = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

	const open: Point[] = [start];
	const cameFrom = new Map<string, Point>();
	const gScore = new Map<string, number>([[key(start), 0]]);
	const fScore = new Map<string, number>([[key(start), heuristic(start, goal)]]);

	while (open.length > 0) {
		open.sort((a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity));
		const current = open.shift()!;
		if (current.x === goal.x && current.y === goal.y) {
			const path = [current];
			let cursor = current;
			while (cameFrom.has(key(cursor))) {
				cursor = cameFrom.get(key(cursor))!;
				path.unshift(cursor);
			}
			return path;
		}

		for (const [dx, dy] of [
			[0, -1],
			[0, 1],
			[-1, 0],
			[1, 0],
		] as const) {
			const next = { x: current.x + dx, y: current.y + dy };
			if (!inBounds(next.x, next.y, width, height)) continue;
			if (collisions[tileToIndex(next.x, next.y, width)] === 1) continue;
			const tentative = (gScore.get(key(current)) ?? Infinity) + 1;
			if (tentative >= (gScore.get(key(next)) ?? Infinity)) continue;
			cameFrom.set(key(next), current);
			gScore.set(key(next), tentative);
			fScore.set(key(next), tentative + heuristic(next, goal));
			if (!open.some((p) => p.x === next.x && p.y === next.y)) open.push(next);
		}
	}
	return null;
}

/** BFS outward from goal to find the closest walkable tile (Manhattan distance). */
export function findNearestWalkable(
	collisions: number[],
	width: number,
	height: number,
	goal: Point,
): Point | null {
	if (!inBounds(goal.x, goal.y, width, height)) return null;
	const key = (p: Point) => `${p.x},${p.y}`;
	if (collisions[tileToIndex(goal.x, goal.y, width)] !== 1) return goal;

	const queue: Point[] = [goal];
	const visited = new Set<string>([key(goal)]);

	while (queue.length > 0) {
		const current = queue.shift()!;
		for (const [dx, dy] of [
			[0, -1],
			[0, 1],
			[-1, 0],
			[1, 0],
		] as const) {
			const next = { x: current.x + dx, y: current.y + dy };
			if (!inBounds(next.x, next.y, width, height)) continue;
			const k = key(next);
			if (visited.has(k)) continue;
			visited.add(k);
			if (collisions[tileToIndex(next.x, next.y, width)] !== 1) return next;
			queue.push(next);
		}
	}
	return null;
}
