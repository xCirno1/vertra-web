'use client';

import { motion } from 'framer-motion';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex min-h-[calc(100vh-56px)] w-full items-center justify-center px-4 py-12"
    >
      {children}
    </motion.div>
  );
}