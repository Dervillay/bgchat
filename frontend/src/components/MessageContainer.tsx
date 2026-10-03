import React from "react";
import { Box, Container, VStack, Flex, IconButton, Tooltip } from "@chakra-ui/react";
import { UserMessage } from "./UserMessage.tsx";
import { AssistantMessage } from "./AssistantMessage.tsx";
import { ErrorMessage } from "./ErrorMessage.tsx";
import { ThinkingPlaceholder } from "./ThinkingPlaceholder.tsx";
import { FiArrowDown, FiRefreshCw } from 'react-icons/fi';
import { Message } from "../types/message";

interface MessageContainerProps {
	messages: Message[];
	isThinking: boolean;
	isLoading: boolean;
	isScrollButtonVisible: boolean;
	onEditMessage: (index: number, newContent: string) => void;
	onCloseError: (index: number) => void;
	onClearChat: () => void;
	onScrollToBottom: () => void;
	onScroll: () => void;
	scrollableContainerRef: React.RefObject<HTMLDivElement | null>;
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const MessageContainer: React.FC<MessageContainerProps> = ({
	messages,
	isThinking,
	isLoading,
	isScrollButtonVisible,
	onEditMessage,
	onCloseError,
	onClearChat,
	onScrollToBottom,
	onScroll,
	scrollableContainerRef,
	messagesEndRef,
}) => {
	return (
		<>
			<Box
				position="fixed"
				pt="3.5rem"
				top={0}
				bottom={{ base: "8.5rem", md: "7rem" }}
				left={0}
				right={0}
				overflowY="auto"
				onScroll={onScroll}
				ref={scrollableContainerRef}
				css={{
					'&::-webkit-scrollbar': {
						display: 'none'
					},
					scrollbarWidth: 'none',
				}}
			>
				<Container maxW="48rem" mx="auto" px={4} py={4}>
					<VStack w="100%" spacing={4}>
						{messages.map((message, index) => (
							message.role === "user" ? (
								<UserMessage
									key={index}
									content={message.content}
									onEdit={(newContent) => onEditMessage(index, newContent)}
								/>
							) : message.role === "assistant" ? (
								<AssistantMessage 
									key={index}
									content={message.content}
								/>
							) : (
								<ErrorMessage 
									key={index}
									content={message.content} 
									onClose={() => onCloseError(index)} 
								/>
							)
						))}
						{isThinking && <ThinkingPlaceholder />}
						{messages.length >= 2 && !isLoading && messages.some(msg => msg.role === "user") && (
							<Flex justify="flex-end" w="100%" mt={1} position="relative" zIndex={6}>
								<Tooltip 
									label="Reset chat"
									placement="bottom"
									offset={[0, 0]}
								>
									{/* Span so Tooltip can attach a ref without breaking IconButton clicks */}
									<span>
										<IconButton
											icon={<FiRefreshCw />}
											onClick={onClearChat}
											size="sm"
											variant="ghost"
											color="gray.500"
											_hover={{ color: "gray.700" }}
											_dark={{
												color: "#a0a0a0",
												_hover: { 
													color: "#e0e0e0",
													filter: "brightness(1.3)"
												}
											}}
											aria-label="Reset chat"
										/>
									</span>
								</Tooltip>
							</Flex>
						)}
						<div ref={messagesEndRef} />
					</VStack>
				</Container>
			</Box>
			<Box
				position="fixed"
				bottom="7.5rem"
				left="50%"
				zIndex={0}
				opacity={isScrollButtonVisible ? 1 : 0}
				transition="opacity 0.2s ease-in-out, transform 0.2s ease-in-out"
				transform={isScrollButtonVisible ? "translate(-50%, 0)" : "translate(-50%, 10px)"}
				pointerEvents={isScrollButtonVisible ? "auto" : "none"}
				display={{ base: "block", md: "none" }}
			>
				<IconButton
					icon={<FiArrowDown/>}
					onClick={onScrollToBottom}
					size="md"
					aria-label="Scroll to bottom"
					bg="chakra-body-message-bg"
					color="chakra-body-message-text"
					variant="ghost"
				/>
			</Box>
		</>
	);
};
