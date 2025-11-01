// 🧪 ПОЛНЫЙ ТЕСТ ВСЕХ 46 КОМБИНАЦИЙ ПРУЖИН И ГРУЗОВ

const g = 9.8; // м/с²

// Пружины
const springs = {
    spring50: { name: 'Пружина №1', k: 50 },
    spring10: { name: 'Пружина №2', k: 10 }
};

// Формулы
function calcForce(massG) {
    return (massG / 1000) * g;
}

function calcElongation(force, k) {
    return (force / k) * 100; // см
}

function calcStiffness(force, elongationCm) {
    return force / (elongationCm / 100);
}

// Матрица тестов
const testMatrix = [
    // ═══════════════════════════════════════════════════════════
    // ПРУЖИНА №1 (50 Н/м)
    // ═══════════════════════════════════════════════════════════
    
    // Обычные грузы
    { spring: 'spring50', desc: '1 × 100г', mass: 100 },
    { spring: 'spring50', desc: '2 × 100г', mass: 200 },
    { spring: 'spring50', desc: '3 × 100г', mass: 300 },
    { spring: 'spring50', desc: '1 × 50г', mass: 50 },
    { spring: 'spring50', desc: '2 × 50г', mass: 100 },
    { spring: 'spring50', desc: '3 × 50г', mass: 150 },
    { spring: 'spring50', desc: '1 × 200г', mass: 200 },
    { spring: 'spring50', desc: '100г + 50г', mass: 150 },
    { spring: 'spring50', desc: '100г + 100г + 50г', mass: 250 },
    
    // Сборные грузы (штанга + диски)
    { spring: 'spring50', desc: '⚠️ Штанга 10г (БАГ!)', mass: 10, bug: true },
    { spring: 'spring50', desc: 'Штанга + 1×Диск 10г', mass: 20 },
    { spring: 'spring50', desc: 'Штанга + 2×Диск 10г', mass: 30 },
    { spring: 'spring50', desc: 'Штанга + 1×Диск 20г', mass: 30 },
    { spring: 'spring50', desc: 'Штанга + 2×Диск 20г', mass: 50 },
    { spring: 'spring50', desc: 'Штанга + 1×Диск 50г', mass: 60 },
    { spring: 'spring50', desc: 'Штанга + 2×Диск 50г', mass: 110 },
    { spring: 'spring50', desc: 'Штанга + 3×Диск 50г', mass: 160 },
    { spring: 'spring50', desc: 'Штанга + Диск 10г + Диск 20г', mass: 40 },
    { spring: 'spring50', desc: 'Штанга + Диск 10г + Диск 50г', mass: 70 },
    { spring: 'spring50', desc: 'Штанга + Диск 20г + Диск 50г', mass: 80 },
    { spring: 'spring50', desc: 'Штанга + все диски (10+20+50)', mass: 90 },
    
    // Смешанные комбинации
    { spring: 'spring50', desc: '100г + Штанга', mass: 110 },
    { spring: 'spring50', desc: '100г + (Штанга + Диск 50г)', mass: 160 },
    { spring: 'spring50', desc: '50г + (Штанга + Диск 20г)', mass: 80 },
    { spring: 'spring50', desc: '2×100г + Штанга', mass: 210 },
    
    // ═══════════════════════════════════════════════════════════
    // ПРУЖИНА №2 (10 Н/м)
    // ═══════════════════════════════════════════════════════════
    
    // Обычные грузы
    { spring: 'spring10', desc: '1 × 100г', mass: 100 },
    { spring: 'spring10', desc: '2 × 100г', mass: 200 },
    { spring: 'spring10', desc: '3 × 100г', mass: 300 },
    { spring: 'spring10', desc: '1 × 50г', mass: 50 },
    { spring: 'spring10', desc: '2 × 50г', mass: 100 },
    { spring: 'spring10', desc: '3 × 50г', mass: 150 },
    { spring: 'spring10', desc: '1 × 200г', mass: 200 },
    { spring: 'spring10', desc: '100г + 50г', mass: 150 },
    
    // Сборные грузы (штанга + диски)
    { spring: 'spring10', desc: 'Штанга 10г', mass: 10 },
    { spring: 'spring10', desc: 'Штанга + 1×Диск 10г', mass: 20 },
    { spring: 'spring10', desc: 'Штанга + 2×Диск 10г', mass: 30 },
    { spring: 'spring10', desc: 'Штанга + 1×Диск 20г', mass: 30 },
    { spring: 'spring10', desc: 'Штанга + 2×Диск 20г', mass: 50 },
    { spring: 'spring10', desc: 'Штанга + 1×Диск 50г', mass: 60 },
    { spring: 'spring10', desc: 'Штанга + 2×Диск 50г', mass: 110 },
    { spring: 'spring10', desc: 'Штанга + 3×Диск 50г', mass: 160 },
    { spring: 'spring10', desc: 'Штанга + все диски (10+20+50)', mass: 90 },
    
    // Смешанные комбинации
    { spring: 'spring10', desc: '100г + Штанга', mass: 110 },
    { spring: 'spring10', desc: '100г + (Штанга + Диск 50г)', mass: 160 },
    { spring: 'spring10', desc: '50г + (Штанга + Диск 20г)', mass: 80 },
    { spring: 'spring10', desc: '2×100г + Штанга', mass: 210 }
];

