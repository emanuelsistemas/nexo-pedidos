import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps {
  id: string;
  type: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoComplete?: string;
}

const Input: React.FC<InputProps> = ({
  id,
  type: initialType,
  label,
  value,
  onChange,
  required = false,
  autoComplete,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = initialType === 'password';
  const type = isPassword ? (showPassword ? 'text' : 'password') : initialType;

  return (
    <div className="relative mb-6 group fade-in">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder=" "
        required={required}
        autoComplete={autoComplete}
        className="form-input"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <label
        htmlFor={id}
        className={`floating-label ${
          isFocused || value ? '-translate-y-6 -translate-x-2 scale-75 text-primary-500' : ''
        }`}
      >
        {label}
      </label>
      {isPassword && (
        <button
          type="button"
          className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff size={20} />
          ) : (
            <Eye size={20} />
          )}
        </button>
      )}
    </div>
  );
};

export default Input;