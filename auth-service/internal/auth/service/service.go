package service

import (
	"context"
	"errors"

	"github.com/kdudkov/goatak/auth-service/internal/auth/store"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	store        *store.Store
	tokenService *TokenService
}

func NewAuthService(store *store.Store, tokenService *TokenService) *AuthService {
	return &AuthService{
		store:        store,
		tokenService: tokenService,
	}
}

func (s *AuthService) Login(ctx context.Context, username, password string) (string, string, error) {
	user, err := s.store.GetUser(ctx, username)
	if err != nil {
		return "", "", err
	}
	if user == nil {
		return "", "", errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", "", errors.New("invalid credentials")
	}

	return s.tokenService.GenerateTokens(user.Username, user.Role)
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (string, error) {
	claims, err := s.tokenService.ValidateRefreshToken(refreshToken)
	if err != nil {
		return "", err
	}

	// Verify user still exists
	user, err := s.store.GetUser(ctx, claims.Username)
	if err != nil {
		return "", err
	}
	if user == nil {
		return "", errors.New("user not found")
	}

	// Generate new Access Token ONLY
	// We can reuse GenerateTokens but ignore refresh token, OR implement a method for just Access Token.
	// For simplicity, let's call GenerateTokens and discard the new refresh token (or rotate it).
	// The requirement: "The Refresh Token should be used to get a new Access Token".
	// It doesn't strictly say rotate Refresh Token, but it's good practice.
	// For now, let's return a new Access Token. Rotation is better but basic is asked.

	acc, _, err := s.tokenService.GenerateTokens(user.Username, user.Role)
	return acc, err
}
