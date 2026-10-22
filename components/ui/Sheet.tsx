'use client';

import { Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMediaQuery } from 'react-responsive';
import { EASE_DRAWER, EASE_OUT } from '@/lib/motion';
import InertBackground from '@/components/ui/InertBackground';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** 있으면 머리줄(제목 + 닫기)을 그린다. 없으면 손잡이와 몸만 */
  title?: string;
  closeLabel?: string;
  /** 머리줄 제목이 없을 때 대화상자 이름으로 읽힌다 */
  ariaLabel?: string;
  children: React.ReactNode;
}

/**
 * 간지 시트 — 모바일은 아래에서 올라오는 시트, lg 이상은 가운데 창.
 * 껍데기는 EntryEditSheet와 같은 공식 패턴: `static` Dialog를 AnimatePresence 안에 둬서
 * 포커스 가두기·Esc·바깥 클릭·배경 inert는 Headless UI가, 들어오고 나가는 움직임은 framer가 맡는다.
 */
export default function Sheet({
  open,
  onClose,
  title,
  closeLabel = '닫기',
  ariaLabel,
  children,
}: SheetProps) {
  const isDesktop = useMediaQuery({ minWidth: 1024 });

  return (
    <AnimatePresence>
      {open && (
        <Dialog static open={open} onClose={onClose} className="relative z-[100]">
          <InertBackground />
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32 }}
            className="fixed inset-0 bg-scrim/[.32]"
          />
          <div className="fixed inset-0 flex items-end justify-center lg:items-center">
            <DialogPanel as={Fragment}>
              <motion.div
                aria-label={title ? undefined : ariaLabel}
                initial={isDesktop ? { opacity: 0, scale: 0.97 } : { y: '100%' }}
                animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
                exit={isDesktop ? { opacity: 0, scale: 0.97 } : { y: '100%' }}
                transition={
                  isDesktop
                    ? { duration: 0.2, ease: EASE_OUT }
                    : { duration: 0.32, ease: EASE_DRAWER }
                }
                className="mx-auto max-h-[88dvh] w-full max-w-[560px] overflow-auto overscroll-contain rounded-t-[18px] bg-sheet text-ink shadow-[0_-10px_40px_-10px_rgb(30_20_10/.35)] lg:rounded-2xl lg:shadow-[0_30px_80px_-20px_rgb(30_20_10/.45)]"
              >
                <div
                  aria-hidden
                  className="mx-auto mt-2 h-[5px] w-9 rounded-[3px] bg-[rgb(127_127_127/.35)] lg:hidden"
                />
                <div
                  className={`px-[22px] pb-[calc(26px+var(--app-safe-bottom))] ${title ? 'pt-[10px]' : 'pt-[22px]'}`}
                >
                  {title && (
                    <div className="flex min-h-12 items-center gap-2">
                      <DialogTitle as="h2" className="font-sans text-[18px] font-bold">
                        {title}
                      </DialogTitle>
                      <button
                        type="button"
                        onClick={onClose}
                        className="ml-auto min-h-11 px-1 font-sans text-[16px] font-semibold text-accent"
                      >
                        {closeLabel}
                      </button>
                    </div>
                  )}
                  {children}
                </div>
              </motion.div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
