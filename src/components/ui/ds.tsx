/**
 * UI PRIMITIVES — Fase 0/1.
 *
 * Ditulis tangan, tanpa dependency baru (tidak ada shadcn/Radix).
 * Semua styling dari design-tokens.css, jadi otomatis ikut tema yang dipilih.
 *
 * Aman untuk UI lama: komponen ini hanya dipakai kalau diimpor.
 * Tidak ada file lama yang diubah oleh keberadaan file ini.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return <button className={`ds-btn ${className}`} data-variant={variant} data-size={size} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="ds-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="ds-error">{error}</p> : hint ? <p className="ds-hint">{hint}</p> : null}
    </div>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ds-input ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ds-textarea ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`ds-select ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Card({ className = '', pad = true, children }: { className?: string; pad?: boolean; children: ReactNode }) {
  return <div className={`ds-card ${pad ? 'ds-card-pad' : ''} ${className}`}>{children}</div>;
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'info'; children: ReactNode }) {
  return (
    <span className="ds-badge" data-tone={tone}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="ds-empty">
      {icon ? <div className="ds-empty-icon">{icon}</div> : null}
      <p className="ds-h2">{title}</p>
      <p className="ds-small" style={{ maxWidth: 340 }}>
        {body}
      </p>
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="ds-page-head">
      <div>
        <h1 className="ds-h1">{title}</h1>
        {description ? (
          <p className="ds-small" style={{ marginTop: 4 }}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 8 }}>{actions}</div> : null}
    </div>
  );
}
