
import React, { ReactNode } from 'react';

// Card Component
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}
export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => (
  <div className={`bg-slate-800 rounded-lg p-6 shadow-lg ${className}`} {...props}>
    {children}
  </div>
);

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
      md: 'max-w-md',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className={`bg-slate-800 rounded-lg shadow-xl w-full ${sizeClasses[size]} m-4 max-h-[90vh] flex flex-col`}>
        <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-xl font-bold text-slate-400 hover:text-white leading-none px-2">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseClasses = 'rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200';
  const variantClasses = {
    primary: 'bg-primary hover:bg-primary-hover text-black focus:ring-primary',
    secondary: 'bg-secondary hover:bg-green-600 text-black focus:ring-secondary',
    danger: 'bg-danger hover:bg-fuchsia-700 text-white focus:ring-danger',
    ghost: 'bg-transparent hover:bg-slate-700 text-slate-300 focus:ring-primary',
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  return <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...props}>{children}</button>;
};

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
}
export const Input: React.FC<InputProps> = ({ label, id, helperText, ...props }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
    <input id={id} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary" {...props} />
    {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
  </div>
);

// Progress Bar Component
interface ProgressBarProps {
  value: number; // 0 to 100
  colorClass?: string;
}
export const ProgressBar: React.FC<ProgressBarProps> = ({ value, colorClass = 'bg-primary' }) => (
    <div className="w-full bg-slate-700 rounded-full h-2.5">
        <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${value}%` }}></div>
    </div>
);

// Confirmation Modal
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
}
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div>
        <div className="text-slate-300 mb-6">{children}</div>
        <div className="flex justify-end gap-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  );
};