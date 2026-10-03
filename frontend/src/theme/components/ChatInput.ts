export const ChatInput = {
  baseStyle: {
    container: {
      direction: "column",
      w: { base: "92%", md: "40rem" },
      maxW: { base: "92%", md: "40rem" },
      mx: "auto",
      bg: "chakra-body-bg",
      borderRadius: "1.25rem",
      textColor: "chakra-body-text",
      h: "auto",
      lineHeight: "normal",
      // Slightly less top inset than gap — Outfit's metrics make equal padding look top-heavy.
      px: "0.5rem",
      pt: "0.25rem",
      pb: "0.5rem",
      gap: "0.5rem",
      _dark: {
        bg: "chakra-body-message-bg",
      },
      _light: {
        bg: "gray.100",
        border: "none",
      },
      _focus: {
        outline: undefined,
      }
    },
    input: {
      variant: "unstyled",
      // Single-line height before wrap; grows via resize logic after line breaks.
      // minH includes vertical padding (border-box): 1.75 line + 0.375 + 0.5 pad.
      minH: "2.625rem",
      maxH: "6rem",
      fontSize: "md",
      lineHeight: "1.75rem",
      flex: "1",
      border: "none",
      borderRadius: "0",
      resize: "none",
      // Scrollbar only when content exceeds maxH (toggled in ChatInput resize logic)
      overflowY: "hidden",
      px: "0.5rem",
      pt: "0.375rem",
      pb: "0.5rem",
      // Height animation is applied imperatively only when growing.
      transition: "none",
      _dark: {
        bg: "transparent",
        _placeholder: {
          color: "#a0a0a0"
        }
      },
      _hover: {
        border: "none"
      },
      _focus: {
        border: "none",
        boxShadow: "none"
      },
      _disabled: { opacity: 1 }
    },
    controls: {
      align: "center",
      gap: { base: 1, md: 2 },
      justify: "space-between",
      flexShrink: 0,
      w: "100%",
    }
  },
  variants: {
    bottomFixed: {
      container: {
        // Same width as the centered input on md+. On mobile, inset from screen edges.
        w: { base: "auto", md: "40rem" },
        maxW: { base: "100%", md: "40rem" },
        borderRadius: "1.25rem",
        border: "none",
        position: "fixed",
        // Fallback bottom; on mobile ChatInput may override via visualViewport `top`.
        bottom: { base: "0.75rem", md: "2rem" },
        left: { base: "0.75rem", md: "50%" },
        right: { base: "0.75rem", md: "auto" },
        transform: { base: "none", md: "translateX(-50%)" },
        // Keep below message actions (reset sits in the scroll area above this).
        zIndex: 5,
      }
    }
  }
}; 