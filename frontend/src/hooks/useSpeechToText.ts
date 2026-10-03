import { useCallback, useEffect, useRef, useState } from "react";
import {
	getSpeechRecognitionConstructor,
	isSpeechInputSupported,
	SpeechRecognitionLike,
} from "../utils/speechRecognition.ts";

export type SpeechToTextStatus = "idle" | "listening";

const MAX_LISTENING_MS = 60_000;

type UseSpeechToTextOptions = {
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
	const finalTranscriptRef = useRef("");

	const clearStopTimeout = () => {
		if (stopTimeoutRef.current !== null) {
			window.clearTimeout(stopTimeoutRef.current);
			stopTimeoutRef.current = null;
		}
	};

	const reportError = useCallback(
		(message: string) => {
			onError?.(message);
			setStatus("idle");
		},
		[onError]
	);

	const appendTranscript = useCallback(
		(text: string) => {
			const cleaned = text.trim();
			if (!cleaned) {
				return;
			}
			onTranscript(cleaned);
		},
		[onTranscript]
	);

	const stop = useCallback(() => {
		clearStopTimeout();
		const recognition = recognitionRef.current;
		if (!recognition) {
			return;
		}
		try {
			recognition.stop();
		} catch {
			// Already stopped
		}
	}, []);

	const start = useCallback(() => {
		if (disabled || status !== "idle") {
			return;
		}

		const Recognition = getSpeechRecognitionConstructor();
		if (!Recognition) {
			reportError("Voice input is not supported in this browser");
			return;
		}

		const recognition = new Recognition();
		recognition.lang = navigator.language || "en-US";
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.maxAlternatives = 1;
		finalTranscriptRef.current = "";

		recognition.onstart = () => {
			setStatus("listening");
		};

		recognition.onresult = (event) => {
			let finalChunk = "";
			for (let i = event.resultIndex; i < event.results.length; i += 1) {
				const result = event.results[i];
				if (result.isFinal) {
					finalChunk += result[0].transcript;
				}
			}
			if (finalChunk) {
				finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalChunk}`.trim();
			}
		};

		recognition.onerror = (event) => {
			if (event.error === "aborted" || event.error === "no-speech") {
				setStatus("idle");
				return;
			}
			reportError(
				event.error === "not-allowed"
					? "Microphone permission denied"
					: `Voice input failed (${event.error})`
			);
		};

		recognition.onend = () => {
			clearStopTimeout();
			recognitionRef.current = null;
			if (finalTranscriptRef.current) {
				appendTranscript(finalTranscriptRef.current);
				finalTranscriptRef.current = "";
			}
			setStatus("idle");
		};

		recognitionRef.current = recognition;
		try {
			recognition.start();
		} catch {
			recognitionRef.current = null;
			reportError("Could not start voice input");
			return;
		}

		stopTimeoutRef.current = window.setTimeout(() => {
			stop();
		}, MAX_LISTENING_MS);
	}, [appendTranscript, disabled, reportError, status, stop]);

	const toggle = useCallback(() => {
		if (disabled) {
			return;
		}
		if (status === "listening") {
			stop();
			return;
		}
		if (status === "idle") {
			start();
		}
	}, [disabled, start, status, stop]);

	useEffect(() => {
		return () => {
			clearStopTimeout();
			try {
				recognitionRef.current?.abort();
			} catch {
				// ignore
			}
		};
	}, []);

	return {
		isSupported,
		status,
		toggle,
		stop,
		isListening: status === "listening",
	};
}
