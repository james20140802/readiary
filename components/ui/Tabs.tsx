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
  ariaLabel?: string;
}

export default function Tabs({
  tabs,
  value,
  defaultValue,
  onChange,
  className,
  renderTabPanel,
  fullWidth,
  ariaLabel,
}: TabsProps) {
  const isControlled = value !== undefined;
  const [uncontrolledSelected, setUncontrolledSelected] = useState(defaultValue || tabs[0]?.value);
  const selected = isControlled ? value : uncontrolledSelected;

  const handleTabClick = (value: string) => {
    if (!isControlled) {
      setUncontrolledSelected(value);
    }
    onChange?.(value);
  };

  return (
    <div className={clsx(fullWidth && 'w-full', className)}>
      <div role="group" aria-label={ariaLabel} className="flex space-x-2 border-b border-hairline">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={selected === tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={clsx(
              fullWidth && 'flex-1',
              'min-h-11 border-b-2 border-transparent px-4 py-2 text-button font-medium cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              selected === tab.value ? '!border-accent text-accent' : 'text-ink-sub hover:text-ink'
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
