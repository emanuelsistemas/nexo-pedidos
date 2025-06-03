import React from 'react';

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'text' | 'success' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  type = 'button',
  variant = 'primary',
  children,
  onClick,
  fullWidth = false,
  className = '',
  disabled = false,
}) => {
  const baseClasses = 'rounded-lg py-3 px-4 font-medium transition-all duration-300 focus:outline-none focus:ring-2';

  const variantClasses = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-400 focus:ring-opacity-50',
    text: 'text-primary-400 hover:text-primary-300 bg-transparent',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-400 focus:ring-opacity-50',
    secondary: 'bg-gray-600 hover:bg-gray-500 text-white focus:ring-gray-400 focus:ring-opacity-50',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${disabledClass} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;