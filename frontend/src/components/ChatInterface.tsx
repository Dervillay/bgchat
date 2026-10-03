import { useState, useEffect, useRef } from "react";
import { Box, Text, Flex, useBreakpointValue } from "@chakra-ui/react";
import { ChatInput } from "./ChatInput.tsx";
import { useFetchWithAuth } from "../utils/fetchWithAuth.ts";
import { withError } from "../utils/withError.ts";
import { MessageQueue } from "../utils/messageQueue.ts";
import { Message } from "../types/message";
import { Header } from "./Header.tsx";
import { MessageContainer } from "./MessageContainer.tsx";
import { FeedbackModal } from "./FeedbackModal.tsx";
import { FeedbackLink } from "./FeedbackLink.tsx";

declare global {
	interface Window {
		activeEventSource: EventSource | null;
	}
}

const GREETINGS = [
	"What are we playing?",
	"Rules lawyer, standing by.",
	"The rulebook is open.",
	"Table talk welcome.",
	"Got a rules question?",
	"Let's settle this.",
	"No house rules required.",
	"Analysis paralysis optional.",
	"Ask before an argument starts.",
];

const pickGreeting = () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

const ChatInterface = () => {
	const [knownBoardGames, setKnownBoardGames] = useState<string[]>([]);
	const [selectedBoardGame, setSelectedBoardGame] = useState<string>("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [greeting, setGreeting] = useState(pickGreeting);
	const [hasInteracted, setHasInteracted] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isThinking, setIsThinking] = useState(false);
	const [isScrollButtonVisible, setIsScrollButtonVisible] = useState(false);
	const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
	
	const fetchWithAuth = useFetchWithAuth();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const scrollableContainerRef = useRef<HTMLDivElement>(null);
	const isUsingMobile = useBreakpointValue({ base: true, md: false }) ?? true;
	const messageQueue = new MessageQueue((message) => {
		setMessages(prev => [...prev, message]);
	});

	const chatInput = (
		<ChatInput
			inputValue={inputValue}
			isLoading={isLoading}
			selectedBoardGame={selectedBoardGame}
			setInputValue={setInputValue}
			onMessageSend={handleSendMessage}
			knownBoardGames={knownBoardGames}
			onSelectBoardGame={handleSelectBoardGame}
			variant={hasInteracted || isUsingMobile ? "bottomFixed" : "default"}
		/>
	);

	useEffect(() => {
		handleGetKnownBoardGames();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	const handleScroll = () => {
		if (scrollableContainerRef.current) {
			const { scrollTop, scrollHeight, clientHeight } = scrollableContainerRef.current;
			const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
			setIsScrollButtonVisible(!isAtBottom);
		}
	};

	const handleGetKnownBoardGames = async () => {
		try {
			const response = await withError(() => fetchWithAuth(
				`${process.env.REACT_APP_BACKEND_URL}/known-board-games`,
				{ method: "GET" }
			));
			const knownBoardGames = await response.json();
			setKnownBoardGames(knownBoardGames);
		} catch (error: any) {
			messageQueue.push({ content: "Failed to load known board games: " + error.message, role: "error" });
		}	
	};

	const handleSelectBoardGame = async (boardGame: string) => {
		setHasInteracted(true);
		setIsLoading(true);
		try {
			const response = await withError(() => fetchWithAuth(
				`${process.env.REACT_APP_BACKEND_URL}/message-history`,
				{ method: "POST", body: JSON.stringify({ board_game: boardGame }) }
			));
			const data = await response.json();
			setMessages(data);
			setSelectedBoardGame(boardGame);
		} catch (error: any) {
			messageQueue.push({ content: "Failed to switch board game. Please try again: " + error.message, role: "error" });
		}
		setIsLoading(false);
	};

	const handleEditMessage = async (index: number, newContent: string) => {
		try {
			await withError(() => fetchWithAuth(
				`${process.env.REACT_APP_BACKEND_URL}/delete-messages-from-index`,
				{ 
					method: "POST",
					body: JSON.stringify({
						board_game: selectedBoardGame,
						index: index
					})
				}
			));
			setMessages((prev) => prev.slice(0, index));
		} catch (error: any) {
			messageQueue.push({ content: "Failed to edit message: " + error.message, role: "error" });
		}

		await handleSendMessage(newContent);
	};

	const handleDetermineBoardGame = async (message: string) => {
		const response = await withError(() => fetchWithAuth(
			`${process.env.REACT_APP_BACKEND_URL}/determine-board-game`, 
			{
				method: "POST",
				body: JSON.stringify({ question: message })
			}
		));
		const boardGame = await response.json();

		if (knownBoardGames.includes(boardGame)) {
			setSelectedBoardGame(boardGame);
			return boardGame;
		}

		const errorMessage = `Sorry, I'm unable to determine which board game your question refers to.
							Please ask another question, or manually select a board game from the dropdown instead.`;
		const chunks = errorMessage.match(/.{1,4}/g) || []; // Split into chunks of 4 characters
		setIsThinking(false);
		
		// Emulate streaming behaviour for visual consistency
		for (const chunk of chunks) {
			await new Promise(resolve => setTimeout(resolve, 50));
			setMessages((prev) => [
				...prev.slice(0, -1),
				{ 
					content: prev.at(-1)?.content + chunk,
					role: "assistant"
				}
			]);
		}
		return "";
	}

	const handleSendMessage = async (message: string) => {
		setHasInteracted(true);
		setIsLoading(true);
		setIsThinking(true);
		setMessages((prev) => [
			...prev,
			{ content: message, role: "user" },
			{ content: "", role: "assistant" }
		]);

		try {
			let boardGame = selectedBoardGame;
			
			if (!boardGame) {
				boardGame = await handleDetermineBoardGame(message);

				if (!boardGame) {
					return;
				}
			}

			const response = await withError(() => fetchWithAuth(
				`${process.env.REACT_APP_BACKEND_URL}/ask-question`, 
				{ 
					method: "POST", 
					body: JSON.stringify({ 
						question: message,
						board_game: boardGame
					})
				}
			));

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No reader available');
			}

			const decoder = new TextDecoder();
			let hasStartedStreaming = false;
			let currentContent = "";

			while (true) {
				const { done, value } = await reader.read();

				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n');
				const dataStart = "data: ";

				for (const line of lines) {
					if (line.startsWith(dataStart)) {
						const data = JSON.parse(line.slice(dataStart.length));

						if (data.chunk) {
							if (!hasStartedStreaming) {
								hasStartedStreaming = true;
								setIsThinking(false);
							}
							currentContent += data.chunk;
							const newContent = currentContent;
							setMessages((prev) => [
								...prev.slice(0, -1),
								{ 
									content: newContent,
									role: "assistant"
								}
							]);
						}
						else if (data.done) {
							setIsLoading(false);
						}
						else if (data.error) {
							messageQueue.push({ content: data.error, role: "error" });
						}
					}
				}
			}
		} catch (error: any) {
			messageQueue.push({ content: error.message, role: "error" });
		} finally {
			setIsThinking(false);
			setIsLoading(false);
		}
	};

	const handleClearChat = async () => {
		const previousMessages = messages;
		setMessages([]);
		try {
			if (selectedBoardGame) {
				await withError(() => fetchWithAuth(
					`${process.env.REACT_APP_BACKEND_URL}/clear-message-history`,
					{ 
						method: "POST",
						body: JSON.stringify({ board_game: selectedBoardGame })
					}
				));
			}
		} catch (error: any) {
			setMessages(previousMessages);
			messageQueue.push({ content: "Failed to clear chat: " + error.message, role: "error" });
		}
	};

	const handleCloseError = (index: number) => {
		setMessages(prev => prev.filter((_, i) => i !== index));
	};

	const handleOpenFeedbackModal = () => {
		setIsFeedbackModalOpen(true);
	};

	const handleCloseFeedbackModal = () => {
		setIsFeedbackModalOpen(false);
	};

	const handleLogoClick = () => {
		setSelectedBoardGame("");
		setMessages([]);
		setGreeting(pickGreeting());
		setHasInteracted(false);
	};

	return (
		<Box
			position="fixed"
			inset={0}
			w="100%"
			h={{ base: "100%", md: "100vh" }}
			overflow="hidden"
		>
			<Header
				onOpenFeedbackModal={handleOpenFeedbackModal}
				isUsingMobile={isUsingMobile}
				onLogoClick={handleLogoClick}
			/>
			<Box position="relative" h="100%" w="100%" maxW="40rem" mx="auto">
				{hasInteracted ? (
					<>
						<MessageContainer
							messages={messages}
							isThinking={isThinking}
							isLoading={isLoading}
							isScrollButtonVisible={isScrollButtonVisible}
							onEditMessage={handleEditMessage}
							onCloseError={handleCloseError}
							onClearChat={handleClearChat}
							onScrollToBottom={scrollToBottom}
							onScroll={handleScroll}
							scrollableContainerRef={scrollableContainerRef}
							messagesEndRef={messagesEndRef}
						/>
						<Box
							position="absolute"
							left={{ base: "0.75rem", md: 0 }}
							right={{ base: "0.75rem", md: 0 }}
							bottom={{ base: "0.75rem", md: "2rem" }}
							zIndex={5}
						>
							{chatInput}
						</Box>
					</>
				) : isUsingMobile ? (
					<>
						<Flex
							position="absolute"
							inset={0}
							pb="6.5rem"
							align="center"
							justify="center"
							px={4}
						>
							<Text
								fontFamily="heading"
								color="chakra-body-text"
								fontSize="2.5rem"
								fontWeight="500"
								letterSpacing="-0.03em"
								lineHeight="1"
								textAlign="center"
							>
								{greeting}
							</Text>
						</Flex>
						<Box
							position="absolute"
							left="0.75rem"
							right="0.75rem"
							bottom="0.75rem"
							zIndex={5}
						>
							{chatInput}
						</Box>
					</>
				) : (
					<Flex
						direction="column"
						justify="center"
						align="center"
						gap={8}
						h="100%"
						w="100%"
						px={4}
					>
						<Text
							fontFamily="heading"
							color="chakra-body-text"
							fontSize="2.75rem"
							fontWeight="500"
							letterSpacing="-0.03em"
							lineHeight="1"
							textAlign="center"
						>
							{greeting}
						</Text>
						{chatInput}
					</Flex>
				)}
			</Box>
			{!isUsingMobile && (
				<FeedbackLink onClick={handleOpenFeedbackModal} />
			)}
			<FeedbackModal
				isOpen={isFeedbackModalOpen}
				onClose={handleCloseFeedbackModal}
			/>
		</Box>
	);
};

export default ChatInterface;
