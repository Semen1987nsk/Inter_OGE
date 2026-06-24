// Генератор приборных SVG-постеров → public/photos/kit-N.svg
// Источник истины для иллюстраций комплектов. Запуск: node gen-instruments.mjs
import { writeFileSync } from 'node:fs';

const INK='#d6e1f0', DIM='#7588a0', GLASS='rgba(255,255,255,0.05)', AMBER='#ffbe0b';
const DEFS = () => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0e1b2d"/><stop offset="1" stop-color="#060f1d"/>
    </linearGradient>
    <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse">
      <path d="M22 0H0V22" fill="none" stroke="#16273e" stroke-width="1"/>
    </pattern>
    <pattern id="grid5" width="110" height="110" patternUnits="userSpaceOnUse">
      <path d="M110 0H0V110" fill="none" stroke="#1d3149" stroke-width="1.2"/>
    </pattern>
  </defs>`;
const BG = `
  <rect width="300" height="400" fill="url(#bg)"/>
  <rect width="300" height="330" fill="url(#grid)" opacity="0.6"/>
  <rect width="300" height="330" fill="url(#grid5)" opacity="0.7"/>`;

function dynamometer(acc){return `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
${DEFS()}${BG}
<g stroke="${DIM}" stroke-width="2.4" stroke-linecap="round">
  <line x1="104" y1="34" x2="196" y2="34"/>
  ${[0,1,2,3,4,5,6].map(i=>`<line x1="${110+i*13}" y1="34" x2="${102+i*13}" y2="44"/>`).join('')}
</g>
<circle cx="150" cy="52" r="8" fill="none" stroke="${INK}" stroke-width="2.4"/>
<line x1="150" y1="42" x2="150" y2="34" stroke="${INK}" stroke-width="2.4"/>
<line x1="150" y1="60" x2="150" y2="70" stroke="${INK}" stroke-width="2.4"/>
<rect x="128" y="70" width="44" height="182" rx="11" fill="${GLASS}" stroke="${INK}" stroke-width="2.6"/>
<path d="M150 74 L137 80 L163 88 L137 96 L163 104 L137 112 L163 120 L150 126" fill="none" stroke="${acc}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
<g stroke="${DIM}" stroke-width="1.8" stroke-linecap="round">
  ${[0,1,2,3,4,5].map(i=>`<line x1="160" y1="${132+i*20}" x2="${i%5===0?'150':'156'}" y2="${132+i*20}"/>`).join('')}
</g>
<line x1="137" y1="152" x2="166" y2="152" stroke="${AMBER}" stroke-width="2.6"/>
<path d="M166 148 l8 4 -8 4 z" fill="${AMBER}"/>
<line x1="150" y1="252" x2="150" y2="266" stroke="${INK}" stroke-width="2.6"/>
<path d="M150 266 q12 6 0 16 q-10 -4 -2 -10" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M150 282 q20 0 18 14" fill="none" stroke="${INK}" stroke-width="2.2"/>
<path d="M134 300 h32 l5 44 h-42 z" fill="${acc}" fill-opacity="0.20" stroke="${acc}" stroke-width="2.4" stroke-linejoin="round"/>
</svg>`;}

function beaker(acc){return `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
${DEFS()}${BG}
<g stroke="${DIM}" stroke-width="2.4" stroke-linecap="round">
  <line x1="104" y1="30" x2="196" y2="30"/>
  ${[0,1,2,3,4,5,6].map(i=>`<line x1="${110+i*13}" y1="30" x2="${102+i*13}" y2="40"/>`).join('')}
</g>
<line x1="150" y1="30" x2="150" y2="150" stroke="${INK}" stroke-width="1.6"/>
<path d="M112 120 L118 300 Q119 314 133 314 L167 314 Q181 314 182 300 L188 120" fill="${GLASS}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M106 120 L194 120" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M194 120 l9 -5 -3 11 z" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M120 196 Q150 188 180 196 L178 300 Q177 309 168 309 L132 309 Q123 309 122 300 Z" fill="${acc}" fill-opacity="0.22"/>
<path d="M120 196 Q150 188 180 196" fill="none" stroke="${acc}" stroke-width="2.4"/>
<g stroke="${DIM}" stroke-width="1.6" stroke-linecap="round">
  ${[0,1,2,3,4,5,6].map(i=>`<line x1="122" y1="${150+i*22}" x2="${i%2?'130':'136'}" y2="${150+i*22}"/>`).join('')}
