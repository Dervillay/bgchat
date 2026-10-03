import React, { useEffect, useRef } from "react";
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
	const headerRef = useRef<HTMLDivElement | null>(null);

	// Keep the header glued to the visible top. Keyboard focus can scroll the
	// visual viewport, which would otherwise slide position:fixed off-screen.
	useEffect(() => {
		const el = headerRef.current;
		if (!el || !isUsingMobile) {
			if (el) {
				el.style.top = "";
			}
			return;
		}

		const visualViewport = window.visualViewport;
		const sync = () => {
			const offsetTop = visualViewport?.offsetTop ?? 0;
			el.style.top = `${offsetTop}px`;
			if (window.scrollY !== 0 || window.scrollX !== 0) {
				window.scrollTo(0, 0);
			}
		};

		sync();
		visualViewport?.addEventListener("resize", sync);
		visualViewport?.addEventListener("scroll", sync);
		window.addEventListener("scroll", sync, { passive: true });

		return () => {
			visualViewport?.removeEventListener("resize", sync);
			visualViewport?.removeEventListener("scroll", sync);
			window.removeEventListener("scroll", sync);
			el.style.top = "";
		};
	}, [isUsingMobile]);

	return (
		<Box
			ref={headerRef}
			position="fixed"
			top={0}
			left={0}
			right={0}
			transform="none"
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
