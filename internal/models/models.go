package models

import (
	"encoding/xml"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// ===== NF-e XML Models (Mantidos como estão) =====
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

// ===== GORM Models =====

type Category struct {
	ID       int32     `gorm:"primaryKey;type:int" json:"id"`
	Name     string    `gorm:"size:191;not null;unique" json:"name"`
	ParentID *int32    `gorm:"type:int" json:"parent_id,omitempty"`
	Parent   *Category `gorm:"foreignKey:ParentID" json:"-"`
	Products []Product `json:"-"`
}

func (Category) TableName() string {
	return "categories"
}

type Supplier struct {
	ID        int32     `gorm:"primaryKey;type:int" json:"id"`
	Name      string    `gorm:"size:191;not null" json:"name"`
	CNPJ      *string   `gorm:"size:20;unique" json:"cnpj,omitempty"`
	Email     *string   `gorm:"size:191" json:"email,omitempty"`
	Phone     *string   `gorm:"size:20" json:"phone,omitempty"`
	Address   *string   `gorm:"type:text" json:"address,omitempty"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	Products  []Product `json:"-"`
}

func (Supplier) TableName() string {
	return "suppliers"
}

type Product struct {
	Code        string         `gorm:"primaryKey;type:varchar(191)" json:"code"`
	Name        string         `gorm:"size:191;not null" json:"name"`
	Description *string        `gorm:"type:text" json:"description,omitempty"`
	CategoryID  *int32         `gorm:"type:int" json:"category_id,omitempty"`
	Category    *Category      `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Unit        string         `gorm:"size:20;default:'UN'" json:"unit"`
	Barcode     *string        `gorm:"size:191;unique" json:"barcode,omitempty"`
	CostPrice   float64        `gorm:"type:decimal(19,4);default:0" json:"cost_price"`
	SalePrice   float64        `gorm:"type:decimal(19,4);default:0" json:"sale_price"`
	MinStock    float64        `gorm:"type:decimal(19,4);default:0" json:"min_stock"`
	MaxStock    *float64       `gorm:"type:decimal(19,4)" json:"max_stock,omitempty"`
	Location    *string        `gorm:"size:191" json:"location,omitempty"`
	SupplierID  *int32         `gorm:"type:int" json:"supplier_id,omitempty"`
	Supplier    *Supplier      `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Active      bool           `gorm:"default:true" json:"active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Stock       *Stock         `gorm:"foreignKey:ProductCode" json:"stock,omitempty"`
}

func (Product) TableName() string {
	return "products"
}

type Stock struct {
	ProductCode string  `gorm:"primaryKey;type:varchar(191)" json:"product_code"`
	Quantity    float64 `gorm:"type:decimal(19,4);default:0" json:"quantity"`
}

func (Stock) TableName() string {
	return "stock"
}

type User struct {
	ID        int32     `gorm:"primaryKey;type:int" json:"id"`
	Name      *string   `gorm:"size:191" json:"name,omitempty"`
	Email     string    `gorm:"size:191;not null;unique" json:"email"`
	Password  string    `gorm:"size:191;not null" json:"-"` // Ocultar do JSON por padrão
	Role      string    `gorm:"size:20;default:'OPERADOR'" json:"role"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
}

func (User) TableName() string {
	return "users"
}

type Movement struct {
	ID          int32     `gorm:"primaryKey;type:int" json:"id"`
	ProductCode string    `gorm:"size:191;not null;type:varchar(191)" json:"product_code"`
	Product     *Product  `gorm:"foreignKey:ProductCode;references:Code" json:"product,omitempty"` // Added for preloading product details
	Type        string    `gorm:"size:20;not null" json:"type"`                                    // ENTRADA ou SAIDA
	Quantity    float64   `gorm:"type:decimal(19,4);not null" json:"quantity"`
	Origin      *string   `gorm:"size:191" json:"origin,omitempty"`
	Reference   *string   `gorm:"size:191" json:"reference,omitempty"`
	UserID      *int32    `gorm:"type:int" json:"user_id,omitempty"`
	User        *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Notes       *string   `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

func (Movement) TableName() string {
	return "movements"
}

type ProcessedNFe struct {
	AccessKey    string    `gorm:"primaryKey;size:191;type:varchar(191)" json:"access_key"`
	Number       *string   `gorm:"size:50" json:"number,omitempty"`
	SupplierName *string   `gorm:"size:191" json:"supplier_name,omitempty"`
	TotalItems   int32     `gorm:"type:int" json:"total_items"`
	ProcessedAt  time.Time `json:"processed_at"`
}

func (ProcessedNFe) TableName() string {
	return "processed_nfes"
}

// ===== Auxiliar Types (Request/Response) =====

type StockItem struct {
	Code         string   `json:"code"`
	Name         string   `json:"name"`
	Quantity     float64  `json:"quantity"`
	Unit         string   `json:"unit,omitempty"`
	MinStock     float64  `json:"min_stock,omitempty"`
	MaxStock     *float64 `json:"max_stock,omitempty"`
	CategoryName string   `json:"category_name,omitempty"`
	SalePrice    float64  `json:"sale_price,omitempty"`
	Description  *string  `json:"description,omitempty"`
	CategoryID   *int32   `json:"category_id,omitempty"`
	Barcode      *string  `json:"barcode,omitempty"`
	CostPrice    float64  `json:"cost_price,omitempty"`
	Location     *string  `json:"location,omitempty"`
	SupplierID   *int32   `json:"supplier_id,omitempty"`
}

type CreateMovementRequest struct {
	ProductCode string  `json:"product_code"`
	Type        string  `json:"type"`
	Quantity    float64 `json:"quantity"`
	Origin      string  `json:"origin,omitempty"`
	Reference   string  `json:"reference,omitempty"`
	Notes       string  `json:"notes,omitempty"`
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
	UserID int32  `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type DashboardStats struct {
	TotalItems       float64 `json:"total_items"`
	TotalSKUs        int64   `json:"total_skus"`
	EntriesThisMonth int64   `json:"entries_this_month"`
	LowStockCount    int64   `json:"low_stock_count"`
}

type StockEvolution struct {
	Month string  `json:"month"`
	Items float64 `json:"items"`
}

// ReportSummary holds aggregated data for a given period
type ReportSummary struct {
	TotalEntriesQuantity float64 `json:"total_entries_quantity"`
	TotalEntriesValue    float64 `json:"total_entries_value"` // Sum of (quantity * cost_price)
	TotalExitsQuantity   float64 `json:"total_exits_quantity"`
	TotalExitsValue      float64 `json:"total_exits_value"` // Sum of (quantity * sale_price)
	NetQuantity          float64 `json:"net_quantity"`      // TotalEntriesQuantity - TotalExitsQuantity
	NetValue             float64 `json:"net_value"`         // TotalEntriesValue - TotalExitsValue
	TotalMovements       int64   `json:"total_movements"`
	UniqueProducts       int64   `json:"unique_products"`
}

// ReportTimelineItem represents a data point for a chart, grouped by date
type ReportTimelineItem struct {
	Date         time.Time `json:"date"`
	Entries      float64   `json:"entries_quantity"`
	Exits        float64   `json:"exits_quantity"`
	EntriesValue float64   `json:"entries_value"`
	ExitsValue   float64   `json:"exits_value"`
}

type EmailConfig struct {
	gorm.Model
	IMAPHost           string `json:"imap_host"`
	IMAPPort           int    `json:"imap_port"`
	IMAPUser           string `json:"imap_user"`
	IMAPPassword       string `json:"imap_password"` // Nota: Em produção, usar criptografia
	IMAPFolder         string `json:"imap_folder"`
	IMAPAllowedSenders string `json:"imap_allowed_senders"` // Lista separada por vírgula
	IMAPSubjectFilter  string `json:"imap_subject_filter"`  // Termo contido no assunto
	UseTLS             bool   `json:"use_tls"`
	Active             bool   `json:"active"`
}

type CreateUserRequest struct {
	Name     *string `json:"name"`
	Email    string  `json:"email"`
	Password string  `json:"password"`
	Role     string  `json:"role"`
}

type UpdateUserRequest struct {
	Name     *string `json:"name"`
	Email    string  `json:"email"`
	Password string  `json:"password"`
	Role     string  `json:"role"`
	Active   *bool   `json:"active"`
}

// FullReportResponse combines summary, timeline, and detailed movements
type FullReportResponse struct {
	Summary           ReportSummary        `json:"summary"`
	Timeline          []ReportTimelineItem `json:"timeline"`
	DetailedMovements []Movement           `json:"detailed_movements"` // Reuse existing Movement struct
}
