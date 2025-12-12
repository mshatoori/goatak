package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID       int
	Username string
	Password string
	Role     string
}

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Init() error {
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'user'
		);
	`)
	if err != nil {
		return err
	}

	// Seed default admin user if none exists
	var count int
	err = s.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		hashed, _ := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
		_, err = s.db.Exec("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", "admin", string(hashed), "admin")
		if err != nil {
			return err
		}
		fmt.Println("Seeded default user: admin/admin")
	}

	return nil
}

func (s *Store) GetUser(ctx context.Context, username string) (*User, error) {
	row := s.db.QueryRowContext(ctx, "SELECT id, username, password, role FROM users WHERE username = $1", username)
	var u User
	if err := row.Scan(&u.ID, &u.Username, &u.Password, &u.Role); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // Not found
		}
		return nil, err
	}
	return &u, nil
}

func (s *Store) CreateUser(ctx context.Context, username, password, role string) error {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", username, string(hashed), role)
	return err
}
