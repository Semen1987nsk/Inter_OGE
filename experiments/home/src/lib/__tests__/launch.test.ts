import { describe, it, expect } from 'vitest';
import { experimentUrl } from '../launch';
import { KITS } from '../../data/kits';

const kit2 = KITS.find(k => k.num === 2)!;
const kit1 = KITS.find(k => k.num === 1)!;

describe('experimentUrl — catalog-driven regression (FIX 1 guard)', () => {
  it('every READY kit experiment → URL contains screen=<exp.id>', () => {
    const readyKits = KITS.filter(k => k.status === 'ready');
    expect(readyKits.length).toBeGreaterThan(0);

    for (const kit of readyKits) {
      for (const exp of kit.experiments) {
        const url = experimentUrl(kit, exp.id, 'student');
        expect(url, `kit-${kit.num} exp ${exp.id} должен содержать screen=${exp.id}`)
          .toContain(`screen=${exp.id}`);
        expect(url).toContain(`role=student`);
        expect(url).toContain(kit.path);
      }
    }
  });

  it('planned kit → URL has no screen= param', () => {
    const plannedKits = KITS.filter(k => k.status === 'planned');
    expect(plannedKits.length).toBeGreaterThan(0);

    for (const kit of plannedKits) {
      for (const exp of kit.experiments) {
        const url = experimentUrl(kit, exp.id, 'student');
        expect(url, `planned kit-${kit.num} exp ${exp.id} не должен содержать screen=`)
          .not.toContain('screen=');
        expect(url).toContain(kit.path);
        expect(url).toContain('role=student');
      }
    }
  });
});

describe('experimentUrl — конкретные экраны', () => {
  it('teacher роль прокидывается', () => {
    expect(experimentUrl(kit2, 'spring-stiffness', 'teacher')).toContain('role=teacher');
  });

  it('kit-2: spring-stiffness slug → screen=spring-stiffness', () => {
    expect(experimentUrl(kit2, 'spring-stiffness', 'student')).toContain('screen=spring-stiffness');
  });

  it('kit-2: friction slug → screen=friction', () => {
    expect(experimentUrl(kit2, 'friction', 'student')).toContain('screen=friction');
  });

  it('kit-2: elastic-force slug → screen=elastic-force', () => {
    expect(experimentUrl(kit2, 'elastic-force', 'student')).toContain('screen=elastic-force');
  });

  it('kit-2: spring-elastic slug → screen=spring-elastic', () => {
    expect(experimentUrl(kit2, 'spring-elastic', 'student')).toContain('screen=spring-elastic');
  });

  it('kit-2: spring-work slug → screen=spring-work', () => {
    expect(experimentUrl(kit2, 'spring-work', 'student')).toContain('screen=spring-work');
  });

  it('kit-1: density-solid slug → screen=density-solid', () => {
    expect(experimentUrl(kit1, 'density-solid', 'student')).toContain('screen=density-solid');
  });

  it('kit-1: archimedes slug → screen=archimedes', () => {
    expect(experimentUrl(kit1, 'archimedes', 'student')).toContain('screen=archimedes');
  });

  it('kit-1: archimedes-volume slug → screen=archimedes-volume', () => {
    expect(experimentUrl(kit1, 'archimedes-volume', 'student')).toContain('screen=archimedes-volume');
  });

  it('kit-1: independence-mass slug → screen=independence-mass', () => {
    expect(experimentUrl(kit1, 'independence-mass', 'student')).toContain('screen=independence-mass');
  });
  // (planned-kit «без screen=» проверяется обобщённым тестом выше — kit-3 теперь ready)
});