</g>
<line x1="120" y1="196" x2="100" y2="196" stroke="${AMBER}" stroke-width="2.4"/>
<path d="M100 192 l-8 4 8 4 z" fill="${AMBER}"/>
<rect x="139" y="150" width="22" height="78" rx="3" fill="${acc}" fill-opacity="0.16" stroke="${INK}" stroke-width="2.4"/>
<line x1="150" y1="150" x2="150" y2="146" stroke="${INK}" stroke-width="1.6"/>
<circle cx="135" cy="255" r="2.4" fill="${acc}" opacity="0.6"/>
<circle cx="165" cy="270" r="3" fill="${acc}" opacity="0.5"/>
<circle cx="150" cy="288" r="2" fill="${acc}" opacity="0.55"/>
</svg>`;}

function circuit(acc){return `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
${DEFS()}${BG}
<g fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round">
  <line x1="80" y1="120" x2="128" y2="120"/><line x1="172" y1="120" x2="220" y2="120"/>
  <line x1="80" y1="292" x2="132" y2="292"/><line x1="168" y1="292" x2="220" y2="292"/>
  <line x1="80" y1="120" x2="80" y2="190"/><line x1="80" y1="222" x2="80" y2="292"/>
  <line x1="220" y1="120" x2="220" y2="198"/><line x1="220" y1="236" x2="220" y2="292"/>
</g>
<circle cx="150" cy="120" r="26" fill="${AMBER}" fill-opacity="0.14"/>
<circle cx="150" cy="120" r="20" fill="none" stroke="${INK}" stroke-width="2.8"/>
<path d="M139 120 q5.5 -12 11 0 q5.5 12 11 0" fill="none" stroke="${AMBER}" stroke-width="2.6"/>
<g stroke="${INK}" stroke-linecap="round">
  <line x1="140" y1="280" x2="140" y2="304" stroke-width="2.6"/>
  <line x1="152" y1="286" x2="152" y2="298" stroke-width="5"/>
  <line x1="160" y1="280" x2="160" y2="304" stroke-width="2.6"/>
</g>
<circle cx="80" cy="206" r="16" fill="${GLASS}" stroke="${INK}" stroke-width="2.6"/>
<text x="80" y="211" text-anchor="middle" fill="${INK}" font-family="'JetBrains Mono',monospace" font-size="15" font-weight="700">A</text>
<circle cx="220" cy="236" r="3.2" fill="${INK}"/>
<circle cx="220" cy="198" r="3.2" fill="${INK}"/>
<line x1="220" y1="236" x2="238" y2="206" stroke="${acc}" stroke-width="2.8" stroke-linecap="round"/>
</svg>`;}

function optics(acc){return `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
${DEFS()}${BG}
<line x1="30" y1="180" x2="285" y2="180" stroke="${DIM}" stroke-width="1.6" stroke-dasharray="5 5"/>
<path d="M150 112 Q176 180 150 248 Q124 180 150 112 Z" fill="${GLASS}" stroke="${INK}" stroke-width="2.6"/>
<line x1="150" y1="104" x2="150" y2="112" stroke="${INK}" stroke-width="2"/>
<line x1="150" y1="248" x2="150" y2="256" stroke="${INK}" stroke-width="2"/>
<g stroke="${acc}" stroke-width="2.4" stroke-linecap="round">
  <line x1="44" y1="140" x2="150" y2="140"/><line x1="44" y1="220" x2="150" y2="220"/><line x1="44" y1="180" x2="150" y2="180"/>
</g>
<g fill="${acc}"><path d="M104 136 l8 4 -8 4 z"/><path d="M104 216 l8 4 -8 4 z"/></g>
<g stroke="${acc}" stroke-width="2.4" stroke-linecap="round">
  <line x1="150" y1="140" x2="226" y2="180"/><line x1="150" y1="220" x2="226" y2="180"/><line x1="150" y1="180" x2="258" y2="180"/>
</g>
<circle cx="226" cy="180" r="4.5" fill="${AMBER}"/>
<text x="222" y="201" fill="${AMBER}" font-family="'JetBrains Mono',monospace" font-size="13" font-weight="700">F</text>
<line x1="74" y1="174" x2="74" y2="186" stroke="${DIM}" stroke-width="2"/>
<text x="63" y="170" fill="${DIM}" font-family="'JetBrains Mono',monospace" font-size="11">2F</text>
</svg>`;}

function pendulum(acc){return `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
${DEFS()}${BG}
<g stroke="${DIM}" stroke-width="2.4" stroke-linecap="round">
  <line x1="104" y1="44" x2="196" y2="44"/>
  ${[0,1,2,3,4,5,6].map(i=>`<line x1="${110+i*13}" y1="44" x2="${102+i*13}" y2="54"/>`).join('')}
