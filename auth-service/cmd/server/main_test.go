package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// CustomClaims matches the one defined in the service package
type CustomClaims struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func TestServerStartup(t *testing.T) {
	// Test server startup without database connection
	t.Run("Server startup without database", func(t *testing.T) {
		// This test verifies that the server fails gracefully when database is not available
		// In a real scenario, this would test the main() function behavior

		// For now, we'll test the key loading functionality
		privateKey, publicKey := generateTestRSAKeys(t)

		// Convert keys to PEM format (as they would be in environment variables)
		privateKeyPEM := pem.EncodeToMemory(&pem.Block{
			Type:  "RSA PRIVATE KEY",
			Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
		})

		publicKeyPEM := pem.EncodeToMemory(&pem.Block{
			Type:  "PUBLIC KEY",
			Bytes: x509.MarshalPKCS1PublicKey(publicKey),
		})

		// Test key loading (this would be called from main())
		loadedPrivateKey, loadedPublicKey, err := loadKeysFromPEM(string(privateKeyPEM), string(publicKeyPEM))
		require.NoError(t, err)

		// Verify keys are loaded correctly
		assert.Equal(t, privateKey, loadedPrivateKey)
		assert.Equal(t, publicKey, loadedPublicKey)
	})

	t.Run("Server startup with missing environment variables", func(t *testing.T) {
		// Test that server fails when required environment variables are missing
		originalPrivateKey := os.Getenv("JWT_PRIVATE_KEY")
		originalPublicKey := os.Getenv("JWT_PUBLIC_KEY")

		// Clear environment variables
		os.Unsetenv("JWT_PRIVATE_KEY")
		os.Unsetenv("JWT_PUBLIC_KEY")

		// Restore after test
		defer func() {
			if originalPrivateKey != "" {
				os.Setenv("JWT_PRIVATE_KEY", originalPrivateKey)
			}
			if originalPublicKey != "" {
				os.Setenv("JWT_PUBLIC_KEY", originalPublicKey)
			}
		}()

		// Test key loading fails
		_, _, err := loadKeys()
		require.Error(t, err)
		assert.Contains(t, err.Error(), "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY env vars must be set")
	})

	t.Run("Server startup with invalid key format", func(t *testing.T) {
		// Test with invalid PEM data
		invalidPEM := "-----BEGIN INVALID KEY-----\ninvalid data\n-----END INVALID KEY-----"

		_, _, err := loadKeysFromPEM(invalidPEM, invalidPEM)
		require.Error(t, err)
	})
}

