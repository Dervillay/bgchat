import { FC, ChangeEvent, CSSProperties, FocusEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Input, IconButton, Spinner, Flex, Container, Text, Box, useBreakpointValue } from "@chakra-ui/react";
import { FaArrowUp, FaMicrophone, FaStop } from "react-icons/fa";
import { BoardGameSelect } from "./BoardGameSelect.tsx";
import { useSpeechToText } from "../hooks/useSpeechToText.ts";
import { theme } from "../theme/index.ts";

const MOBILE_KEYBOARD_GAP_PX = 12;
const TEXTAREA_HEIGHT_TRANSITION = "height 0.12s ease-out";

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
	const [mobilePinStyle, setMobilePinStyle] = useState<CSSProperties>({});
	const inputValueRef = useRef(inputValue);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const hasResizedOnceRef = useRef(false);
	const speechPrefixRef = useRef("");
	const syncMobilePositionRef = useRef<(() => void) | null>(null);
	const resizeAnimCleanupRef = useRef<(() => void) | null>(null);
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

	// Keep the pinned input's bottom edge glued above the mobile keyboard.
	// Uses visualViewport + React styles so Chakra's `bottom` prop can't fight us.
	useEffect(() => {
		const el = containerRef.current;
		if (!el || !pinToBottom || !isUsingMobile) {
			setMobilePinStyle({});
			syncMobilePositionRef.current = null;
			return;
		}

		const visualViewport = window.visualViewport;
		if (!visualViewport) {
			setMobilePinStyle({ top: "auto", bottom: `${MOBILE_KEYBOARD_GAP_PX}px` });
			return;
		}

		const syncToVisualViewport = () => {
			const height = el.offsetHeight;
			const bottomEdge =
				visualViewport.offsetTop + visualViewport.height - MOBILE_KEYBOARD_GAP_PX;
			const top = bottomEdge - height;
			setMobilePinStyle({
				top: `${Math.max(visualViewport.offsetTop + MOBILE_KEYBOARD_GAP_PX, top)}px`,
				bottom: "auto",
			});
		};

		syncMobilePositionRef.current = syncToVisualViewport;
		syncToVisualViewport();
		const resizeObserver = new ResizeObserver(() => {
			syncToVisualViewport();
		});
		resizeObserver.observe(el);
		visualViewport.addEventListener("resize", syncToVisualViewport);
		visualViewport.addEventListener("scroll", syncToVisualViewport);
		window.addEventListener("resize", syncToVisualViewport);

		return () => {
			if (syncMobilePositionRef.current === syncToVisualViewport) {
				syncMobilePositionRef.current = null;
			}
			resizeObserver.disconnect();
			visualViewport.removeEventListener("resize", syncToVisualViewport);
			visualViewport.removeEventListener("scroll", syncToVisualViewport);
			window.removeEventListener("resize", syncToVisualViewport);
			setMobilePinStyle({});
		};
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
		setIsFocused(true);
		// iOS fires visualViewport resize during the keyboard animation; resync a few times.
		window.requestAnimationFrame(() => syncMobilePositionRef.current?.());
		window.setTimeout(() => syncMobilePositionRef.current?.(), 150);
		window.setTimeout(() => syncMobilePositionRef.current?.(), 350);
	};

	const handleBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
		const nextTarget = e.relatedTarget as Node | null;
		if (nextTarget && containerRef.current?.contains(nextTarget)) {
			return;
		}
		setIsFocused(false);
	};

	const containerStyle = pinToBottom
		? { ...theme.components.ChatInput.baseStyle.container, ...theme.components.ChatInput.variants.bottomFixed.container }
		: theme.components.ChatInput.baseStyle.container;

	const speechLabel = isListening ? "Stop listening" : "Voice input";

	return (
		<Container ref={containerRef} {...containerStyle} style={mobilePinStyle}>
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
								bg="gray.100"
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
