import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../tests/setup/test-utils';
import { DarkModeToggle } from '../DarkModeToggle';
import { useColorMode } from '@chakra-ui/react';

// Mock react-icons
jest.mock('react-icons/fi', () => ({
  FiSun: () => <svg data-testid="sun-icon" />,
  FiMoon: () => <svg data-testid="moon-icon" />,
}));

// Mock Chakra UI components and hooks
jest.mock('@chakra-ui/react', () => ({
  IconButton: ({ children, onClick, 'aria-label': ariaLabel, icon, ...props }: any) => (
    <button onClick={onClick} aria-label={ariaLabel} {...props}>
      {icon || children}
    </button>
  ),
  useColorMode: jest.fn(),
}));

describe('DarkModeToggle', () => {
  const mockToggleColorMode = jest.fn();

  beforeEach(() => {
    mockToggleColorMode.mockClear();
  });

  it('renders sun icon in dark mode', () => {
    (useColorMode as jest.Mock).mockReturnValue({
      colorMode: 'dark',
      toggleColorMode: mockToggleColorMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button', { name: /toggle color mode/i });
    expect(button).toBeInTheDocument();

    // Sun icon should be present in dark mode
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
  });

  it('renders moon icon in light mode', () => {
    (useColorMode as jest.Mock).mockReturnValue({
      colorMode: 'light',
      toggleColorMode: mockToggleColorMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button', { name: /toggle color mode/i });
    expect(button).toBeInTheDocument();

    // Moon icon should be present in light mode
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
  });

  it('calls toggleColorMode when clicked', () => {
    (useColorMode as jest.Mock).mockReturnValue({
      colorMode: 'light',
      toggleColorMode: mockToggleColorMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button', { name: /toggle color mode/i });
    fireEvent.click(button);

    expect(mockToggleColorMode).toHaveBeenCalledTimes(1);
  });

  it('has correct aria-label for accessibility', () => {
    (useColorMode as jest.Mock).mockReturnValue({
      colorMode: 'light',
      toggleColorMode: mockToggleColorMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button', { name: /toggle color mode/i });
    expect(button).toHaveAttribute('aria-label', 'Toggle color mode');
  });
});
