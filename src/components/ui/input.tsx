import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leadingIcon,
  trailingIcon,
  className = '',
  containerClassName = '',
  disabled,
  id,
  ...props
}, ref) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 select-none"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="absolute right-3.5 flex items-center text-slate-400 pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`w-full h-10 sm:h-11 rounded-xl bg-white dark:bg-slate-900 border text-sm text-slate-900 dark:text-white placeholder-slate-400 transition-all duration-150 focus:outline-none focus:ring-2 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed ${
            leadingIcon ? 'pr-10' : 'pr-3.5'
          } ${trailingIcon ? 'pl-10' : 'pl-3.5'} ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-primary/20'
          } ${className}`}
          {...props}
        />
        {trailingIcon && (
          <span className="absolute left-3.5 flex items-center text-slate-400">
            {trailingIcon}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs font-medium text-rose-500 mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
