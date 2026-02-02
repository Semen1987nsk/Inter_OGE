/**
 * 🧪 База данных химических веществ и реакций для ОГЭ 2025
 * 
 * Источник: ФИПИ Спецификация КИМ ОГЭ 2025 по химии
 * Задание 23 — экспериментальное (5 баллов)
 * 
 * Структура:
 * - SUBSTANCES — все 40 веществ из спецификации
 * - REACTIONS — база качественных реакций
 * - REAGENT_KITS — 8 комплектов реактивов
 * - INDICATORS — индикаторы и их цвета
 */

// ============================================
// 🧪 ВЕЩЕСТВА (40 из спецификации ФИПИ)
// ============================================

export const SUBSTANCES = {
    // === МЕТАЛЛЫ ===
    'Al': {
        id: 'Al',
        name: 'Алюминий',
        formula: 'Al',
        type: 'metal',
        state: 'solid',
        color: 'silver',
        form: 'гранулы',
        molarMass: 27
    },
    'Fe': {
        id: 'Fe',
        name: 'Железо',
        formula: 'Fe',
        type: 'metal',
        state: 'solid',
        color: 'gray',
        form: 'стружка/гранулы',
        molarMass: 56
    },
    'Zn': {
        id: 'Zn',
        name: 'Цинк',
        formula: 'Zn',
        type: 'metal',
        state: 'solid',
        color: 'silver',
        form: 'гранулы',
        molarMass: 65
    },
    'Cu': {
        id: 'Cu',
        name: 'Медь',
        formula: 'Cu',
        type: 'metal',
        state: 'solid',
        color: 'copper',
        form: 'проволока',
        molarMass: 64
    },

    // === ОКСИДЫ ===
    'CuO': {
        id: 'CuO',
        name: 'Оксид меди(II)',
        formula: 'CuO',
        type: 'oxide',
        state: 'solid',
        color: 'black',
        form: 'порошок',
        molarMass: 80
    },
    'MgO': {
        id: 'MgO',
        name: 'Оксид магния',
        formula: 'MgO',
        type: 'oxide',
        state: 'solid',
        color: 'white',
        form: 'порошок',
        molarMass: 40
    },
    'Al2O3': {
        id: 'Al2O3',
        name: 'Оксид алюминия',
        formula: 'Al₂O₃',
        type: 'oxide',
        state: 'solid',
        color: 'white',
        form: 'порошок',
        molarMass: 102
    },
    'SiO2': {
        id: 'SiO2',
        name: 'Оксид кремния',
        formula: 'SiO₂',
        type: 'oxide',
        state: 'solid',
        color: 'white',
        form: 'порошок',
        molarMass: 60
    },

    // === КИСЛОТЫ ===
    'HCl': {
        id: 'HCl',
        name: 'Соляная кислота',
        formula: 'HCl',
        type: 'acid',
        state: 'solution',
        color: 'colorless',
        concentration: '10%',
        pH: 1,
        molarMass: 36.5
    },
    'H2SO4': {
        id: 'H2SO4',
        name: 'Серная кислота',
        formula: 'H₂SO₄',
        type: 'acid',
        state: 'solution',
        color: 'colorless',
        concentration: '25%',
        pH: 0.5,
        molarMass: 98
    },

    // === ОСНОВАНИЯ ===
    'NaOH': {
        id: 'NaOH',
        name: 'Гидроксид натрия',
        formula: 'NaOH',
        type: 'base',
        state: 'solution',
        color: 'colorless',
        concentration: '10-15%',
        pH: 13,
        molarMass: 40
    },
    'KOH': {
        id: 'KOH',
        name: 'Гидроксид калия',
        formula: 'KOH',
        type: 'base',
        state: 'solution',
        color: 'colorless',
        concentration: '10-15%',
        pH: 13,
        molarMass: 56
    },
    'Ca(OH)2': {
        id: 'Ca(OH)2',
        name: 'Гидроксид кальция',
        formula: 'Ca(OH)₂',
        type: 'base',
        state: 'solution',
        color: 'colorless',
        concentration: '0.1-0.2%',
        pH: 12,
        molarMass: 74
    },

    // === СОЛИ — ХЛОРИДЫ ===
    'NaCl': {
        id: 'NaCl',
        name: 'Хлорид натрия',
        formula: 'NaCl',
        type: 'salt',
        anion: 'Cl-',
        cation: 'Na+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 58.5
    },
    'KCl': {
        id: 'KCl',
        name: 'Хлорид калия',
        formula: 'KCl',
        type: 'salt',
        anion: 'Cl-',
        cation: 'K+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 74.5
    },
    'LiCl': {
        id: 'LiCl',
        name: 'Хлорид лития',
        formula: 'LiCl',
        type: 'salt',
        anion: 'Cl-',
        cation: 'Li+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 42.5
    },
    'CaCl2': {
        id: 'CaCl2',
        name: 'Хлорид кальция',
        formula: 'CaCl₂',
        type: 'salt',
        anion: 'Cl-',
        cation: 'Ca2+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 111
    },
    'MgCl2': {
        id: 'MgCl2',
        name: 'Хлорид магния',
        formula: 'MgCl₂',
        type: 'salt',
        anion: 'Cl-',
        cation: 'Mg2+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 95
    },
    'CuCl2': {
        id: 'CuCl2',
        name: 'Хлорид меди(II)',
        formula: 'CuCl₂',
        type: 'salt',
        anion: 'Cl-',
        cation: 'Cu2+',
        state: 'solution',
        color: 'blue-green',
        colorHex: '#4A9B8E',
        concentration: '5-10%',
        molarMass: 135
    },
    'AlCl3': {
        id: 'AlCl3',
        name: 'Хлорид алюминия',
        formula: 'AlCl₃',
        type: 'salt',
        anion: 'Cl-',
        cation: 'Al3+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 133.5
    },
    'FeCl3': {
        id: 'FeCl3',
        name: 'Хлорид железа(III)',
        formula: 'FeCl₃',
        type: 'salt',
        anion: 'Cl-',
        cation: 'Fe3+',
        state: 'solution',
        color: 'yellow-brown',
        colorHex: '#B8860B',
        concentration: '5-10%',
        molarMass: 162.5
    },
    'NH4Cl': {
        id: 'NH4Cl',
        name: 'Хлорид аммония',
        formula: 'NH₄Cl',
        type: 'salt',
        anion: 'Cl-',
        cation: 'NH4+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 53.5
    },
    'BaCl2': {
        id: 'BaCl2',
        name: 'Хлорид бария',
        formula: 'BaCl₂',
        type: 'salt',
        anion: 'Cl-',
        cation: 'Ba2+',
        state: 'solution',
        color: 'colorless',
        concentration: '≤5%',
        molarMass: 208
    },

    // === СОЛИ — СУЛЬФАТЫ ===
    'Na2SO4': {
        id: 'Na2SO4',
        name: 'Сульфат натрия',
        formula: 'Na₂SO₄',
        type: 'salt',
        anion: 'SO42-',
        cation: 'Na+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 142
    },
    'MgSO4': {
        id: 'MgSO4',
        name: 'Сульфат магния',
        formula: 'MgSO₄',
        type: 'salt',
        anion: 'SO42-',
        cation: 'Mg2+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 120
    },
    'CuSO4': {
        id: 'CuSO4',
        name: 'Сульфат меди(II)',
        formula: 'CuSO₄',
        type: 'salt',
        anion: 'SO42-',
        cation: 'Cu2+',
        state: 'solution',
        color: 'blue',
        colorHex: '#4169E1',
        concentration: '5-10%',
        molarMass: 160
    },
    'FeSO4': {
        id: 'FeSO4',
        name: 'Сульфат железа(II)',
        formula: 'FeSO₄',
        type: 'salt',
        anion: 'SO42-',
        cation: 'Fe2+',
        state: 'solution',
        color: 'pale-green',
        colorHex: '#90EE90',
        concentration: '5-10%',
        molarMass: 152
    },
    'ZnSO4': {
        id: 'ZnSO4',
        name: 'Сульфат цинка',
        formula: 'ZnSO₄',
        type: 'salt',
        anion: 'SO42-',
        cation: 'Zn2+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 161
    },
    'Al2(SO4)3': {
        id: 'Al2(SO4)3',
        name: 'Сульфат алюминия',
        formula: 'Al₂(SO₄)₃',
        type: 'salt',
        anion: 'SO42-',
        cation: 'Al3+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 342
    },
    '(NH4)2SO4': {
        id: '(NH4)2SO4',
        name: 'Сульфат аммония',
        formula: '(NH₄)₂SO₄',
        type: 'salt',
        anion: 'SO42-',
        cation: 'NH4+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 132
    },

    // === СОЛИ — НИТРАТЫ ===
    'NaNO3': {
        id: 'NaNO3',
        name: 'Нитрат натрия',
        formula: 'NaNO₃',
        type: 'salt',
        anion: 'NO3-',
        cation: 'Na+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 85
    },
    'Ba(NO3)2': {
        id: 'Ba(NO3)2',
        name: 'Нитрат бария',
        formula: 'Ba(NO₃)₂',
        type: 'salt',
        anion: 'NO3-',
        cation: 'Ba2+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 261
    },
    'Ca(NO3)2': {
        id: 'Ca(NO3)2',
        name: 'Нитрат кальция',
        formula: 'Ca(NO₃)₂',
        type: 'salt',
        anion: 'NO3-',
        cation: 'Ca2+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 164
    },
    'AgNO3': {
        id: 'AgNO3',
        name: 'Нитрат серебра',
        formula: 'AgNO₃',
        type: 'salt',
        anion: 'NO3-',
        cation: 'Ag+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 170
    },

    // === СОЛИ — КАРБОНАТЫ ===
    'Na2CO3': {
        id: 'Na2CO3',
        name: 'Карбонат натрия',
        formula: 'Na₂CO₃',
        type: 'salt',
        anion: 'CO32-',
        cation: 'Na+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 106
    },
    'K2CO3': {
        id: 'K2CO3',
        name: 'Карбонат калия',
        formula: 'K₂CO₃',
        type: 'salt',
        anion: 'CO32-',
        cation: 'K+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 138
    },
    'NaHCO3': {
        id: 'NaHCO3',
        name: 'Гидрокарбонат натрия',
        formula: 'NaHCO₃',
        type: 'salt',
        anion: 'HCO3-',
        cation: 'Na+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 84
    },

    // === СОЛИ — ФОСФАТЫ ===
    'Na3PO4': {
        id: 'Na3PO4',
        name: 'Фосфат натрия',
        formula: 'Na₃PO₄',
        type: 'salt',
        anion: 'PO43-',
        cation: 'Na+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 164
    },
    'K3PO4': {
        id: 'K3PO4',
        name: 'Фосфат калия',
        formula: 'K₃PO₄',
        type: 'salt',
        anion: 'PO43-',
        cation: 'K+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 212
    },

    // === СОЛИ — ГАЛОГЕНИДЫ ===
    'NaBr': {
        id: 'NaBr',
        name: 'Бромид натрия',
        formula: 'NaBr',
        type: 'salt',
        anion: 'Br-',
        cation: 'Na+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 103
    },
    'NaI': {
        id: 'NaI',
        name: 'Иодид натрия',
        formula: 'NaI',
        type: 'salt',
        anion: 'I-',
        cation: 'Na+',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        molarMass: 150
    },

    // === ПРОЧИЕ ===
    'NH3': {
        id: 'NH3',
        name: 'Аммиак',
        formula: 'NH₃',
        type: 'base',
        state: 'solution',
        color: 'colorless',
        concentration: '5-10%',
        pH: 11,
        smell: 'резкий',
        molarMass: 17
    },
    'H2O2': {
        id: 'H2O2',
        name: 'Пероксид водорода',
        formula: 'H₂O₂',
        type: 'other',
        state: 'solution',
        color: 'colorless',
        concentration: '3-5%',
        molarMass: 34
    },
    'H2O': {
        id: 'H2O',
        name: 'Дистиллированная вода',
        formula: 'H₂O',
        type: 'other',
        state: 'liquid',
        color: 'colorless',
        pH: 7,
        molarMass: 18
    }
};

