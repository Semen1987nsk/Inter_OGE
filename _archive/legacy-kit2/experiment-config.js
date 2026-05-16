/**
 * Configuration for Experiment 1: Spring Stiffness
 * Contains physics constants, equipment definitions, and visual settings.
 */

export const PHYSICS_CONFIG = {
    springConstant: 50, // N/m (initial)
    gravity: 9.8, // m/s²
    pixelsPerCm: 40, // scale: 40px = 1cm
    oscillationAmplitude: 0,
    oscillationTime: 0,
    isDamping: false,
    noisePercentage: 0.02, // 2% measurement noise
    overloadThreshold: 1.5 // 150% of max load causes damage
};

export const VISUAL_CONFIG = {
    scale: 1,
    minScale: 0.2,
    marginTop: 120,
    marginBottom: 140,
    measurementParticles: false,
    completionConfetti: true
};

export const LAYOUT_CONFIG = {
    springRig: {
        position: { x: 260, y: 80 },
        width: 260,
        height: 420,
        anchorRatio: { x: 0.48, y: 0.18 }, // relative position of top hook
        anchorOffset: { x: 0, y: 0 }
    }
};

export const EQUIPMENT_CONFIG = {
    dynamometer1: {
        id: 'dynamometer1',
        name: 'Динамометр 1Н',
        maxForce: 1,
        icon: '⚖️',
        type: 'dynamometer',
        description: 'Для измерения малых сил',
        scale: 0.1 // Division value 0.1 N
    },
    dynamometer5: {
        id: 'dynamometer5',
        name: 'Динамометр 5Н',
        maxForce: 5,
        icon: '⚖️',
        type: 'dynamometer',
        description: 'Для измерения больших сил',
        scale: 0.5 // Division value 0.5 N
    },
    spring50: {
        id: 'spring50',
        name: 'Пружина №1',
        stiffness: '50 Н/м',
        stiffnessValue: 50,
        icon: '🌀',
        type: 'spring',
        naturalLength: 140
    },
    spring10: {
        id: 'spring10',
        name: 'Пружина №2',
        stiffness: '10 Н/м',
        stiffnessValue: 10,
        icon: '🧷',
        type: 'spring',
        naturalLength: 140
    }
};

export const WEIGHTS_INVENTORY = [
    {
        id: 'weight100_double_1',
        mass: 100,
        name: 'Груз 100 г №1',
        description: 'Двойной крюк для стыковки',
        icon: '../../assets/equipment/weight-100g-double-hook.svg',
        hooksTop: true,
        hooksBottom: true,
        targetSize: 88,
        hookGap: 28
    },
    {
        id: 'weight100_double_2',
        mass: 100,
        name: 'Груз 100 г №2',
        description: 'Двойной крюк для стыковки',
        icon: '../../assets/equipment/weight-100g-double-hook.svg',
        hooksTop: true,
        hooksBottom: true,
        targetSize: 88,
        hookGap: 28
    },
    {
        id: 'weight100_double_3',
        mass: 100,
        name: 'Груз 100 г №3',
        description: 'Двойной крюк для стыковки',
        icon: '../../assets/equipment/weight-100g-double-hook.svg',
        hooksTop: true,
        hooksBottom: true,
        targetSize: 88,
        hookGap: 28
    },
    // 🔩 COMPOSITE WEIGHT COMPONENTS
    {
        id: 'composite_rod_10g',
        mass: 10,
        name: 'Штанга 10 г',
        description: 'Основа наборного груза',
        icon: '../../assets/equipment/composite-weights/rod-10g-side.svg',
        hooksTop: true,
        hooksBottom: true,
        targetSize: 135, // 90 * 1.5
        hookGap: 28,
        isCompositeRod: true
    },
    {
        id: 'composite_disk_10g',
        mass: 10,
        name: 'Диск 10 г',
        description: 'Маленький диск для штанги',
        icon: '../../assets/equipment/composite-weights/disk-10g-side.svg',
        hooksTop: false,
        hooksBottom: false,
        targetSize: 90, // 60 * 1.5
        hookGap: 0,
        isCompositeDisk: true,
        diskSize: 'small'
    },
    {
        id: 'composite_disk_20g',
        mass: 20,
        name: 'Диск 20 г',
        description: 'Средний диск для штанги',
        icon: '../../assets/equipment/composite-weights/disk-20g-side.svg',
        hooksTop: false,
        hooksBottom: false,
        targetSize: 112.5, // 75 * 1.5
        hookGap: 0,
        isCompositeDisk: true,
        diskSize: 'medium'
    },
    {
        id: 'composite_disk_50g',
        mass: 50,
        name: 'Диск 50 г',
        description: 'Большой диск для штанги',
        icon: '../../assets/equipment/composite-weights/disk-50g-side.svg',
        hooksTop: false,
        hooksBottom: false,
        targetSize: 135, // 90 * 1.5
        hookGap: 0,
        isCompositeDisk: true,
        diskSize: 'large'
    }
];
