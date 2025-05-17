"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileArchive,
  Upload,
  Download,
  FileUp,
  FileDown,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

function downloadBlob(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(downloadUrl);
}

export default function Home() {
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [decompressedFile, setDecompressedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<"compress" | "decompress" | null>(
    null
  );
  const [success, setSuccess] = useState<"compress" | "decompress" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "compress" | "decompress"
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      if (fileType === "compress") {
        setCompressedFile(e.target.files[0]);
      } else {
        setDecompressedFile(e.target.files[0]);
      }
      setSuccess(null);
      setError(null);
    }
  };

  const handleSubmit = async (
    e: React.FormEvent,
    submitType: "compress" | "decompress"
  ) => {
    e.preventDefault();
    setLoading(submitType);
    setSuccess(null);
    setError(null);

    try {
      const file =
        submitType === "compress" ? compressedFile : decompressedFile;
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      const endpoint =
        submitType === "compress"
          ? "http://localhost:6969/compress"
          : "http://localhost:6969/decompress";

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("File processing failed");

      const blob = await response.blob();

      const outputFileName =
        submitType === "compress"
          ? `compressed_${file.name}.huff`
          : `decompressed_${file.name.replace(/\.huff$/, "")}`;

      downloadBlob(blob, outputFileName);
      setSuccess(submitType);

      // Reset file input
      if (submitType === "compress") {
        setCompressedFile(null);
      } else {
        setDecompressedFile(null);
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="pt-24 pb-16 min-h-screen w-full flex flex-col items-center justify-center">
        <motion.div
          className="max-w-4xl w-full mx-auto px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                delay: 0.2,
              }}
            >
              <FileArchive className="h-16 w-16 mx-auto text-blue-600 mb-4" />
            </motion.div>

            <motion.h1
              className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Huffmin
            </motion.h1>

            <motion.p
              className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Compress/Decompress your files below.
            </motion.p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <motion.div
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
              whileHover={{
                y: -5,
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="text-center mb-4">
                <FileUp className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <h2 className="text-xl font-semibold">Compress File</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Reduce file size with Huffman coding
                </p>
              </div>

              <form onSubmit={(e) => handleSubmit(e, "compress")}>
                <div className="mb-4">
                  <label
                    htmlFor="compress-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Select file to compress
                  </label>
                  <div className="relative">
                    <Input
                      id="compress-input"
                      type="file"
                      onChange={(e) => handleFileChange(e, "compress")}
                      className="cursor-pointer"
                      value={compressedFile ? undefined : ""}
                    />
                  </div>
                  {compressedFile && (
                    <motion.p
                      className="mt-2 text-sm text-gray-600 dark:text-gray-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Selected: {compressedFile.name} (
                      {(compressedFile.size / 1024).toFixed(2)} KB)
                    </motion.p>
                  )}
                </div>

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    type="submit"
                    disabled={!compressedFile || loading !== null}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg"
                  >
                    {loading === "compress" ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Number.POSITIVE_INFINITY,
                          duration: 1,
                          ease: "linear",
                        }}
                        className="mr-2"
                      >
                        <Upload className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {loading === "compress"
                      ? "Compressing..."
                      : "Compress File"}
                  </Button>
                </motion.div>

                <AnimatePresence>
                  {success === "compress" && (
                    <motion.div
                      className="mt-3 text-center text-green-600 flex items-center justify-center"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">
                        File compressed successfully!
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
              whileHover={{
                y: -5,
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <div className="text-center mb-4">
                <FileDown className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                <h2 className="text-xl font-semibold">Decompress File</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Restore compressed .huff files
                </p>
              </div>

              <form onSubmit={(e) => handleSubmit(e, "decompress")}>
                <div className="mb-4">
                  <label
                    htmlFor="decompress-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Select .huff file to decompress
                  </label>
                  <Input
                    id="decompress-input"
                    type="file"
                    onChange={(e) => handleFileChange(e, "decompress")}
                    className="cursor-pointer"
                    value={decompressedFile ? undefined : ""}
                  />
                  {decompressedFile && (
                    <motion.p
                      className="mt-2 text-sm text-gray-600 dark:text-gray-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      Selected: {decompressedFile.name} (
                      {(decompressedFile.size / 1024).toFixed(2)} KB)
                    </motion.p>
                  )}
                </div>

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    type="submit"
                    disabled={!decompressedFile || loading !== null}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg"
                  >
                    {loading === "decompress" ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Number.POSITIVE_INFINITY,
                          duration: 1,
                          ease: "linear",
                        }}
                        className="mr-2"
                      >
                        <Download className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {loading === "decompress"
                      ? "Decompressing..."
                      : "Decompress File"}
                  </Button>
                </motion.div>

                <AnimatePresence>
                  {success === "decompress" && (
                    <motion.div
                      className="mt-3 text-center text-green-600 flex items-center justify-center"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm">
                        File decompressed successfully!
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>
          </div>

          <motion.div
            className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <p>
              Huffmin uses Huffman coding algorithm for efficient file
              compression
            </p>
            <p className="mt-1">
              Upload your files to compress or decompress them instantly
            </p>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
