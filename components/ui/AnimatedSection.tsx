'use client';

import { motion } from 'framer-motion';
import { type PropsWithChildren } from 'react';

export default function AnimatedSection({ children }: PropsWithChildren) {
  return (
    <motion.section
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
}
