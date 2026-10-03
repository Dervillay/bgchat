export const UserMessage = {
  container: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    w: "100%",
    role: "group",
  },
  messageBox: {
    maxW: { base: "85%", md: "70%" },
    bg: "chakra-body-message-bg",
    color: "chakra-body-message-text",
    px: { base: 3, md: 5 },
    py: { base: 2, md: 2.5 },
    borderRadius: "1.5rem",
  },
  messageText: {
    fontSize: "md",
  },
  editInput: {
    as: "textarea",
    fontSize: "md",
    resize: "none", 
    overflowY: "auto",
    minH: "5rem",
    maxH: "15rem",
    maxW: { base: "85%", md: "70%" },
    bg: "chakra-body-message-bg",
    color: "chakra-body-message-text",
    _dark: {
      _placeholder: {
        color: "#a0a0a0"
      }
    },
    px: { base: 3, md: 5 },
    py: { base: 2, md: 2.5 },
    borderRadius: "1.5rem",
    _hover: {
      borderColor: "chakra-body-border-focus"
    },
    _focus: {
      outline: "none",
      borderColor: "chakra-body-border-focus",
      boxShadow: "none"
    },
  },
  buttonContainer: {
    justify: "flex-end",
    w: "100%",
    mb: -3,
  },
  button: {
    variant: "ghost",
    size: "sm",
    color: "gray.500",
    _hover: { color: "gray.700" },
    _dark: {
      color: "#a0a0a0",
      _hover: { 
        color: "#e0e0e0",
        filter: "brightness(1.3)"
      }
    }
  },
  requireHoverOnDesktop: {
    opacity: { base: 1, md: 0 },
    _groupHover: { opacity: 1 },
  },
};
