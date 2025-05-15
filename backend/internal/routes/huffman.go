package routes

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/kelbwah/huffmin/backend/internal/huffman"
	"github.com/labstack/echo/v4"
)

func CompressFile(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "file required")
	}
	src, err := file.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "cannot open uploaded file")
	}
	defer src.Close()

	tempInputPath := filepath.Join(os.TempDir(), file.Filename)
	outFile, err := os.Create(tempInputPath)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to create temp file")
	}
	defer outFile.Close()

	_, err = io.Copy(outFile, src)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to copy file data")
	}

	// Compress File
	compressedBytes, err := huffman.HuffmanCompress(tempInputPath)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "compression failed")
	}

	c.Response().Header().Set(echo.HeaderContentType, "application/octet-stream")
	c.Response().Header().Set(
		echo.HeaderContentDisposition,
		"attachment; filename=\"compressed_"+file.Filename+"\"",
	)

	_, err = c.Response().Write(compressedBytes)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to write response")
	}

	return nil
}

func DecompressFile(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "file required")
	}

	src, err := file.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "cannot open uploaded file")
	}
	defer src.Close()

	compressedBytes, err := io.ReadAll(src)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to read uploaded file")
	}

	decompressedBytes, err := huffman.HuffmanDecompress(compressedBytes)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "decompression failed")
	}

	c.Response().Header().Set(echo.HeaderContentType, "application/octet-stream")
	c.Response().Header().Set(
		echo.HeaderContentDisposition,
		"attachment; filename=\"decompressed_"+strings.TrimSuffix(file.Filename, ".huff")+"\"",
	)

	_, err = c.Response().Write(decompressedBytes)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to write response")
	}

	return nil
}
