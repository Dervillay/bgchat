import { FC, ChangeEvent, FocusEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { Input, IconButton, Spinner, Flex, Container, Tooltip, Text, useBreakpointValue } from "@chakra-ui/react";
import { FaArrowUp, FaMicrophone, FaStop } from "react-icons/fa";
import { BoardGameSelect } from "./BoardGameSelect.tsx";
import { useSpeechToText } from "../hooks/useSpeechToText.ts";
import { theme } from "../theme/index.ts";

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
	const [keyboardOffset, setKeyboardOffset] = useState(0);
	const [isFocused, setIsFocused] = useState(false);
	const [speechError, setSpeechError] = useState<string | null>(null);
	const inputValueRef = useRef(inputValue);
	const containerRef = useRef<HTMLDivElement | null>(null);
	inputValueRef.current = inputValue;

	const isUsingMobile = useBreakpointValue({ base: true, md: false });
	const pinToBottom = variant === "bottomFixed" || (Boolean(isUsingMobile) && isFocused);

	const handleSpeechTranscript = useCallback(
		(transcript: string) => {
			setSpeechError(null);
			const current = inputValueRef.current.trim();
			setInputValue(current ? `${current} ${transcript}` : transcript);
		},
		[setInputValue]
	);

	const {
		isSupported: isSpeechSupported,
		toggle: toggleSpeech,
		isListening,
	} = useSpeechToText({
		onTranscript: handleSpeechTranscript,
		onError: setSpeechError,
		disabled: isLoading,
	});

	useEffect(() => {
		if (!pinToBottom) {
			setKeyboardOffset(0);
			return;
		}

		const visualViewport = window.visualViewport;
		if (!visualViewport) {
			return;
		}

		const updateKeyboardOffset = () => {
			const offset = Math.max(
				0,
				window.innerHeight - visualViewport.height - visualViewport.offsetTop
			);
			setKeyboardOffset(offset);
		};

		updateKeyboardOffset();
		visualViewport.addEventListener("resize", updateKeyboardOffset);
		visualViewport.addEventListener("scroll", updateKeyboardOffset);
		window.addEventListener("resize", updateKeyboardOffset);

		return () => {
			visualViewport.removeEventListener("resize", updateKeyboardOffset);
			visualViewport.removeEventListener("scroll", updateKeyboardOffset);
			window.removeEventListener("resize", updateKeyboardOffset);
		};
	}, [pinToBottom]);

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
		e.target.style.height = "auto";
		e.target.style.height = `${e.target.scrollHeight}px`;
		setInputValue(e.target.value);
	};

	const handleFocus = () => {
		setIsFocused(true);
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

	const keyboardAwareStyle =
		pinToBottom && keyboardOffset > 0
			? {
				bottom: `calc(${keyboardOffset}px + 0.75rem)`,
			}
			: undefined;

	const speechLabel = isListening ? "Stop listening" : "Voice input";

	return (
		<Container ref={containerRef} {...containerStyle} style={keyboardAwareStyle}>
			<Input
				as="textarea"
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
				/>
				{isSpeechSupported && (
					<Tooltip label={speechLabel} placement="top" hasArrow>
						<IconButton
							icon={isListening ? <FaStop /> : <FaMicrophone />}
							onClick={toggleSpeech}
							disabled={isLoading}
							aria-label={speechLabel}
							aria-pressed={isListening}
							colorScheme={isListening ? "red" : undefined}
							variant={isListening ? "solid" : "ghost"}
						/>
					</Tooltip>
				)}
				<IconButton
					icon={isLoading ? <Spinner /> : <FaArrowUp />}
					onClick={handleSend}
					disabled={!inputValue.trim() || isLoading || isListening}
					aria-label="Send message"
				/>
			</Flex>
		</Container>
	);
};
