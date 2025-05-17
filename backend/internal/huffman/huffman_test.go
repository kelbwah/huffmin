package huffman

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func createTempFile(t *testing.T, name string, content []byte) string {
	t.Helper()
	tmpDir := t.TempDir()
	tmpFile := filepath.Join(tmpDir, name)
	if err := os.WriteFile(tmpFile, content, 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}
	return tmpFile
}

func TestHuffmanCompressDecompress(t *testing.T) {
	tests := []struct {
		name        string
		content     []byte
		shouldError bool
	}{
		{
			name:        "Empty file",
			content:     []byte(""),
			shouldError: true,
		},
		{
			name:        "Simple ASCII",
			content:     []byte("aaaaabbbbcccdde"),
			shouldError: false,
		},
		{
			name:        "Binary data",
			content:     []byte{0x00, 0xFF, 0xAB, 0xAB, 0xAB, 0x01, 0x02, 0x03},
			shouldError: false,
		},
		{
			name:        "Long repetitive",
			content:     []byte("hello world! hello world! hello world! hello world!"),
			shouldError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := createTempFile(t, tt.name, tt.content)

			compressed, err := HuffmanCompress(path)

			if tt.shouldError {
				if err == nil {
					t.Errorf("expected compress error but got nil")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected compress error: %v", err)
			}
			if len(compressed) == 0 {
				t.Fatal("compressed output is empty")
			}

			decompressed, err := HuffmanDecompress(compressed)
			if err != nil {
				t.Fatalf("unexpected decompress error: %v", err)
			}

			if !bytes.Equal(decompressed, tt.content) {
				t.Errorf("decompressed output does not match original.\nGot: %v\nWant: %v", decompressed, tt.content)
			}
		})
	}
}
