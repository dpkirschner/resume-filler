import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal, ModalProps } from '../../../../src/ui/components/common/Modal';

describe('Modal Component', () => {
  // Define default props to be used in tests, reducing repetition.
  const defaultProps: ModalProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal Title',
    children: <div>Modal Content</div>,
  };

  afterEach(() => {
    // Clear all mocks after each test to ensure test isolation.
    jest.clearAllMocks();
  });

  test('should not render when isOpen is false', () => {
    // Arrange
    render(<Modal {...defaultProps} isOpen={false} />);

    // Act & Assert
    // `queryByRole` is used because it returns `null` if the element is not found,
    // which is exactly what we want to check. `getByRole` would throw an error.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('should render correctly when isOpen is true', () => {
    // Arrange
    render(<Modal {...defaultProps} />);

    // Act & Assert
    // We can now reliably find the modal by its accessible role.
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();

    // Check that the title and children are rendered.
    expect(screen.getByText(defaultProps.title as string)).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  test('should call onClose when the background overlay is clicked', () => {
    // Arrange
    render(<Modal {...defaultProps} />);

    // Act
    // Find the overlay by the test ID we added.
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);

    // Assert
    // Verify that our mock `onClose` function was called exactly once.
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('should render correctly without a title', () => {
    // Arrange
    render(<Modal {...defaultProps} title={undefined} />);

    // Act & Assert
    // The modal itself should still be present.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Check that the children are still rendered.
    expect(screen.getByText('Modal Content')).toBeInTheDocument();

    // `queryByRole` confirms that no `heading` element was rendered.
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  test('should have correct ARIA attributes for accessibility', () => {
    // Arrange
    render(<Modal {...defaultProps} />);

    // Act
    const modal = screen.getByRole('dialog');

    // Assert
    // These attributes are critical for screen reader users.
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');

    const title = screen.getByText(defaultProps.title as string);
    expect(title).toHaveAttribute('id', 'modal-title');
  });
});