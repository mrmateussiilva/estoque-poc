package nfe_consumer

import (
	"context"
	"estoque/internal/services"
	"log/slog"
	"os"
	"strconv"
	"time"

	"gorm.io/gorm"
)

type Consumer struct {
	NfeService *services.NfeService
	Config     Config
}

type Config struct {
	IMAPHost     string
	IMAPPort     int
	IMAPUser     string
	IMAPPassword string
	IMAPFolder   string
}

func NewConsumer(db *gorm.DB) *Consumer {
	port, _ := strconv.Atoi(os.Getenv("IMAP_PORT"))
	if port == 0 {
		port = 993
	}

	return &Consumer{
		NfeService: services.NewNfeService(db),
		Config: Config{
			IMAPHost:     os.Getenv("IMAP_HOST"),
			IMAPPort:     port,
			IMAPUser:     os.Getenv("IMAP_USER"),
			IMAPPassword: os.Getenv("IMAP_PASSWORD"),
			IMAPFolder:   os.Getenv("IMAP_FOLDER"),
		},
	}
}

func (c *Consumer) Start(ctx context.Context) {
	slog.Info("Starting NFE Email Consumer service")

	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	// Initial run
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
