package services

import (
	"encoding/xml"
	"estoque/internal/events"
	"estoque/internal/models"
	"time"

	"gorm.io/gorm"
)

type NfeService struct {
	DB *gorm.DB
}

func NewNfeService(db *gorm.DB) *NfeService {
	return &NfeService{DB: db}
}

// RegisterNfe apenas salva os metadados e o XML com status PENDENTE
func (s *NfeService) RegisterNfe(proc *models.NfeProc, xmlData []byte) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		// Verificar duplicação
		var count int64
		tx.Model(&models.ProcessedNFe{}).Where("access_key = ?", proc.NFe.InfNFe.ID).Count(&count)
		if count > 0 {
			return gorm.ErrDuplicatedKey
		}

		// Registrar NF-e pendente
		nfe := models.ProcessedNFe{
			AccessKey:    proc.NFe.InfNFe.ID,
			Number:       &proc.NFe.InfNFe.Ide.NNF,
			SupplierName: &proc.NFe.InfNFe.Emit.XNome,
			TotalItems:   int32(len(proc.NFe.InfNFe.Det)),
			TotalValue:   proc.NFe.InfNFe.Total.ICMSTot.VNF,
			Status:       "PENDENTE",
			XMLData:      xmlData,
			ProcessedAt:  time.Now(),
		}

		if err := tx.Create(&nfe).Error; err != nil {
			return err
		}

		// Notificar via SSE em tempo real usando o hub global
		go events.NotifyNewNFe(proc.NFe.InfNFe.Ide.NNF, proc.NFe.InfNFe.Emit.XNome)

		return nil
	})
}

// ProcessNfe realiza a movimentação de estoque para uma nota pendente
func (s *NfeService) ProcessNfe(accessKey string) (int, error) {
	var nfe models.ProcessedNFe
	if err := s.DB.First(&nfe, "access_key = ?", accessKey).Error; err != nil {
		return 0, err
	}

	if nfe.Status == "PROCESSADA" {
		return int(nfe.TotalItems), nil
	}

	// Decodificar XML armazenado
	var proc models.NfeProc
	if err := xml.Unmarshal(nfe.XMLData, &proc); err != nil {
		return 0, err
	}

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// Processar cada produto
		for _, det := range proc.NFe.InfNFe.Det {
			product := models.Product{
				Code:      det.Prod.CProd,
				Name:      det.Prod.XProd,
				Unit:      "UN",
				CostPrice: det.Prod.VUnCom,
			}
			// Tentar encontrar ou criar o produto
			var existingProduct models.Product
			err := tx.First(&existingProduct, "code = ?", product.Code).Error
			if err == gorm.ErrRecordNotFound {
				if err := tx.Create(&product).Error; err != nil {
					return err
				}
			} else if err != nil {
				return err
			} else {
				// Atualizar nome e preco de custo do produto existente
				if err := tx.Model(&existingProduct).Updates(map[string]interface{}{
					"name":       product.Name,
					"cost_price": product.CostPrice,
					"updated_at": time.Now(),
				}).Error; err != nil {
					return err
				}
			}

			movement := models.Movement{
				ProductCode: det.Prod.CProd,
				Type:        "ENTRADA",
				Quantity:    det.Prod.QCom,
				Origin:      stringPtr("NFE"),
				Reference:   stringPtr(proc.NFe.InfNFe.ID),
			}
			if err := tx.Create(&movement).Error; err != nil {
				return err
			}

			var stock models.Stock
			err = tx.First(&stock, "product_code = ?", det.Prod.CProd).Error
			if err == gorm.ErrRecordNotFound {
				stock = models.Stock{
					ProductCode: det.Prod.CProd,
					Quantity:    det.Prod.QCom,
				}
				if err := tx.Create(&stock).Error; err != nil {
					return err
				}
			} else if err != nil {
				return err
			} else {
				stock.Quantity += det.Prod.QCom
				if err := tx.Save(&stock).Error; err != nil {
					return err
				}
			}
		}

		// Atualizar status
		return tx.Model(&nfe).Update("status", "PROCESSADA").Error
	})

	if err != nil {
		return 0, err
	}

	return len(proc.NFe.InfNFe.Det), nil
}

func stringPtr(s string) *string {
	return &s
}
