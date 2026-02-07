package services

import (
	"estoque/internal/models"
	"gorm.io/gorm"
)

type NfeService struct {
	DB *gorm.DB
}

func NewNfeService(db *gorm.DB) *NfeService {
	return &NfeService{DB: db}
}

func (s *NfeService) ProcessNfe(proc *models.NfeProc) (int, error) {
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// Verificar duplicação
		var count int64
		tx.Model(&models.ProcessedNFe{}).Where("access_key = ?", proc.NFe.InfNFe.ID).Count(&count)
		if count > 0 {
			return gorm.ErrDuplicatedKey
		}

		// Registrar NF-e processada
		totalItems := len(proc.NFe.InfNFe.Det)
		nfe := models.ProcessedNFe{
			AccessKey:  proc.NFe.InfNFe.ID,
			TotalItems: int32(totalItems),
		}
		if err := tx.Create(&nfe).Error; err != nil {
			return err
		}

		// Processar cada produto
		for _, det := range proc.NFe.InfNFe.Det {
			product := models.Product{
				Code: det.Prod.CProd,
				Name: det.Prod.XProd,
				Unit: "UN",
			}
			if err := tx.FirstOrCreate(&product, models.Product{Code: product.Code}).Error; err != nil {
				return err
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
			err := tx.First(&stock, "product_code = ?", det.Prod.CProd).Error
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
		return nil
	})

	if err != nil {
		return 0, err
	}

	return len(proc.NFe.InfNFe.Det), nil
}

func stringPtr(s string) *string {
	return &s
}
