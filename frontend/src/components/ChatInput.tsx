import { FC, ChangeEvent, FocusEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Input, IconButton, Spinner, Flex, Container, Text, Box, useBreakpointValue } from "@chakra-ui/react";
import { FaArrowUp, FaMicrophone, FaStop } from "react-icons/fa";
import { BoardGameSelect } from "./BoardGameSelect.tsx";
import { useSpeechToText } from "../hooks/useSpeechToText.ts";
import { theme } from "../theme/index.ts";

const TEXTAREA_HEIGHT_TRANSITION = "height 0.12s ease-out";
/** Closely matches typical mobile OS keyboard open/close timing. */
const KEYBOARD_FOLLOW_MS = 280;
const KEYBOARD_INSET_EPSILON_PX = 1;
/** Treat a single large inset change as a snap that should be eased. */
const KEYBOARD_SNAP_DELTA_PX = 48;
const KEYBOARD_INSET_STORAGE_KEY = "bgchat:last-keyboard-inset";

const readCachedKeyboardInset = (): number => {
	try {
		const raw = sessionStorage.getItem(KEYBOARD_INSET_STORAGE_KEY);
		const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
		if (Number.isFinite(parsed) && parsed > 80 && parsed < 800) {
			return parsed;
		}
	} catch {
		// sessionStorage may be unavailable
	}
	if (typeof window !== "undefined") {
		return Math.round(window.innerHeight * 0.4);
	}
	return 280;
};

const writeCachedKeyboardInset = (inset: number) => {
	if (inset < 80) {
		return;
	}
	try {
		sessionStorage.setItem(KEYBOARD_INSET_STORAGE_KEY, String(Math.round(inset)));
	} catch {
		// sessionStorage may be unavailable
	}
};

const getKeyboardInsetPx = (): number => {
	const visualViewport = window.visualViewport;
	if (!visualViewport) {
		return 0;
	}
	return Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop);
};

interface ChatInputProps {
	inputValue: string;
	isLoading: boolean;
	selectedBoardGame: string;
	setInputValue: (value: string) => void;
	onMessageSend: (message: string) => void;
	knownBoardGames: string[];
	onSelectBoardGame: (selectedBoardGame: string) => void;
	variant?: "default" | "bottomFixed";
}

