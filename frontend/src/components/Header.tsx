import React from "react";
import { Box, Text, Flex } from "@chakra-ui/react";
import { DarkModeToggle } from "./DarkModeToggle.tsx";
import { UserProfileMenu } from "./UserProfileMenu.tsx";
import { ThemedFaviconIcon } from "./ThemedFaviconIcon.tsx";

interface HeaderProps {
	onOpenFeedbackModal: () => void;
	isUsingMobile: boolean | undefined;
	onLogoClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenFeedbackModal, isUsingMobile, onLogoClick }) => {
	return (
		<Box
			position="absolute"
			top={0}
			left={0}
			right={0}
			h={{ base: "3.5rem", md: "4rem" }}
			bgGradient={`linear(to bottom, var(--chakra-colors-chakra-body-bg) 50%, transparent 100%)`}
			display="flex"
			alignItems="center"
			justifyContent="space-between"
			px={{ base: 3, md: 5 }}
			zIndex={10}
		>
			<Flex
				align="center"
				gap={{ base: 2, md: 2.5 }}
				cursor="pointer"
				onClick={onLogoClick}
				_hover={{ opacity: 0.8 }}
				transition="opacity 0.2s"
			>
				<ThemedFaviconIcon boxSize={{ base: "1.9rem", md: "2.15rem" }} />
				<Text
					fontFamily="heading"
					color="chakra-body-text"
					fontSize={{ base: "xl", md: "2xl" }}
					fontWeight="500"
					letterSpacing="-0.02em"
					lineHeight="1"
				>
					BGChat
				</Text>
			</Flex>
			<Flex align="center" gap={2}>
				<DarkModeToggle />
				<UserProfileMenu 
					onOpenFeedbackModal={onOpenFeedbackModal}
					isUsingMobile={isUsingMobile}
				/>
			</Flex>
		</Box>
	);
};
