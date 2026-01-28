package models

import (
	"encoding/xml"
	"github.com/golang-jwt/jwt/v5"
)

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

type StockItem struct {
	Code     string  `json:"code"`
	Name     string  `json:"name"`
	Quantity float64 `json:"quantity"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type Claims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}
