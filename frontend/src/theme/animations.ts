import { keyframes } from "@emotion/react";

export const shimmer = keyframes`
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
`;