// ============================================
// 🎨 ИНДИКАТОРЫ
// ============================================

export const INDICATORS = {
    'phenolphthalein': {
        id: 'phenolphthalein',
        name: 'Фенолфталеин',
        formula: 'C₂₀H₁₄O₄',
        colors: {
            acidic: 'colorless',      // pH < 8.2
            neutral: 'colorless',     // pH 8.2-10
            basic: 'crimson'          // pH > 10 — малиновый
        },
        colorHex: {
            acidic: 'transparent',
            neutral: 'transparent',
            basic: '#DC143C'
        }
    },
    'methyl_orange': {
        id: 'methyl_orange',
        name: 'Метилоранж',
        formula: 'C₁₄H₁₄N₃NaO₃S',
        colors: {
            acidic: 'red',            // pH < 3.1
            neutral: 'orange',        // pH 3.1-4.4
            basic: 'yellow'           // pH > 4.4
        },
        colorHex: {
            acidic: '#FF4500',
            neutral: '#FFA500',
            basic: '#FFD700'
        }
    },
    'litmus': {
        id: 'litmus',
        name: 'Лакмус',
        formula: 'C₁₀H₁₂O₆',
        colors: {
            acidic: 'red',            // pH < 5
            neutral: 'purple',        // pH 5-8
            basic: 'blue'             // pH > 8
        },
        colorHex: {
            acidic: '#FF0000',
            neutral: '#800080',
            basic: '#0000FF'
        }
    },
    'universal': {
        id: 'universal',
        name: 'Универсальный индикатор',
        type: 'paper',
        colors: {
            acidic: 'red-orange',
            neutral: 'green',
            basic: 'blue-purple'
        }
    }
};

