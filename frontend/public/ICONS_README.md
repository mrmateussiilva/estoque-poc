# Ícones PWA

Este diretório deve conter os ícones necessários para o PWA:

- `icon-192.png` - Ícone 192x192 pixels (PNG)
- `icon-512.png` - Ícone 512x512 pixels (PNG)

## Como gerar os ícones

### Opção 1: Usando ferramentas online
1. Acesse https://realfavicongenerator.net/ ou https://www.pwabuilder.com/imageGenerator
2. Faça upload de uma imagem (recomendado: 512x512 ou maior)
3. Baixe os ícones gerados
4. Coloque-os neste diretório

### Opção 2: Usando ImageMagick (CLI)
```bash
# Converter imagem para 192x192
convert logo.png -resize 192x192 icon-192.png

# Converter imagem para 512x512
convert logo.png -resize 512x512 icon-512.png
```

### Opção 3: Usando GIMP/Photoshop
1. Abra sua imagem de logo
2. Redimensione para 192x192 e exporte como `icon-192.png`
3. Redimensione para 512x512 e exporte como `icon-512.png`

## Requisitos

- **Formato**: PNG
- **Tamanhos**: 192x192 e 512x512 pixels
- **Purpose**: `any maskable` (suporta máscaras para diferentes dispositivos)
- **Background**: Recomendado fundo sólido ou transparente

## Ícones temporários

Atualmente, os ícones são placeholders. Substitua-os por ícones reais antes do deploy em produção.
