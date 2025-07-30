import React from 'react';

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'text' | 'success' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  type = 'button',
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  fullWidth = false,
  className = '',
  disabled = false,
}) => {
  const baseClasses = 'rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 flex items-center justify-center';

  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4',
    lg: 'py-4 px-6 text-lg',
  };

  const variantClasses = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-400 focus:ring-opacity-50',
    text: 'text-primary-400 hover:text-primary-300 bg-transparent',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-400 focus:ring-opacity-50',
    secondary: 'bg-gray-600 hover:bg-gray-500 text-white focus:ring-gray-400 focus:ring-opacity-50',
    outline: 'bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white focus:ring-gray-400 focus:ring-opacity-50',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${disabledClass} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;