// ============================================
// ⚗️ БАЗА КАЧЕСТВЕННЫХ РЕАКЦИЙ
// ============================================

export const REACTIONS = {
    // === РЕАКЦИИ НА КАТИОНЫ ===
    
    // Cu²⁺ + 2OH⁻ → Cu(OH)₂↓ (голубой)
    'Cu2+_OH-': {
        reactants: ['Cu2+', 'OH-'],
        products: ['Cu(OH)2'],
        precipitate: {
            formula: 'Cu(OH)₂',
            color: 'blue',
            colorHex: '#87CEEB',
            description: 'голубой студенистый осадок'
        },
        equation: {
            molecular: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',
            ionic_full: 'Cu²⁺ + SO₄²⁻ + 2Na⁺ + 2OH⁻ → Cu(OH)₂↓ + 2Na⁺ + SO₄²⁻',
            ionic_short: 'Cu²⁺ + 2OH⁻ → Cu(OH)₂↓'
        }
    },
    
    // Fe²⁺ + 2OH⁻ → Fe(OH)₂↓ (серо-зелёный, темнеет на воздухе)
    'Fe2+_OH-': {
        reactants: ['Fe2+', 'OH-'],
        products: ['Fe(OH)2'],
        precipitate: {
            formula: 'Fe(OH)₂',
            color: 'gray-green',
            colorHex: '#556B2F',
            description: 'серо-зелёный осадок (темнеет на воздухе)',
            oxidizes: true
        },
        equation: {
            molecular: 'FeSO₄ + 2NaOH → Fe(OH)₂↓ + Na₂SO₄',
            ionic_full: 'Fe²⁺ + SO₄²⁻ + 2Na⁺ + 2OH⁻ → Fe(OH)₂↓ + 2Na⁺ + SO₄²⁻',
            ionic_short: 'Fe²⁺ + 2OH⁻ → Fe(OH)₂↓'
        }
    },
    
    // Fe³⁺ + 3OH⁻ → Fe(OH)₃↓ (бурый)
    'Fe3+_OH-': {
        reactants: ['Fe3+', 'OH-'],
        products: ['Fe(OH)3'],
        precipitate: {
            formula: 'Fe(OH)₃',
            color: 'brown',
            colorHex: '#8B4513',
            description: 'бурый осадок'
        },
        equation: {
            molecular: 'FeCl₃ + 3NaOH → Fe(OH)₃↓ + 3NaCl',
            ionic_full: 'Fe³⁺ + 3Cl⁻ + 3Na⁺ + 3OH⁻ → Fe(OH)₃↓ + 3Na⁺ + 3Cl⁻',
            ionic_short: 'Fe³⁺ + 3OH⁻ → Fe(OH)₃↓'
        }
    },
    
    // Al³⁺ + 3OH⁻ → Al(OH)₃↓ (белый, растворяется в избытке щёлочи)
    'Al3+_OH-': {
        reactants: ['Al3+', 'OH-'],
        products: ['Al(OH)3'],
        precipitate: {
            formula: 'Al(OH)₃',
            color: 'white',
            colorHex: '#FFFFFF',
            description: 'белый студенистый осадок',
            amphoteric: true,
            dissolvesInExcess: 'NaOH'
        },
        equation: {
            molecular: 'AlCl₃ + 3NaOH → Al(OH)₃↓ + 3NaCl',
            ionic_full: 'Al³⁺ + 3Cl⁻ + 3Na⁺ + 3OH⁻ → Al(OH)₃↓ + 3Na⁺ + 3Cl⁻',
            ionic_short: 'Al³⁺ + 3OH⁻ → Al(OH)₃↓'
        }
    },
    
    // Zn²⁺ + 2OH⁻ → Zn(OH)₂↓ (белый, растворяется в избытке)
    'Zn2+_OH-': {
        reactants: ['Zn2+', 'OH-'],
        products: ['Zn(OH)2'],
        precipitate: {
            formula: 'Zn(OH)₂',
            color: 'white',
            colorHex: '#FFFFFF',
            description: 'белый осадок',
            amphoteric: true,
            dissolvesInExcess: 'NaOH'
        },
        equation: {
            molecular: 'ZnSO₄ + 2NaOH → Zn(OH)₂↓ + Na₂SO₄',
            ionic_full: 'Zn²⁺ + SO₄²⁻ + 2Na⁺ + 2OH⁻ → Zn(OH)₂↓ + 2Na⁺ + SO₄²⁻',
            ionic_short: 'Zn²⁺ + 2OH⁻ → Zn(OH)₂↓'
        }
    },
    
    // Mg²⁺ + 2OH⁻ → Mg(OH)₂↓ (белый)
    'Mg2+_OH-': {
        reactants: ['Mg2+', 'OH-'],
        products: ['Mg(OH)2'],
        precipitate: {
            formula: 'Mg(OH)₂',
            color: 'white',
            colorHex: '#FFFFFF',
            description: 'белый осадок'
        },
        equation: {
            molecular: 'MgCl₂ + 2NaOH → Mg(OH)₂↓ + 2NaCl',
            ionic_full: 'Mg²⁺ + 2Cl⁻ + 2Na⁺ + 2OH⁻ → Mg(OH)₂↓ + 2Na⁺ + 2Cl⁻',
            ionic_short: 'Mg²⁺ + 2OH⁻ → Mg(OH)₂↓'
        }
    },
    
    // Ca²⁺ + CO₃²⁻ → CaCO₃↓ (белый)
    'Ca2+_CO32-': {
        reactants: ['Ca2+', 'CO32-'],
        products: ['CaCO3'],
        precipitate: {
            formula: 'CaCO₃',
            color: 'white',
            colorHex: '#FFFFFF',
            description: 'белый осадок'
        },
        equation: {
            molecular: 'CaCl₂ + Na₂CO₃ → CaCO₃↓ + 2NaCl',
            ionic_full: 'Ca²⁺ + 2Cl⁻ + 2Na⁺ + CO₃²⁻ → CaCO₃↓ + 2Na⁺ + 2Cl⁻',
            ionic_short: 'Ca²⁺ + CO₃²⁻ → CaCO₃↓'
        }
    },
    
    // Ca²⁺ + SO₄²⁻ → CaSO₄↓ (белый)
    'Ca2+_SO42-': {
        reactants: ['Ca2+', 'SO42-'],
        products: ['CaSO4'],
        precipitate: {
            formula: 'CaSO₄',
            color: 'white',
            colorHex: '#FFFFFF',
            description: 'белый осадок (малорастворим)'
        },
        equation: {
            molecular: 'CaCl₂ + Na₂SO₄ → CaSO₄↓ + 2NaCl',
            ionic_short: 'Ca²⁺ + SO₄²⁻ → CaSO₄↓'
        }
    },
    
    // Ba²⁺ + SO₄²⁻ → BaSO₄↓ (белый)
    'Ba2+_SO42-': {
        reactants: ['Ba2+', 'SO42-'],
        products: ['BaSO4'],
        precipitate: {
            formula: 'BaSO₄',
            color: 'white',
            colorHex: '#FFFFFF',
            description: 'белый осадок'
        },
        equation: {
            molecular: 'BaCl₂ + H₂SO₄ → BaSO₄↓ + 2HCl',
            ionic_short: 'Ba²⁺ + SO₄²⁻ → BaSO₄↓'
        }
    },
    
    // NH₄⁺ + OH⁻ → NH₃↑ + H₂O (резкий запах)
    'NH4+_OH-': {
        reactants: ['NH4+', 'OH-'],
        products: ['NH3', 'H2O'],
        gas: {
            formula: 'NH₃',
            name: 'аммиак',
            smell: 'резкий',
            description: 'выделение газа с резким запахом'
        },
        requiresHeating: true,
        equation: {
            molecular: 'NH₄Cl + NaOH → NaCl + NH₃↑ + H₂O',
            ionic_short: 'NH₄⁺ + OH⁻ → NH₃↑ + H₂O'
        }
    },
    
    // Ag⁺ + Cl⁻ → AgCl↓ (белый творожистый)
    'Ag+_Cl-': {
        reactants: ['Ag+', 'Cl-'],
        products: ['AgCl'],
        precipitate: {
            formula: 'AgCl',
            color: 'white',
            colorHex: '#FFFAF0',
            description: 'белый творожистый осадок',
            texture: 'curdy'
        },
        equation: {
            molecular: 'AgNO₃ + NaCl → AgCl↓ + NaNO₃',
            ionic_short: 'Ag⁺ + Cl⁻ → AgCl↓'
        }
    },
    
    // Ag⁺ + Br⁻ → AgBr↓ (светло-жёлтый)
    'Ag+_Br-': {
        reactants: ['Ag+', 'Br-'],
        products: ['AgBr'],
        precipitate: {
            formula: 'AgBr',
            color: 'pale-yellow',
            colorHex: '#FFFACD',
            description: 'светло-жёлтый осадок'
        },
        equation: {
            molecular: 'AgNO₃ + NaBr → AgBr↓ + NaNO₃',
            ionic_short: 'Ag⁺ + Br⁻ → AgBr↓'
        }
    },
    
    // Ag⁺ + I⁻ → AgI↓ (жёлтый)
    'Ag+_I-': {
        reactants: ['Ag+', 'I-'],
        products: ['AgI'],
        precipitate: {
            formula: 'AgI',
            color: 'yellow',
            colorHex: '#FFD700',
            description: 'жёлтый осадок'
        },
        equation: {
            molecular: 'AgNO₃ + NaI → AgI↓ + NaNO₃',
            ionic_short: 'Ag⁺ + I⁻ → AgI↓'
        }
    },
    
    // 3Ag⁺ + PO₄³⁻ → Ag₃PO₄↓ (жёлтый)
    'Ag+_PO43-': {
        reactants: ['Ag+', 'PO43-'],
        products: ['Ag3PO4'],
        precipitate: {
            formula: 'Ag₃PO₄',
            color: 'yellow',
            colorHex: '#FFD700',
            description: 'жёлтый осадок'
        },
        equation: {
            molecular: '3AgNO₃ + Na₃PO₄ → Ag₃PO₄↓ + 3NaNO₃',
            ionic_short: '3Ag⁺ + PO₄³⁻ → Ag₃PO₄↓'
        }
    },
    
    // === РЕАКЦИИ НА АНИОНЫ ===
    
    // CO₃²⁻ + 2H⁺ → H₂O + CO₂↑ (газ без запаха)
    'CO32-_H+': {
        reactants: ['CO32-', 'H+'],
        products: ['H2O', 'CO2'],
        gas: {
            formula: 'CO₂',
            name: 'углекислый газ',
            smell: 'без запаха',
            description: 'выделение газа без запаха (вскипание)'
        },
        equation: {
            molecular: 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑',
            ionic_short: 'CO₃²⁻ + 2H⁺ → H₂O + CO₂↑'
        }
    },
    
    // HCO₃⁻ + H⁺ → H₂O + CO₂↑
    'HCO3-_H+': {
        reactants: ['HCO3-', 'H+'],
        products: ['H2O', 'CO2'],
        gas: {
            formula: 'CO₂',
            name: 'углекислый газ',
            smell: 'без запаха',
            description: 'выделение газа без запаха'
        },
        equation: {
            molecular: 'NaHCO₃ + HCl → NaCl + H₂O + CO₂↑',
            ionic_short: 'HCO₃⁻ + H⁺ → H₂O + CO₂↑'
        }
    },
    
    // === РЕАКЦИИ МЕТАЛЛОВ С КИСЛОТАМИ ===
    
    // Zn + 2H⁺ → Zn²⁺ + H₂↑
    'Zn_H+': {
        reactants: ['Zn', 'H+'],
        products: ['Zn2+', 'H2'],
        gas: {
            formula: 'H₂',
            name: 'водород',
            smell: 'без запаха',
            description: 'выделение газа (пузырьки)'
        },
        equation: {
            molecular: 'Zn + 2HCl → ZnCl₂ + H₂↑',
            ionic_short: 'Zn + 2H⁺ → Zn²⁺ + H₂↑'
        }
    },
    
    // Fe + 2H⁺ → Fe²⁺ + H₂↑
    'Fe_H+': {
        reactants: ['Fe', 'H+'],
        products: ['Fe2+', 'H2'],
        gas: {
            formula: 'H₂',
            name: 'водород',
            smell: 'без запаха',
            description: 'выделение газа (пузырьки)'
        },
        equation: {
            molecular: 'Fe + 2HCl → FeCl₂ + H₂↑',
            ionic_short: 'Fe + 2H⁺ → Fe²⁺ + H₂↑'
        }
    },
    
    // Al + 6H⁺ → 2Al³⁺ + 3H₂↑
    'Al_H+': {
        reactants: ['Al', 'H+'],
        products: ['Al3+', 'H2'],
        gas: {
            formula: 'H₂',
            name: 'водород',
            smell: 'без запаха',
            description: 'бурное выделение газа'
        },
        equation: {
            molecular: '2Al + 6HCl → 2AlCl₃ + 3H₂↑',
            ionic_short: '2Al + 6H⁺ → 2Al³⁺ + 3H₂↑'
        }
    },
    
    // Cu + H⁺ → НЕТ РЕАКЦИИ (Cu после H в ряду активности)
    'Cu_H+': {
        reactants: ['Cu', 'H+'],
        products: [],
        noReaction: true,
        description: 'Реакция не идёт: Cu стоит после H в ряду активности металлов'
    }
};

