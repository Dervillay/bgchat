import { useEffect, RefObject } from "react";

/**
 * Sizes a shell to the visual viewport so in-flow / absolutely-docked children
 * (e.g. the chat input) move with the keyboard when the browser reports
 * intermediate visualViewport frames.
 */
export const useVisualViewportShell = (
	shellRef: RefObject<HTMLElement | null>,
	enabled: boolean
) => {
	useEffect(() => {
		const el = shellRef.current;
		if (!el || !enabled) {
			if (el) {
				el.style.top = "";
				el.style.left = "";
				el.style.width = "";
				el.style.height = "";
			}
			return;
		}

		const visualViewport = window.visualViewport;
		let rafId = 0;

		const sync = () => {
			if (window.scrollY !== 0 || window.scrollX !== 0) {
				window.scrollTo(0, 0);
			}

			if (!visualViewport) {
				el.style.top = "0px";
				el.style.left = "0px";
				el.style.width = "100%";
				el.style.height = "100%";
				return;
			}

			el.style.top = `${visualViewport.offsetTop}px`;
			el.style.left = `${visualViewport.offsetLeft}px`;
			el.style.width = `${visualViewport.width}px`;
			el.style.height = `${visualViewport.height}px`;
		};

		const scheduleSync = () => {
			if (rafId) {
				return;
			}
			rafId = window.requestAnimationFrame(() => {
				rafId = 0;
				sync();
			});
		};

		sync();
		visualViewport?.addEventListener("resize", scheduleSync);
		visualViewport?.addEventListener("scroll", scheduleSync);
		window.addEventListener("resize", scheduleSync);

		return () => {
			if (rafId) {
				window.cancelAnimationFrame(rafId);
			}
			visualViewport?.removeEventListener("resize", scheduleSync);
			visualViewport?.removeEventListener("scroll", scheduleSync);
			window.removeEventListener("resize", scheduleSync);
			el.style.top = "";
			el.style.left = "";
			el.style.width = "";
			el.style.height = "";
		};
	}, [shellRef, enabled]);
};
