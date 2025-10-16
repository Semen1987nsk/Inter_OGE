// SVG placeholders для оборудования (если фото еще не загружены)
const SVGPlaceholders = {
    // Датчик температуры
    temperature: `
        <svg width="200" height="300" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
            <rect x="70" y="20" width="60" height="200" rx="5" fill="#E0E0E0" stroke="#333" stroke-width="2"/>
            <circle cx="100" cy="250" r="35" fill="#BDBDBD" stroke="#333" stroke-width="2"/>
            <rect x="85" y="40" width="30" height="180" rx="3" fill="#F44336"/>
            <circle cx="100" cy="250" r="25" fill="#F44336"/>
            <text x="100" y="135" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">LS-T100</text>
        </svg>
    `,
    
    // Датчик тока
    current: `
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="40" width="160" height="120" rx="10" fill="#2196F3" stroke="#1565C0" stroke-width="3"/>
            <rect x="40" y="60" width="120" height="60" rx="5" fill="#1E88E5"/>
            <text x="100" y="95" text-anchor="middle" font-size="20" fill="#fff" font-weight="bold">LS-I3</text>
            <text x="100" y="115" text-anchor="middle" font-size="14" fill="#fff">±3 A</text>
            <circle cx="50" cy="150" r="8" fill="#FFD700"/>
            <circle cx="150" cy="150" r="8" fill="#000"/>
        </svg>
    `,
    
    // Весы
    scale: `
        <svg width="200" height="150" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="100" width="180" height="30" rx="5" fill="#757575"/>
            <rect x="0" y="90" width="200" height="10" fill="#9E9E9E"/>
            <rect x="40" y="30" width="120" height="40" rx="5" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/>
            <text x="100" y="55" text-anchor="middle" font-size="18" fill="#fff" font-weight="bold">0.0 г</text>
        </svg>
    `,
    
    // Мензурка
    beaker: `
        <svg width="150" height="200" viewBox="0 0 150 200" xmlns="http://www.w3.org/2000/svg">
            <path d="M 30 10 L 30 180 L 120 180 L 120 10" fill="none" stroke="#333" stroke-width="3"/>
            <line x1="30" y1="180" x2="120" y2="180" stroke="#333" stroke-width="3"/>
            <line x1="30" y1="50" x2="50" y2="50" stroke="#999" stroke-width="1"/>
            <line x1="30" y1="90" x2="50" y2="90" stroke="#999" stroke-width="1"/>
            <line x1="30" y1="130" x2="50" y2="130" stroke="#999" stroke-width="1"/>
            <text x="55" y="53" font-size="12" fill="#666">200</text>
            <text x="55" y="93" font-size="12" fill="#666">100</text>
            <text x="55" y="133" font-size="12" fill="#666">50</text>
        </svg>
    `
};

// Создать Data URL из SVG
function svgToDataURL(svg) {
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Загрузить SVG placeholder как Image
function loadSVGPlaceholder(type) {
    return new Promise((resolve) => {
        if (!SVGPlaceholders[type]) {
            resolve(null);
            return;
        }
        
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = svgToDataURL(SVGPlaceholders[type]);
    });
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SVGPlaceholders, svgToDataURL, loadSVGPlaceholder };
}
