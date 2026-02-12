package nfe_consumer

import (
	"archive/zip"
	"bytes"
	"estoque/internal/models"
	"estoque/internal/services/worker_pools"
	"fmt"
	"io"
	"log/slog"
	"net"
	"strings"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-message/mail"
)

func (c *Consumer) processEmails() {
	var configs []models.EmailConfig
	if err := c.DB.Where("active = ?", true).Limit(1).Find(&configs).Error; err != nil {
		slog.Error("Erro ao buscar configuração de e-mail no banco", "error", err)
		return
	}

	if len(configs) == 0 {
		return
	}
	config := configs[0]

	addr := net.JoinHostPort(config.IMAPHost, fmt.Sprintf("%d", config.IMAPPort))
	var imapClient *client.Client
	var err error

	if config.UseTLS {
		imapClient, err = client.DialTLS(addr, nil)
	} else {
		imapClient, err = client.Dial(addr)
	}

	if err != nil {
		slog.Error("IMAP connection error", "error", err)
		return
	}
	defer imapClient.Logout()

	if err := imapClient.Login(config.IMAPUser, config.IMAPPassword); err != nil {
		slog.Error("IMAP login error", "error", err)
		return
	}

	mbox, err := imapClient.Select(config.IMAPFolder, false)
	if err != nil {
		slog.Error("IMAP folder selection error", "error", err)
		return
	}

	if mbox.Messages == 0 {
		return
	}

	criteria := imap.NewSearchCriteria()
	criteria.WithoutFlags = []string{imap.SeenFlag}

	// Filtro de Assunto (opcional)
	if config.IMAPSubjectFilter != "" {
		criteria.Text = []string{config.IMAPSubjectFilter}
	}

	ids, err := imapClient.Search(criteria)
	if err != nil {
		slog.Error("IMAP search error", "error", err)
		return
	}

	if len(ids) == 0 {
		return
	}

	// Lista de remetentes permitidos (opcional)
	var allowedSenders []string
	if config.IMAPAllowedSenders != "" {
		senders := strings.Split(config.IMAPAllowedSenders, ",")
		for _, s := range senders {
			allowedSenders = append(allowedSenders, strings.TrimSpace(strings.ToLower(s)))
		}
	}

	seqset := new(imap.SeqSet)
	seqset.AddNum(ids...)

	// Precisamos do Envelope para filtrar por remetente se o filtro estiver ativo
	section := &imap.BodySectionName{}
	fetchItems := []imap.FetchItem{section.FetchItem(), imap.FetchEnvelope}

	messages := make(chan *imap.Message, 10)
	done := make(chan error, 1)
	go func() {
		done <- imapClient.Fetch(seqset, fetchItems, messages)
	}()

	for msg := range messages {
		// Validar remetente se o filtro estiver ativo
		if len(allowedSenders) > 0 {
			found := false
			if msg.Envelope != nil && len(msg.Envelope.From) > 0 {
				fromEmail := fmt.Sprintf("%s@%s", msg.Envelope.From[0].MailboxName, msg.Envelope.From[0].HostName)
				fromEmail = strings.ToLower(fromEmail)
				for _, allowed := range allowedSenders {
					if strings.Contains(fromEmail, allowed) {
						found = true
						break
					}
				}
			}
			if !found {
				slog.Debug("Email ignorado: remetente não autorizado", "from", msg.Envelope.From[0].MailboxName)
				continue
			}
		}
		r := msg.GetBody(section)
		if r == nil {
			continue
		}

		mr, err := mail.CreateReader(r)
		if err != nil {
			slog.Error("Error creating mail reader", "error", err)
			continue
		}

		for {
			p, err := mr.NextPart()
			if err == io.EOF {
				break
			} else if err != nil {
				slog.Error("Error reading mail part", "error", err)
				break
			}

			switch h := p.Header.(type) {
			case *mail.AttachmentHeader:
				filename, _ := h.Filename()
				ext := strings.ToLower(filename)
				if strings.HasSuffix(ext, ".xml") {
					c.processXMLAttachment(p.Body, filename)
				} else if strings.HasSuffix(ext, ".zip") {
					c.processZipAttachment(p.Body, filename)
				}
			}
		}

		// Mark as seen
		item := imap.FormatFlagsOp(imap.AddFlags, true)
		flags := []interface{}{imap.SeenFlag}
		msgSeq := new(imap.SeqSet)
		msgSeq.AddNum(msg.SeqNum)
		imapClient.Store(msgSeq, item, flags, nil)
	}

	if err := <-done; err != nil {
		slog.Error("IMAP fetch finished with error", "error", err)
	}
}

func (c *Consumer) processXMLAttachment(r io.Reader, filename string) {
	xmlData, err := io.ReadAll(r)
	if err != nil {
		slog.Error("Erro ao ler anexo XML", "file", filename, "error", err)
		return
	}

	job := worker_pools.NFeJob{
		XMLData:   xmlData,
		UserID:    nil, // Processado pelo sistema
		UserEmail: "email-consumer",
	}

	result, err := c.NfeWorkerPool.SubmitSync(job)
	if err != nil {
		slog.Error("Erro ao processar NF-e de e-mail (pool)", "file", filename, "error", err)
		return
	}

	if result.Success {
		slog.Info("NF-e processada com sucesso via e-mail", "access_key", result.AccessKey, "items", result.Items)
	} else {
		slog.Warn("Falha ao processar NF-e via e-mail", "file", filename, "error", result.Error)
	}
}

func (c *Consumer) processZipAttachment(r io.Reader, filename string) {
	// Ler o ZIP completo para memória
	zipData, err := io.ReadAll(r)
	if err != nil {
		slog.Error("Erro ao ler anexo ZIP", "file", filename, "error", err)
		return
	}

	zipReader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		slog.Error("Erro ao abrir arquivo ZIP", "file", filename, "error", err)
		return
	}

	for _, f := range zipReader.File {
		if strings.HasSuffix(strings.ToLower(f.Name), ".xml") {
			rc, err := f.Open()
			if err != nil {
				slog.Error("Erro ao abrir arquivo dentro do ZIP", "zip", filename, "file", f.Name, "error", err)
				continue
			}
			c.processXMLAttachment(rc, f.Name)
			rc.Close()
		}
	}
}
