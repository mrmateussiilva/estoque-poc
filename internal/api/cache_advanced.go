package api

import (
	"sync"
	"time"
)

// AdvancedCache é um cache thread-safe otimizado usando sync.Map para leituras concorrentes
// e invalidação inteligente por tags
type AdvancedCache struct {
	// Usar sync.Map para leituras concorrentes sem lock
	data sync.Map // map[string]*CacheEntry
	
	// Tags para invalidação inteligente: tag -> []keys
	tags sync.Map // map[string][]string
	
	// Mutex apenas para operações de escrita em tags (menos frequente)
	tagsMu sync.RWMutex
}

// CacheEntry representa uma entrada no cache com metadados
type CacheEntry struct {
	Value     interface{}
	ExpiresAt time.Time
	Tags      []string // Tags associadas para invalidação
	CreatedAt time.Time
}

var advancedCache *AdvancedCache
var advancedCacheOnce sync.Once

// GetAdvancedCache retorna a instância singleton do cache avançado
func GetAdvancedCache() *AdvancedCache {
	advancedCacheOnce.Do(func() {
		advancedCache = &AdvancedCache{}
		// Iniciar cleanup periódico
		go advancedCache.cleanup()
	})
	return advancedCache
}

// Get retorna um item do cache se ainda válido
func (c *AdvancedCache) Get(key string) (interface{}, bool) {
	value, ok := c.data.Load(key)
	if !ok {
		return nil, false
	}
	
	entry := value.(*CacheEntry)
	
	// Verificar se expirou
	if time.Now().After(entry.ExpiresAt) {
		c.data.Delete(key)
		c.removeKeyFromTags(key)
		return nil, false
	}
	
	return entry.Value, true
}

// Set armazena um item no cache com TTL e tags opcionais
func (c *AdvancedCache) Set(key string, data interface{}, ttl time.Duration, tags ...string) {
	entry := &CacheEntry{
		Value:     data,
		ExpiresAt: time.Now().Add(ttl),
		Tags:      tags,
		CreatedAt: time.Now(),
	}
	
	c.data.Store(key, entry)
	
	// Associar tags
	for _, tag := range tags {
		c.addKeyToTag(tag, key)
	}
}

// Delete remove um item do cache
func (c *AdvancedCache) Delete(key string) {
	value, ok := c.data.Load(key)
	if ok {
		entry := value.(*CacheEntry)
		// Remover de todas as tags
		for _, tag := range entry.Tags {
			c.removeKeyFromTag(tag, key)
		}
	}
	c.data.Delete(key)
}

// InvalidateByTag invalida todas as entradas com uma tag específica
func (c *AdvancedCache) InvalidateByTag(tag string) {
	value, ok := c.tags.Load(tag)
	if !ok {
		return
	}
	
	keys := value.([]string)
	for _, key := range keys {
		c.data.Delete(key)
	}
	
	// Remover tag
	c.tags.Delete(tag)
}

// InvalidateByTags invalida todas as entradas com qualquer uma das tags fornecidas
func (c *AdvancedCache) InvalidateByTags(tags ...string) {
	for _, tag := range tags {
		c.InvalidateByTag(tag)
	}
}

// Clear limpa todo o cache
func (c *AdvancedCache) Clear() {
	c.data.Range(func(key, value interface{}) bool {
		c.data.Delete(key)
		return true
	})
	c.tags.Range(func(key, value interface{}) bool {
		c.tags.Delete(key)
		return true
	})
}

// addKeyToTag adiciona uma chave a uma tag
func (c *AdvancedCache) addKeyToTag(tag, key string) {
	c.tagsMu.Lock()
	defer c.tagsMu.Unlock()
	
	value, _ := c.tags.LoadOrStore(tag, []string{})
	keys := value.([]string)
	
	// Verificar se já existe
	for _, k := range keys {
		if k == key {
			return
		}
	}
	
	// Adicionar
	keys = append(keys, key)
	c.tags.Store(tag, keys)
}

// removeKeyFromTag remove uma chave de uma tag
func (c *AdvancedCache) removeKeyFromTag(tag, key string) {
	c.tagsMu.Lock()
	defer c.tagsMu.Unlock()
	
	value, ok := c.tags.Load(tag)
	if !ok {
		return
	}
	
	keys := value.([]string)
	newKeys := make([]string, 0, len(keys))
	for _, k := range keys {
		if k != key {
			newKeys = append(newKeys, k)
		}
	}
	
	if len(newKeys) == 0 {
		c.tags.Delete(tag)
	} else {
		c.tags.Store(tag, newKeys)
	}
}

// removeKeyFromTags remove uma chave de todas as tags
func (c *AdvancedCache) removeKeyFromTags(key string) {
	value, ok := c.data.Load(key)
	if !ok {
		return
	}
	
	entry := value.(*CacheEntry)
	for _, tag := range entry.Tags {
		c.removeKeyFromTag(tag, key)
	}
}

// cleanup remove itens expirados periodicamente
func (c *AdvancedCache) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		now := time.Now()
		// Coletar chaves expiradas primeiro (evitar modificar durante Range)
		var expiredKeys []string
		c.data.Range(func(key, value interface{}) bool {
			entry := value.(*CacheEntry)
			if now.After(entry.ExpiresAt) {
				expiredKeys = append(expiredKeys, key.(string))
			}
			return true
		})
		
		// Deletar chaves expiradas
		for _, key := range expiredKeys {
			c.Delete(key)
		}
	}
}

// Stats retorna estatísticas do cache
type CacheStats struct {
	TotalEntries int
	TotalTags    int
	MemoryUsage  int64 // Aproximado em bytes
}

// GetStats retorna estatísticas do cache
func (c *AdvancedCache) GetStats() CacheStats {
	stats := CacheStats{}
	
	c.data.Range(func(key, value interface{}) bool {
		stats.TotalEntries++
		return true
	})
	
	c.tags.Range(func(key, value interface{}) bool {
		stats.TotalTags++
		return true
	})
	
	return stats
}
