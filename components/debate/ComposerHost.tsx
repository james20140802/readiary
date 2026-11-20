'use client';

import { useMediaQuery } from 'react-responsive';
import Sheet from '@/components/ui/Sheet';

/** 768px 이상이면 단락 안에 그대로, 그보다 좁으면 아래에서 올라오는 시트에 담는다 */
export const WIDE_COMPOSER_QUERY = { minWidth: 768 };

interface Props {
  open: boolean;
  title: string;
  onClose(): void;
  children: React.ReactNode;
}

export default function ComposerHost({ open, title, onClose, children }: Props) {
  const wide = useMediaQuery(WIDE_COMPOSER_QUERY);
  if (!open) return null;
  if (wide) {
    return <div className="composer-in mt-3 py-2">{children}</div>;
  }
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {children}
    </Sheet>
  );
}