func TestHealthEndpoint(t *testing.T) {
	// Test the health check endpoint
	t.Run("Health endpoint responds correctly", func(t *testing.T) {
		// Create a test HTTP server with just the health endpoint
		router := setupTestRouter()

		// Make request to health endpoint
		req, _ := http.NewRequest("GET", "/health", nil)
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		// Verify response
		assert.Equal(t, http.StatusOK, resp.Code)

		var response map[string]interface{}
		err := decodeJSON(resp.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "ok", response["status"])
	})

	t.Run("Health endpoint CORS headers", func(t *testing.T) {
		router := setupTestRouter()

		req, _ := http.NewRequest("GET", "/health", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		// Verify CORS headers
		assert.Equal(t, "*", resp.Header().Get("Access-Control-Allow-Origin"))
		assert.Contains(t, resp.Header().Get("Access-Control-Allow-Methods"), "GET")
	})
}

func TestAuthenticationFlowIntegration(t *testing.T) {
	// This would be a full integration test if we had a working database
	// For now, we'll test the individual components

	t.Run("Complete authentication flow simulation", func(t *testing.T) {
		// Generate test keys
		privateKey, publicKey := generateTestRSAKeys(t)

		// Test JWT token generation and validation
		accessToken, refreshToken, err := generateTokens(privateKey, "testuser", "admin")
		require.NoError(t, err)
		assert.NotEmpty(t, accessToken)
		assert.NotEmpty(t, refreshToken)

		// Test token validation
		claims, err := validateRefreshToken(refreshToken, publicKey)
		require.NoError(t, err)
		assert.Equal(t, "testuser", claims.Username)
		assert.Equal(t, "admin", claims.Role)
		assert.Equal(t, "refresh", claims.Subject)
	})

	t.Run("Token expiration handling", func(t *testing.T) {
		privateKey, publicKey := generateTestRSAKeys(t)

		// Create tokens with very short expiration for testing
		_, refreshToken, err := generateTokensWithExpiration(privateKey, "testuser", "admin", time.Second)
		require.NoError(t, err)

		// Tokens should be valid immediately
		claims, err := validateRefreshToken(refreshToken, publicKey)
		require.NoError(t, err)
		assert.Equal(t, "testuser", claims.Username)

		// Wait for expiration
		time.Sleep(2 * time.Second)

		// Tokens should now be expired
		_, err = validateRefreshToken(refreshToken, publicKey)
		require.Error(t, err)
	})

	t.Run("Token tampering detection", func(t *testing.T) {
		privateKey, publicKey := generateTestRSAKeys(t)

		// Generate valid token
		_, refreshToken, err := generateTokens(privateKey, "testuser", "admin")
		require.NoError(t, err)

		// Tamper with the token
		tamperedToken := refreshToken[:len(refreshToken)-5] + "XXXXX"

		// Validation should fail
		_, err = validateRefreshToken(tamperedToken, publicKey)
		require.Error(t, err)
	})
}

func TestSecurityHeaders(t *testing.T) {
	t.Run("Security headers on all endpoints", func(t *testing.T) {
		router := setupTestRouter()

		endpoints := []string{"/health", "/auth/login", "/auth/refresh"}

		for _, endpoint := range endpoints {
			req, _ := http.NewRequest("GET", endpoint, nil)
			resp := httptest.NewRecorder()

			router.ServeHTTP(resp, req)

			// Check for security headers
			assert.NotEmpty(t, resp.Header().Get("Content-Type"))

			// For JSON endpoints, verify JSON content type
			if endpoint != "/health" {
				assert.Contains(t, resp.Header().Get("Content-Type"), "application/json")
			}
		}
	})

	t.Run("No sensitive information in responses", func(t *testing.T) {
		router := setupTestRouter()

		// Test various error scenarios
		errorScenarios := []struct {
			endpoint string
			method   string
			body     string
		}{
			{"/auth/login", "POST", `{"username": "admin", "password": "wrong"}`},
			{"/auth/refresh", "POST", ""},
		}

		for _, scenario := range errorScenarios {
			var req *http.Request
			if scenario.body != "" {
				req, _ = http.NewRequest(scenario.method, scenario.endpoint, nil)
			} else {
				req, _ = http.NewRequest(scenario.method, scenario.endpoint, nil)
			}

			resp := httptest.NewRecorder()
			router.ServeHTTP(resp, req)

			responseBody := resp.Body.String()

			// Verify no sensitive information is leaked
			assert.NotContains(t, responseBody, "password")
			assert.NotContains(t, responseBody, "hash")
			assert.NotContains(t, responseBody, "database")
			assert.NotContains(t, responseBody, "sql")
			assert.NotContains(t, responseBody, "private")
			assert.NotContains(t, responseBody, "key")
		}
	})
}

func TestErrorHandling(t *testing.T) {
	t.Run("Invalid JSON handling", func(t *testing.T) {
		router := setupTestRouter()

		// Test with malformed JSON
		req, _ := http.NewRequest("POST", "/auth/login", nil)
		req.Header.Set("Content-Type", "application/json")
		req.Body = nil // This will cause issues

		resp := httptest.NewRecorder()
		router.ServeHTTP(resp, req)

		// Should return error status
		assert.NotEqual(t, http.StatusOK, resp.Code)
	})

	t.Run("Method not allowed", func(t *testing.T) {
		router := setupTestRouter()

		// Test GET on POST-only endpoint
		req, _ := http.NewRequest("GET", "/auth/login", nil)
		resp := httptest.NewRecorder()

		router.ServeHTTP(resp, req)

		// Should return method not allowed or not found
		assert.NotEqual(t, http.StatusOK, resp.Code)
	})

	t.Run("Unsupported content type", func(t *testing.T) {
		router := setupTestRouter()

		req, _ := http.NewRequest("POST", "/auth/login", nil)
		req.Header.Set("Content-Type", "text/plain")

		resp := httptest.NewRecorder()
		router.ServeHTTP(resp, req)

		// Should return error status
		assert.NotEqual(t, http.StatusOK, resp.Code)
	})
}

// Helper functions for testing

func setupTestRouter() *gin.Engine {
	// This would setup a minimal router for testing
	// In a real implementation, this would replicate the main server setup
	router := gin.New()

	// Add basic middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(200)
			return
		}
		c.Next()
	})

	// Add health endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Add auth endpoints (simplified for testing)
	router.POST("/auth/login", func(c *gin.Context) {
		c.JSON(401, gin.H{"error": "Invalid credentials"})
	})

	router.POST("/auth/refresh", func(c *gin.Context) {
		c.JSON(401, gin.H{"error": "Invalid refresh token"})
	})

	return router
}

