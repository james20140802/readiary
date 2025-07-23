import { ReactNode } from 'react';

interface FormGroupProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export default function FormGroup({ label, children, className }: FormGroupProps) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <label className="block text-sm font-medium text-label">{label}</label>
      {children}
    </div>
  );
}
