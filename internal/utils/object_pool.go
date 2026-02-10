package utils

import (
	"sync"
)

// ObjectPool é um pool de objetos reutilizáveis para reduzir alocações
type ObjectPool struct {
	pool sync.Pool
}

// NewObjectPool cria um novo object pool
func NewObjectPool(newFunc func() interface{}) *ObjectPool {
	return &ObjectPool{
		pool: sync.Pool{
			New: newFunc,
		},
	}
}

// Get obtém um objeto do pool
func (p *ObjectPool) Get() interface{} {
	return p.pool.Get()
}

// Put retorna um objeto ao pool
func (p *ObjectPool) Put(obj interface{}) {
	p.pool.Put(obj)
}

// Resetable é uma interface para objetos que podem ser resetados antes de retornar ao pool
type Resetable interface {
	Reset()
}

// GetAndReset obtém um objeto do pool e o reseta se implementar Resetable
func (p *ObjectPool) GetAndReset() interface{} {
	obj := p.pool.Get()
	if resetable, ok := obj.(Resetable); ok {
		resetable.Reset()
	}
	return obj
}

// PutAndReset reseta um objeto antes de retorná-lo ao pool
func (p *ObjectPool) PutAndReset(obj interface{}) {
	if resetable, ok := obj.(Resetable); ok {
		resetable.Reset()
	}
	p.pool.Put(obj)
}