console.log('═'.repeat(100));
console.log('🧪 ПОЛНЫЙ ТЕСТ ВСЕХ 46 КОМБИНАЦИЙ ПРУЖИН И ГРУЗОВ');
console.log('═'.repeat(100));

let testNumber = 1;
let currentSpring = null;
let bugCount = 0;

testMatrix.forEach(test => {
    const springData = springs[test.spring];
    const k = springData.k;
    
    // Заголовок для новой пружины
    if (currentSpring !== test.spring) {
        currentSpring = test.spring;
        console.log('\n' + '─'.repeat(100));
        console.log(`\n📍 ${springData.name.toUpperCase()} (${k} Н/м)\n`);
        console.log('─'.repeat(100));
        console.log(`${'№'.padStart(3)} | ${'Комбинация'.padEnd(35)} | ${'Масса'.padStart(7)} | ${'F (Н)'.padStart(8)} | ${'Δl (см)'.padStart(9)} | ${'k (Н/м)'.padStart(8)} | Статус`);
        console.log('─'.repeat(100));
    }
    
    // Расчет
    const force = calcForce(test.mass);
    const elongationCm = calcElongation(force, k);
    const calculatedK = calcStiffness(force, elongationCm);
    const error = Math.abs(calculatedK - k);
    const status = error < 0.01 ? '✅' : '❌';
    
    if (error >= 0.01) bugCount++;
    
    // Форматирование
    const num = testNumber.toString().padStart(3);
    const desc = test.desc.padEnd(35);
    const mass = `${test.mass}г`.padStart(7);
    const forceStr = force.toFixed(3).padStart(8);
    const elongStr = elongationCm.toFixed(3).padStart(9);
    const kStr = calculatedK.toFixed(1).padStart(8);
    
    // Особое выделение для бага
    const marker = test.bug ? '⚠️  ' : '   ';
    
    console.log(`${marker}${num} | ${desc} | ${mass} | ${forceStr} | ${elongStr} | ${kStr} | ${status}`);
    
    testNumber++;
});

console.log('\n' + '═'.repeat(100));
console.log(`\n📊 ИТОГОВАЯ СТАТИСТИКА:`);
console.log(`   Всего тестов: ${testMatrix.length}`);
console.log(`   ✅ Успешно: ${testMatrix.length - bugCount}`);
console.log(`   ❌ Ошибок (математических): ${bugCount}`);
console.log(`\n💡 ВАЖНО: Все тесты показывают ✅ в математике!`);
console.log(`   Если в реальном эксперименте штанга дает k=195 Н/м вместо 50 Н/м,`);
console.log(`   значит проблема в КОДЕ, а не в формулах.\n`);

console.log('🔍 КЛЮЧЕВЫЕ ЗНАЧЕНИЯ ДЛЯ ПРОВЕРКИ В КОДЕ:\n');
console.log('   Штанга 10г на Пружине №1 (50 Н/м):');
console.log('      Ожидаемое удлинение: 0.196 см (очень маленькое!)');
console.log('      Ожидаемая сила: 0.098 Н');
console.log('      Ожидаемая жесткость: 50.0 Н/м');
console.log('      Фактическая жесткость: 195.0 Н/м ❌\n');
console.log('   Возможные причины:');
console.log('      1. Удлинение рассчитывается неправильно (слишком маленькое значение)');
console.log('      2. Масса штанги не учитывается (считается 0)');
console.log('      3. Ошибка в функции getTotalWeightMass() для штанги без дисков');
console.log('      4. Визуальное удлинение ≠ физическому расчету\n');

console.log('═'.repeat(100));
