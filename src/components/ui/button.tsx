import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, ElementType, forwardRef } from 'react';
import { Link } from 'react-router-dom';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  asChild?: boolean;
  as?: ElementType;
  to?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', as, asChild, to, ...props }, ref) => {
    const Comp = as || (to ? Link : 'button');
    
    const baseStyles = cn(
      'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      {
        'bg-green-600 text-white hover:bg-green-700': variant === 'primary',
        'bg-blue-600 text-white hover:bg-blue-700': variant === 'secondary',
        'border border-gray-200 bg-white hover:bg-gray-100': variant === 'outline',
        'hover:bg-gray-100': variant === 'ghost',
        'h-9 px-4 text-sm': size === 'sm',
        'h-10 px-6': size === 'md',
        'h-11 px-8': size === 'lg',
      },
      className
    );

    if (to) {
      return <Link to={to} className={baseStyles} {...(props as any)} />;
    }

    return (
      <Comp
        className={baseStyles}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button }