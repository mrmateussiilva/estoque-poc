package events

import (
	"fmt"
	"log/slog"
	"sync"
)

// NotificationEvent representa um evento de notificação para o frontend
type NotificationEvent struct {
	Type    string      `json:"type"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Hub gerencia clientes SSE conectados
type Hub struct {
	clients    map[chan NotificationEvent]bool
	Register   chan chan NotificationEvent
	Unregister chan chan NotificationEvent
	broadcast  chan NotificationEvent
	mu         sync.RWMutex
}

var (
	globalHub *Hub
	hubOnce   sync.Once
)

// GetHub retorna a instância singleton do Hub de notificações
func GetHub() *Hub {
	hubOnce.Do(func() {
		globalHub = &Hub{
			clients:    make(map[chan NotificationEvent]bool),
			Register:   make(chan chan NotificationEvent),
			Unregister: make(chan chan NotificationEvent),
			broadcast:  make(chan NotificationEvent),
		}
		go globalHub.run()
	})
	return globalHub
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			slog.Debug("Novo cliente SSE conectado", "total_clients", len(h.clients))

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client)
			}
			h.mu.Unlock()
			slog.Debug("Cliente SSE desconectado", "total_clients", len(h.clients))

		case event := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client <- event:
				default:
					slog.Warn("Removendo cliente SSE lento")
					go func(c chan NotificationEvent) {
						h.Unregister <- c
					}(client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Notify envia uma notificação para todos os clientes conectados
func (h *Hub) Notify(eventType, message string, data interface{}) {
	event := NotificationEvent{
		Type:    eventType,
		Message: message,
		Data:    data,
	}
	h.broadcast <- event
}

// NotifyNewNFe dispara um evento de nova NF-e
func NotifyNewNFe(number, supplier string) {
	msg := fmt.Sprintf("Nova Nota Fiscal Detectada! Nº %s de %s aguarda aprovação.", number, supplier)
	GetHub().Notify("NEW_NFE", msg, map[string]string{
		"number":   number,
		"supplier": supplier,
	})
}
