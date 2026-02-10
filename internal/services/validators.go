package services

import (
	"errors"
	"strings"
)

var (
	ErrEmptyProductCode = errors.New("código do produto é obrigatório")
	ErrInvalidMovementType = errors.New("tipo de movimentação deve ser ENTRADA ou SAIDA")
	ErrInvalidQuantity = errors.New("quantidade deve ser maior que zero")
	ErrEmptyCategoryName = errors.New("nome da categoria é obrigatório")
	ErrEmptyEmail = errors.New("email é obrigatório")
	ErrEmptyPassword = errors.New("senha é obrigatória")
	ErrInvalidEmail = errors.New("email inválido")
)

// ValidateMovementRequest valida os dados de uma requisição de movimentação
func ValidateMovementRequest(productCode, movementType string, quantity float64) error {
	if strings.TrimSpace(productCode) == "" {
		return ErrEmptyProductCode
	}

	if movementType != "ENTRADA" && movementType != "SAIDA" {
		return ErrInvalidMovementType
	}

	if quantity <= 0 {
		return ErrInvalidQuantity
	}

	return nil
}

// ValidateCategoryRequest valida os dados de uma requisição de categoria
func ValidateCategoryRequest(name string) error {
	if strings.TrimSpace(name) == "" {
		return ErrEmptyCategoryName
	}
	return nil
}

// ValidateUserRequest valida os dados de uma requisição de usuário
func ValidateUserRequest(email, password string) error {
	if strings.TrimSpace(email) == "" {
		return ErrEmptyEmail
	}

	// Validação básica de email
	if !strings.Contains(email, "@") || !strings.Contains(email, ".") {
		return ErrInvalidEmail
	}

	if strings.TrimSpace(password) == "" {
		return ErrEmptyPassword
	}

	return nil
}

// ValidateProductUpdate valida os dados de atualização de produto
func ValidateProductUpdate(name string) error {
	if name != "" && strings.TrimSpace(name) == "" {
		return errors.New("nome do produto não pode ser vazio")
	}
	return nil
}
