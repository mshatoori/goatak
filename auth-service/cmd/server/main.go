package main

import (
	"crypto/rsa"
	"crypto/x509"
	"database/sql"
	"encoding/pem"
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/kdudkov/goatak/auth-service/internal/auth/api"
	"github.com/kdudkov/goatak/auth-service/internal/auth/service"
	"github.com/kdudkov/goatak/auth-service/internal/auth/store"
)

func main() {
	// Database Connection
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbName := os.Getenv("DB_NAME")
	connStr := fmt.Sprintf("postgres://%s:%s@%s:5432/%s", dbUser, dbPass, dbHost, dbName)

	db, err := sql.Open("pgx", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	err = db.Ping()
	for err != nil {
		// Wait for DB? Docker depends_on helps but basic retry logic or crash-restart loop by Docker is common.
		log.Printf("Failed to ping DB: %v", err)
		err = db.Ping()
	}

	// Initialize Store and Auto-seed
	st := store.NewStore(db)
	if err := st.Init(); err != nil {
		log.Fatalf("Store init failed: %v", err)
	}

	// Load Keys
	privKey, pubKey, err := loadKeys()
	if err != nil {
		log.Fatalf("Failed to load keys: %v", err)
	}

	// Initialize Services
	tokenService := service.NewTokenService(privKey, pubKey)
	authService := service.NewAuthService(st, tokenService)
	authHandler := api.NewAuthHandler(authService)

	// Setup Server
	r := gin.Default()

	// Simple health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	authHandler.RegisterRoutes(r)

	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}

func loadKeys() (*rsa.PrivateKey, *rsa.PublicKey, error) {
	privEnv := os.Getenv("JWT_PRIVATE_KEY")
	pubEnv := os.Getenv("JWT_PUBLIC_KEY")

	if privEnv == "" || pubEnv == "" {
		return nil, nil, errors.New("JWT_PRIVATE_KEY and JWT_PUBLIC_KEY env vars must be set")
	}

	// Helper to handle literal \n in env var (common issue)
	// privEnv = strings.ReplaceAll(privEnv, "\\n", "\n")
	// pubEnv = strings.ReplaceAll(pubEnv, "\\n", "\n")

	privBlock, _ := pem.Decode([]byte(privEnv))
	if privBlock == nil {
		return nil, nil, errors.New("failed to decode private key pem")
	}
	privKey, err := x509.ParsePKCS1PrivateKey(privBlock.Bytes)
	if err != nil {
		// Try PKCS8
		k, err2 := x509.ParsePKCS8PrivateKey(privBlock.Bytes)
		if err2 != nil {
			return nil, nil, fmt.Errorf("failed to parse private key: %v | %v", err, err2)
		}
		privKey = k.(*rsa.PrivateKey)
	}

	pubBlock, _ := pem.Decode([]byte(pubEnv))
	if pubBlock == nil {
		return nil, nil, errors.New("failed to decode public key pem")
	}
	pubKey, err := x509.ParsePKIXPublicKey(pubBlock.Bytes)
	if err != nil {
		// Try PKCS1
		k, err2 := x509.ParsePKCS1PublicKey(pubBlock.Bytes)
		if err2 != nil {
			return nil, nil, fmt.Errorf("failed to parse public key: %v | %v", err, err2)
		}
		pubKey = k
	}

	return privKey, pubKey.(*rsa.PublicKey), nil
}
