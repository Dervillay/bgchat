import { FC, useEffect, useState } from "react";
import { Image as ChakraImage, ResponsiveValue } from "@chakra-ui/react";
import { useTheme } from "../contexts/ThemeContext";
import { createThemedFaviconDataUrl, FAVICON_IMAGE_SRC } from "../utils/themedFavicon";

type ThemedFaviconIconProps = {
	boxSize?: ResponsiveValue<string | number>;
};

export const ThemedFaviconIcon: FC<ThemedFaviconIconProps> = ({ boxSize = "3rem" }) => {
	const { themeId } = useTheme();
	const [src, setSrc] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const img = new window.Image();
		img.onload = () => {
			if (cancelled) {
				return;
			}
			setSrc(createThemedFaviconDataUrl(themeId, img, 128));
		};
		img.src = FAVICON_IMAGE_SRC;
		return () => {
			cancelled = true;
		};
	}, [themeId]);

	if (!src) {
		return null;
	}

	return (
		<ChakraImage
			src={src}
			alt=""
			boxSize={boxSize}
			flexShrink={0}
			draggable={false}
			aria-hidden
		/>
	);
};
