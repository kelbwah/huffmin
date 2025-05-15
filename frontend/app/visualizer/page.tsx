"use client";

import HuffmanTreeVisualizer from "@/components/huffman-visualizer";
import { motion } from "framer-motion";

export default function VisualizerPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <HuffmanTreeVisualizer />
    </motion.div>
  );
}
