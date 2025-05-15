package main

import (
	"log"
	"net/http"

	"github.com/kelbwah/huffmin/backend/internal/routes"
	"github.com/labstack/echo/v4"
	echoware "github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()
	e.Use(echoware.Logger())
	e.Use(echoware.Recover())
	e.Use(echoware.CORSWithConfig(echoware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost},
	}))

	e.POST("/compress", func(c echo.Context) error {
		return routes.CompressFile(c)
	})

	e.POST("/decompress", func(c echo.Context) error {
		return routes.DecompressFile(c)
	})

	if err := e.Start(":6969"); err != nil {
		log.Fatalf("Server error: %v\n", err)
	}
}
