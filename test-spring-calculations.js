// 🧪 Тест расчета жесткости пружин для всех комбинаций

const g = 9.8; // м/с²

// Пружины
const springs = {
    spring50: { name: 'Пружина №1', k: 50, naturalLength: 140 },
    spring10: { name: 'Пружина №2', k: 10, naturalLength: 140 }
};

// Грузы
const weights = {
    // Обычные
    weight100: { name: '100г', mass: 100 },
    weight50: { name: '50г', mass: 50 },
    weight200: { name: '200г', mass: 200 },
    // Сборные
    rod10: { name: 'Стержень 10г', mass: 10 },
    disk10: { name: 'Диск 10г', mass: 10 },
    disk20: { name: 'Диск 20г', mass: 20 },
    disk50: { name: 'Диск 50г', mass: 50 }
};

// Формула: Δl = F / k, где F = mg
function calculateExpectedElongation(massGrams, springK) {
    const massKg = massGrams / 1000;
    const force = massKg * g;
    const elongationM = force / springK;
    const elongationCm = elongationM * 100;
    return { force, elongationCm };
}

// Формула: k = F / Δl
function calculateStiffness(massGrams, elongationCm) {
    const massKg = massGrams / 1000;
    const force = massKg * g;
    const elongationM = elongationCm / 100;
    const k = force / elongationM;
    return k;
}

console.log('='.repeat(80));
console.log('🧪 ТЕСТ РАСЧЕТА ЖЕСТКОСТИ ПРУЖИН');
console.log('='.repeat(80));

// Тесты для пружины 50 Н/м
console.log('\n📌 ПРУЖИНА №1 (50 Н/м)\n');
console.log('| Грузы | Масса (г) | F (Н) | Δl (см) | k (Н/м) | Статус |');
console.log('|-------|-----------|-------|---------|---------|--------|');

const tests50 = [
    { desc: '1x 100г', mass: 100 },
    { desc: '2x 100г', mass: 200 },
    { desc: '3x 100г', mass: 300 },
    { desc: '1x 50г', mass: 50 },
    { desc: '2x 50г', mass: 100 },
    { desc: '3x 50г', mass: 150 },
    { desc: 'Стержень 10г', mass: 10 },
    { desc: 'Стержень + 1x Диск 10г', mass: 20 },
    { desc: 'Стержень + 2x Диск 10г', mass: 30 },
    { desc: 'Стержень + 1x Диск 20г', mass: 30 },
    { desc: 'Стержень + 1x Диск 50г', mass: 60 },
    { desc: 'Стержень + 3 диска (10+20+50)', mass: 90 },
    { desc: '100г + Сборный (10+50)', mass: 160 },
];

tests50.forEach(test => {
    const { force, elongationCm } = calculateExpectedElongation(test.mass, 50);
    const k = calculateStiffness(test.mass, elongationCm);
    const status = Math.abs(k - 50) < 0.1 ? '✅' : '❌';
    console.log(`| ${test.desc.padEnd(28)} | ${test.mass.toString().padStart(4)} | ${force.toFixed(2).padStart(5)} | ${elongationCm.toFixed(2).padStart(7)} | ${k.toFixed(1).padStart(7)} | ${status} |`);
});

// Тесты для пружины 10 Н/м
console.log('\n📌 ПРУЖИНА №2 (10 Н/м)\n');
console.log('| Грузы | Масса (г) | F (Н) | Δl (см) | k (Н/м) | Статус |');
console.log('|-------|-----------|-------|---------|---------|--------|');

const tests10 = [
    { desc: '1x 100г', mass: 100 },
    { desc: '2x 100г', mass: 200 },
    { desc: '3x 100г', mass: 300 },
    { desc: '1x 50г', mass: 50 },
    { desc: '2x 50г', mass: 100 },
    { desc: '3x 50г', mass: 150 },
    { desc: 'Стержень 10г', mass: 10 },
    { desc: 'Стержень + 1x Диск 50г', mass: 60 },
    { desc: 'Стержень + 2x Диск 50г', mass: 110 },
    { desc: 'Стержень + 3x Диск 50г', mass: 160 },
    { desc: '100г + Сборный (10+50)', mass: 160 },
];

tests10.forEach(test => {
    const { force, elongationCm } = calculateExpectedElongation(test.mass, 10);
    const k = calculateStiffness(test.mass, elongationCm);
    const status = Math.abs(k - 10) < 0.1 ? '✅' : '❌';
    console.log(`| ${test.desc.padEnd(28)} | ${test.mass.toString().padStart(4)} | ${force.toFixed(2).padStart(5)} | ${elongationCm.toFixed(2).padStart(7)} | ${k.toFixed(1).padStart(7)} | ${status} |`);
});

// Детальный пример для пружины №2 с 3 грузами
console.log('\n🔍 ДЕТАЛЬНЫЙ РАСЧЕТ: Пружина №2 (10 Н/м) + 3 груза по 100г\n');
const mass3x100 = 300;
const k10 = 10;
const { force: F, elongationCm: dL } = calculateExpectedElongation(mass3x100, k10);
const kCalc = calculateStiffness(mass3x100, dL);

console.log(`Масса: ${mass3x100} г = ${mass3x100/1000} кг`);
console.log(`Сила: F = mg = ${mass3x100/1000} × ${g} = ${F.toFixed(3)} Н`);
console.log(`Удлинение: Δl = F / k = ${F.toFixed(3)} / ${k10} = ${(F/k10).toFixed(4)} м = ${dL.toFixed(2)} см`);
console.log(`Жесткость: k = F / Δl = ${F.toFixed(3)} / ${dL/100} = ${kCalc.toFixed(2)} Н/м`);
console.log(`\nОжидаемый результат: k ≈ ${k10} Н/м ${Math.abs(kCalc - k10) < 0.1 ? '✅ ПРАВИЛЬНО' : '❌ ОШИБКА'}`);

console.log('\n' + '='.repeat(80));
console.log('💡 ПРОБЛЕМА: Если k ≠ 10 Н/м для пружины №2, проверь:');
console.log('   1. Правильно ли установлена springConstant при прикреплении пружины');
console.log('   2. Правильно ли считается масса (с учетом сборных дисков)');
console.log('   3. Правильно ли считается удлинение (Δl = F / k)');
console.log('='.repeat(80));
