package services

import "testing"

func TestValidateMovementRequest(t *testing.T) {
	tests := []struct {
		name        string
		productCode string
		movementType string
		quantity    float64
		wantErr     bool
	}{
		{
			name:        "validação bem-sucedida - ENTRADA",
			productCode: "PROD001",
			movementType: "ENTRADA",
			quantity:    10.0,
			wantErr:     false,
		},
		{
			name:        "validação bem-sucedida - SAIDA",
			productCode: "PROD001",
			movementType: "SAIDA",
			quantity:    5.0,
			wantErr:     false,
		},
		{
			name:        "erro - código vazio",
			productCode: "",
			movementType: "ENTRADA",
			quantity:    10.0,
			wantErr:     true,
		},
		{
			name:        "erro - código apenas espaços",
			productCode: "   ",
			movementType: "ENTRADA",
			quantity:    10.0,
			wantErr:     true,
		},
		{
			name:        "erro - tipo inválido",
			productCode: "PROD001",
			movementType: "INVALIDO",
			quantity:    10.0,
			wantErr:     true,
		},
		{
			name:        "erro - quantidade zero",
			productCode: "PROD001",
			movementType: "ENTRADA",
			quantity:    0.0,
			wantErr:     true,
		},
		{
			name:        "erro - quantidade negativa",
			productCode: "PROD001",
			movementType: "ENTRADA",
			quantity:    -5.0,
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateMovementRequest(tt.productCode, tt.movementType, tt.quantity)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateMovementRequest() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateCategoryRequest(t *testing.T) {
	tests := []struct {
		name    string
		categoryName string
		wantErr bool
	}{
		{
			name:    "validação bem-sucedida",
			categoryName: "Eletrônicos",
			wantErr: false,
		},
		{
			name:    "erro - nome vazio",
			categoryName: "",
			wantErr: true,
		},
		{
			name:    "erro - nome apenas espaços",
			categoryName: "   ",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateCategoryRequest(tt.categoryName)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateCategoryRequest() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateUserRequest(t *testing.T) {
	tests := []struct {
		name    string
		email   string
		password string
		wantErr bool
	}{
		{
			name:    "validação bem-sucedida",
			email:   "test@example.com",
			password: "senha123",
			wantErr: false,
		},
		{
			name:    "erro - email vazio",
			email:   "",
			password: "senha123",
			wantErr: true,
		},
		{
			name:    "erro - senha vazia",
			email:   "test@example.com",
			password: "",
			wantErr: true,
		},
		{
			name:    "erro - email inválido (sem @)",
			email:   "testexample.com",
			password: "senha123",
			wantErr: true,
		},
		{
			name:    "erro - email inválido (sem .)",
			email:   "test@example",
			password: "senha123",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateUserRequest(tt.email, tt.password)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateUserRequest() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
