import { useEffect, useState } from "react";

export function useMobileEditor(): boolean {
	const [mobile, setMobile] = useState(() => {
		if (typeof window === "undefined") return false;
		return (
			window.matchMedia("(pointer: coarse)").matches ||
			window.matchMedia("(max-width: 900px)").matches
		);
	});

	useEffect(() => {
		const mqCoarse = window.matchMedia("(pointer: coarse)");
		const mqNarrow = window.matchMedia("(max-width: 900px)");
		const update = () => setMobile(mqCoarse.matches || mqNarrow.matches);
		update();
		mqCoarse.addEventListener("change", update);
		mqNarrow.addEventListener("change", update);
		return () => {
			mqCoarse.removeEventListener("change", update);
			mqNarrow.removeEventListener("change", update);
		};
	}, []);

	return mobile;
}
