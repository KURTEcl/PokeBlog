import { useEffect, useState } from "react";
import { DEFAULT_SCENE_LOADING, type SceneLoadingConfig } from "./sceneLoading";

type Props = {
	config?: SceneLoadingConfig;
};

export default function SceneLoader({ config = DEFAULT_SCENE_LOADING }: Props) {
	const [messageIndex, setMessageIndex] = useState(0);
	const messages = config.messages.length > 0 ? config.messages : DEFAULT_SCENE_LOADING.messages;
	const intervalMs = config.messageIntervalMs ?? DEFAULT_SCENE_LOADING.messageIntervalMs ?? 900;

	useEffect(() => {
		if (messages.length <= 1) return;
		const timer = window.setInterval(() => {
			setMessageIndex((current) => (current + 1) % messages.length);
		}, intervalMs);
		return () => window.clearInterval(timer);
	}, [messages.length, intervalMs]);

	return (
		<div className="scene-loader" role="status" aria-live="polite" aria-busy="true">
			<div className="scene-loader-card">
				{config.logoUrl ? (
					<img
						className="scene-loader-logo"
						src={config.logoUrl}
						alt={config.logoAlt ?? ""}
						draggable={false}
					/>
				) : (
					<div className="scene-loader-logo scene-loader-logo--placeholder" aria-hidden="true">
						◓
					</div>
				)}
				<p className="scene-loader-message">{messages[messageIndex]}</p>
				<div className="scene-loader-dots" aria-hidden="true">
					<span />
					<span />
					<span />
				</div>
			</div>
		</div>
	);
}
