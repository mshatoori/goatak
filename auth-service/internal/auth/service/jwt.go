package service

import (
	"crypto/rsa"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type CustomClaims struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

type TokenService struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
}

func NewTokenService(privKey *rsa.PrivateKey, pubKey *rsa.PublicKey) *TokenService {
	return &TokenService{
		privateKey: privKey,
		publicKey:  pubKey,
	}
}

func (s *TokenService) GenerateTokens(username, role string) (string, string, error) {
	// Access Token (15 min)
	accessTokenClaims := CustomClaims{
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "goatak-auth",
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodRS256, accessTokenClaims)
	accessTokenString, err := accessToken.SignedString(s.privateKey)
	if err != nil {
		return "", "", err
	}

	// Refresh Token (30 days)
	refreshTokenClaims := CustomClaims{
		Username: username,
		Role:     role, // In real app, maybe just ID
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "goatak-auth",
			Subject:   "refresh",
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodRS256, refreshTokenClaims)
	refreshTokenString, err := refreshToken.SignedString(s.privateKey)
	if err != nil {
		return "", "", err
	}

	return accessTokenString, refreshTokenString, nil
}

func (s *TokenService) ValidateRefreshToken(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.publicKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		if claims.Subject != "refresh" {
			return nil, errors.New("invalid token type")
		}
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
