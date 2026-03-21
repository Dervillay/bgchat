import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../tests/setup/test-utils';
import { UserMessage } from '../UserMessage';

// Mock react-icons
jest.mock('react-icons/fi', () => ({
  FiEdit2: () => <svg data-testid="edit-icon" />,
  FiCheck: () => <svg data-testid="check-icon" />,
  FiX: () => <svg data-testid="x-icon" />,
}));

// Mock the theme
jest.mock('../../theme/index', () => ({
  theme: {
    components: {
      UserMessage: {
        container: {},
        messageBox: {},
        messageText: {},
        buttonContainer: {},
        button: {},
        editInput: {},
        requireHoverOnDesktop: {},
      },
    },
  },
}));

// Mock Chakra UI components
jest.mock('@chakra-ui/react', () => ({
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  Flex: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  IconButton: ({ onClick, 'aria-label': ariaLabel, icon, ...props }: any) => (
    <button onClick={onClick} aria-label={ariaLabel} {...props}>
      {icon}
    </button>
  ),
  Input: ({ onChange, onKeyDown, value, ...props }: any) => (
    <input
      type="text"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      {...props}
    />
  ),
}));

describe('UserMessage', () => {
  const mockOnEdit = jest.fn();
  const initialContent = 'Hello, this is a test message';

  beforeEach(() => {
    mockOnEdit.mockClear();
  });

  it('renders the message content', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    expect(screen.getByText(initialContent)).toBeInTheDocument();
  });

  it('renders edit button in view mode', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    expect(editButton).toBeInTheDocument();
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
  });

  it('switches to edit mode when edit button is clicked', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue(initialContent);
    expect(input).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel edit/i })).toBeInTheDocument();
  });

  it('allows editing the message content', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue(initialContent) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Edited message' } });

    expect(input.value).toBe('Edited message');
  });

  it('calls onEdit when save button is clicked with changed content', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue(initialContent);
    fireEvent.change(input, { target: { value: 'Edited message' } });

    const saveButton = screen.getByRole('button', { name: /save edit/i });
    fireEvent.click(saveButton);

    expect(mockOnEdit).toHaveBeenCalledWith('Edited message');
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('does not call onEdit when save button is clicked with unchanged content', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const saveButton = screen.getByRole('button', { name: /save edit/i });
    fireEvent.click(saveButton);

    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  it('does not call onEdit when save button is clicked with only whitespace', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue(initialContent);
    fireEvent.change(input, { target: { value: '   ' } });

    const saveButton = screen.getByRole('button', { name: /save edit/i });
    fireEvent.click(saveButton);

    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  it('trims whitespace when saving', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue(initialContent);
    fireEvent.change(input, { target: { value: '  Edited message  ' } });

    const saveButton = screen.getByRole('button', { name: /save edit/i });
    fireEvent.click(saveButton);

    expect(mockOnEdit).toHaveBeenCalledWith('Edited message');
  });

  it('restores original content when cancel button is clicked', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue(initialContent);
    fireEvent.change(input, { target: { value: 'Edited message' } });

    const cancelButton = screen.getByRole('button', { name: /cancel edit/i });
    fireEvent.click(cancelButton);

    expect(screen.getByText(initialContent)).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Edited message')).not.toBeInTheDocument();
    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  it('saves when Enter key is pressed', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue(initialContent);
    fireEvent.change(input, { target: { value: 'Edited message' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    expect(mockOnEdit).toHaveBeenCalledWith('Edited message');
  });

  it('does not save when Shift+Enter is pressed', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue(initialContent);
    fireEvent.change(input, { target: { value: 'Edited message' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  it('cancels when Escape key is pressed', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue(initialContent);
    fireEvent.change(input, { target: { value: 'Edited message' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.getByText(initialContent)).toBeInTheDocument();
    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  it('returns to view mode after saving', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const input = screen.getByDisplayValue(initialContent);
    fireEvent.change(input, { target: { value: 'Edited message' } });

    const saveButton = screen.getByRole('button', { name: /save edit/i });
    fireEvent.click(saveButton);

    expect(screen.getByRole('button', { name: /edit message/i })).toBeInTheDocument();
  });

  it('returns to view mode after canceling', () => {
    render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    const editButton = screen.getByRole('button', { name: /edit message/i });
    fireEvent.click(editButton);

    const cancelButton = screen.getByRole('button', { name: /cancel edit/i });
    fireEvent.click(cancelButton);

    expect(screen.getByText(initialContent)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit message/i })).toBeInTheDocument();
  });

  it('updates edited content when prop changes', () => {
    const { rerender } = render(<UserMessage content={initialContent} onEdit={mockOnEdit} />);

    expect(screen.getByText(initialContent)).toBeInTheDocument();

    const newContent = 'Updated content';
    rerender(<UserMessage content={newContent} onEdit={mockOnEdit} />);

    expect(screen.getByText(newContent)).toBeInTheDocument();
  });
});

