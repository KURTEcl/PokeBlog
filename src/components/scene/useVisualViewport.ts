import { useEffect, useState } from "react";

type VisualViewportState = {
	height: number;
	offsetTop: number;
};

export function useVisualViewport(): VisualViewportState {
	const [state, setState] = useState<VisualViewportState>(() => ({
		height: typeof window !== "undefined" ? window.innerHeight : 0,
		offsetTop: 0,
	}));

	useEffect(() => {
		const update = () => {
			const vv = window.visualViewport;
			if (!vv) {
				setState({ height: window.innerHeight, offsetTop: 0 });
				return;
			}
			setState({ height: vv.height, offsetTop: vv.offsetTop });
		};

		update();
		const vv = window.visualViewport;
		vv?.addEventListener("resize", update);
		vv?.addEventListener("scroll", update);
		window.addEventListener("resize", update);
		window.addEventListener("orientationchange", update);

		return () => {
			vv?.removeEventListener("resize", update);
			vv?.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
			window.removeEventListener("orientationchange", update);
		};
	}, []);

	return state;
}
