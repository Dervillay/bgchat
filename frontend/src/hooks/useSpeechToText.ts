import { useCallback, useEffect, useRef, useState } from "react";
import {
	getSpeechRecognitionConstructor,
	isSpeechInputSupported,
	SpeechRecognitionLike,
} from "../utils/speechRecognition.ts";

export type SpeechToTextStatus = "idle" | "listening";

const MAX_LISTENING_MS = 60_000;
/** Stop after this much silence once the user has started speaking. */
const PAUSE_STOP_MS = 2_000;
/** Stop if nothing is heard within this window after pressing record. */
const INITIAL_SILENCE_MS = 6_000;

type UseSpeechToTextOptions = {
	/** Called on every recognition update with committed + interim text for this session. */
	onTranscript: (text: string) => void;
	onError?: (message: string) => void;
	disabled?: boolean;
};

export function useSpeechToText({
	onTranscript,
	onError,
	disabled = false,
}: UseSpeechToTextOptions) {
	const [status, setStatus] = useState<SpeechToTextStatus>("idle");
	const [isSupported] = useState(() => isSpeechInputSupported());

	const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
	const stopTimeoutRef = useRef<number | null>(null);
	const pauseTimeoutRef = useRef<number | null>(null);
	const committedRef = useRef("");
	const hasSpeechRef = useRef(false);
	const shouldListenRef = useRef(false);
	const onTranscriptRef = useRef(onTranscript);
	const onErrorRef = useRef(onError);
	onTranscriptRef.current = onTranscript;
	onErrorRef.current = onError;

	const clearStopTimeout = () => {
		if (stopTimeoutRef.current !== null) {
			window.clearTimeout(stopTimeoutRef.current);
			stopTimeoutRef.current = null;
		}
	};

	const clearPauseTimeout = () => {
		if (pauseTimeoutRef.current !== null) {
			window.clearTimeout(pauseTimeoutRef.current);
			pauseTimeoutRef.current = null;
		}
	};

	const publishTranscript = useCallback((committed: string, interim = "") => {
		const text = `${committed} ${interim}`.replace(/\s+/g, " ").trim();
		onTranscriptRef.current(text);
	}, []);

	const stop = useCallback(() => {
		shouldListenRef.current = false;
		clearStopTimeout();
		clearPauseTimeout();
		const recognition = recognitionRef.current;
		if (!recognition) {
			publishTranscript(committedRef.current);
			committedRef.current = "";
			hasSpeechRef.current = false;
			setStatus("idle");
			return;
		}
		try {
			recognition.stop();
		} catch {
			// Already stopped
		}
	}, [publishTranscript]);

	const armPauseTimeout = useCallback(
		(delayMs: number) => {
			clearPauseTimeout();
			pauseTimeoutRef.current = window.setTimeout(() => {
				stop();
			}, delayMs);
		},
		[stop]
	);

	const startRecognition = useCallback(() => {
		const Recognition = getSpeechRecognitionConstructor();
		if (!Recognition) {
			shouldListenRef.current = false;
			onErrorRef.current?.("Voice input is not supported in this browser");
			setStatus("idle");
			return;
		}

		const recognition = new Recognition();
		recognition.lang = navigator.language || "en-US";
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.maxAlternatives = 1;

		recognition.onstart = () => {
			setStatus("listening");
		};

		recognition.onresult = (event) => {
			let interim = "";
			let newlyFinal = "";

			for (let i = event.resultIndex; i < event.results.length; i += 1) {
				const result = event.results[i];
				const piece = result[0]?.transcript ?? "";
				if (result.isFinal) {
					newlyFinal += piece;
				} else {
					interim += piece;
				}
			}

			if (newlyFinal || interim) {
				hasSpeechRef.current = true;
				armPauseTimeout(PAUSE_STOP_MS);
			}

			if (newlyFinal) {
				committedRef.current = `${committedRef.current} ${newlyFinal}`
					.replace(/\s+/g, " ")
					.trim();
			}

			publishTranscript(committedRef.current, interim);
		};

		recognition.onerror = (event) => {
			if (event.error === "aborted") {
				return;
			}
			if (event.error === "no-speech") {
				// Treat prolonged silence as end-of-utterance.
				if (!hasSpeechRef.current) {
					shouldListenRef.current = false;
				}
				return;
			}
			shouldListenRef.current = false;
			clearStopTimeout();
			clearPauseTimeout();
			onErrorRef.current?.(
				event.error === "not-allowed"
					? "Microphone permission denied"
					: `Voice input failed (${event.error})`
			);
			setStatus("idle");
		};

		recognition.onend = () => {
			recognitionRef.current = null;

			// Chrome often ends after a short pause even with continuous=true — resume
			// only while we're still in an active utterance window.
			if (shouldListenRef.current) {
				window.setTimeout(() => {
					if (!shouldListenRef.current) {
						return;
					}
					try {
						startRecognition();
					} catch {
						shouldListenRef.current = false;
						clearStopTimeout();
						clearPauseTimeout();
						setStatus("idle");
					}
				}, 80);
				return;
			}

			clearStopTimeout();
			clearPauseTimeout();
			publishTranscript(committedRef.current);
			committedRef.current = "";
			hasSpeechRef.current = false;
			setStatus("idle");
		};

		recognitionRef.current = recognition;
		recognition.start();
	}, [armPauseTimeout, publishTranscript]);

	const start = useCallback(() => {
		if (disabled || shouldListenRef.current) {
			return;
		}

		if (!getSpeechRecognitionConstructor()) {
			onErrorRef.current?.("Voice input is not supported in this browser");
			return;
		}

		shouldListenRef.current = true;
		committedRef.current = "";
		hasSpeechRef.current = false;

		try {
			startRecognition();
		} catch {
			shouldListenRef.current = false;
			recognitionRef.current = null;
			onErrorRef.current?.("Could not start voice input");
			setStatus("idle");
			return;
		}

		clearStopTimeout();
		armPauseTimeout(INITIAL_SILENCE_MS);
		stopTimeoutRef.current = window.setTimeout(() => {
			stop();
		}, MAX_LISTENING_MS);
	}, [armPauseTimeout, disabled, startRecognition, stop]);

	const toggle = useCallback(() => {
		if (disabled) {
			return;
		}
		if (shouldListenRef.current || status === "listening") {
			stop();
			return;
		}
		start();
	}, [disabled, start, status, stop]);

	useEffect(() => {
		return () => {
			shouldListenRef.current = false;
			clearStopTimeout();
			clearPauseTimeout();
			try {
				recognitionRef.current?.abort();
			} catch {
				// ignore
			}
		};
	}, []);

	useEffect(() => {
		if (disabled && shouldListenRef.current) {
			stop();
		}
	}, [disabled, stop]);

	return {
		isSupported,
		status,
		toggle,
		stop,
		isListening: status === "listening",
	};
}
