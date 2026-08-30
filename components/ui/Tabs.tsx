'use client';

import { useState, ReactNode } from 'react';
import clsx from 'clsx';

interface Tab {
  label: string;
  value: string;
}

interface TabsProps {
  tabs: Tab[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  renderTabPanel?: (value: string) => ReactNode;
  fullWidth?: boolean;
}

export default function Tabs({
  tabs,
  value,
  defaultValue,
  onChange,
  className,
  renderTabPanel,
  fullWidth,
}: TabsProps) {
  const isControlled = value !== undefined;
  const [uncontrolledSelected, setUncontrolledSelected] = useState(
    defaultValue || tabs[0]?.value
  );
  const selected = isControlled ? value : uncontrolledSelected;

  const handleTabClick = (value: string) => {
    if (!isControlled) {
      setUncontrolledSelected(value);
    }
    onChange?.(value);
  };

  return (
    <div className={clsx(fullWidth && 'w-full', className)}>
      <div className="flex space-x-2 border-b border-hairline">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={clsx(
              fullWidth && 'flex-1',
              'px-4 py-2 text-sm md:text-base font-medium transition-colors',
              selected === tab.value
                ? 'border-b-2 border-accent text-accent'
                : 'text-ink-sub hover:text-ink'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderTabPanel && <div className="mt-4">{renderTabPanel(selected)}</div>}
    </div>
  );
}
