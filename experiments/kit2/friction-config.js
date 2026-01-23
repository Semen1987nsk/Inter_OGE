/**
 * Configuration for Experiment 2: Friction Force Measurement
 * Contains physics constants, equipment definitions, and visual settings.
 */

export const PHYSICS_CONFIG = {
    gravity: 10, // m/s² (Standard for OGE/EGE problems)
    pixelsPerCm: 20, // scale for horizontal setup
    noisePercentage: 0.0, // No noise for cleaner readings
    
    // Friction coefficients for different surfaces (по ФИПИ для ОГЭ)
    frictionCoefficients: {
        wood: { static: 0.25, kinetic: 0.20, name: 'Дерево', color: '#8B4513' },
        rubber: { static: 0.70, kinetic: 0.60, name: 'Резина', color: '#2F4F4F' }
    },
    
    // Motion thresholds
    staticToKineticThreshold: 0.98, // Start moving when applied force > 98% of max static friction
    pullSpeed: 2, // pixels per frame when sliding
    maxPullForce: 6, // Maximum force the dynamometer can show (5N + margin)
};

export const VISUAL_CONFIG = {
    scale: 1,
    canvasWidth: 1200,
    canvasHeight: 700,
    surfaceY: 480, // Y position of the surface (adjusted for larger canvas)
    blockStartX: 350, // Initial X position of the block (centered)
    measurementParticles: true,
    showForceVectors: true
};

export const LAYOUT_CONFIG = {
    surface: {
        x: 200,
        y: 480,
        width: 850,
        height: 20
    },
    block: {
        width: 120,
        height: 60,
        color: '#DEB887', // Burlywood - wooden block
        startX: 350,
        startY: 420 // Above surface
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
    dynamometer1: {
        id: 'dynamometer1',
        name: 'Динамометр 1Н',
        maxForce: 1,
        divisions: 10, // 0.1N per division
        icon: '⚖️',
        type: 'dynamometer',
        description: 'Для точных измерений малых сил',
        scale: 0.1
    },
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
        mass: 50, // grams (по ФИПИ ОГЭ)
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
        name: 'Груз №1',
        description: 'Для увеличения нормальной силы',
        icon: '../../assets/equipment/weight-100g-no-label.svg',
        color: '#CD853F',
        targetSize: 80
    },
    {
        id: 'load_weight_100_2',
        mass: 100,
        name: 'Груз №2',
        description: 'Для увеличения нормальной силы',
        icon: '../../assets/equipment/weight-100g-no-label.svg',
        color: '#CD853F',
        targetSize: 80
    },
    {
        id: 'load_weight_100_3',
        mass: 100,
        name: 'Груз №3',
        description: 'Для увеличения нормальной силы',
        icon: '../../assets/equipment/weight-100g-no-label.svg',
        color: '#CD853F',
        targetSize: 80
    }
];

// Surface textures for rendering
export const SURFACE_TEXTURES = {
    wood: {
        baseColor: '#DEB887',
        lineColor: '#8B4513',
        pattern: 'grain'
    },
    rubber: {
        baseColor: '#2F2F2F',
        lineColor: '#1A1A1A',
        pattern: 'dots'
    }
};
