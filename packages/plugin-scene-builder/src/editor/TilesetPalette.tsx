import type { CatalogTileset } from "@poke-emdash/scene-core";
import { tileCropRect } from "@poke-emdash/scene-core";

type Props = {
	tileset: CatalogTileset;
	selectedIndex: number | null;
	onSelect: (index: number) => void;
	/** Limit visible rows for performance (default: all). */
	maxRows?: number;
};

/**
 * Full tileset grid — every 32×32 cell is selectable as floor/wall/ornament.
 * RPG Maker / Essentials layout: 8 columns.
 */
export function TilesetPalette({ tileset, selectedIndex, onSelect, maxRows }: Props) {
	const rows = Math.ceil(tileset.tileCount / tileset.columns);
	const visibleRows = maxRows ? Math.min(rows, maxRows) : rows;
	const cell = 24;

	return (
		<div className="space-y-1">
			<div className="text-xs text-kumo-subtle">
				{tileset.name} · click a tile ({tileset.columns}×{visibleRows}
				{maxRows && rows > maxRows ? ` of ${rows}` : ""})
			</div>
			<div
				className="max-h-64 overflow-auto rounded border border-kumo-line bg-black/40"
				style={{ imageRendering: "pixelated" }}
			>
				<div
					className="relative"
					style={{
						width: tileset.columns * cell,
						height: visibleRows * cell,
					}}
				>
					{Array.from({ length: tileset.columns * visibleRows }, (_, index) => {
						const crop = tileCropRect(index, tileset.columns, tileset.tileSize);
						const selected = selectedIndex === index;
						const scale = cell / tileset.tileSize;
						return (
							<button
								key={index}
								type="button"
								title={`Tile ${index} (r${Math.floor(index / tileset.columns)} c${index % tileset.columns})`}
								className="absolute border border-transparent hover:border-yellow-300"
								style={{
									left: (index % tileset.columns) * cell,
									top: Math.floor(index / tileset.columns) * cell,
									width: cell,
									height: cell,
									backgroundImage: `url(${tileset.imageUrl})`,
									backgroundPosition: `-${crop.x * scale}px -${crop.y * scale}px`,
									backgroundSize: `${tileset.columns * tileset.tileSize * scale}px auto`,
									imageRendering: "pixelated",
									outline: selected ? "2px solid #ffe066" : undefined,
									zIndex: selected ? 2 : 1,
								}}
								onClick={() => onSelect(index)}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}