</g>
<circle cx="150" cy="48" r="3.5" fill="${INK}"/>
<line x1="150" y1="48" x2="150" y2="230" stroke="${DIM}" stroke-width="1.4" stroke-dasharray="4 5"/>
<path d="M83 215 Q150 248 217 215" fill="none" stroke="${AMBER}" stroke-width="2" stroke-dasharray="5 5"/>
<line x1="150" y1="48" x2="217" y2="215" stroke="${DIM}" stroke-width="1.6"/>
<circle cx="217" cy="215" r="13" fill="${acc}" fill-opacity="0.18" stroke="${acc}" stroke-width="1.6"/>
<line x1="150" y1="48" x2="83" y2="215" stroke="${INK}" stroke-width="2"/>
<circle cx="83" cy="215" r="15" fill="${acc}" fill-opacity="0.85" stroke="${acc}" stroke-width="2"/>
<circle cx="78" cy="210" r="4" fill="#fff" opacity="0.4"/>
<path d="M150 92 A44 44 0 0 0 134 89" fill="none" stroke="${DIM}" stroke-width="1.6"/>
<text x="151" y="106" fill="${DIM}" font-family="'JetBrains Mono',monospace" font-size="12">&#945;</text>
</svg>`;}

function lever(acc){return `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
${DEFS()}${BG}
<rect x="52" y="200" width="196" height="9" rx="4" fill="${GLASS}" stroke="${INK}" stroke-width="2.4"/>
<g stroke="${DIM}" stroke-width="1.6" stroke-linecap="round">
  ${[1,2,3,4,5,6,7,8].map(i=>`<line x1="${68+i*18}" y1="200" x2="${68+i*18}" y2="195"/>`).join('')}
</g>
<path d="M150 209 L132 250 L168 250 Z" fill="${INK}" fill-opacity="0.25" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
<circle cx="150" cy="209" r="3.5" fill="${AMBER}"/>
<line x1="126" y1="250" x2="174" y2="250" stroke="${DIM}" stroke-width="2.4" stroke-linecap="round"/>
<line x1="104" y1="209" x2="104" y2="222" stroke="${INK}" stroke-width="1.8"/>
<path d="M88 222 h32 v34 h-32 z" fill="${acc}" fill-opacity="0.22" stroke="${acc}" stroke-width="2.2"/>
<path d="M92 222 v-6 h24 v6" fill="none" stroke="${acc}" stroke-width="1.8"/>
<line x1="212" y1="209" x2="212" y2="222" stroke="${INK}" stroke-width="1.8"/>
<path d="M200 222 h24 v26 h-24 z" fill="${acc}" fill-opacity="0.22" stroke="${acc}" stroke-width="2.2"/>
<path d="M204 222 v-5 h16 v5" fill="none" stroke="${acc}" stroke-width="1.8"/>
</svg>`;}

function thermal(acc){return `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
${DEFS()}${BG}
<path d="M96 158 L102 300 Q103 314 117 314 L183 314 Q197 314 198 300 L204 158" fill="${GLASS}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M90 158 L210 158" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M106 212 Q150 206 194 212 L191 300 Q190 309 181 309 L119 309 Q110 309 109 300 Z" fill="${acc}" fill-opacity="0.14"/>
<path d="M106 212 Q150 206 194 212" fill="none" stroke="${acc}" stroke-width="2" opacity="0.7"/>
<rect x="143" y="120" width="10" height="150" rx="5" fill="${GLASS}" stroke="${INK}" stroke-width="2.2"/>
<circle cx="148" cy="276" r="10" fill="${acc}" stroke="${INK}" stroke-width="2.2"/>
<rect x="145.5" y="182" width="5" height="94" fill="${acc}"/>
<g stroke="${DIM}" stroke-width="1.4" stroke-linecap="round">
  ${[0,1,2,3,4,5].map(i=>`<line x1="153" y1="${142+i*22}" x2="${i%2?'157':'159'}" y2="${142+i*22}"/>`).join('')}
</g>
<path d="M118 132 L118 250 Q118 262 130 262 L138 262" fill="none" stroke="${DIM}" stroke-width="2.2" stroke-linecap="round"/>
<g stroke="${AMBER}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.85">
  <path d="M124 198 q6 -8 12 0 q6 8 12 0"/><path d="M168 198 q6 -8 12 0 q6 8 12 0"/>
</g>
</svg>`;}

const MAP = {
  1: ['#14b8a6', beaker],
  2: ['#3a86ff', dynamometer],
  3: ['#f59e0b', circuit],
  4: ['#a855f7', optics],
  5: ['#22d3ee', pendulum],
  6: ['#84cc16', lever],
  7: ['#ef4444', thermal],
};
for (const [num, [acc, fn]] of Object.entries(MAP)) {
  const svg = fn(acc).trim();
  writeFileSync(new URL(`./public/photos/kit-${num}.svg`, import.meta.url), svg);
  console.log(`kit-${num}.svg  ${svg.length} bytes  acc=${acc}`);
}
