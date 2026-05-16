import { motion } from 'motion/react';

const variants = {
  primary: 'bg-brand-cyan hover:bg-brand-cyan-dark text-bg-primary font-semibold shadow-glow',
  secondary: 'bg-white/5 hover:bg-white/10 text-ink-primary border border-white/10',
  ghost: 'text-ink-secondary hover:text-ink-primary hover:bg-white/5',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

export function Button({ variant = 'primary', size = 'md', children, ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`rounded-xl font-medium transition-colors ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
