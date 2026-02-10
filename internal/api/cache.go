package api

import (
	"estoque/internal/models"
	"sync"
	"time"
)

// CacheItem representa um item em cache com TTL
type CacheItem struct {
	Data      interface{}
	ExpiresAt time.Time
}

// InMemoryCache é um cache simples em memória com TTL
type InMemoryCache struct {
	items map[string]*CacheItem
	mu    sync.RWMutex
}

var cache *InMemoryCache
var cacheOnce sync.Once

// GetCache retorna a instância singleton do cache
func GetCache() *InMemoryCache {
	cacheOnce.Do(func() {
		cache = &InMemoryCache{
			items: make(map[string]*CacheItem),
		}
		// Limpar itens expirados periodicamente
		go cache.cleanup()
	})
	return cache
}

// Get retorna um item do cache se ainda válido
func (c *InMemoryCache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, exists := c.items[key]
	if !exists {
		return nil, false
	}

	// Verificar se expirou
	if time.Now().After(item.ExpiresAt) {
		delete(c.items, key)
		return nil, false
	}

	return item.Data, true
}

// Set armazena um item no cache com TTL
func (c *InMemoryCache) Set(key string, data interface{}, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = &CacheItem{
		Data:      data,
		ExpiresAt: time.Now().Add(ttl),
	}
}

// Delete remove um item do cache
func (c *InMemoryCache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}

// Clear limpa todo o cache
func (c *InMemoryCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]*CacheItem)
}

// cleanup remove itens expirados periodicamente
func (c *InMemoryCache) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, item := range c.items {
			if now.After(item.ExpiresAt) {
				delete(c.items, key)
			}
		}
		c.mu.Unlock()
	}
}

// Cache keys
const (
	CacheKeyCategories = "categories"
	CacheKeyDashboardStats = "dashboard:stats"
)

// GetCachedCategories retorna categorias do cache ou nil se não existir
func GetCachedCategories() ([]models.Category, bool) {
	data, ok := GetCache().Get(CacheKeyCategories)
	if !ok {
		return nil, false
	}
	categories, ok := data.([]models.Category)
	return categories, ok
}

// SetCachedCategories armazena categorias no cache
func SetCachedCategories(categories []models.Category) {
	GetCache().Set(CacheKeyCategories, categories, 30*time.Minute)
}

// GetCachedDashboardStats retorna stats do dashboard do cache ou nil se não existir
func GetCachedDashboardStats() (*models.DashboardStats, bool) {
	data, ok := GetCache().Get(CacheKeyDashboardStats)
	if !ok {
		return nil, false
	}
	stats, ok := data.(*models.DashboardStats)
	return stats, ok
}

// SetCachedDashboardStats armazena stats do dashboard no cache
func SetCachedDashboardStats(stats *models.DashboardStats) {
	GetCache().Set(CacheKeyDashboardStats, stats, 5*time.Minute)
}

// InvalidateCache invalida um cache específico
func InvalidateCache(key string) {
	GetCache().Delete(key)
}
