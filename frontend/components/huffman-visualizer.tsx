"use client";

import type React from "react";
import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, FileText, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface HuffmanNode {
  char?: string;
  freq: number;
  left?: HuffmanNode;
  right?: HuffmanNode;
}

function buildFrequencyTableBytes(data: Uint8Array): Record<string, number> {
  const freq: Record<string, number> = {};
  data.forEach((b) => {
    const key = `0x${b.toString(16).padStart(2, "0")}`;
    freq[key] = (freq[key] || 0) + 1;
  });
  return freq;
}

function parseCompressedHeader(buffer: ArrayBuffer): Record<string, number> {
  const view = new DataView(buffer);
  let offset = 0;
  const numEntries = view.getUint16(offset, true);
  offset += 2;
  const freq: Record<string, number> = {};
  for (let i = 0; i < numEntries; i++) {
    const byteVal = view.getUint8(offset);
    offset += 1;
    const count = view.getUint32(offset, true);
    offset += 4;
    const key = `0x${byteVal.toString(16).padStart(2, "0")}`;
    freq[key] = count;
  }
  return freq;
}

function buildHuffmanTree(freq: Record<string, number>): HuffmanNode | null {
  const nodes: HuffmanNode[] = Object.entries(freq).map(([char, count]) => ({
    char,
    freq: count,
  }));
  if (nodes.length === 0) return null;
  while (nodes.length > 1) {
    nodes.sort((a, b) => a.freq - b.freq);
    const left = nodes.shift()!;
    const right = nodes.shift()!;
    nodes.push({ freq: left.freq + right.freq, left, right });
  }
  return nodes[0];
}

