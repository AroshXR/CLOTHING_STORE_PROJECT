import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
export const editorialEase = [.22, 1, .36, 1];
export default function Reveal({ children, className = '', delay = 0, as = 'div', ...props }) {
  const reduced = useReducedMotion(), Component = as === 'section' ? motion.section : motion.div;
  return <Component className={className} initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }} transition={{ duration: .75, delay, ease: editorialEase }} {...props}>{children}</Component>;
}
