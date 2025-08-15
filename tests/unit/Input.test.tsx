import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../../src/ui/components/common/Input';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render basic input', () => {
      render(<Input />);
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Input label="Email Address" />);
      
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('Email Address')).toBeInTheDocument();
    });

    it('should auto-generate id from label', () => {
      render(<Input label="Full Name" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'full-name');
    });

    it('should use custom id when provided', () => {
      render(<Input label="Email" id="custom-email-id" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'custom-email-id');
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<Input error="This field is required" />);
      
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });

    it('should apply error styles', () => {
      render(<Input error="Invalid input" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-300', 'text-red-900', 'placeholder-red-300');
    });

    it('should prioritize error over helper text', () => {
      render(
        <Input 
          error="This field is required" 
          helperText="This should not be shown"
        />
      );
      
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
      expect(screen.queryByText('This should not be shown')).not.toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    it('should display helper text when no error', () => {
      render(<Input helperText="Enter your email address" />);
      
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
      expect(screen.getByText('Enter your email address')).toHaveClass('text-gray-500');
    });

    it('should not display helper text when error exists', () => {
      render(
        <Input 
          error="Required field" 
          helperText="This helper text should be hidden"
        />
      );
      
      expect(screen.queryByText('This helper text should be hidden')).not.toBeInTheDocument();
      expect(screen.getByText('Required field')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply default styles', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'block',
        'w-full',
        'px-3',
        'py-2',
        'border',
        'rounded-md',
        'shadow-sm',
        'focus:outline-none',
        'focus:ring-1'
      );
    });

    it('should apply normal styles when no error', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-gray-300', 'focus:ring-blue-500', 'focus:border-blue-500');
    });

    it('should apply custom className', () => {
      render(<Input className="custom-class" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });
  });

  describe('Props Forwarding', () => {
    it('should forward HTML input props', () => {
      render(
        <Input 
          type="email"
          placeholder="Enter email"
          disabled
          data-testid="email-input"
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('placeholder', 'Enter email');
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('data-testid', 'email-input');
    });

    it('should handle value and onChange', () => {
      const handleChange = jest.fn();
      render(<Input value="test value" onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('test value');
      
      fireEvent.change(input, { target: { value: 'new value' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('forwardRef', () => {
    it('should forward ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toBe(screen.getByRole('textbox'));
    });

    it('should allow ref methods to be called', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      
      // Should not throw
      expect(() => {
        ref.current?.focus();
        ref.current?.blur();
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should associate label with input', () => {
      render(<Input label="Username" />);
      
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Username');
      
      expect(input).toHaveAttribute('id', 'username');
      expect(label).toHaveAttribute('for', 'username');
    });

    it('should mark error text with role="alert"', () => {
      render(<Input error="Invalid input" />);
      
      const errorText = screen.getByText('Invalid input');
      expect(errorText).toHaveAttribute('role', 'alert');
    });

    it('should be keyboard accessible', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      input.focus();
      
      expect(input).toHaveFocus();
    });
  });

  describe('Label Processing', () => {
    it('should handle labels with spaces correctly', () => {
      render(<Input label="First Name Here" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'first-name-here');
    });

    it('should handle labels with special characters', () => {
      render(<Input label="Email & Phone" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'email-&-phone');
    });

    it('should handle empty/undefined labels', () => {
      render(<Input label="" />);
      
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('id');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle all props together', () => {
      const handleChange = jest.fn();
      render(
        <Input
          label="Email Address"
          type="email"
          value="test@example.com"
          onChange={handleChange}
          error="Invalid email format"
          helperText="We'll never share your email"
          placeholder="Enter your email"
          className="custom-styling"
          id="custom-email-id"
        />
      );

      // Label should be present
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      
      // Input should have correct attributes
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('id', 'custom-email-id');
      expect(input).toHaveValue('test@example.com');
      expect(input).toHaveClass('custom-styling');
      
      // Error should be shown, helper text should not
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email format');
      expect(screen.queryByText("We'll never share your email")).not.toBeInTheDocument();
    });
  });
});