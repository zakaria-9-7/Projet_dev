import { motion } from 'motion/react';

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.4,
        ease: 'easeInOut',
      }}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  );
}
