import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../../../src/ui/components/common/Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with children content', () => {
      render(<Button>Click me</Button>);
      
      expect(screen.getByRole('button')).toHaveTextContent('Click me');
    });

    it('should render with default props', () => {
      render(<Button>Default Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600'); // primary variant
      expect(button).toHaveClass('px-4 py-2'); // medium size
    });
  });

  describe('Variants', () => {
    it('should apply primary variant classes', () => {
      render(<Button variant="primary">Primary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600', 'text-white', 'hover:bg-blue-700', 'focus:ring-blue-500');
    });

    it('should apply secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-200', 'text-gray-900', 'hover:bg-gray-300', 'focus:ring-gray-500');
    });

    it('should apply danger variant classes', () => {
      render(<Button variant="danger">Delete</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600', 'text-white', 'hover:bg-red-700', 'focus:ring-red-500');
    });
  });

  describe('Sizes', () => {
    it('should apply small size classes', () => {
      render(<Button size="small">Small</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-2', 'py-1', 'text-sm');
    });

    it('should apply medium size classes', () => {
      render(<Button size="medium">Medium</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
    });

    it('should apply large size classes', () => {
      render(<Button size="large">Large</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-base');
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should apply custom HTML attributes', () => {
      render(<Button id="custom-id" data-testid="custom-button">Custom</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('id', 'custom-id');
      expect(button).toHaveAttribute('data-testid', 'custom-button');
    });

    it('should handle disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });
  });

  describe('Base Classes', () => {
    it('should always include base classes', () => {
      render(<Button>Base Classes</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'inline-flex',
        'items-center',
        'justify-center',
        'font-medium',
        'rounded-md',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-2'
      );
    });
  });

  describe('Event Handling', () => {
    it('should handle click events', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Clickable</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not trigger click when disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Disabled</Button>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should handle other events', () => {
      const handleMouseEnter = jest.fn();
      const handleFocus = jest.fn();
      
      render(
        <Button onMouseEnter={handleMouseEnter} onFocus={handleFocus}>
          Events
        </Button>
      );
      
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      fireEvent.focus(button);
      
      expect(handleMouseEnter).toHaveBeenCalledTimes(1);
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should be accessible by role', () => {
      render(<Button>Accessible Button</Button>);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('should support aria-describedby', () => {
      render(<Button aria-describedby="help-text">Submit</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should handle focus correctly', () => {
      render(<Button>Focusable</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
    });
  });

  describe('Variant and Size Combinations', () => {
    it('should combine variant and size classes correctly', () => {
      render(<Button variant="danger" size="large">Large Danger</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600'); // danger variant
      expect(button).toHaveClass('px-6', 'py-3'); // large size
    });

    it('should maintain base classes with all combinations', () => {
      render(<Button variant="secondary" size="small">Small Secondary</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('inline-flex', 'rounded-md'); // base classes
      expect(button).toHaveClass('bg-gray-200'); // secondary variant
      expect(button).toHaveClass('px-2', 'py-1'); // small size
    });
  });

  describe('Complex Children', () => {
    it('should render with JSX children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('IconText');
      expect(button.querySelector('span')).toBeInTheDocument();
    });

    it('should render with React fragments', () => {
      render(
        <Button>
          <>
            Fragment content
          </>
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Fragment content');
    });
  });
});