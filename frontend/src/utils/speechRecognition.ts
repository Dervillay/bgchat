export type SpeechRecognitionLike = {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	maxAlternatives: number;
	onstart: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
	onresult: ((this: SpeechRecognitionLike, ev: SpeechRecognitionEventLike) => void) | null;
	onerror: ((this: SpeechRecognitionLike, ev: SpeechRecognitionErrorEventLike) => void) | null;
	onend: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
	start: () => void;
	stop: () => void;
	abort: () => void;
};

export type SpeechRecognitionEventLike = {
	resultIndex: number;
	results: ArrayLike<{
		isFinal: boolean;
		0: { transcript: string };
	}>;
};

export type SpeechRecognitionErrorEventLike = {
	error: string;
	message?: string;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
	const speechWindow = window as Window & {
		SpeechRecognition?: SpeechRecognitionConstructor;
		webkitSpeechRecognition?: SpeechRecognitionConstructor;
	};

	return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

export function isSpeechInputSupported(): boolean {
	return getSpeechRecognitionConstructor() !== null;
}
