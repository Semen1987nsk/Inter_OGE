/**
 * Configuration for Experiment 2: Friction Force Measurement
 * Contains physics constants, equipment definitions, and visual settings.
 */

export const PHYSICS_CONFIG = {
    gravity: 10, // m/s² (Standard for OGE/EGE problems)
    pixelsPerCm: 20, // scale for horizontal setup
    noisePercentage: 0.0, // No noise for cleaner readings
    
    // Friction coefficients for different surfaces
    frictionCoefficients: {
        wood: { static: 0.40, kinetic: 0.30, name: 'Дерево', color: '#8B4513' },
        plastic: { static: 0.30, kinetic: 0.25, name: 'Пластик', color: '#4169E1' },
        rubber: { static: 0.70, kinetic: 0.55, name: 'Резина', color: '#2F4F4F' }
    },
    
    // Motion thresholds
    staticToKineticThreshold: 0.98, // Start moving when applied force > 98% of max static friction
    pullSpeed: 2, // pixels per frame when sliding
    maxPullForce: 6, // Maximum force the dynamometer can show (5N + margin)
};

export const VISUAL_CONFIG = {
    scale: 1,
    canvasWidth: 900,
    canvasHeight: 600,
    surfaceY: 400, // Y position of the surface
    blockStartX: 200, // Initial X position of the block
    measurementParticles: true,
    showForceVectors: true
};

export const LAYOUT_CONFIG = {
    surface: {
        x: 50,
        y: 380,
        width: 700,
        height: 20
    },
    block: {
        width: 120,
        height: 60,
        color: '#DEB887', // Burlywood - wooden block
        startX: 200,
        startY: 320 // Above surface
    },
    dynamometer: {
        width: 150,
        height: 40,
        attachOffset: 10 // Offset from block edge
    },
    weightStack: {
        weightHeight: 25,
        weightWidth: 80,
        maxWeights: 5
    }
};

export const EQUIPMENT_CONFIG = {
    dynamometer5: {
        id: 'dynamometer5',
        name: 'Динамометр 5Н',
        maxForce: 5,
        divisions: 50, // 0.1N per division
        icon: '⚖️',
        type: 'dynamometer',
        description: 'Для измерения силы тяги',
        scale: 0.1
    },
    block: {
        id: 'block',
        name: 'Деревянный брусок',
        mass: 100, // grams
        icon: '📦',
        type: 'block',
        description: 'Брусок для исследования трения',
        dimensions: { width: 12, height: 6, depth: 4 } // cm
    }
};

// Weights that can be placed ON TOP of the block
export const WEIGHTS_INVENTORY = [
    {
        id: 'load_weight_100_1',
        mass: 100,
        name: 'Груз 100 г №1',
        description: 'Для увеличения нормальной силы',
        icon: '../../assets/equipment/weight-100g-double-hook.svg',
        color: '#CD853F',
        targetSize: 80
    },
    {
        id: 'load_weight_100_2',
        mass: 100,
        name: 'Груз 100 г №2',
        description: 'Для увеличения нормальной силы',
        icon: '../../assets/equipment/weight-100g-double-hook.svg',
        color: '#CD853F',
        targetSize: 80
    },
    {
        id: 'load_weight_100_3',
        mass: 100,
        name: 'Груз 100 г №3',
        description: 'Для увеличения нормальной силы',
        icon: '../../assets/equipment/weight-100g-double-hook.svg',
        color: '#CD853F',
        targetSize: 80
    },
    {
        id: 'load_weight_200',
        mass: 200,
        name: 'Груз 200 г',
        description: 'Большой груз',
        icon: '../../assets/equipment/weight-100g-double-hook.svg',
        color: '#8B4513',
        targetSize: 100
    }
];

// Surface textures for rendering
export const SURFACE_TEXTURES = {
    wood: {
        baseColor: '#DEB887',
        lineColor: '#8B4513',
        pattern: 'grain'
    },
    plastic: {
        baseColor: '#E0E0E0',
        lineColor: '#B0B0B0',
        pattern: 'smooth'
    },
    rubber: {
        baseColor: '#2F2F2F',
        lineColor: '#1A1A1A',
        pattern: 'dots'
    }
};
