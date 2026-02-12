package nfe_consumer

import (
	"context"
	"estoque/internal/services/worker_pools"
	"log/slog"
	"time"

	"gorm.io/gorm"
)

type Consumer struct {
	DB            *gorm.DB
	NfeWorkerPool *worker_pools.NFeWorkerPool
}

func NewConsumer(db *gorm.DB, nfePool *worker_pools.NFeWorkerPool) *Consumer {
	return &Consumer{
		DB:            db,
		NfeWorkerPool: nfePool,
	}
}

func (c *Consumer) Start(ctx context.Context) {
	slog.Info("Starting NFE Email Consumer service")

	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	// Initial run
	slog.Info("Iniciando busca automática de e-mails de NF-e...")
	c.processEmails()

	for {
		select {
		case <-ctx.Done():
			slog.Info("Stopping NFE Email Consumer service")
			return
		case <-ticker.C:
			c.processEmails()
		}
	}
}
