import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../tests/setup/test-utils';
import { CitationLink } from '../CitationLink';
import { usePDFViewer } from '../../contexts/PDFViewerContext';

// Mock Chakra UI Link component
jest.mock('@chakra-ui/react', () => ({
  Link: ({ children, href, onClick, isExternal, backgroundImage, backgroundSize, backgroundPosition, backgroundClip, sx, _hover, ...props }: any) => (
    <a 
      href={href} 
      onClick={onClick}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      style={{
        backgroundImage,
        backgroundSize,
        backgroundPosition,
        WebkitBackgroundClip: backgroundClip,
        ...(sx || {}),
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

// Mock the gradient hook
jest.mock('../../hooks/useCurrentGradient', () => ({
  useCurrentGradient: () => 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
}));

// Mock the PDFViewer context
jest.mock('../../contexts/PDFViewerContext', () => ({
  usePDFViewer: jest.fn(),
}));

describe('CitationLink', () => {
  const mockOpenViewer = jest.fn();

  beforeEach(() => {
    (usePDFViewer as jest.Mock).mockReturnValue({
      openViewer: mockOpenViewer,
    });
    mockOpenViewer.mockClear();
  });

  it('renders children correctly', () => {
    render(
      <CitationLink href="/pdfs/wingspan/rules.pdf#page=5">
        Wingspan Rules, Page 5
      </CitationLink>
    );

    expect(screen.getByText(/Wingspan Rules, Page 5/)).toBeInTheDocument();
  });

  it('opens PDF viewer and extracts page number from href', () => {
    render(
      <CitationLink
        href="/pdfs/wingspan/rules.pdf#page=5"
        text="Wingspan Rules, Page 5"
      >
        Click here
      </CitationLink>
    );

    const link = screen.getByRole('link');
    fireEvent.click(link);

    expect(mockOpenViewer).toHaveBeenCalledWith(
      '/pdfs/wingspan/rules.pdf#page=5',
      'Wingspan Rules',
      '5'
    );
  });

  it('handles links without page numbers', () => {
    render(
      <CitationLink
        href="/pdfs/catan/rules.pdf"
        text="Catan Rules"
      >
        Catan Citation
      </CitationLink>
    );

    const link = screen.getByRole('link');
    fireEvent.click(link);

    expect(mockOpenViewer).toHaveBeenCalledWith(
      '/pdfs/catan/rules.pdf',
      'Catan Rules',
      undefined
    );
  });

  it('handles external links correctly', () => {
    render(
      <CitationLink href="https://boardgamegeek.com/wingspan">
        External Link
      </CitationLink>
    );

    const link = screen.getByRole('link');

    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    fireEvent.click(link);
    expect(mockOpenViewer).not.toHaveBeenCalled();
  });

  it('renders with arrow indicator', () => {
    render(
      <CitationLink href="/pdfs/test.pdf">
        Test Link
      </CitationLink>
    );

    expect(screen.getByText(/↗/)).toBeInTheDocument();
  });

  it('has correct aria-label for PDF links', () => {
    render(
      <CitationLink
        href="/pdfs/wingspan/rules.pdf"
        text="Wingspan Rules"
      >
        Link Text
      </CitationLink>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('aria-label', 'Open Wingspan Rules in viewer');
  });

  it('has correct aria-label for external links', () => {
    render(
      <CitationLink href="https://example.com">
        External
      </CitationLink>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('aria-label', 'Open webpage in new tab');
  });
});
