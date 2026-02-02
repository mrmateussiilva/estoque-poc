package models

import (
	"encoding/xml"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ===== NF-e XML Models =====
type NfeProc struct {
	XMLName xml.Name `xml:"nfeProc"`
	NFe     NFe      `xml:"NFe"`
}

type NFe struct {
	InfNFe InfNFe `xml:"infNFe"`
}

type InfNFe struct {
	ID  string `xml:"Id,attr"`
	Det []Det  `xml:"det"`
}

type Det struct {
	Prod Prod `xml:"prod"`
}

type Prod struct {
	CProd string  `xml:"cProd"`
	XProd string  `xml:"xProd"`
	QCom  float64 `xml:"qCom"`
}

// ===== Product Models =====
type Product struct {
	Code        string     `json:"code"`
	Name        string     `json:"name"`
	Description *string    `json:"description,omitempty"`
	CategoryID  *int       `json:"category_id,omitempty"`
	Unit        string     `json:"unit"`
	Barcode     *string    `json:"barcode,omitempty"`
	CostPrice   float64    `json:"cost_price"`
	SalePrice   float64    `json:"sale_price"`
	MinStock    float64    `json:"min_stock"`
	MaxStock    *float64   `json:"max_stock,omitempty"`
	Location    *string    `json:"location,omitempty"`
	SupplierID  *int       `json:"supplier_id,omitempty"`
	Active      bool       `json:"active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type StockItem struct {
	Code         string   `json:"code"`
	Name         string   `json:"name"`
	Quantity     float64  `json:"quantity"`
	Unit         string   `json:"unit,omitempty"`
	MinStock     float64  `json:"min_stock,omitempty"`
	MaxStock     *float64  `json:"max_stock,omitempty"`
	CategoryName string   `json:"category_name,omitempty"`
	SalePrice    float64  `json:"sale_price,omitempty"`
	Description  *string  `json:"description,omitempty"`
	CategoryID   *int     `json:"category_id,omitempty"`
	Barcode      *string  `json:"barcode,omitempty"`
	CostPrice    float64  `json:"cost_price,omitempty"`
	Location     *string  `json:"location,omitempty"`
	SupplierID   *int     `json:"supplier_id,omitempty"`
}

// ===== Movement Models =====
type Movement struct {
	ID          int       `json:"id"`
	ProductCode string    `json:"product_code"`
	Type        string    `json:"type"` // ENTRADA ou SAIDA
	Quantity    float64   `json:"quantity"`
	Origin      *string   `json:"origin,omitempty"`
	Reference   *string   `json:"reference,omitempty"`
	UserID      *int      `json:"user_id,omitempty"`
	Notes       *string   `json:"notes,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateMovementRequest struct {
	ProductCode string  `json:"product_code"`
	Type        string  `json:"type"`
	Quantity    float64 `json:"quantity"`
	Origin      string  `json:"origin,omitempty"`
	Reference   string  `json:"reference,omitempty"`
	Notes       string  `json:"notes,omitempty"`
}

// ===== Category Models =====
type Category struct {
	ID       int     `json:"id"`
	Name     string  `json:"name"`
	ParentID *int    `json:"parent_id,omitempty"`
}

// ===== Supplier Models =====
type Supplier struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	CNPJ      *string   `json:"cnpj,omitempty"`
	Email     *string   `json:"email,omitempty"`
	Phone     *string   `json:"phone,omitempty"`
	Address   *string   `json:"address,omitempty"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
}

// ===== User Models =====
type User struct {
	ID        int       `json:"id"`
	Name      *string   `json:"name,omitempty"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type Claims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// ===== Dashboard Models =====
type DashboardStats struct {
	TotalItems       float64 `json:"total_items"`
	TotalSKUs        int     `json:"total_skus"`
	EntriesThisMonth int     `json:"entries_this_month"`
	LowStockCount    int     `json:"low_stock_count"`
}

type StockEvolution struct {
	Month string  `json:"month"`
	Items float64 `json:"items"`
}

// ===== NF-e Models =====
type ProcessedNFe struct {
	AccessKey    string    `json:"access_key"`
	Number       *string   `json:"number,omitempty"`
	SupplierName *string   `json:"supplier_name,omitempty"`
	TotalItems   int       `json:"total_items"`
	ProcessedAt  time.Time `json:"processed_at"`
}
