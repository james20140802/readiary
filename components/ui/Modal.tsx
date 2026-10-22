'use client';

import Sheet from '@/components/ui/Sheet';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** 확인 창 — 이제 Sheet 위에 얹힌다(모바일은 아래에서 올라오고 데스크톱은 가운데 창). 제목 없이 내용만 받는다 */
export default function Modal({ isOpen, onClose, children }: ModalProps) {
  return (
    <Sheet open={isOpen} onClose={onClose}>
      {children}
    </Sheet>
  );
}
