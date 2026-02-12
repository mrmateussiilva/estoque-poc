package api

import (
	"estoque/internal/services/worker_pools"
	"net/http"
	"os"
)

// ExportStockHandler exporta lista de estoque em CSV usando worker pool
func (h *Handler) ExportStockHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	// Obter usuário do contexto
	user, _ := GetUserFromContext(r, h.DB)
	var userID *int32
	userEmail := "system"
	if user != nil {
		userID = &user.ID
		userEmail = user.Email
	}

	// Criar job de exportação
	job := worker_pools.ExportJob{
		Type:      worker_pools.ExportTypeStock,
		Filters:   make(map[string]string),
		UserID:    userID,
		UserEmail: userEmail,
	}

	// Adicionar filtros
	if search := r.URL.Query().Get("search"); search != "" {
		job.Filters["search"] = search
	}
	if categoryID := r.URL.Query().Get("category_id"); categoryID != "" {
		job.Filters["category_id"] = categoryID
	}

	// Processar exportação via worker pool
	result, err := h.ExportPool.SubmitSync(job)
	if err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao processar exportação", err), "Erro ao exportar")
		return
	}

	if !result.Success {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao gerar exportação", result.Error), "Erro ao exportar")
		return
	}

	// Ler arquivo gerado e enviar para o cliente
	file, err := os.Open(result.FilePath)
	if err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao abrir arquivo exportado", err), "Erro ao exportar")
		return
	}
	defer file.Close()
	defer os.Remove(result.FilePath) // Limpar arquivo temporário após envio

	// Configurar headers para download CSV
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename="+result.FileName)
	w.Header().Set("Content-Transfer-Encoding", "binary")

	// Obter informações do arquivo para modtime
	fileInfo, err := file.Stat()
	if err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao obter informações do arquivo", err), "Erro ao exportar")
		return
	}

	// Copiar arquivo para response
	http.ServeContent(w, r, result.FileName, fileInfo.ModTime(), file)
}

// ExportMovementsHandler exporta movimentações em CSV usando worker pool
func (h *Handler) ExportMovementsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		RespondWithError(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	// Obter usuário do contexto
	user, _ := GetUserFromContext(r, h.DB)
	var userID *int32
	userEmail := "system"
	if user != nil {
		userID = &user.ID
		userEmail = user.Email
	}

	// Criar job de exportação
	job := worker_pools.ExportJob{
		Type:      worker_pools.ExportTypeMovements,
		Filters:   make(map[string]string),
		UserID:    userID,
		UserEmail: userEmail,
	}

	// Adicionar filtros
	if productCode := r.URL.Query().Get("product_code"); productCode != "" {
		job.Filters["product_code"] = productCode
	}
	if movType := r.URL.Query().Get("type"); movType != "" {
		job.Filters["type"] = movType
	}

	// Processar exportação via worker pool
	result, err := h.ExportPool.SubmitSync(job)
	if err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao processar exportação", err), "Erro ao exportar")
		return
	}

	if !result.Success {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao gerar exportação", result.Error), "Erro ao exportar")
		return
	}

	// Ler arquivo gerado e enviar para o cliente
	file, err := os.Open(result.FilePath)
	if err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao abrir arquivo exportado", err), "Erro ao exportar")
		return
	}
	defer file.Close()
	defer os.Remove(result.FilePath) // Limpar arquivo temporário após envio

	// Configurar headers para download CSV
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename="+result.FileName)
	w.Header().Set("Content-Transfer-Encoding", "binary")

	// Obter informações do arquivo para modtime
	fileInfo, err := file.Stat()
	if err != nil {
		HandleError(w, NewAppError(http.StatusInternalServerError, "Erro ao obter informações do arquivo", err), "Erro ao exportar")
		return
	}

	// Copiar arquivo para response
	http.ServeContent(w, r, result.FileName, fileInfo.ModTime(), file)
}

func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
