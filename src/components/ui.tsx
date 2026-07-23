import type { ReactNode } from 'react';

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type={type}
        className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 'any',
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: string;
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          min={min}
          className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="text-slate-400 text-xs shrink-0">{suffix}</span>}
      </div>
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <select
        className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}

export function SmallButton({
  onClick,
  children,
  variant = 'default',
  type = 'button',
}: {
  onClick?: () => void;
  children: ReactNode;
  variant?: 'default' | 'danger' | 'primary';
  type?: 'button' | 'submit';
}) {
  const styles = {
    default: 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400',
    danger: 'border-rose-200 text-rose-600 hover:border-rose-400 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950',
    primary: 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700',
  }[variant];
  return (
    <button type={type} onClick={onClick} className={`text-xs px-2.5 py-1.5 rounded border whitespace-nowrap ${styles}`}>
      {children}
    </button>
  );
}
