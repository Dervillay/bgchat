import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../tests/setup/test-utils';
import { BoardGameSelect } from '../BoardGameSelect';

// Mock the theme to avoid Chakra UI dependency issues
jest.mock('../../theme/index', () => ({
  theme: {
    components: {
      BoardGameSelect: {
        control: () => ({}),
        singleValue: () => ({}),
        dropdownIndicator: () => ({}),
        menu: () => ({}),
        menuList: () => ({}),
        option: () => ({}),
        placeholder: () => ({}),
      },
    },
  },
}));

// Mock chakra-react-select to avoid Chakra UI dependency issues
jest.mock('chakra-react-select', () => ({
  Select: ({ options, value, onChange, placeholder, ...props }: any) => (
    <div data-testid="chakra-react-select">
      <div data-testid="select-placeholder">{placeholder}</div>
      {value && <div data-testid="select-value">{value.label}</div>}
      <div data-testid="select-options">
        {options.map((option: any) => (
          <div
            key={option.value}
            data-testid={`option-${option.value}`}
            onClick={() => onChange(option)}
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  ),
}));

describe('BoardGameSelect', () => {
  const mockOnSelectBoardGame = jest.fn();
  const mockBoardGames = ['Wingspan', 'Azul', 'Catan', 'Ticket to Ride'];

  beforeEach(() => {
    mockOnSelectBoardGame.mockClear();
  });

  it('renders with placeholder when no game selected', () => {
    render(
      <BoardGameSelect
        selectedBoardGame=""
        knownBoardGames={mockBoardGames}
        onSelectBoardGame={mockOnSelectBoardGame}
      />
    );

    expect(screen.getByText('Select a board game')).toBeInTheDocument();
  });

  it('renders with selected game', () => {
    render(
      <BoardGameSelect
        selectedBoardGame="Wingspan"
        knownBoardGames={mockBoardGames}
        onSelectBoardGame={mockOnSelectBoardGame}
      />
    );

    expect(screen.getByTestId('select-value')).toHaveTextContent('Wingspan');
  });

  it('displays all available board games in dropdown', () => {
    render(
      <BoardGameSelect
        selectedBoardGame=""
        knownBoardGames={mockBoardGames}
        onSelectBoardGame={mockOnSelectBoardGame}
      />
    );

    mockBoardGames.forEach((game) => {
      expect(screen.getByText(game)).toBeInTheDocument();
    });
  });

  it('calls onSelectBoardGame when a game is selected', () => {
    render(
      <BoardGameSelect
        selectedBoardGame=""
        knownBoardGames={mockBoardGames}
        onSelectBoardGame={mockOnSelectBoardGame}
      />
    );

    // With the mock, options are always visible
    const azulOption = screen.getByText('Azul');
    fireEvent.click(azulOption);

    expect(mockOnSelectBoardGame).toHaveBeenCalledWith('Azul');
  });

  it('renders with empty list gracefully', () => {
    render(
      <BoardGameSelect
        selectedBoardGame=""
        knownBoardGames={[]}
        onSelectBoardGame={mockOnSelectBoardGame}
      />
    );

    expect(screen.getByText('Select a board game')).toBeInTheDocument();
  });

  it('updates displayed value when selectedBoardGame prop changes', () => {
    const { rerender } = render(
      <BoardGameSelect
        selectedBoardGame="Wingspan"
        knownBoardGames={mockBoardGames}
        onSelectBoardGame={mockOnSelectBoardGame}
      />
    );

    expect(screen.getByTestId('select-value')).toHaveTextContent('Wingspan');

    rerender(
      <BoardGameSelect
        selectedBoardGame="Azul"
        knownBoardGames={mockBoardGames}
        onSelectBoardGame={mockOnSelectBoardGame}
      />
    );

    expect(screen.getByTestId('select-value')).toHaveTextContent('Azul');
  });
});
