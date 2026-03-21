import { renderHook } from '@testing-library/react';
import { useCurrentGradient } from '../useCurrentGradient';
import { useTheme } from '../../contexts/ThemeContext';
import { gradients } from '../../theme/gradients';

// Mock the ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

describe('useCurrentGradient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the gradient for themeId 0', () => {
    (useTheme as jest.Mock).mockReturnValue({ themeId: 0 });

    const { result } = renderHook(() => useCurrentGradient());

    expect(result.current).toBe(gradients[0]);
  });

  it('updates when themeId changes', () => {
    (useTheme as jest.Mock).mockReturnValue({ themeId: 0 });
    const { result, rerender } = renderHook(() => useCurrentGradient());
    expect(result.current).toBe(gradients[0]);

    (useTheme as jest.Mock).mockReturnValue({ themeId: 2 });
    rerender();
    expect(result.current).toBe(gradients[2]);
  });

  it('returns a valid gradient string', () => {
    (useTheme as jest.Mock).mockReturnValue({ themeId: 0 });
    const { result } = renderHook(() => useCurrentGradient());

    expect(typeof result.current).toBe('string');
    expect(result.current).toContain('linear-gradient');
  });
});
