package huffman

import (
	"bytes"
	"container/heap"
	"encoding/binary"
	"fmt"
	"io"
	"os"
)

type Node struct {
	Char    byte
	Freq    int
	MinChar byte
	Left    *Node
	Right   *Node
}

type PriorityQueue []*Node

func (pq PriorityQueue) Len() int { return len(pq) }
func (pq PriorityQueue) Less(i, j int) bool {
	if pq[i].Freq != pq[j].Freq {
		return pq[i].Freq < pq[j].Freq
	}
	return pq[i].MinChar < pq[j].MinChar
}
func (pq PriorityQueue) Swap(i, j int) { pq[i], pq[j] = pq[j], pq[i] }
func (pq *PriorityQueue) Push(x interface{}) {
	*pq = append(*pq, x.(*Node))
}
func (pq *PriorityQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	item := old[n-1]
	*pq = old[:n-1]
	return item
}

// buildFrequencyTable counts byte frequencies in data.
// Time Complexity: O(n), Space Complexity: O(1) since max 256 byte values
func buildFrequencyTable(data []byte) map[byte]int {
	freq := make(map[byte]int)
	for _, b := range data {
		freq[b]++
	}
	return freq
}

// buildHuffmanTree builds a Huffman tree from frequency table deterministically.
// Time Complexity: O(m log m), Space Complexity: O(m) where m is unique byte count (<= 256)
func buildHuffmanTree(freq map[byte]int) *Node {
	if len(freq) == 0 {
		return nil
	}
	pq := &PriorityQueue{}
	heap.Init(pq)
	for b, f := range freq {
		node := &Node{Char: b, Freq: f, MinChar: b}
		heap.Push(pq, node)
	}
	for pq.Len() > 1 {
		left := heap.Pop(pq).(*Node)
		right := heap.Pop(pq).(*Node)
		minChar := left.MinChar
		if right.MinChar < minChar {
			minChar = right.MinChar
		}
		merged := &Node{
			Freq:    left.Freq + right.Freq,
			MinChar: minChar,
			Left:    left,
			Right:   right,
		}
		heap.Push(pq, merged)
	}
	return heap.Pop(pq).(*Node)
}

// generateCodes populates codeMap with bit-strings for each leaf.
// Time Complexity: O(m), Space Complexity: O(m)
func generateCodes(root *Node, prefix string, codeMap map[byte]string) {
	if root == nil {
		return
	}
	if root.Left == nil && root.Right == nil {
		codeMap[root.Char] = prefix
		return
	}
	generateCodes(root.Left, prefix+"0", codeMap)
	generateCodes(root.Right, prefix+"1", codeMap)
}

// encodeDataWithCount encodes data, returns bytes and total bit count.
// Time Complexity: O(n), Space Complexity: O(n)
func encodeDataWithCount(data []byte, codeMap map[byte]string) ([]byte, int, error) {
	var buf bytes.Buffer
	var bitBuf byte
	var bitCount uint8
	var totalBits int

	for _, b := range data {
		code := codeMap[b]
		for _, bit := range code {
			if bit == '1' {
				bitBuf |= 1 << (7 - bitCount)
			}
			bitCount++
			totalBits++
			if bitCount == 8 {
				buf.WriteByte(bitBuf)
				bitBuf = 0
				bitCount = 0
			}
		}
	}
	if bitCount > 0 {
		buf.WriteByte(bitBuf)
	}
	return buf.Bytes(), totalBits, nil
}

// writeHeader serializes frequency table.
// Time Complexity: O(m), Space Complexity: O(m)
func writeHeader(freq map[byte]int) ([]byte, error) {
	var buf bytes.Buffer
	if err := binary.Write(&buf, binary.LittleEndian, uint16(len(freq))); err != nil {
		return nil, err
	}
	for b, f := range freq {
		buf.WriteByte(b)
		if err := binary.Write(&buf, binary.LittleEndian, uint32(f)); err != nil {
			return nil, err
		}
	}
	return buf.Bytes(), nil
}

// HuffmanCompress reads filePath, builds Huffman-coded bytes with header+bitlen.
// Time Complexity: O(n + m log m), Space Complexity: O(n + m)
func HuffmanCompress(filePath string) ([]byte, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	if len(data) == 0 {
		return nil, fmt.Errorf("cannot compress empty file")
	}
	freqTable := buildFrequencyTable(data)
	root := buildHuffmanTree(freqTable)
	codeMap := make(map[byte]string)
	generateCodes(root, "", codeMap)
	encoded, totalBits, err := encodeDataWithCount(data, codeMap)
	if err != nil {
		return nil, err
	}
	head, err := writeHeader(freqTable)
	if err != nil {
		return nil, err
	}
	var out bytes.Buffer
	out.Write(head)
	if err := binary.Write(&out, binary.LittleEndian, uint64(totalBits)); err != nil {
		return nil, err
	}
	out.Write(encoded)
	return out.Bytes(), nil
}

// HuffmanDecompress reads header+bitlen+data.
// Time Complexity: O(n + m log m), Space Complexity: O(n + m)
func HuffmanDecompress(blob []byte) ([]byte, error) {
	r := bytes.NewReader(blob)
	var numEntries uint16
	if err := binary.Read(r, binary.LittleEndian, &numEntries); err != nil {
		return nil, fmt.Errorf("read header entries failed: %v", err)
	}
	freq := make(map[byte]int)
	for i := 0; i < int(numEntries); i++ {
		b, err := r.ReadByte()
		if err != nil {
			return nil, fmt.Errorf("read header byte failed: %v", err)
		}
		var count uint32
		if err := binary.Read(r, binary.LittleEndian, &count); err != nil {
			return nil, fmt.Errorf("read header freq failed: %v", err)
		}
		freq[b] = int(count)
	}
	var totalBits uint64
	if err := binary.Read(r, binary.LittleEndian, &totalBits); err != nil {
		return nil, fmt.Errorf("read bit length failed: %v", err)
	}
	root := buildHuffmanTree(freq)
	if root == nil {
		return nil, fmt.Errorf("invalid tree")
	}
	bitData, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("read encoded data failed: %v", err)
	}
	var out []byte
	node := root
	bitsRead := uint64(0)
	for i := 0; bitsRead < totalBits; i++ {
		byteVal := bitData[i]
		for j := 0; j < 8 && bitsRead < totalBits; j++ {
			bitsRead++
			if (byteVal>>(7-j))&1 == 0 {
				node = node.Left
			} else {
				node = node.Right
			}
			if node.Left == nil && node.Right == nil {
				out = append(out, node.Char)
				node = root
			}
		}
	}
	return out, nil
}
