// Script Node.js para gerar ícones PWA com Ruby
// Execute: node gerar_icones.js

const fs = require('fs');
const { createCanvas } = require('canvas');

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    const padding = size * 0.15; // 15% de padding para maskable
    const centerX = size / 2;
    const centerY = size / 2;
    const diamondSize = size * 0.5; // 50% do tamanho
    const radius = size * 0.22; // 22% de border radius

    // Criar gradiente de fundo (ruby escuro para ruby claro)
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#e11d48'); // Ruby claro no topo
    gradient.addColorStop(1, '#9f1239'); // Ruby escuro na base

    // Desenhar fundo arredondado
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, radius);
    ctx.fill();

    // Desenhar diamante branco com outline
    ctx.strokeStyle = 'white';
    ctx.lineWidth = Math.max(2, size * 0.02); // Mínimo 2px
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = size * 0.03; // Glow effect

    // Desenhar facets do diamante (brilliant cut)
    const topWidth = diamondSize * 0.6;
    const bottomWidth = diamondSize * 0.3;
    const height = diamondSize * 0.8;

    ctx.beginPath();
    
    // Top table (mesa superior)
    ctx.moveTo(centerX - topWidth/2, centerY - height/2);
    ctx.lineTo(centerX + topWidth/2, centerY - height/2);
    
    // Top facets (facetas superiores)
    ctx.lineTo(centerX + topWidth/3, centerY - height/4);
    ctx.lineTo(centerX, centerY);
    ctx.lineTo(centerX - topWidth/3, centerY - height/4);
    ctx.closePath();
    
    // Girdle (cintura)
    ctx.moveTo(centerX - topWidth/2, centerY - height/2);
    ctx.lineTo(centerX - bottomWidth/2, centerY + height/2);
    ctx.lineTo(centerX + bottomWidth/2, centerY + height/2);
    ctx.lineTo(centerX + topWidth/2, centerY - height/2);
    
    // Bottom facets (facetas inferiores)
    ctx.moveTo(centerX - bottomWidth/2, centerY + height/2);
    ctx.lineTo(centerX, centerY);
    ctx.lineTo(centerX + bottomWidth/2, centerY + height/2);
    
    // Pavillion facets (facetas do pavilhão)
    ctx.moveTo(centerX - bottomWidth/2, centerY + height/2);
    ctx.lineTo(centerX - bottomWidth/4, centerY + height/3);
    ctx.lineTo(centerX, centerY);
    
    ctx.moveTo(centerX + bottomWidth/2, centerY + height/2);
    ctx.lineTo(centerX + bottomWidth/4, centerY + height/3);
    ctx.lineTo(centerX, centerY);

    ctx.stroke();

    return canvas;
}

// Gerar ícones
console.log('Gerando ícones PWA...');

try {
    // Ícone 512x512
    const icon512 = generateIcon(512);
    const buffer512 = icon512.toBuffer('image/png');
    fs.writeFileSync('icon-512.png', buffer512);
    console.log('✅ icon-512.png criado');

    // Ícone 192x192
    const icon192 = generateIcon(192);
    const buffer192 = icon192.toBuffer('image/png');
    fs.writeFileSync('icon-192.png', buffer192);
    console.log('✅ icon-192.png criado');

    console.log('\n🎉 Ícones gerados com sucesso!');
    console.log('Os arquivos foram salvos na pasta atual.');
} catch (error) {
    if (error.message.includes('canvas')) {
        console.error('\n❌ Erro: Biblioteca "canvas" não instalada.');
        console.log('\n📦 Para instalar, execute:');
        console.log('   npm install canvas');
        console.log('\n💡 Alternativa: Use o arquivo criar_icones.html no navegador');
    } else {
        console.error('Erro ao gerar ícones:', error);
    }
}
