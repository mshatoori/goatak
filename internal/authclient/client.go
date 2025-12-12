package authclient

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type AuthClient struct {
	publicKey *rsa.PublicKey
}

func NewAuthClient() (*AuthClient, error) {
	pubEnv := os.Getenv("JWT_PUBLIC_KEY")
	if pubEnv == "" {
		// Just for safety, validation will fail if nil
		return nil, errors.New("JWT_PUBLIC_KEY env var is not set")
	}

	block, _ := pem.Decode([]byte(pubEnv))
	if block == nil {
		return nil, errors.New("failed to decode public key pem")
	}

	pubKey, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		// Try PKCS1
		k, err2 := x509.ParsePKCS1PublicKey(block.Bytes)
		if err2 != nil {
			return nil, fmt.Errorf("failed to parse public key: %v | %v", err, err2)
		}
		pubKey = k
	}

	return &AuthClient{publicKey: pubKey.(*rsa.PublicKey)}, nil
}

func (c *AuthClient) ValidateToken(tokenString string) (string, string, error) {
	if c.publicKey == nil {
		return "", "", errors.New("public key not initialized")
	}

	// Remove Bearer prefix if present
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return c.publicKey, nil
	})

	if err != nil {
		return "", "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		username, _ := claims["username"].(string)
		role, _ := claims["role"].(string)
		return username, role, nil
	}

	return "", "", errors.New("invalid token")
}