function drawTree(
  root: HuffmanNode | null,
  svgRef: React.RefObject<SVGSVGElement | null>,
  setError?: (error: string | null) => void
) {
  if (!root || !svgRef.current) {
    if (setError) setError("No data to visualize or SVG reference is missing");
    return;
  }

  if (setError) setError(null);
  const svg = d3.select(svgRef.current);
  svg.selectAll("*").remove();

  const width = svgRef.current.clientWidth;
  const height = svgRef.current.clientHeight - 50;

  const hierarchyData = d3.hierarchy(root, (d) => {
    const children = [];
    if (d.left) children.push(d.left);
    if (d.right) children.push(d.right);
    return children.length > 0 ? children : [];
  });

  const treeLayout = d3.tree().size([width - 100, height - 150]);
  const treeData = treeLayout(hierarchyData);

  const g = svg.append("g").attr("transform", "translate(50, 30)");

  const linkGroup = g.append("g").attr("class", "links");

  linkGroup
    .selectAll("path")
    .data(treeData.links())
    .enter()
    .append("path")
    .attr(
      "d",
      d3
        .linkVertical()
        .x((d) => d.x)
        .y((d) => d.y)
    )
    .attr("fill", "none")
    .attr("stroke", "#94a3b8")
    .attr("stroke-width", 2)
    .attr("stroke-opacity", 0.8);

  const edgeLabelGroup = g.append("g").attr("class", "edge-labels");

  const edgeLabels = edgeLabelGroup
    .selectAll("g")
    .data(treeData.links())
    .enter()
    .append("g")
    .attr("transform", (d) => {
      const midX = (d.source.x + d.target.x) / 2;
      const midY = (d.source.y + d.target.y) / 2;
      return `translate(${midX}, ${midY})`;
    });

  edgeLabels
    .append("circle")
    .attr("r", 12)
    .attr("fill", (d) => {
      const isLeftChild =
        d.source.children && d.source.children[0] === d.target;
      return isLeftChild ? "#4ade80" : "#f43f5e";
    })
    .attr("stroke", "white")
    .attr("stroke-width", 2);

  edgeLabels
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("fill", "white")
    .attr("font-size", "0.9em")
    .attr("font-weight", "bold")
    .text((d) => {
      const isLeftChild =
        d.source.children && d.source.children[0] === d.target;
      return isLeftChild ? "0" : "1";
    });

  const nodeGroup = g
    .append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(treeData.descendants())
    .enter()
    .append("g")
    .attr("class", (d) => `node ${d.data.char ? "leaf-node" : "internal-node"}`)
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

  nodeGroup
    .filter((d) => Boolean(d.data.char))
    .append("rect")
    .attr("x", -30)
    .attr("y", -20)
    .attr("width", 60)
    .attr("height", 40)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("fill", "#f59e0b")
    .attr("stroke", "#d97706")
    .attr("stroke-width", 2);

  nodeGroup
    .filter((d) => !d.data.char)
    .append("circle")
    .attr("r", 20)
    .attr("fill", "#3b82f6")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2);

  nodeGroup
    .append("text")
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .attr("font-size", "0.9em")
    .attr("font-weight", "bold")
    .text((d) => d.data.freq);

  nodeGroup
    .filter((d) => Boolean(d.data.char))
    .append("text")
    .attr("dy", "-1.8em")
    .attr("text-anchor", "middle")
    .attr("fill", "#d97706")
    .attr("font-size", "0.9em")
    .attr("font-weight", "bold")
    .text((d) => d.data.char || "")
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .attr("paint-order", "stroke");

  nodeGroup.append("title").text((d) => {
    if (d.data.char) {
      return `Byte: ${d.data.char}\nFrequency: ${d.data.freq}`;
    } else {
      return `Internal Node\nFrequency: ${d.data.freq}`;
    }
  });

  const legend = svg.append("g").attr("class", "legend");

  legend
    .append("rect")
    .attr("width", 180)
    .attr("height", 160)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("fill", "white")
    .attr("stroke", "#e2e8f0")
    .attr("stroke-width", 1)
    .attr("opacity", 0.9);

  legend
    .append("text")
    .attr("x", 10)
    .attr("y", 20)
    .attr("font-weight", "bold")
    .text("Legend");

  legend
    .append("circle")
    .attr("cx", 20)
    .attr("cy", 40)
    .attr("r", 10)
    .attr("fill", "#3b82f6");

  legend.append("text").attr("x", 40).attr("y", 45).text("Internal Node");

  legend
    .append("rect")
    .attr("x", 10)
    .attr("y", 60)
    .attr("width", 20)
    .attr("height", 20)
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", "#f59e0b");

  legend.append("text").attr("x", 40).attr("y", 75).text("Leaf Node (Byte)");

  legend
    .append("circle")
    .attr("cx", 20)
    .attr("cy", 100)
    .attr("r", 10)
    .attr("fill", "#4ade80");
  legend.append("text").attr("x", 40).attr("y", 105).text("Left Edge (0)");

  legend
    .append("circle")
    .attr("cx", 20)
    .attr("cy", 130)
    .attr("r", 10)
    .attr("fill", "#f43f5e");
  legend.append("text").attr("x", 40).attr("y", 135).text("Right Edge (1)");

  const instructions = svg
    .append("g")
    .attr("class", "instructions")
    .attr("transform", `translate(0,${height - 30})`);

  instructions
    .append("rect")
    .attr("width", 200)
    .attr("height", 80)
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("fill", "white")
    .attr("stroke", "#e2e8f0")
    .attr("stroke-width", 1)
    .attr("opacity", 0.9);

  instructions
    .append("text")
    .attr("x", 10)
    .attr("y", 20)
    .attr("font-weight", "bold")
    .text("Navigation");

  instructions
    .append("text")
    .attr("x", 10)
    .attr("y", 45)
    .text("• Scroll to zoom in/out");

  instructions.append("text").attr("x", 10).attr("y", 65).text("• Drag to pan");

  const zoom = d3
    .zoom()
    .scaleExtent([0.3, 3])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoom);
}

