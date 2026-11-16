"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function Footer() {
  const year = new Date().getFullYear();
  const reduceMotion = useReducedMotion();

  return (
    <footer className="mt-10 px-4 mb-20 md:mb-8">
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
        whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: false, amount: 0.35 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        whileHover={reduceMotion ? undefined : { y: -4, scale: 1.005 }}
        className="mx-auto max-w-6xl rounded-2xl border border-amber-200/60 bg-gradient-to-b from-maroon to-maroon-dark px-4 py-5 text-center shadow-sm backdrop-blur-lg transition-shadow duration-300 hover:shadow-xl lg:px-6"
      >
        <p className="text-xs text-ivory/80 md:text-sm">
          © {year} NweNyeinHill Monastery. All rights reserved.
        </p>
      </motion.div>
    </footer>
  );
}
