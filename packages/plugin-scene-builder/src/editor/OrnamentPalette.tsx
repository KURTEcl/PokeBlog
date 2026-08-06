import { CATALOG_PROPS, propsForTileset, type CatalogProp } from "@poke-emdash/scene-core";

type Props = {
	tilesetFilter: string | "all";
	selectedPropId: string | null;
	onSelect: (propId: string | null) => void;
};

export function OrnamentPalette({ tilesetFilter, selectedPropId, onSelect }: Props) {
	const props: CatalogProp[] = propsForTileset(tilesetFilter);

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">Biblioteca de adornos</h3>
				<span className="text-[10px] text-kumo-subtle">{props.length} items</span>
			</div>
			<div className="grid max-h-56 grid-cols-3 gap-2 overflow-auto pr-1">
				{props.map((prop) => (
					<button
						key={prop.id}
						type="button"
						title={`${prop.name} (${prop.sourceTileset})`}
						className={`rounded-lg border p-1.5 text-left transition ${
							selectedPropId === prop.id
								? "border-kumo-brand bg-kumo-brand/10"
								: "border-kumo-line hover:bg-kumo-elevated"
						}`}
						onClick={() => onSelect(selectedPropId === prop.id ? null : prop.id)}
					>
						<div className="flex h-12 items-end justify-center bg-black/30">
							<img
								src={prop.imageUrl}
								alt={prop.name}
								style={{
									imageRendering: "pixelated",
									maxHeight: 48,
									maxWidth: "100%",
								}}
							/>
						</div>
						<span className="mt-1 block truncate text-center text-[10px] font-medium">
							{prop.name}
						</span>
						<span className="block truncate text-center text-[9px] text-kumo-subtle">
							{prop.sourceTileset.replace("-interior", "").replace("poke-center", "center")}
						</span>
					</button>
				))}
			</div>
			{props.length === 0 && (
				<p className="text-xs text-kumo-subtle">No hay adornos nombrados en este tileset.</p>
			)}
			{tilesetFilter === "all" && CATALOG_PROPS.length > 0 ? null : null}
		</div>
	);
}
