package api

import (
	"net/http"
	"strconv"
)

// PaginationParams representa os parâmetros de paginação da requisição
type PaginationParams struct {
	Page  int // Página atual (1-indexed)
	Limit int // Itens por página
}

// ParsePaginationParams extrai parâmetros de paginação da query string
func ParsePaginationParams(r *http.Request) PaginationParams {
	page := 1
	limit := 50 // padrão

	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			if l > 100 {
				limit = 100 // máximo
			} else {
				limit = l
			}
		}
	}

	return PaginationParams{
		Page:  page,
		Limit: limit,
	}
}

// PaginatedResponse representa uma resposta paginada
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Pagination struct {
		Page       int   `json:"page"`
		Limit      int   `json:"limit"`
		Total      int64 `json:"total"`
		TotalPages int   `json:"total_pages"`
	} `json:"pagination"`
}

// NewPaginatedResponse cria uma resposta paginada
func NewPaginatedResponse(data interface{}, total int64, params PaginationParams) PaginatedResponse {
	totalPages := int(total) / params.Limit
	if int(total)%params.Limit > 0 {
		totalPages++
	}
	if totalPages == 0 && total > 0 {
		totalPages = 1
	}

	return PaginatedResponse{
		Data: data,
		Pagination: struct {
			Page       int   `json:"page"`
			Limit      int   `json:"limit"`
			Total      int64 `json:"total"`
			TotalPages int   `json:"total_pages"`
		}{
			Page:       params.Page,
			Limit:      params.Limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}
}