export const ChatInput: FC<ChatInputProps> = ({
	inputValue,
	isLoading,
	knownBoardGames,
	selectedBoardGame,
	setInputValue,
	onMessageSend,
	onSelectBoardGame,
	variant = "default",
}) => {
	const [isFocused, setIsFocused] = useState(false);
	const [speechError, setSpeechError] = useState<string | null>(null);
	const inputValueRef = useRef(inputValue);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const hasResizedOnceRef = useRef(false);
	const speechPrefixRef = useRef("");
	const syncMobilePositionRef = useRef<((options?: { animate?: boolean; inset?: number }) => void) | null>(null);
	const resizeAnimCleanupRef = useRef<(() => void) | null>(null);
	const lastKeyboardInsetRef = useRef(0);
	const isFocusedRef = useRef(false);
	inputValueRef.current = inputValue;

	// Prefer the real breakpoint once known; default to mobile so keyboard pinning
	// is ready before the first client layout pass.
	const isUsingMobile = useBreakpointValue({ base: true, md: false }) ?? true;
	const pinToBottom = variant === "bottomFixed" || (isUsingMobile && isFocused);

	const resizeTextarea = useCallback((animate: boolean) => {
		const el = textareaRef.current;
		if (!el) {
			return;
		}

		resizeAnimCleanupRef.current?.();
		resizeAnimCleanupRef.current = null;

		const previousHeight = el.offsetHeight;
		el.style.transition = "none";
		el.style.overflowY = "hidden";
		el.style.height = "auto";
		const maxHeight = Number.parseFloat(getComputedStyle(el).maxHeight) || Number.POSITIVE_INFINITY;
		const contentHeight = el.scrollHeight;
		const nextHeight = Math.min(contentHeight, maxHeight);
		const isGrowing = nextHeight > previousHeight + 0.5;
		const heightChanged = Math.abs(previousHeight - nextHeight) >= 1;
		const willOverflow = contentHeight > nextHeight + 1;

		const settle = () => {
			const textOutOfView = el.scrollHeight > el.clientHeight + 1;
			el.style.overflowY = textOutOfView ? "auto" : "hidden";
			el.scrollTop = textOutOfView ? el.scrollHeight : 0;
			syncMobilePositionRef.current?.();
		};

		// Once the scrollbar is needed, snap height and pin to the caret.
		// Animating + per-frame scroll sync fights itself here.
		if (willOverflow || !animate || !heightChanged) {
			el.style.height = `${nextHeight}px`;
			settle();
			return;
		}

		// Animate only while content still fits without scrolling.
		el.style.height = `${previousHeight}px`;
		if (isGrowing) {
			el.scrollTop = 0;
		}
		el.style.transition = TEXTAREA_HEIGHT_TRANSITION;

		let safetyId = 0;
		const finish = () => {
			el.removeEventListener("transitionend", onTransitionEnd);
			window.clearTimeout(safetyId);
			resizeAnimCleanupRef.current = null;
			el.style.transition = "none";
			settle();
		};
		function onTransitionEnd(event: TransitionEvent) {
			if (event.propertyName !== "height") {
				return;
			}
			finish();
		}

		el.addEventListener("transitionend", onTransitionEnd);
		safetyId = window.setTimeout(finish, 200);
		resizeAnimCleanupRef.current = () => {
			el.removeEventListener("transitionend", onTransitionEnd);
			window.clearTimeout(safetyId);
		};

		requestAnimationFrame(() => {
			el.style.height = `${nextHeight}px`;
			if (isGrowing) {
				el.scrollTop = 0;
			}
			// Mobile bottom-anchor is handled by the container ResizeObserver.
		});
	}, []);

	useEffect(() => {
		resizeTextarea(hasResizedOnceRef.current);
		hasResizedOnceRef.current = true;
	}, [inputValue, speechError, resizeTextarea]);

	const handleSpeechTranscript = useCallback(
		(speechText: string) => {
			setSpeechError(null);
			const prefix = speechPrefixRef.current;
			if (!prefix) {
				setInputValue(speechText);
				return;
			}
			setInputValue(speechText ? `${prefix} ${speechText}` : prefix);
		},
		[setInputValue]
	);

	const {
		isSupported: isSpeechSupported,
		toggle: toggleSpeechRecognition,
		isListening,
	} = useSpeechToText({
		onTranscript: handleSpeechTranscript,
		onError: setSpeechError,
		disabled: isLoading,
	});

	const toggleSpeech = () => {
		if (!isListening) {
			// Snapshot text before this session so live updates can replace in place.
			speechPrefixRef.current = inputValueRef.current.replace(/\s+$/, "");
		}
		toggleSpeechRecognition();
	};

	// Lift the fixed input with the keyboard. Layout stays on svh + resizes-visual so the
	// page shell doesn't jump; we translate from visualViewport inset each frame.
	// If the browser only reports the final inset (common), ease large snaps over ~keyboard time.
	useEffect(() => {
		const el = containerRef.current;
		if (!el || !pinToBottom || !isUsingMobile) {
			syncMobilePositionRef.current = null;
			return;
		}

		const clearKeyboardOffset = () => {
			el.style.top = "";
			el.style.bottom = "";
			el.style.transform = "";
			el.style.transition = "";
			el.style.willChange = "";
			lastKeyboardInsetRef.current = 0;
		};

		const visualViewport = window.visualViewport;
		if (!visualViewport) {
			clearKeyboardOffset();
			return;
		}

		let rafId = 0;
		let pendingAnimate = false;
		let pendingInset: number | undefined;

		const applyInset = (inset: number, animate: boolean) => {
			const next = inset < KEYBOARD_INSET_EPSILON_PX ? 0 : inset;
			const prev = lastKeyboardInsetRef.current;
			const delta = Math.abs(next - prev);
			const shouldAnimate = animate || delta >= KEYBOARD_SNAP_DELTA_PX;

			el.style.top = "auto";
			el.style.bottom = "";
			el.style.willChange = "transform";
			el.style.transition = shouldAnimate
				? `transform ${KEYBOARD_FOLLOW_MS}ms ease-out`
				: "none";
			el.style.transform = next > 0 ? `translate3d(0, ${-next}px, 0)` : "";
			lastKeyboardInsetRef.current = next;
			writeCachedKeyboardInset(next);
		};

		const syncToVisualViewport = (options?: { animate?: boolean; inset?: number }) => {
			const explicitInset = options?.inset;
			const measured = explicitInset ?? getKeyboardInsetPx();

			// While focused, ignore partial undershoots (optimistic lift already rose higher).
			// Closing still reaches 0 and is applied below.
			if (
				explicitInset === undefined &&
				isFocusedRef.current &&
				measured > KEYBOARD_INSET_EPSILON_PX &&
				lastKeyboardInsetRef.current > 0 &&
				measured + KEYBOARD_SNAP_DELTA_PX < lastKeyboardInsetRef.current
			) {
				return;
			}

			applyInset(measured, Boolean(options?.animate));
		};

		const scheduleSync = (options?: { animate?: boolean; inset?: number }) => {
			if (options?.animate) {
				pendingAnimate = true;
			}
			if (options?.inset !== undefined) {
				pendingInset = options.inset;
			}
			if (rafId) {
				return;
			}
			rafId = window.requestAnimationFrame(() => {
				rafId = 0;
				const animate = pendingAnimate;
				const inset = pendingInset;
				pendingAnimate = false;
				pendingInset = undefined;
				syncToVisualViewport({ animate, inset });
			});
		};

		const onViewportChange = () => scheduleSync();

		syncMobilePositionRef.current = scheduleSync;
		// If focus beat the effect mount, keep rising with a cached inset until VV catches up.
		const measuredInset = getKeyboardInsetPx();
		if (measuredInset < KEYBOARD_INSET_EPSILON_PX && isFocused) {
			syncToVisualViewport({ animate: true, inset: readCachedKeyboardInset() });
		} else {
			syncToVisualViewport({ animate: measuredInset >= KEYBOARD_SNAP_DELTA_PX });
		}
		const resizeObserver = new ResizeObserver(onViewportChange);
		resizeObserver.observe(el);
		visualViewport.addEventListener("resize", onViewportChange);
		visualViewport.addEventListener("scroll", onViewportChange);
		window.addEventListener("resize", onViewportChange);

		return () => {
			if (syncMobilePositionRef.current === scheduleSync) {
				syncMobilePositionRef.current = null;
			}
			if (rafId) {
				window.cancelAnimationFrame(rafId);
			}
			resizeObserver.disconnect();
			visualViewport.removeEventListener("resize", onViewportChange);
			visualViewport.removeEventListener("scroll", onViewportChange);
			window.removeEventListener("resize", onViewportChange);
			clearKeyboardOffset();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- isFocused only needed when pinToBottom becomes true
	}, [pinToBottom, isUsingMobile]);

	useEffect(() => {
		if (!speechError) {
			return;
		}
		const timeoutId = window.setTimeout(() => setSpeechError(null), 4000);
		return () => window.clearTimeout(timeoutId);
	}, [speechError]);

	const handleSend = async () => {
		const message = inputValue.trim();
		if (!message) return;
		setInputValue("");
		onMessageSend(message);
	};

	const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
	};

	const handleFocus = () => {
		isFocusedRef.current = true;
		setIsFocused(true);
		// Start rising with the keyboard immediately. Many browsers only report the final
		// visualViewport inset after the OS animation, which would otherwise look like a snap.
		const measured = getKeyboardInsetPx();
		const inset = measured > KEYBOARD_INSET_EPSILON_PX ? measured : readCachedKeyboardInset();
		if (syncMobilePositionRef.current) {
			syncMobilePositionRef.current({ animate: true, inset });
			return;
		}
		const el = containerRef.current;
		if (!el || !isUsingMobile) {
			return;
		}
		el.style.willChange = "transform";
		el.style.transition = `transform ${KEYBOARD_FOLLOW_MS}ms ease-out`;
		el.style.transform = `translate3d(0, ${-inset}px, 0)`;
		lastKeyboardInsetRef.current = inset;
	};

	const handleBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
		const nextTarget = e.relatedTarget as Node | null;
		if (nextTarget && containerRef.current?.contains(nextTarget)) {
			return;
		}
		isFocusedRef.current = false;
		setIsFocused(false);
		syncMobilePositionRef.current?.({ animate: true });
	};

	const containerStyle = pinToBottom
		? { ...theme.components.ChatInput.baseStyle.container, ...theme.components.ChatInput.variants.bottomFixed.container }
		: theme.components.ChatInput.baseStyle.container;

	const speechLabel = isListening ? "Stop listening" : "Voice input";

	return (
		<Container ref={containerRef} {...containerStyle}>
			<Input
				as="textarea"
				ref={textareaRef}
				rows={1}
				value={inputValue}
				onChange={handleChange}
				onKeyDown={handleKeyPress}
				onFocus={handleFocus}
				onBlur={handleBlur}
				placeholder={
					isListening
						? "Listening…"
						: `Ask about the rules${selectedBoardGame ? "…" : " for any board game"}`
				}
				disabled={isLoading}
				{...theme.components.ChatInput.baseStyle.input}
			/>
			{speechError && (
				<Text fontSize="xs" color="red.400" px={1}>
					{speechError}
				</Text>
			)}
			<Flex {...theme.components.ChatInput.baseStyle.controls}>
				<BoardGameSelect
					selectedBoardGame={selectedBoardGame}
					knownBoardGames={knownBoardGames}
					onSelectBoardGame={onSelectBoardGame}
					isDisabled={isLoading}
				/>
				<Flex align="center" gap={{ base: 1, md: 2 }} flexShrink={0}>
					{isSpeechSupported && (
						<Box position="relative" display="inline-flex">
							<IconButton
								icon={
									isListening ? (
										<Box as={FaStop} boxSize="0.55rem" />
									) : (
										<FaMicrophone />
									)
								}
								onClick={toggleSpeech}
								disabled={isLoading}
								aria-label={speechLabel}
								aria-pressed={isListening}
								variant="ghost"
								border="none"
								borderRadius="1.5rem"
								bg="gray.200"
								color="chakra-body-text"
								_dark={{ bg: "#3a3a3a" }}
								_hover={{ filter: "brightness(0.97)" }}
								_active={{ filter: "brightness(0.95)" }}
							/>
							{isListening && (
								<Box
									position="absolute"
									inset="1.5px"
									pointerEvents="none"
									display="flex"
									alignItems="center"
									justifyContent="center"
								>
									<Spinner
										w="100%"
										h="100%"
										thickness="2px"
										speed="0.7s"
										color="chakra-body-text"
									/>
								</Box>
							)}
						</Box>
					)}
					<IconButton
						icon={isLoading ? <Spinner /> : <FaArrowUp />}
						onClick={handleSend}
						disabled={!inputValue.trim() || isLoading || isListening}
						aria-label="Send message"
					/>
				</Flex>
			</Flex>
		</Container>
	);
};
