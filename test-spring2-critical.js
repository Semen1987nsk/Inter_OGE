// 🧪 КРИТИЧНЫЙ ТЕСТ: Пружина №2 с 2 и 3 грузами

console.log('═'.repeat(80));
console.log('⚠️  КРИТИЧНЫЙ ТЕСТ: ПРУЖИНА №2 (10 Н/м)');
console.log('═'.repeat(80));

const g = 9.8; // м/с²
const k = 10;  // Н/м для Пружины №2

function testSpring2(testName, massGrams) {
    console.log('\n' + '─'.repeat(80));
    console.log(`📊 ${testName}`);
    console.log('─'.repeat(80));
    
    const massKg = massGrams / 1000;
    const force = massKg * g;
    const elongationM = force / k;
    const elongationCm = elongationM * 100;
    const calculatedK = force / elongationM;
    const error = Math.abs(calculatedK - k);
    const errorPercent = (error / k * 100).toFixed(2);
    
    console.log(`\n📌 Входные данные:`);
    console.log(`   Масса: ${massGrams} г = ${massKg} кг`);
    console.log(`   Константа пружины: ${k} Н/м`);
    console.log(`   Ускорение свободного падения: ${g} м/с²`);
    
    console.log(`\n🔢 Расчеты:`);
    console.log(`   1️⃣  Сила: F = mg = ${massKg} × ${g} = ${force.toFixed(4)} Н`);
    console.log(`   2️⃣  Удлинение: Δl = F / k = ${force.toFixed(4)} / ${k} = ${elongationM.toFixed(6)} м`);
    console.log(`   3️⃣  Удлинение в см: ${elongationCm.toFixed(4)} см`);
    console.log(`   4️⃣  Жесткость: k = F / Δl = ${force.toFixed(4)} / ${elongationM.toFixed(6)} = ${calculatedK.toFixed(4)} Н/м`);
    
    console.log(`\n✅ Проверка:`);
    console.log(`   Ожидаемая жесткость: ${k} Н/м`);
    console.log(`   Расчётная жесткость: ${calculatedK.toFixed(4)} Н/м`);
    console.log(`   Погрешность: ${error.toFixed(6)} Н/м (${errorPercent}%)`);
    
    if (error < 0.01) {
        console.log(`   Статус: ✅ ПРАВИЛЬНО`);
    } else {
        console.log(`   Статус: ❌ ОШИБКА!`);
    }
    
    return {
        mass: massGrams,
        force: force.toFixed(4),
        elongationCm: elongationCm.toFixed(2),
        k: calculatedK.toFixed(2),
        error: error.toFixed(4),
        status: error < 0.01 ? '✅' : '❌'
    };
}

// ТЕСТ 1: 2 груза по 100г
const test1 = testSpring2('ТЕСТ 1: Пружина №2 + 2 груза по 100г', 200);

// ТЕСТ 2: 3 груза по 100г (ПРОБЛЕМНЫЙ!)
const test2 = testSpring2('ТЕСТ 2: Пружина №2 + 3 груза по 100г (ПРОБЛЕМНЫЙ!)', 300);

// Итоговая таблица
console.log('\n' + '═'.repeat(80));
console.log('📋 ИТОГОВАЯ ТАБЛИЦА');
console.log('═'.repeat(80));
console.log('\n| Тест | Масса | F (Н) | Δl (см) | k (Н/м) | Погрешность | Статус |');
console.log('|------|-------|-------|---------|---------|-------------|--------|');
console.log(`| Тест 1 (2×100г) | ${test1.mass}г | ${test1.force} | ${test1.elongationCm} | ${test1.k} | ${test1.error} Н/м | ${test1.status} |`);
console.log(`| Тест 2 (3×100г) | ${test2.mass}г | ${test2.force} | ${test2.elongationCm} | ${test2.k} | ${test2.error} Н/м | ${test2.status} |`);

console.log('\n' + '═'.repeat(80));
console.log('💡 ВЫВОД:');
console.log('═'.repeat(80));

if (test1.status === '✅' && test2.status === '✅') {
    console.log('\n✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('   Математические расчеты верны для обоих случаев.');
    console.log('   Если в эксперименте видишь другие значения — проблема в коде.');
} else {
    console.log('\n❌ ОБНАРУЖЕНЫ ОШИБКИ В РАСЧЕТАХ!');
    console.log('   Проверь формулы в коде.');
}

console.log('\n📝 Что делать дальше:');
console.log('   1. Открой эксперимент: experiments/kit2/experiment-1-spring.html');
console.log('   2. Открой консоль браузера (F12)');
console.log('   3. Прикрепи Пружину №2 (10 Н/м)');
console.log('   4. Подвесь 2 груза → "Записать измерение" → проверь консоль');
console.log('   5. Подвесь 3-й груз → "Записать измерение" → проверь консоль');
console.log('   6. Сравни вывод с ожидаемыми значениями выше');

console.log('\n🔍 Специальная тестовая страница:');
console.log('   https://semen1987nsk.github.io/Inter_OGE/experiments/kit2/test-spring2-critical.html');

console.log('\n' + '═'.repeat(80));