// ============================================
// 🎁 8 КОМПЛЕКТОВ РЕАКТИВОВ (ФИПИ 2025)
// ============================================

export const REAGENT_KITS = {
    'kit1': {
        id: 'kit1',
        name: 'Комплект 1: Cu²⁺ и Fe³⁺',
        description: 'Определение солей меди и железа',
        unknowns: ['CuSO4', 'FeCl3'],
        reagents: ['NaOH', 'H2SO4', 'BaCl2'],
        indicators: ['phenolphthalein', 'litmus']
    },
    'kit2': {
        id: 'kit2',
        name: 'Комплект 2: Карбонат и сульфат натрия',
        description: 'Определение карбоната и сульфата',
        unknowns: ['Na2CO3', 'Na2SO4'],
        reagents: ['HCl', 'BaCl2', 'AgNO3'],
        indicators: ['phenolphthalein', 'methyl_orange']
    },
    'kit3': {
        id: 'kit3',
        name: 'Комплект 3: Соли аммония',
        description: 'Определение хлорида и сульфата аммония',
        unknowns: ['NH4Cl', '(NH4)2SO4'],
        reagents: ['NaOH', 'BaCl2', 'AgNO3'],
        indicators: ['litmus']
    },
    'kit4': {
        id: 'kit4',
        name: 'Комплект 4: Хлориды цинка и алюминия',
        description: 'Определение солей цинка и алюминия',
        unknowns: ['ZnSO4', 'AlCl3'],
        reagents: ['NaOH', 'AgNO3', 'Na2CO3'],
        indicators: ['phenolphthalein']
    },
    'kit5': {
        id: 'kit5',
        name: 'Комплект 5: Хлориды кальция и магния',
        description: 'Определение солей кальция и магния',
        unknowns: ['CaCl2', 'MgCl2'],
        reagents: ['Na2CO3', 'NaOH', 'AgNO3'],
        indicators: ['phenolphthalein']
    },
    'kit6': {
        id: 'kit6',
        name: 'Комплект 6: Сульфиды и сульфиты',
        description: 'Определение сульфида и сульфита натрия',
        unknowns: ['Na2CO3', 'Na2SO4'],
        reagents: ['HCl', 'CuSO4', 'H2SO4'],
        indicators: ['methyl_orange']
    },
    'kit7': {
        id: 'kit7',
        name: 'Комплект 7: Галогениды',
        description: 'Определение йодида и бромида калия',
        unknowns: ['NaI', 'NaBr'],
        reagents: ['AgNO3', 'FeCl3', 'HCl'],
        indicators: ['litmus']
    },
    'kit8': {
        id: 'kit8',
        name: 'Комплект 8: Соли железа (II) и (III)',
        description: 'Определение степени окисления железа',
        unknowns: ['FeSO4', 'FeCl3'],
        reagents: ['NaOH', 'H2SO4', 'K3PO4'],
        indicators: ['phenolphthalein', 'litmus']
    }
};

