'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isEditorRoute = Boolean(pathname?.match(/^\/projects\/[^/]+$/));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
      className={isEditorRoute ? 'h-screen w-screen overflow-hidden' : 'min-h-screen'}
    >
      {children}
    </motion.div>
  );
}
