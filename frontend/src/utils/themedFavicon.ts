import { gradients } from "../theme/gradients";

export function createThemedFaviconDataUrl(
	themeId: number,
	image: HTMLImageElement,
	size = 32,
): string | null {
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return null;
	}

	ctx.drawImage(image, 0, 0, size, size);
	const imageData = ctx.getImageData(0, 0, size, size);

	const colors = gradients[themeId].match(/#[A-Fa-f0-9]{6}/g) || ["#88D4AB", "#6BC5A0", "#5BBFBA"];
	const gradient = ctx.createLinearGradient(0, 0, size, size);
	colors.forEach((color, i) => gradient.addColorStop(i / (colors.length - 1), color));
	ctx.clearRect(0, 0, size, size);
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, size, size);

	const gradientData = ctx.getImageData(0, 0, size, size);
	const src = imageData.data;
	const dst = gradientData.data;
	for (let i = 0; i < src.length; i += 4) {
		const alpha = src[i + 3];
		if (alpha < 8) {
			dst[i + 3] = 0;
			continue;
		}
		// Source luminance shades the gradient (front = bright, isometric sides = darker).
		const shade = (src[i] + src[i + 1] + src[i + 2]) / (3 * 255);
		dst[i] = Math.round(dst[i] * shade);
		dst[i + 1] = Math.round(dst[i + 1] * shade);
		dst[i + 2] = Math.round(dst[i + 2] * shade);
		dst[i + 3] = alpha;
	}
	ctx.putImageData(gradientData, 0, 0);

	return canvas.toDataURL("image/png");
}

export const FAVICON_IMAGE_SRC = `${process.env.PUBLIC_URL || ""}/images/favicon.png`;