// ============================================
// 🔬 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Получить ион из вещества
 */
export function getCation(substance) {
    const sub = SUBSTANCES[substance];
    if (!sub) return null;
    
    if (sub.cation) return sub.cation;
    if (sub.type === 'acid') return 'H+';
    if (sub.type === 'base' && substance !== 'NH3') {
        // Извлекаем катион из формулы основания
        if (substance.includes('Na')) return 'Na+';
        if (substance.includes('K')) return 'K+';
        if (substance.includes('Ca')) return 'Ca2+';
        if (substance.includes('Ba')) return 'Ba2+';
    }
    if (sub.type === 'metal') return substance;
    
    return null;
}

export function getAnion(substance) {
    const sub = SUBSTANCES[substance];
    if (!sub) return null;
    
    if (sub.anion) return sub.anion;
    if (sub.type === 'base') return 'OH-';
    if (substance === 'HCl') return 'Cl-';
    if (substance === 'H2SO4') return 'SO42-';
    
    return null;
}

/**
 * Найти реакцию между двумя веществами
 */
export function findReaction(substance1, substance2) {
    const cation1 = getCation(substance1);
    const anion1 = getAnion(substance1);
    const cation2 = getCation(substance2);
    const anion2 = getAnion(substance2);
    
    // Проверяем все возможные комбинации
    const combinations = [
        `${cation1}_${anion2}`,
        `${cation2}_${anion1}`,
        `${substance1}_${anion2}`,
        `${substance2}_${anion1}`,
        `${substance1}_${cation2}`,
        `${substance2}_${cation1}`
    ];
    
    for (const combo of combinations) {
        if (REACTIONS[combo]) {
            return REACTIONS[combo];
        }
    }
    
    return null;
}