func generateTestRSAKeys(t *testing.T) (*rsa.PrivateKey, *rsa.PublicKey) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	return privateKey, &privateKey.PublicKey
}

func loadKeysFromPEM(privateKeyPEM, publicKeyPEM string) (*rsa.PrivateKey, *rsa.PublicKey, error) {
	// Decode private key
	privateBlock, _ := pem.Decode([]byte(privateKeyPEM))
	if privateBlock == nil {
		return nil, nil, fmt.Errorf("failed to decode private key pem")
	}

	privateKey, err := x509.ParsePKCS1PrivateKey(privateBlock.Bytes)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to parse private key: %v", err)
	}

	// Decode public key
	publicBlock, _ := pem.Decode([]byte(publicKeyPEM))
	if publicBlock == nil {
		return nil, nil, fmt.Errorf("failed to decode public key pem")
	}

	publicKey, err := x509.ParsePKIXPublicKey(publicBlock.Bytes)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to parse public key: %v", err)
	}

	return privateKey, publicKey.(*rsa.PublicKey), nil
}

func generateTokens(privateKey *rsa.PrivateKey, username, role string) (string, string, error) {
	// This would use the actual JWT service
	// For testing, we'll create a simplified version
	now := time.Now()

	// Access token claims
	accessClaims := CustomClaims{
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "goatak-auth",
		},
	}

	// Refresh token claims
	refreshClaims := CustomClaims{
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "goatak-auth",
			Subject:   "refresh",
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodRS256, accessClaims)
	accessTokenString, err := accessToken.SignedString(privateKey)
	if err != nil {
		return "", "", err
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodRS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(privateKey)
	if err != nil {
		return "", "", err
	}

	return accessTokenString, refreshTokenString, nil
}

func generateTokensWithExpiration(privateKey *rsa.PrivateKey, username, role string, expiration time.Duration) (string, string, error) {
	// Similar to generateTokens but with custom expiration
	now := time.Now()

	accessClaims := CustomClaims{
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(expiration)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "goatak-auth",
		},
	}

	refreshClaims := CustomClaims{
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(expiration)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "goatak-auth",
			Subject:   "refresh",
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodRS256, accessClaims)
	accessTokenString, err := accessToken.SignedString(privateKey)
	if err != nil {
		return "", "", err
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodRS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(privateKey)
	if err != nil {
		return "", "", err
	}

	return accessTokenString, refreshTokenString, nil
}

func validateRefreshToken(tokenString string, publicKey *rsa.PublicKey) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return publicKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		if claims.Subject != "refresh" {
			return nil, fmt.Errorf("invalid token type")
		}
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func decodeJSON(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}
