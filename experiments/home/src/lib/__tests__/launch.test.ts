import { describe, it, expect } from 'vitest';
import { experimentUrl } from '../launch';
import { KITS } from '../../data/kits';

const kit2 = KITS.find(k => k.num === 2)!;
const kit1 = KITS.find(k => k.num === 1)!;
const kit3 = KITS.find(k => k.num === 3)!;

describe('experimentUrl', () => {
  it('строит относительный URL с screen и role', () => {
    const url = experimentUrl(kit2, '2.1', 'student');
    expect(url).toContain(kit2.path);          // ../kit-2-forces/
    expect(url).toContain('screen=');
    expect(url).toContain('role=student');
  });

  it('teacher роль прокидывается', () => {
    expect(experimentUrl(kit2, '2.1', 'teacher')).toContain('role=teacher');
  });

  it('kit-2: 2.1 → spring-stiffness', () => {
    expect(experimentUrl(kit2, '2.1', 'student')).toContain('screen=spring-stiffness');
  });

  it('kit-2: 2.6 → spring-elastic', () => {
    expect(experimentUrl(kit2, '2.6', 'student')).toContain('screen=spring-elastic');
  });

  it('kit-2: 2.4 → spring-work', () => {
    expect(experimentUrl(kit2, '2.4', 'student')).toContain('screen=spring-work');
  });

  it('kit-2: 2.2 → friction', () => {
    expect(experimentUrl(kit2, '2.2', 'student')).toContain('screen=friction');
  });

  it('kit-1: 1.1 → density-solid', () => {
    expect(experimentUrl(kit1, '1.1', 'student')).toContain('screen=density-solid');
  });

  it('kit-1: 1.2 → archimedes', () => {
    expect(experimentUrl(kit1, '1.2', 'student')).toContain('screen=archimedes');
  });

  it('kit-1: 1.4 → archimedes', () => {
    expect(experimentUrl(kit1, '1.4', 'student')).toContain('screen=archimedes');
  });

  it('kit-1: 1.3 → archimedes-volume', () => {
    expect(experimentUrl(kit1, '1.3', 'student')).toContain('screen=archimedes-volume');
  });

  it('kit-1: 1.5 (не реализован) → fallback без screen=', () => {
    const url = experimentUrl(kit1, '1.5', 'student');
    // Для неизвестного id возвращается kit.path с role, без screen
    expect(url).toContain(kit1.path);
    expect(url).toContain('role=student');
    expect(url).not.toContain('screen=');
  });

  it('planned kit (kit-3) → path + role, без screen', () => {
    const url = experimentUrl(kit3, '3.1', 'student');
    expect(url).toContain(kit3.path);
    expect(url).toContain('role=student');
    expect(url).not.toContain('screen=');
  });
});