/**
 * Определить цвет индикатора по pH
 */
export function getIndicatorColor(indicatorId, pH) {
    const indicator = INDICATORS[indicatorId];
    if (!indicator) return null;
    
    if (pH < 5) {
        return {
            color: indicator.colors.acidic,
            hex: indicator.colorHex?.acidic || '#FF0000'
        };
    } else if (pH > 9) {
        return {
            color: indicator.colors.basic,
            hex: indicator.colorHex?.basic || '#0000FF'
        };
    } else {
        return {
            color: indicator.colors.neutral,
            hex: indicator.colorHex?.neutral || '#800080'
        };
    }
}

/**
 * Проверить, есть ли реакция между веществами
 */
export function willReact(substance1, substance2) {
    return findReaction(substance1, substance2) !== null;
}

/**
 * Получить описание реакции для отображения
 */
export function getReactionDescription(substance1, substance2) {
    const reaction = findReaction(substance1, substance2);
    
    if (!reaction) {
        return {
            hasReaction: false,
            description: 'Реакция не идёт',
            observations: 'Видимых изменений нет'
        };
    }
    
    if (reaction.noReaction) {
        return {
            hasReaction: false,
            description: reaction.description,
            observations: 'Видимых изменений нет'
        };
    }
    
    const result = {
        hasReaction: true,
        equation: reaction.equation,
        observations: []
    };
    
    if (reaction.precipitate) {
        result.precipitate = reaction.precipitate;
        result.observations.push(reaction.precipitate.description);
    }
    
    if (reaction.gas) {
        result.gas = reaction.gas;
        result.observations.push(reaction.gas.description);
    }
    
    if (reaction.colorChange) {
        result.colorChange = reaction.colorChange;
        result.observations.push(reaction.colorChange.description);
    }
    
    result.description = result.observations.join(', ') || 'Реакция идёт';
    
    return result;
}

console.log('🧪 Chemistry Data Module loaded: ', Object.keys(SUBSTANCES).length, 'substances,', Object.keys(REACTIONS).length, 'reactions');
