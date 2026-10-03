import { FC, ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Input, IconButton, Spinner, Flex, Container, Text, Box } from "@chakra-ui/react";
import { FaArrowUp, FaMicrophone, FaStop } from "react-icons/fa";
import { BoardGameSelect } from "./BoardGameSelect.tsx";
import { useSpeechToText } from "../hooks/useSpeechToText.ts";
import { theme } from "../theme/index.ts";

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
	const [speechError, setSpeechError] = useState<string | null>(null);
	const inputValueRef = useRef(inputValue);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const hasResizedOnceRef = useRef(false);
	const speechPrefixRef = useRef("");
	const resizeAnimCleanupRef = useRef<(() => void) | null>(null);
	inputValueRef.current = inputValue;

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
		// Stop the browser scrolling the page to the focused field (causes dock jitter).
		window.scrollTo(0, 0);
		document.documentElement.scrollTop = 0;
		document.body.scrollTop = 0;
	};

	const containerStyle = variant === "bottomFixed"
		? { ...theme.components.ChatInput.baseStyle.container, ...theme.components.ChatInput.variants.bottomFixed.container }
		: theme.components.ChatInput.baseStyle.container;

	const speechLabel = isListening ? "Stop listening" : "Voice input";

	return (
		<Container {...containerStyle}>
			<Input
				as="textarea"
				ref={textareaRef}
				rows={1}
				value={inputValue}
				onChange={handleChange}
				onKeyDown={handleKeyPress}
				onFocus={handleFocus}
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
