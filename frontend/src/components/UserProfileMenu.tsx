import { useState } from "react";
import {
	Menu,
	MenuButton,
	MenuList,
	MenuItem,
	Avatar,
	Text,
	Box,
	Divider,
	Link,
	HStack,
	Collapse,
} from "@chakra-ui/react";
import { useAuth0 } from "@auth0/auth0-react";
import { FiLogOut, FiGithub, FiHeart, FiMessageSquare } from "react-icons/fi";
import { PiPaintBrush } from "react-icons/pi";
import { gradients } from "../theme/gradients";
import { useTheme } from "../contexts/ThemeContext";

interface UserProfileMenuProps {
	onOpenFeedbackModal: () => void;
	isUsingMobile: boolean | undefined;
}

export const UserProfileMenu = ({ onOpenFeedbackModal, isUsingMobile }: UserProfileMenuProps) => {
	const { user, logout } = useAuth0();
	const { themeId, setTheme } = useTheme();
	const [isThemeExpanded, setIsThemeExpanded] = useState(false);

	const menuItemStyle = {
		fontWeight: "normal",
		fontSize: "sm",
		backgroundColor: "transparent",
		borderRadius: "5px",
		color: "gray.600",
		_dark: {
			color: "#a0a0a0",
			_hover: {
				backgroundColor: "#404040",
				borderRadius: "5px",
				filter: "brightness(1.2)"
			}
		},
		_hover: {
			backgroundColor: "gray.50",
			borderRadius: "5px",
		}
	};

	const handleThemeSelect = (themeId: number) => {
		setTheme(themeId);
	};

	return (
		<Menu onClose={() => setIsThemeExpanded(false)}>
			<MenuButton
				_hover={{
					borderRadius: "full"
				}}
				transition="all 0.2s"
			>
				<Avatar
					size="sm"
					name={user?.name || user?.email}
					src={user?.picture}
					bg="gray.200"
					color="gray.600"
					cursor="pointer"
					_hover={{ 
						opacity: 0.8,
						color: "gray.900",
					}}
				/>
			</MenuButton>
			<MenuList
				borderRadius="10px"
				padding="0.3rem"
				minWidth="12rem"
				right={0}
				bg="chakra-body-bg"
				border="1px solid"
				borderColor="gray.200"
				_dark={{
					borderColor: "#404040"
				}}
			>
			<Box px={3} py={2}>
				<Text fontSize="xs" color="gray.500" _dark={{ color: "#808080" }}>
					Logged in as
				</Text>
				<Text fontSize="sm" color="gray.600" _dark={{ color: "#a0a0a0" }}>
					{user?.email}
				</Text>
			</Box>
			<Divider my={1} borderColor="gray.200" _dark={{ borderColor: "#404040" }}/>
			<MenuItem 
				onClick={() => setIsThemeExpanded(!isThemeExpanded)}
				closeOnSelect={false}
				{...menuItemStyle}
				icon={<PiPaintBrush />}
			>
				Theme
			</MenuItem>
			<Collapse in={isThemeExpanded} animateOpacity>
				<Box px={3} py={2}>
					<HStack spacing={2} justify="flex-start">
						{gradients.map((gradient, index) => (
							<Box
								key={index}
								w="1.5rem"
								h="1.5rem"
								borderRadius="full"
								bg={gradient}
								cursor="pointer"
								transition="all 0.2s"
								boxShadow={themeId === index ? "0 0 0 2px #1a1a1a" : "none"}
								_dark={{
									boxShadow: themeId === index ? "0 0 0 2px white" : "none",
								}}
								_hover={{
									transform: "scale(1.15)",
								}}
								onClick={() => handleThemeSelect(index)}
							/>
						))}
					</HStack>
				</Box>
			</Collapse>
			<MenuItem 
				as={Link}
				href="https://github.com/Dervillay/BGChat"
					isExternal
					{...menuItemStyle}
					_hover={{
						...menuItemStyle._hover,
						textDecoration: "none"
					}}
					icon={<FiGithub />}
				>
					GitHub
				</MenuItem>
				<MenuItem 
					as={Link}
					href="https://ko-fi.com/dervillay"
					isExternal
					{...menuItemStyle}
					_hover={{
						...menuItemStyle._hover,
						textDecoration: "none"
					}}
					icon={<FiHeart />}
				>
					Support the project
				</MenuItem>
				{isUsingMobile && (
					<MenuItem 
						onClick={onOpenFeedbackModal}
						{...menuItemStyle}
						icon={<FiMessageSquare />}
					>
						Give feedback
					</MenuItem>
				)}
				<MenuItem 
					onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
					{...menuItemStyle}
					icon={<FiLogOut />}
				>
					Log out
				</MenuItem>
			</MenuList>
		</Menu>
	);
};
