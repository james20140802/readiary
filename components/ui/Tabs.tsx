'use client';

import { useState, ReactNode } from 'react';
import clsx from 'clsx';

interface Tab {
  label: string;
  value: string;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  renderTabPanel?: (value: string) => ReactNode;
  fullWidth?: boolean;
}

export default function Tabs({
  tabs,
  defaultValue,
  onChange,
  className,
  renderTabPanel,
  fullWidth,
}: TabsProps) {
  const [selected, setSelected] = useState(defaultValue || tabs[0]?.value);

  const handleTabClick = (value: string) => {
    setSelected(value);
    onChange?.(value);
  };

  return (
    <div className={clsx(fullWidth && 'w-full', className)}>
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={clsx(
              fullWidth && 'flex-1',
              'px-4 py-2 text-sm md:text-lg font-medium transition-colors',
              selected === tab.value
                ? 'border-b-2 border-tint text-tint'
                : 'text-secondary hover:text-label'
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