export default function HuffmanTreeVisualizer() {
  const compressSvg = useRef<SVGSVGElement | null>(null);
  const decompressSvg = useRef<SVGSVGElement | null>(null);
  const [compressFileName, setCompressFileName] = useState("");
  const [decompressFileName, setDecompressFileName] = useState("");
  const [compressError, setCompressError] = useState<string | null>(null);
  const [decompressError, setDecompressError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("compress");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Function to generate sample data for demonstration
  const generateSampleData = () => {
    // Create a simple frequency table
    const sampleFreq: Record<string, number> = {
      "0x41": 10, // 'A'
      "0x42": 5, // 'B'
      "0x43": 8, // 'C'
      "0x44": 12, // 'D'
      "0x45": 3, // 'E'
      "0x46": 7, // 'F'
    };

    const root = buildHuffmanTree(sampleFreq);
    drawTree(root, compressSvg, setCompressError);
  };

  // Handle compress input
  useEffect(() => {
    if (!compressFileName) return;

    const input = document.getElementById("compress-input") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setCompressError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = new Uint8Array(reader.result as ArrayBuffer);
        const freq = buildFrequencyTableBytes(arr);
        const root = buildHuffmanTree(freq);
        drawTree(root, compressSvg, setCompressError);
      } catch (err) {
        setCompressError(
          `Error processing file: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setCompressError("Failed to read file");
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }, [compressFileName]);

  // Handle decompress input
  useEffect(() => {
    if (!decompressFileName) return;

    const input = document.getElementById(
      "decompress-input"
    ) as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setDecompressError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        const freq = parseCompressedHeader(buffer);
        const root = buildHuffmanTree(freq);
        drawTree(root, decompressSvg, setDecompressError);
      } catch (err) {
        setDecompressError(
          `Error processing compressed file: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setDecompressError("Failed to read compressed file");
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }, [decompressFileName]);

  const handleZoom = (zoomIn: boolean, tabType: string) => {
    const svgElement =
      tabType === "compress" ? compressSvg.current : decompressSvg.current;
    if (!svgElement) return;

    const svg = d3.select(svgElement);
    const currentZoom = d3.zoomTransform(svgElement);
    const newScale = zoomIn ? currentZoom.k * 1.2 : currentZoom.k / 1.2;

    d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        svg.select("g").attr("transform", event.transform);
      })
      .transform(
        svg,
        d3.zoomIdentity.scale(newScale).translate(currentZoom.x, currentZoom.y)
      );
  };

  useEffect(() => {
    generateSampleData();
  }, []);

  return (
    <div className="container mx-auto py-8 mt-14 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Huffman Tree Visualizer
      </h1>
      <p className="text-gray-600 mb-8 text-center max-w-2xl mx-auto">
        Upload a file to visualize its Huffman tree structure. This tool helps
        you understand how Huffman coding compresses data by assigning
        variable-length codes to input characters.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="compress">Compression Tree</TabsTrigger>
          <TabsTrigger value="decompress">Decompression Tree</TabsTrigger>
        </TabsList>

        <TabsContent value="compress">
          <Card className="p-6">
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 text-lg font-medium">
                  <FileText className="h-5 w-5" />
                  Upload Raw File
                </label>
                <Button onClick={generateSampleData} variant="outline">
                  Generate Sample Data
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    id="compress-input"
                    type="file"
                    onChange={(e) => setCompressFileName(e.target.value)}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full h-20 border-dashed flex flex-col gap-2"
                    onClick={() =>
                      document.getElementById("compress-input")?.click()
                    }
                  >
                    <Upload className="h-5 w-5" />
                    <span>
                      {compressFileName
                        ? compressFileName.split("\\").pop()
                        : "Select file"}
                    </span>
                  </Button>
                </div>

                {compressError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{compressError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="relative mt-6 border rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner">
                {isLoading && activeTab === "compress" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}

                {/* Zoom controls */}
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white"
                    onClick={() => handleZoom(true, "compress")}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white"
                    onClick={() => handleZoom(false, "compress")}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </div>

                <svg
                  ref={compressSvg}
                  width="100%"
                  height="700"
                  className="bg-white"
                  style={{ minHeight: "0px" }}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="decompress">
          <Card className="p-6">
            <div className="flex flex-col space-y-4">
              <label className="flex items-center gap-2 text-lg font-medium">
                <FileText className="h-5 w-5" />
                Upload Compressed File
              </label>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    id="decompress-input"
                    type="file"
                    onChange={(e) => setDecompressFileName(e.target.value)}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full h-20 border-dashed flex flex-col gap-2"
                    onClick={() =>
                      document.getElementById("decompress-input")?.click()
                    }
                  >
                    <Upload className="h-5 w-5" />
                    <span>
                      {decompressFileName
                        ? decompressFileName.split("\\").pop()
                        : "Select compressed file"}
                    </span>
                  </Button>
                </div>

                {decompressError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{decompressError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="relative mt-6 border rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner">
                {isLoading && activeTab === "decompress" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}

                {/* Zoom controls */}
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white"
                    onClick={() => handleZoom(true, "decompress")}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white"
                    onClick={() => handleZoom(false, "decompress")}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </div>

                <svg
                  ref={decompressSvg}
                  width="100%"
                  height="700"
                  className="bg-white"
                  style={{ minHeight: "0px" }}
                />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">
          How to use this visualizer:
        </h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            For <strong>Compression Tree</strong>: Upload any file to visualize
            how it would be encoded using Huffman coding.
          </li>
          <li>
            For <strong>Decompression Tree</strong>: Upload a Huffman-compressed
            file to visualize its decoding tree.
          </li>
          <li>
            Leaf nodes (orange rectangles) represent individual bytes with their
            hex values.
          </li>
          <li>
            Internal nodes (blue circles) show the combined frequency of their
            children.
          </li>
          <li>The edge labels (0/1) represent the bits in the Huffman code.</li>
          <li>
            Use the zoom buttons or scroll to zoom in/out, and drag to pan the
            visualization.
          </li>
        </ul>
      </div>
    </div>
  );
}
