import React, { ReactNode } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}) => {
  const baseClasses = 'px-4 py-2 rounded-md font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-400',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };
  
  const finalClassName = [
    baseClasses, 
    variantClasses[variant], 
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={finalClassName} {...props}>
      {children}
    </button>
  );
};

export default Button;