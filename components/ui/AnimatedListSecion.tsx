'use client';

import { motion } from 'framer-motion';
import { PropsWithChildren } from 'react';

export default function AnimatedListSection({ children }: PropsWithChildren) {
  return (
    <motion.div
      className="space-y-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.08,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
