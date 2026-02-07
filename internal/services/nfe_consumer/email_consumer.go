package nfe_consumer

import (
	"encoding/xml"
	"estoque/internal/models"
	"fmt"
	"io"
	"log/slog"
	"net"
	"strings"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
	"github.com/emersion/go-message/mail"
	"gorm.io/gorm"
)

func (c *Consumer) processEmails() {
	if c.Config.IMAPHost == "" || c.Config.IMAPUser == "" {
		slog.Warn("IMAP configuration missing, skipping email process")
		return
	}

	addr := net.JoinHostPort(c.Config.IMAPHost, fmt.Sprintf("%d", c.Config.IMAPPort))
	client, err := client.DialTLS(addr, nil)
	if err != nil {
		slog.Error("IMAP connection error", "error", err)
		return
	}
	defer client.Logout()

	if err := client.Login(c.Config.IMAPUser, c.Config.IMAPPassword); err != nil {
		slog.Error("IMAP login error", "error", err)
		return
	}

	mbox, err := client.Select(c.Config.IMAPFolder, false)
	if err != nil {
		slog.Error("IMAP folder selection error", "error", err)
		return
	}

	if mbox.Messages == 0 {
		return
	}

	criteria := imap.NewSearchCriteria()
	criteria.WithoutFlags = []string{imap.SeenFlag}
	ids, err := client.Search(criteria)
	if err != nil {
		slog.Error("IMAP search error", "error", err)
		return
	}

	if len(ids) == 0 {
		return
	}

	seqset := new(imap.SeqSet)
	seqset.AddNum(ids...)

	section := &imap.BodySectionName{}
	items := []imap.FetchItem{section.FetchItem()}

	messages := make(chan *imap.Message, 10)
	done := make(chan error, 1)
	go func() {
		done <- client.Fetch(seqset, items, messages)
	}()

	for msg := range messages {
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
				if strings.HasSuffix(strings.ToLower(filename), ".xml") {
					c.processXML(p.Body, filename)
				}
			}
		}

		// Mark as seen
		item := imap.FormatFlagsOp(imap.AddFlags, true)
		flags := []interface{}{imap.SeenFlag}
		msgSeq := new(imap.SeqSet)
		msgSeq.AddNum(msg.SeqNum)
		client.Store(msgSeq, item, flags, nil)
	}

	if err := <-done; err != nil {
		slog.Error("IMAP fetch finished with error", "error", err)
	}
}

func (c *Consumer) processXML(r io.Reader, filename string) {
	var proc models.NfeProc
	if err := xml.NewDecoder(r).Decode(&proc); err != nil {
		slog.Debug("Error decoding XML from attachment", "file", filename, "error", err)
		return
	}

	if proc.NFe.InfNFe.ID == "" {
		return
	}

	total, err := c.NfeService.ProcessNfe(&proc)
	if err != nil {
		if err == gorm.ErrDuplicatedKey {
			slog.Info("NFE already processed, skipping", "access_key", proc.NFe.InfNFe.ID)
			return
		}
		slog.Error("Error processing NFE from email", "access_key", proc.NFe.InfNFe.ID, "error", err)
		return
	}

	slog.Info("NFE processed from email successfully", "access_key", proc.NFe.InfNFe.ID, "total_items", total)
}
