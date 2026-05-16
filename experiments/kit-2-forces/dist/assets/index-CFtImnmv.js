import{G as Ye,t as Pe,S as Xe,a as je}from"./screen-spring-stiffness-DZVJgMS1.js";import{S as Ke}from"./screen-spring-elastic-DhDSeBcV.js";import{F as Ue}from"./screen-friction-C3AT7TY_.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function e(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(r){if(r.ep)return;r.ep=!0;const a=e(r);fetch(r.href,a)}})();const $e=document.createElement("template");$e.innerHTML=`
<style>
  :host {
    display: inline-flex;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2, 8px);
    padding: var(--space-3, 12px) var(--space-6, 24px);
    border-radius: var(--radius-md, 8px);
    font-family: var(--font-display, 'Space Grotesk', sans-serif);
    font-size: var(--text-body, 1rem);
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    transition:
      transform var(--dur-fast, 150ms) var(--ease-out, ease-out),
      box-shadow var(--dur-fast, 150ms) var(--ease-out, ease-out),
      background var(--dur-fast, 150ms) var(--ease-out, ease-out),
      opacity var(--dur-fast, 150ms) var(--ease-out, ease-out);
    min-height: 44px; /* a11y touch-target */
  }

  button:focus-visible {
    outline: 2px solid var(--color-brand-orange, #FFBE0B);
    outline-offset: 2px;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* primary */
  :host([variant="primary"]) button {
    background: var(--gradient-cta, linear-gradient(135deg, #FFBE0B 0%, #3A86FF 100%));
    color: #fff;
    box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.4));
  }

  :host([variant="primary"]) button:hover:not(:disabled) {
    box-shadow: var(--shadow-glow-blue, 0 0 24px rgba(58,134,255,0.35));
    transform: translateY(-1px);
  }

  /* secondary */
  :host([variant="secondary"]) button {
    background: transparent;
    color: var(--color-brand-blue, #3A86FF);
    border: 2px solid var(--color-brand-blue, #3A86FF);
  }

  :host([variant="secondary"]) button:hover:not(:disabled) {
    background: var(--color-brand-blue, #3A86FF);
    color: #fff;
  }

  /* icon-round (Reset All в стиле PhET) */
  :host([variant="icon-round"]) button {
    width: 56px;
    height: 56px;
    padding: 0;
    border-radius: var(--radius-pill, 9999px);
    background: var(--color-brand-orange, #FFBE0B);
    color: #1B263B;
  }

  :host([variant="icon-round"]) button:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: var(--shadow-glow-orange, 0 0 24px rgba(255,190,11,0.35));
  }

  :host([variant="icon-round"]) button:active {
    transform: scale(0.95);
  }

  ::slotted(svg) {
    width: 1.25em;
    height: 1.25em;
  }
</style>
<button part="button">
  <slot></slot>
</button>
`;class Ve extends HTMLElement{static observedAttributes=["disabled","variant","aria-label"];#t;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild($e.content.cloneNode(!0)),this.#t=t.querySelector("button")}connectedCallback(){this.hasAttribute("variant")||this.setAttribute("variant","primary")}attributeChangedCallback(t,e,s){t==="disabled"&&(this.#t.disabled=s!==null),t==="aria-label"&&s!==null&&this.#t.setAttribute("aria-label",s)}}customElements.define("lab-button",Ve);const Se=document.createElement("template");Se.innerHTML=`
<style>
  :host {
    display: block;
  }

  label {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-3, 12px);
    align-items: center;
    padding: var(--space-2, 8px) var(--space-3, 12px);
    border-radius: var(--radius-md, 8px);
    cursor: pointer;
    transition: background var(--dur-fast, 150ms) var(--ease-out, ease-out);
    min-height: 44px;
  }

  label:hover {
    background: rgba(255,255,255,0.05);
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    accent-color: var(--color-brand-blue, #3A86FF);
    cursor: pointer;
  }

  input[type="checkbox"]:focus-visible {
    outline: 2px solid var(--color-brand-orange, #FFBE0B);
    outline-offset: 2px;
  }

  .text {
    font-size: var(--text-sm, 14px);
    color: var(--color-text-secondary, #9CA3AF);
    transition: color var(--dur-fast, 150ms) var(--ease-out, ease-out);
  }

  :host([checked]) .text {
    color: var(--color-text-primary, #E0E1DD);
  }

  :host([checked]) label {
    background: rgba(58,134,255,0.1);
  }

  .preview {
    display: inline-block;
    width: 32px;
    height: 16px;
    flex-shrink: 0;
  }
</style>
<label part="label">
  <input type="checkbox" part="checkbox" />
  <span class="text" part="text">
    <slot></slot>
  </span>
  <span class="preview" part="preview" aria-hidden="true">
    <slot name="preview"></slot>
  </span>
</label>
`;class Qe extends HTMLElement{static observedAttributes=["checked","disabled"];#t;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild(Se.content.cloneNode(!0)),this.#t=t.querySelector("input"),this.#t.addEventListener("change",()=>{this.#t.checked?this.setAttribute("checked",""):this.removeAttribute("checked"),this.dispatchEvent(new CustomEvent("change",{detail:{checked:this.#t.checked},bubbles:!0}))})}attributeChangedCallback(t,e,s){t==="checked"&&(this.#t.checked=s!==null),t==="disabled"&&(this.#t.disabled=s!==null)}get checked(){return this.#t.checked}set checked(t){this.#t.checked=t,t?this.setAttribute("checked",""):this.removeAttribute("checked")}}customElements.define("lab-checkbox-preview",Qe);const Ae=document.createElement("template");Ae.innerHTML=`
<style>
  :host {
    --weight-body: var(--equip-weight, #5a6172);
    --weight-body-light: var(--equip-weight-light, #7a8294);
    --weight-body-dark: var(--equip-weight-dark, #3d4252);
    --weight-edge: var(--equip-weight-edge, #2a2d36);
    --weight-label-bg: var(--equip-weight-label-bg, #f5f5f0);
    --weight-label-text: var(--equip-weight-label-text, #1a1b1f);
    --weight-size: 60px;

    display: inline-block;
    width: var(--weight-size);
    height: calc(var(--weight-size) * 1.55);
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    transition: transform var(--dur-fast, 150ms) var(--ease-out, ease-out);
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.35));
  }

  :host(:hover) {
    transform: translateY(-2px) rotate(-1.5deg);
    filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.45));
  }

  :host([dragging]) {
    cursor: grabbing;
    transform: scale(1.06);
    filter: drop-shadow(0 12px 16px rgb(0 0 0 / 0.55));
    z-index: 100;
  }

  :host([attached]) {
    cursor: pointer;
  }

  :host([type="mystery"]) {
    --weight-body: var(--mystery-color, #b94e4e);
    --weight-body-light: color-mix(in srgb, var(--mystery-color, #b94e4e) 70%, white);
    --weight-body-dark: color-mix(in srgb, var(--mystery-color, #b94e4e) 70%, black);
    --weight-edge: color-mix(in srgb, var(--mystery-color, #b94e4e) 50%, black);
  }

  .body {
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
    transition: opacity var(--dur-fast, 150ms);
  }

  :host(:focus-visible) {
    outline: none;
  }

  :host(:focus-visible) .focus-ring {
    opacity: 1;
  }

  .label-text {
    fill: var(--weight-label-text);
    font-family: var(--font-display, 'Space Grotesk', sans-serif);
    font-weight: 800;
    font-size: 22px;
    text-anchor: middle;
    dominant-baseline: middle;
    letter-spacing: 0.02em;
  }

  :host([type="mystery"]) .label-text {
    font-size: 22px;
    font-weight: 800;
  }
</style>
<svg class="body" viewBox="0 0 60 93" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Радиальный градиент на корпусе для объёма -->
    <linearGradient id="cyl-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--weight-body-dark)" />
      <stop offset="35%" stop-color="var(--weight-body)" />
      <stop offset="55%" stop-color="var(--weight-body-light)" />
      <stop offset="80%" stop-color="var(--weight-body)" />
      <stop offset="100%" stop-color="var(--weight-body-dark)" />
    </linearGradient>
    <!-- Хромированный крюк -->
    <linearGradient id="hook-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#9aa3b0" />
      <stop offset="40%" stop-color="#dde2e8" />
      <stop offset="60%" stop-color="#dde2e8" />
      <stop offset="100%" stop-color="#9aa3b0" />
    </linearGradient>
    <!-- Тень под наклейкой -->
    <filter id="label-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="0.5" stdDeviation="0.4" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Верхний крючок (хромированный, S-образный) -->
  <path
    d="M 30 2 Q 25 2 25 7 Q 25 12 30 12 Q 35 12 35 17 L 35 22"
    stroke="url(#hook-grad)"
    stroke-width="2.4"
    fill="none"
    stroke-linecap="round"
  />
  <!-- Тёмный обод-фланец сверху (где крюк входит в груз) -->
  <ellipse cx="30" cy="22" rx="18" ry="3.5" fill="var(--weight-edge)" />
  <ellipse cx="30" cy="21" rx="17" ry="2.5" fill="var(--weight-body-light)" />

  <!-- Корпус-цилиндр -->
  <rect x="12" y="22" width="36" height="50" fill="url(#cyl-grad)" />
  <!-- Боковая риска / поясок (декор как у реального груза) -->
  <line x1="12" y1="33" x2="48" y2="33" stroke="var(--weight-edge)" stroke-width="0.5" opacity="0.4" />
  <line x1="12" y1="61" x2="48" y2="61" stroke="var(--weight-edge)" stroke-width="0.5" opacity="0.4" />

  <!-- Белая наклейка с массой -->
  <rect
    x="13" y="38" width="34" height="18" rx="2"
    fill="var(--weight-label-bg)"
    stroke="var(--weight-edge)"
    stroke-width="0.3"
    filter="url(#label-shadow)"
  />
  <text class="label-text" x="30" y="48"><slot></slot></text>

  <!-- Тёмный обод-фланец снизу -->
  <ellipse cx="30" cy="72" rx="18" ry="3.5" fill="var(--weight-edge)" />
  <ellipse cx="30" cy="73" rx="17" ry="2.5" fill="var(--weight-body-dark)" />

  <!-- Нижняя петля (для соединения в цепочку) — хромированное кольцо -->
  <path
    d="M 30 75 L 30 79"
    stroke="url(#hook-grad)" stroke-width="2.4" stroke-linecap="round"
  />
  <ellipse
    cx="30" cy="84" rx="4" ry="4"
    fill="none"
    stroke="url(#hook-grad)"
    stroke-width="2"
  />

  <!-- Focus ring -->
  <rect class="focus-ring" x="2" y="2" width="56" height="89" rx="8" />
</svg>
`;class Je extends HTMLElement{static observedAttributes=["mass","type","color","number"];#t;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild(Ae.content.cloneNode(!0)),this.#t=t.querySelector(".label-text")}connectedCallback(){this.hasAttribute("role")||this.setAttribute("role","button"),this.tabIndex<0&&(this.tabIndex=0),this.#e(),this.#s()}attributeChangedCallback(t){(t==="mass"||t==="type"||t==="number")&&this.#e(),(t==="color"||t==="type")&&this.#s()}getTopHookY(){const t=this.getBoundingClientRect();return 4/93*t.height}getWeightHookY(){const t=this.getBoundingClientRect();return 88/93*t.height}get mass(){return Number(this.getAttribute("mass")??0)}get type(){return this.getAttribute("type")??"standard"}get number(){return this.getAttribute("number")}#e(){this.type==="mystery"?this.#t.textContent="?":this.number!==null?this.#t.textContent=this.number:this.#t.textContent="",this.setAttribute("aria-label",this.type==="mystery"?"Груз неизвестной массы, нажмите Enter чтобы взять":this.number!==null?`Груз №${this.number} — взвесьте на динамометре. Нажмите Enter чтобы взять.`:"Груз, нажмите Enter чтобы взять")}#s(){const t=this.getAttribute("color");t&&this.style.setProperty("--mystery-color",t)}}customElements.define("lab-weight",Je);const $={top:16,right:16,bottom:32,left:40},K=4,xt=8,Ce=document.createElement("template");Ce.innerHTML=`
<style>
  :host {
    display: block;
    width: 100%;
  }

  .container {
    position: relative;
    width: 100%;
    aspect-ratio: 1.4;
    background: var(--color-bg-deep, #0d1b2a);
    border-radius: var(--radius-md, 8px);
    overflow: hidden;
  }

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .axis,
  .axis-tick {
    stroke: var(--color-border, rgba(255,255,255,0.15));
    stroke-width: 1;
  }

  .axis-label {
    fill: var(--color-text-secondary, #9ca3af);
    font-family: var(--font-body, sans-serif);
    font-size: 11px;
  }

  .axis-title {
    fill: var(--color-text-primary, #e0e1dd);
    font-family: var(--font-body, sans-serif);
    font-size: 12px;
    font-weight: 500;
  }

  .grid-line {
    stroke: rgba(255,255,255,0.04);
    stroke-width: 1;
  }

  .fit-line {
    stroke: var(--phys-displacement, #2ba84a);
    stroke-width: 1.5;
    stroke-dasharray: 4 3;
    fill: none;
    opacity: 0.7;
  }

  .point {
    fill: var(--color-brand-blue, #3a86ff);
    stroke: #fff;
    stroke-width: 1.5;
    cursor: pointer;
    transition: r 150ms var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1));
    transform-origin: center;
    transform-box: fill-box;
    animation: pop-in 250ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
  }

  .point:hover {
    r: 7;
    fill: var(--color-brand-orange, #ffbe0b);
  }

  @keyframes pop-in {
    0% { transform: scale(0); }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }

  .point-tooltip-bg {
    fill: rgba(6, 13, 20, 0.95);
    stroke: var(--color-border-strong, rgba(255,255,255,0.2));
    stroke-width: 1;
  }

  .point-tooltip-text {
    fill: var(--color-text-primary, #e0e1dd);
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    pointer-events: none;
  }

  .delete-btn {
    fill: var(--color-error, #ef4444);
    cursor: pointer;
    opacity: 0;
    transition: opacity 150ms;
  }

  .point:hover ~ .delete-btn,
  .delete-btn:hover {
    opacity: 1;
  }

  .empty-state {
    fill: var(--color-text-muted, #6b7280);
    font-family: var(--font-body, sans-serif);
    font-size: 13px;
    font-style: italic;
    text-anchor: middle;
  }

  .fit-label {
    fill: var(--phys-displacement, #2ba84a);
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-weight: 600;
  }

  @media (prefers-reduced-motion: reduce) {
    .point { animation: none; }
  }
</style>

<div class="container">
  <svg part="svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"></svg>
</div>
`;class Ze extends HTMLElement{#t;#e={measurements:[],fitSlope:null};#s;#r=0;#o=0;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild(Ce.content.cloneNode(!0)),this.#t=t.querySelector("svg"),this.#s=new ResizeObserver(()=>this.#i())}connectedCallback(){this.#s.observe(this),this.#i()}disconnectedCallback(){this.#s.disconnect()}set data(t){this.#e=t,this.#i()}get data(){return this.#e}#i(){const t=this.#t.getBoundingClientRect(),e=t.width||400,s=t.height||280;e===this.#r&&s===this.#o&&this.#t.childElementCount>0,this.#r=e,this.#o=s,this.#t.setAttribute("viewBox",`0 0 ${e} ${s}`),this.#t.innerHTML="";const r=e-$.left-$.right,a=s-$.top-$.bottom,o=$.left,i=$.top+a,l=d=>o+d/xt*r,c=d=>i-d/K*a;if(this.#a(o,i,r,a,l,c),this.#n(o,i,r,a),this.#l(o,i,r,a,l,c),this.#d(e,s,o,i),this.#e.measurements.length===0){this.#g(e,s);return}this.#e.measurements.length>=2&&this.#e.fitSlope!==null&&(this.#c(this.#e.fitSlope,l,c),this.#h(this.#e.fitSlope,o+8,$.top+14));for(const d of this.#e.measurements)this.#u(d,l,c)}#a(t,e,s,r,a,o){for(let i=1;i<=xt;i++){const l=a(i);this.#t.appendChild(this.#p(l,$.top,l,$.top+r,"grid-line"))}for(let i=1;i<=K;i++){const l=o(i);this.#t.appendChild(this.#p(t,l,t+s,l,"grid-line"))}}#n(t,e,s,r){this.#t.appendChild(this.#p(t,e,t+s,e,"axis")),this.#t.appendChild(this.#p(t,e,t,e-r,"axis"))}#l(t,e,s,r,a,o){for(let i=0;i<=xt;i+=2){const l=a(i);this.#t.appendChild(this.#p(l,e,l,e+4,"axis-tick")),this.#t.appendChild(this.#f(String(i),l,e+16,"axis-label","middle"))}for(let i=0;i<=K;i++){const l=o(i);this.#t.appendChild(this.#p(t-4,l,t,l,"axis-tick")),this.#t.appendChild(this.#f(String(i),t-8,l+4,"axis-label","end"))}}#d(t,e,s,r){this.#t.appendChild(this.#f("Δl, см",s+(t-$.left-$.right)/2,e-8,"axis-title","middle"));const a=this.#f("F, Н",12,r-(e-$.top-$.bottom)/2,"axis-title","middle");a.setAttribute("transform",`rotate(-90, 12, ${r-(e-$.top-$.bottom)/2})`),this.#t.appendChild(a)}#c(t,e,s){const o=xt,i=t*o/100;if(i>K){const l=K*100/t,c=this.#p(e(0),s(0),e(l),s(K),"fit-line");this.#t.appendChild(c)}else{const l=this.#p(e(0),s(0),e(o),s(i),"fit-line");this.#t.appendChild(l)}}#h(t,e,s){const r=this.#f(`k ≈ ${t.toFixed(0)} Н/м`,e,s,"fit-label","start");this.#t.appendChild(r)}#u(t,e,s){const r=e(t.extension),a=s(t.force),o=document.createElementNS("http://www.w3.org/2000/svg","circle");o.setAttribute("cx",String(r)),o.setAttribute("cy",String(a)),o.setAttribute("r","5"),o.classList.add("point"),o.dataset.measurementId=t.id;const i=document.createElementNS("http://www.w3.org/2000/svg","title");i.textContent=`m=${t.totalMass} г, F=${t.force.toFixed(2)} Н, Δl=${t.extension.toFixed(1)} см`,o.appendChild(i),o.addEventListener("click",()=>{this.dispatchEvent(new CustomEvent("delete-point",{detail:{id:t.id},bubbles:!0}))}),this.#t.appendChild(o)}#g(t,e){this.#t.appendChild(this.#f("Запишите хотя бы одно измерение",t/2,e/2,"empty-state","middle"))}#p(t,e,s,r,a){const o=document.createElementNS("http://www.w3.org/2000/svg","line");return o.setAttribute("x1",String(t)),o.setAttribute("y1",String(e)),o.setAttribute("x2",String(s)),o.setAttribute("y2",String(r)),o.classList.add(a),o}#f(t,e,s,r,a){const o=document.createElementNS("http://www.w3.org/2000/svg","text");return o.setAttribute("x",String(e)),o.setAttribute("y",String(s)),o.setAttribute("text-anchor",a),o.classList.add(r),o.textContent=t,o}}customElements.define("lab-graph",Ze);const Qt=240,Jt=480,Zt=[120,168,210],_=64,Tt=60,ts=430,es=ts-Tt,ss=`
  :host {
    --stand-width: 240px;

    display: inline-block;
    width: var(--stand-width);
    /* Aspect-ratio задаётся inline через style, потому что зависит от rod-extra.
       Width фиксируется контейнером (по умолчанию 240px), height = width * (480+extra)/240. */
    position: relative;
    pointer-events: none;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
`;function rs(n){const t=Jt+n,e=es+n,s=n;return`
<svg viewBox="0 0 ${Qt} ${t}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Хромированный стержень (вертикальный) -->
    <linearGradient id="rod-vertical" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--equip-metal-shadow, #4a5260)" />
      <stop offset="20%" stop-color="var(--equip-metal-dark, #6e7682)" />
      <stop offset="45%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="55%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="75%" stop-color="var(--equip-metal, #a8afb8)" />
      <stop offset="100%" stop-color="var(--equip-metal-shadow, #4a5260)" />
    </linearGradient>

    <!-- Хромированный стержень (горизонтальный) -->
    <linearGradient id="rod-horizontal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-metal-shadow, #4a5260)" />
      <stop offset="20%" stop-color="var(--equip-metal-dark, #6e7682)" />
      <stop offset="45%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="55%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="75%" stop-color="var(--equip-metal, #a8afb8)" />
      <stop offset="100%" stop-color="var(--equip-metal-shadow, #4a5260)" />
    </linearGradient>

    <linearGradient id="base-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-stand-base-shine, #3a3d44)" />
      <stop offset="15%" stop-color="var(--equip-stand-base-edge, #2d2f33)" />
      <stop offset="60%" stop-color="var(--equip-stand-base, #1a1b1f)" />
      <stop offset="100%" stop-color="#0d0e10" />
    </linearGradient>

    <radialGradient id="clamp-grad" cx="0.4" cy="0.3" r="0.7">
      <stop offset="0%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="50%" stop-color="var(--equip-metal, #a8afb8)" />
      <stop offset="100%" stop-color="var(--equip-metal-shadow, #4a5260)" />
    </radialGradient>

    <filter id="base-shadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- ОСНОВАНИЕ (массивная чёрная трапециевидная плита) — сдвинуто вниз на rod-extra -->
  <g transform="translate(0 ${s})" filter="url(#base-shadow)">
    <path
      d="M 50 426 L 190 426 L 220 458 L 20 458 Z"
      fill="var(--equip-stand-base-edge, #2d2f33)"
    />
    <rect x="20" y="454" width="200" height="26" fill="url(#base-grad)" rx="2.5" />
    <rect x="20" y="478" width="200" height="2.5" fill="var(--equip-metal-dark, #6e7682)" rx="1" />
    <rect x="22" y="455" width="196" height="1" fill="rgb(255 255 255 / 0.18)" />
  </g>

  <!-- Цоколь крепления стержня — сдвинут на rod-extra -->
  <g transform="translate(0 ${s})">
    <ellipse cx="120" cy="430" rx="28" ry="9" fill="var(--equip-stand-base-shine, #3a3d44)" />
    <ellipse cx="120" cy="427" rx="25" ry="6" fill="var(--equip-metal-dark, #6e7682)" />
    <ellipse cx="120" cy="425" rx="22" ry="4" fill="var(--equip-metal, #a8afb8)" />
    <ellipse cx="120" cy="424" rx="20" ry="2.5" fill="var(--equip-metal-shine, #f0f2f5)" />
    <circle cx="148" cy="424" r="4" fill="var(--equip-metal-dark, #6e7682)" />
    <circle cx="148" cy="423" r="2.8" fill="var(--equip-metal-shine, #f0f2f5)" />
    <line x1="145.5" y1="423" x2="150.5" y2="423" stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="0.6" />
  </g>

  <!-- ВЕРТИКАЛЬНЫЙ СТЕРЖЕНЬ (растягивается на rod-extra) -->
  <rect
    x="113" y="${Tt}" width="14" height="${e}"
    fill="url(#rod-vertical)"
    rx="1.5"
  />
  <rect x="117" y="${Tt}" width="1.6" height="${e}" fill="rgb(255 255 255 / 0.55)" />
  <rect x="123.5" y="${Tt}" width="0.8" height="${e}" fill="rgb(255 255 255 / 0.25)" />

  <!-- МУФТА (зажим между стержнем и перекладиной) -->
  <g>
    <rect x="103" y="54" width="34" height="22" rx="3" fill="url(#clamp-grad)" />
    <circle cx="100" cy="65" r="5" fill="var(--equip-metal-dark, #6e7682)" />
    <circle cx="100" cy="65" r="3.2" fill="var(--equip-metal-shine, #f0f2f5)" />
    <line x1="96.5" y1="65" x2="103.5" y2="65" stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="0.7" />
    <line x1="100" y1="61.5" x2="100" y2="68.5" stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="0.7" />
  </g>

  <!-- ГОРИЗОНТАЛЬНАЯ ПЕРЕКЛАДИНА -->
  <rect
    x="120" y="${_-6}" width="115" height="12"
    fill="url(#rod-horizontal)"
    rx="1.5"
  />
  <rect x="120" y="${_-5.5}" width="115" height="1.5" fill="rgb(255 255 255 / 0.55)" />

  <rect x="231" y="${_-7}" width="7" height="14" rx="2" fill="var(--equip-metal-dark, #6e7682)" />
  <rect x="232" y="${_-6.5}" width="0.8" height="13" fill="rgb(255 255 255 / 0.4)" />

  <!-- ТРИ ТОЧКИ КРЕПЛЕНИЯ (хромированные петли) -->
  ${Zt.map(r=>`
    <ellipse cx="${r}" cy="${_+11}" rx="5" ry="1.5" fill="rgb(0 0 0 / 0.3)" />
    <ellipse cx="${r}" cy="${_+9}" rx="4.5" ry="3.8" fill="none"
      stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="2" />
    <path d="M ${r-4} ${_+9} A 4 3.4 0 0 1 ${r+4} ${_+9}"
          stroke="var(--equip-metal-shine, #f0f2f5)" stroke-width="1" fill="none" />
  `).join("")}
</svg>
  `}class os extends HTMLElement{static observedAttributes=["rod-extra"];#t;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#e()}attributeChangedCallback(t){t==="rod-extra"&&this.#e()}get rodExtra(){return Math.max(0,Number(this.getAttribute("rod-extra")??0))}set rodExtra(t){const e=Math.max(0,Math.round(t));e!==this.rodExtra&&this.setAttribute("rod-extra",String(e))}#e(){const t=this.rodExtra;this.#t.innerHTML=`<style>${ss}</style>${rs(t)}`;const e=Jt+t;this.style.aspectRatio=`${Qt} / ${e}`}getHookPosition(t){const e=this.getBoundingClientRect(),s=Jt+this.rodExtra,r=e.width/Qt,a=e.height/s;return{x:Zt[t]*r,y:(_+8)*a}}get hookCount(){return Zt.length}}customElements.define("lab-stand",os);const te=130,ee=360,st=12,rt=26,vt=106,wt=274,u=26,G=50,x=78,se=230,tt=100,Y=se/tt,ot=u,is=u+12,as=u+14,it=u+x,ns=u+x-12,ls=u+x-14,H=u+x/2,de=G,cs=8,Wt=12,O=4,he={k50:{num:"1"},k10:{num:"2"}},Ee=document.createElement("template");Ee.innerHTML=`
<style>
  :host {
    --board-w: 130px;
    --board-h: 360px;
    display: inline-block;
    width: var(--board-w);
    height: var(--board-h);
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .scale-area {
    cursor: crosshair;
    pointer-events: all;
  }

  :host(:not([interactive])) .scale-area {
    cursor: default;
    pointer-events: none;
  }

  .hover-group {
    transition: opacity 80ms ease-out;
  }

  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 4 3;
    opacity: 0;
  }

  :host(:focus-visible) {
    outline: none;
  }

  :host(:focus-visible) .focus-ring {
    opacity: 1;
  }
</style>
<svg viewBox="0 0 ${te} ${ee}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Серый корпус (с лёгким "стальным" градиентом) -->
    <linearGradient id="board-body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5a626d" />
      <stop offset="6%" stop-color="#7e8794" />
      <stop offset="50%" stop-color="#aab2bd" />
      <stop offset="94%" stop-color="#7e8794" />
      <stop offset="100%" stop-color="#5a626d" />
    </linearGradient>

    <!-- Прозрачное окно -->
    <linearGradient id="board-window" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#dee5ed" />
      <stop offset="50%" stop-color="#f4f7fb" />
      <stop offset="100%" stop-color="#dee5ed" />
    </linearGradient>

    <linearGradient id="board-hook" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#9aa3b0" />
      <stop offset="40%" stop-color="#dde2e8" />
      <stop offset="60%" stop-color="#dde2e8" />
      <stop offset="100%" stop-color="#9aa3b0" />
    </linearGradient>

    <linearGradient id="coil-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5a6470" />
      <stop offset="50%" stop-color="#e8edf3" />
      <stop offset="100%" stop-color="#5a6470" />
    </linearGradient>

    <filter id="board-shadow" x="-15%" y="-5%" width="130%" height="115%">
      <feDropShadow dx="2" dy="5" stdDeviation="4" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- ВЕРХНИЙ КРЮК -->
  <path
    d="M 65 ${O} Q 60 ${O+2} 60 ${O+8} Q 60 ${O+14} 65 ${O+14} Q 70 ${O+14} 70 ${O+20} L 70 ${rt}"
    stroke="url(#board-hook)" stroke-width="2.6" fill="none" stroke-linecap="round"
  />

  <!-- КОРПУС ПЛАНШЕТА -->
  <g filter="url(#board-shadow)">
    <rect
      x="${st}" y="${rt}" width="${vt}" height="${wt}"
      rx="3" fill="url(#board-body)"
      stroke="#3d434c" stroke-width="0.6"
    />
    <!-- Внутренняя обводка -->
    <rect
      x="${st+1}" y="${rt+1}" width="${vt-2}" height="${wt-2}"
      rx="2" fill="none" stroke="rgb(255 255 255 / 0.2)" stroke-width="0.5"
    />
  </g>

  <!-- ВЕРТИКАЛЬНАЯ МАРКИРОВКА «Пружина 1» (как на фото himlabo) -->
  <g transform="translate(${st+8}, ${rt+wt/2})">
    <text class="brand-num"
          font-family="var(--font-display, sans-serif)"
          font-size="11" font-weight="800"
          fill="rgb(255 255 255 / 0.95)"
          text-anchor="middle"
          transform="rotate(-90)"
          letter-spacing="0.18em">Пружина 1</text>
  </g>

  <!-- БРЕНД ЛАБОСФЕРЫ справа на корпусе. Без k = N Н/м — жёсткость ученик определяет сам. -->
  <g transform="translate(${st+vt-8}, ${rt+wt/2})">
    <text class="brand-k"
          font-family="var(--font-display, sans-serif)"
          font-size="8.5" font-weight="700"
          fill="rgb(255 255 255 / 0.7)"
          text-anchor="middle"
          transform="rotate(90)"
          letter-spacing="0.18em">ЛАБОСФЕРА</text>
  </g>

  <!-- ПРОЗРАЧНОЕ ОКНО (за стеклом — пружина и шкала) -->
  <rect
    x="${u}" y="${G}" width="${x}" height="${se}"
    rx="1.5" fill="url(#board-window)"
    stroke="#3d434c" stroke-width="0.5"
  />

  <!-- ДВОЙНАЯ ШКАЛА: левая и правая колонки делений + цифры -->
  <g class="scale-left" font-family="var(--font-mono, monospace)" font-size="9"
     fill="#14233a">
    ${(()=>{const n=[];for(let t=0;t<=tt;t+=1){const e=G+t*Y;t%10===0?(n.push(`<line x1="${ot}" y1="${e}" x2="${is}" y2="${e}" stroke="#0f2747" stroke-width="0.9" />`),n.push(`<text x="${as}" y="${e+3}" font-weight="700">${t}</text>`)):t%5===0?n.push(`<line x1="${ot}" y1="${e}" x2="${ot+7}" y2="${e}" stroke="#1f3a5c" stroke-width="0.6" />`):n.push(`<line x1="${ot}" y1="${e}" x2="${ot+3}" y2="${e}" stroke="#1f3a5c" stroke-width="0.4" />`)}return n.join(`
`)})()}
  </g>

  <g class="scale-right" font-family="var(--font-mono, monospace)" font-size="9"
     fill="#14233a">
    ${(()=>{const n=[];for(let t=0;t<=tt;t+=1){const e=G+t*Y;t%10===0?(n.push(`<line x1="${ns}" y1="${e}" x2="${it}" y2="${e}" stroke="#0f2747" stroke-width="0.9" />`),n.push(`<text x="${ls}" y="${e+3}" font-weight="700" text-anchor="end">${t}</text>`)):t%5===0?n.push(`<line x1="${it-7}" y1="${e}" x2="${it}" y2="${e}" stroke="#1f3a5c" stroke-width="0.6" />`):n.push(`<line x1="${it-3}" y1="${e}" x2="${it}" y2="${e}" stroke="#1f3a5c" stroke-width="0.4" />`)}return n.join(`
`)})()}
  </g>

  <!-- "мм" надписи сверху и снизу окна -->
  <text x="${u+x/2}" y="${G-4}"
        text-anchor="middle" font-family="var(--font-display, sans-serif)" font-size="8"
        font-weight="700" fill="rgb(255 255 255 / 0.75)" letter-spacing="0.1em">мм</text>

  <!-- Подсветка-подсказка (золотая полоса) -->
  <g class="hint-mark" style="display:none">
    <rect x="${u-2}" y="-1.5" width="${x+4}" height="3"
          fill="var(--equip-snap-active, #f2c94c)" opacity="0.55" />
  </g>

  <!-- Запись ученика (тёмная риска поверх с подписью l₀/l₁ слева) -->
  <g class="reading-mark" style="display:none">
    <rect x="${u-4}" y="-1.4" width="${x+8}" height="2.8"
          fill="#0d6efd" opacity="0.9" />
    <!-- Подпись слева: l₀ = 50 мм (фон + текст) -->
    <rect class="reading-label-bg" x="${u-46}" y="-7" width="42" height="14" rx="2.5"
          fill="#0d6efd" />
    <text class="reading-label-text" x="${u-25}" y="2.6"
          font-family="var(--font-mono, monospace)" font-size="9" font-weight="800"
          fill="#fff" text-anchor="middle"></text>
    <!-- Число справа: 50 мм -->
    <rect class="reading-value-bg" x="${u+x+4}" y="-7" width="42" height="14" rx="2.5"
          fill="#0d6efd" />
    <text class="reading-value" x="${u+x+25}" y="2.6"
          font-family="var(--font-mono, monospace)" font-size="9" font-weight="800"
          fill="#fff" text-anchor="middle"></text>
  </g>

  <!-- Hover-индикатор: пунктирная линия + бейдж с цифрой -->
  <g class="hover-group" style="opacity:0; pointer-events:none">
    <line class="hover-tick" x1="${u-2}" y1="0" x2="${u+x+2}" y2="0"
          stroke="var(--color-brand-orange, #ffbe0b)" stroke-width="0.9"
          stroke-dasharray="2 1.5" />
    <rect class="hover-badge-bg" x="${u+x+4}" y="-7" width="40" height="14" rx="2.5"
          fill="var(--color-brand-orange, #ffbe0b)" />
    <text class="hover-badge-text" x="${u+x+24}" y="2.6"
          font-family="var(--font-mono, monospace)" font-size="9" font-weight="800"
          fill="#1a1b1f" text-anchor="middle"></text>
  </g>

  <!-- ПРУЖИНА (path обновляется в JS) -->
  <path class="spring-coil"
        stroke="url(#coil-grad)" stroke-width="2.4"
        fill="none" stroke-linecap="round" stroke-linejoin="round" />

  <!-- ШТОК (металлический стержень от пружины вниз — выходит за окно и крюк) -->
  <line class="spring-rod"
        stroke="url(#board-hook)" stroke-width="1.4" stroke-linecap="round" />

  <!-- ЗИГЗАГ-РАЗРЫВ: рисуется при extension > 100 мм (пружина сжата для масштаба).
       Условный знак из инженерных чертежей: «здесь продолжается, но мы это сжали». -->
  <g class="break-symbol" style="display:none">
    <path class="break-zigzag" stroke="url(#board-hook)" stroke-width="1.4"
          fill="none" stroke-linecap="round" stroke-linejoin="round" />
    <text class="break-label" font-family="var(--font-display, sans-serif)" font-size="6.5"
          font-weight="700" fill="var(--color-warning, #f59e0b)" text-anchor="middle"
          letter-spacing="0.05em">за шкалой</text>
  </g>

  <!-- КРАСНАЯ ГОРИЗОНТАЛЬНАЯ РИСКА-УКАЗАТЕЛЬ через всё окно -->
  <g class="pointer">
    <!-- Тонкая внутренняя риска -->
    <rect x="${u-1}" y="-1.4" width="${x+2}" height="2.8"
          fill="var(--equip-pointer, #e63946)" />
    <!-- Треугольные носики слева и справа -->
    <polygon points="${u-5},0 ${u-1},-2.4 ${u-1},2.4"
             fill="var(--equip-pointer, #e63946)" />
    <polygon points="${u+x+5},0 ${u+x+1},-2.4 ${u+x+1},2.4"
             fill="var(--equip-pointer, #e63946)" />
  </g>

  <!-- НИЖНИЙ КРЮК для подвеса груза (выходит за корпус) -->
  <g class="bottom-hook">
    <line class="hook-stem" stroke="url(#board-hook)" stroke-width="1.5" stroke-linecap="round" />
    <ellipse class="hook-loop" rx="4.5" ry="3.8" fill="none"
             stroke="url(#board-hook)" stroke-width="1.5" />
  </g>

  <!-- Невидимый клик-слой для шкалы — расширен по ширине на ВЕСЬ корпус планшета,
       чтобы ученик мог кликнуть и по цифрам шкалы по бокам, не только по узкой полосе
       вокруг пружины. По высоте — ровно границы шкалы (WINDOW_Y…WINDOW_Y+WINDOW_H),
       чтобы калибровка y → мм осталась корректной (#pointerEventToMm).
       Размещён ПОСЛЕДНИМ в SVG → поверх hover/reading marks, клик не перехватывается. -->
  <rect class="scale-area" x="${st+2}" y="${G}"
        width="${vt-4}" height="${se}" fill="transparent" />

  <!-- Focus-ring -->
  <rect class="focus-ring" x="2" y="2" width="${te-4}" height="${ee-4}" rx="6" />
</svg>
`;class ds extends HTMLElement{static observedAttributes=["extension","spring-id","interactive"];restLengthMm=30;#t;#e;#s;#r;#o;#i;#a;#n;#l;#d;#c;#h;#u;#g;#p;#f;#y;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild(Ee.content.cloneNode(!0)),this.#t=t.querySelector(".scale-area"),this.#e=t.querySelector(".hover-group"),this.#s=t.querySelector(".hover-badge-text"),this.#r=t.querySelector(".hint-mark"),this.#o=t.querySelector(".reading-mark"),this.#i=t.querySelector(".reading-value"),this.#a=t.querySelector(".reading-label-text"),this.#n=t.querySelector(".spring-coil"),this.#l=t.querySelector(".spring-rod"),this.#d=t.querySelector(".pointer"),this.#c=t.querySelector(".hook-stem"),this.#h=t.querySelector(".hook-loop"),this.#u=t.querySelector(".brand-num"),this.#g=t.querySelector(".brand-k"),this.#p=t.querySelector(".break-symbol"),this.#f=t.querySelector(".break-zigzag"),this.#y=t.querySelector(".break-label"),this.#t.addEventListener("pointermove",this.#k),this.#t.addEventListener("pointerleave",this.#$),this.#t.addEventListener("click",this.#x)}connectedCallback(){this.tabIndex<0&&this.hasAttribute("interactive")&&(this.tabIndex=0),this.#w(),this.#b()}attributeChangedCallback(t){t==="extension"&&this.#b(),t==="spring-id"&&this.#w(),t==="interactive"&&(this.tabIndex=this.hasAttribute("interactive")?0:-1)}get extension(){return Number(this.getAttribute("extension")??0)}getTopHookY(){return this.#m(65,O+4).y}getHookPosition(){return this.#m(65,O+4)}getWeightHookPosition(){const t=Math.max(0,tt-this.restLengthMm),e=Math.max(0,Math.min(t,this.extension)),s=this.restLengthMm+e,r=de+s*Y,a=this.extension>t?12:0,o=r+30+a;return this.#m(H,o+8)}getWeightHookY(){return this.getWeightHookPosition().y}setHighlight(t){if(t===null){this.#r.style.display="none";return}const e=G+t*Y;this.#r.setAttribute("transform",`translate(0 ${e})`),this.#r.style.display=""}setReadingMark(t,e=""){if(t===null){this.#o.style.display="none";return}const s=G+t*Y;this.#o.setAttribute("transform",`translate(0 ${s})`),this.#i.textContent=`${t} мм`,this.#a.textContent=e;const r=this.#o.querySelector(".reading-label-bg");r.style.display=e?"":"none",this.#o.style.display=""}#k=t=>{if(!this.hasAttribute("interactive"))return;const e=this.#v(t);if(e===null)return;const s=G+e*Y;this.#e.setAttribute("transform",`translate(0 ${s})`),this.#s.textContent=`${e} мм`,this.#e.style.opacity="1"};#$=()=>{this.#e.style.opacity="0"};#x=t=>{if(!this.hasAttribute("interactive"))return;const e=this.#v(t);e!==null&&this.dispatchEvent(new CustomEvent("scale-click",{detail:{valueMm:e},bubbles:!0,composed:!0}))};#v(t){const e=this.#t.getBoundingClientRect(),r=(t.clientY-e.top)/e.height;return r<0||r>1?null:Math.round(r*tt)}#m(t,e){const s=this.getBoundingClientRect();return{x:t/te*s.width,y:e/ee*s.height}}#w(){const t=this.getAttribute("spring-id")??"k50",e=he[t]??he.k50;this.#u.textContent=`Пружина ${e.num}`,this.#g.textContent="ЛАБОСФЕРА",this.setAttribute("aria-label",`Пружина №${e.num}, миллиметровая шкала 0…100 мм. Кликните по делению, чтобы записать положение указателя.`)}#b(){const t=this.extension,e=Math.max(0,tt-this.restLengthMm),s=Math.max(0,Math.min(e,t)),r=t>e,a=this.restLengthMm+s,o=de,i=o+a*Y,l=i-o,c=[`M ${H} ${o}`];for(let p=0;p<Wt;p++){const b=(p+.5)/Wt,h=(p+1)/Wt,f=p%2===0?1:-1;c.push(`Q ${H+f*cs} ${o+b*l} ${H} ${o+h*l}`)}this.#n.setAttribute("d",c.join(" ")),this.#d.setAttribute("transform",`translate(0 ${i})`);const d=r?12:0;if(r){const p=i+2,b=i+12,h=H,f=[`M ${h} ${p}`,`L ${h-5} ${p+2.5}`,`L ${h+5} ${p+5}`,`L ${h-5} ${p+7.5}`,`L ${h} ${b}`].join(" ");this.#f.setAttribute("d",f),this.#y.setAttribute("x",String(h+22)),this.#y.setAttribute("y",String(p+6)),this.#p.style.display=""}else this.#p.style.display="none";const v=i+2+d,k=i+30+d;this.#l.setAttribute("x1",String(H)),this.#l.setAttribute("y1",String(v)),this.#l.setAttribute("x2",String(H)),this.#l.setAttribute("y2",String(k)),this.#c.setAttribute("x1",String(H)),this.#c.setAttribute("y1",String(k)),this.#c.setAttribute("x2",String(H)),this.#c.setAttribute("y2",String(k+4)),this.#h.setAttribute("cx",String(H)),this.#h.setAttribute("cy",String(k+8))}}customElements.define("lab-spring-board",ds);const re=90,oe=320,kt=12,at=22,Ft=66,pe=270,m=16,I=50,A=58,D=220,M=45,hs=30,ps=7,Nt=14,ue=12,$t=18,St=72,us=24,fs=66,zt=m,Yt=A,Pt=I+D+4,fe=16,qe=document.createElement("template");qe.innerHTML=`
<style>
  :host {
    --dyno-w: 90px;
    --dyno-h: 320px;
    display: inline-block;
    width: var(--dyno-w);
    height: var(--dyno-h);
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .scale-area {
    cursor: crosshair;
    pointer-events: all;
  }

  :host(:not([interactive])) .scale-area {
    cursor: default;
    pointer-events: none;
  }

  .hover-group {
    transition: opacity 80ms ease-out;
  }

  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 4 3;
    opacity: 0;
  }

  :host(:focus-visible) {
    outline: none;
  }

  :host(:focus-visible) .focus-ring {
    opacity: 1;
  }
</style>
<svg viewBox="0 0 ${re} ${oe}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Светлый корпус (как у школьных учебных динамометров): белый/светло-серый
         градиент с лёгкой объёмностью -->
    <linearGradient id="dyno-body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a8b0bb" />
      <stop offset="6%" stop-color="#c8cfd8" />
      <stop offset="50%" stop-color="#eef1f5" />
      <stop offset="94%" stop-color="#c8cfd8" />
      <stop offset="100%" stop-color="#a8b0bb" />
    </linearGradient>

    <!-- Прозрачное окно -->
    <linearGradient id="dyno-window" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#dee5ed" />
      <stop offset="50%" stop-color="#f4f7fb" />
      <stop offset="100%" stop-color="#dee5ed" />
    </linearGradient>

    <!-- Хром-крюк -->
    <linearGradient id="dyno-hook" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#9aa3b0" />
      <stop offset="40%" stop-color="#dde2e8" />
      <stop offset="60%" stop-color="#dde2e8" />
      <stop offset="100%" stop-color="#9aa3b0" />
    </linearGradient>

    <!-- Витки пружины -->
    <linearGradient id="dyno-coil" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5a6470" />
      <stop offset="50%" stop-color="#e8edf3" />
      <stop offset="100%" stop-color="#5a6470" />
    </linearGradient>

    <filter id="dyno-shadow" x="-15%" y="-5%" width="130%" height="115%">
      <feDropShadow dx="2" dy="4" stdDeviation="3" flood-opacity="0.45" />
    </filter>

    <!-- Окно как clipPath: пружина за его пределами обрезается (верх скрыт корпусом). -->
    <clipPath id="dyno-window-clip">
      <rect x="${m}" y="${I}" width="${A}" height="${D}" />
    </clipPath>
  </defs>

  <!-- ВЕРХНИЙ КРЮК -->
  <path
    d="M 45 4 Q 40 6 40 12 Q 40 18 45 18 Q 50 18 50 24 L 50 ${at}"
    stroke="url(#dyno-hook)" stroke-width="2.4" fill="none" stroke-linecap="round"
  />

  <!-- КОРПУС -->
  <g filter="url(#dyno-shadow)">
    <rect
      x="${kt}" y="${at}" width="${Ft}" height="${pe}"
      rx="3" fill="url(#dyno-body)"
      stroke="#3d434c" stroke-width="0.6"
    />
    <!-- Внутренняя обводка -->
    <rect
      x="${kt+1}" y="${at+1}" width="${Ft-2}" height="${pe-2}"
      rx="2" fill="none" stroke="rgb(255 255 255 / 0.15)" stroke-width="0.5"
    />
  </g>

  <!-- ПРОЗРАЧНОЕ ОКНО (за стеклом — пружина и шкала) -->
  <rect
    x="${m}" y="${I}" width="${A}" height="${D}"
    rx="1.5" fill="url(#dyno-window)"
    stroke="#3d434c" stroke-width="0.5"
  />

  <!-- LCD-плашка с цифровым показанием — встроена в корпус под окном шкалы.
       Вместо аналоговой маркировки диапазона. Чёрный фон + янтарные моноширинные
       цифры (как у Vernier/PASCO). Ученик одновременно видит и аналоговую шкалу,
       и точное число. Маркировка диапазона перенесена наверх (см. ниже). -->
  <g class="readout">
    <rect x="${zt}" y="${Pt}" width="${Yt}" height="${fe}"
          rx="2" fill="#0a0e16"
          stroke="#3d434c" stroke-width="0.5" />
    <rect x="${zt+1}" y="${Pt+1}" width="${Yt-2}" height="3"
          rx="1.5" fill="rgb(255 255 255 / 0.05)" />
    <text class="readout-text"
          x="${zt+Yt-5}" y="${Pt+fe-4}"
          text-anchor="end"
          font-family="var(--font-mono, monospace)" font-size="10"
          font-weight="800" letter-spacing="0.04em"
          fill="var(--color-brand-orange, #ffbe0b)">0,00 Н</text>
  </g>

  <!-- Маркировка диапазона СВЕРХУ корпуса (рядом с подписью ЛАБОСФЕРА) -->
  <g class="brand-top" transform="translate(${kt+Ft-6}, ${at+12})">
    <text class="brand-range-top"
          font-family="var(--font-display, sans-serif)"
          font-size="8" font-weight="800"
          fill="rgb(0 0 0 / 0.7)"
          text-anchor="end"
          dominant-baseline="middle">1Н</text>
  </g>

  <!-- Подпись ЛАБОСФЕРА мелким текстом сверху корпуса (слева, чтобы не пересекалось
       с маркировкой диапазона справа) -->
  <g transform="translate(${kt+6}, ${at+12})">
    <text font-family="var(--font-display, sans-serif)"
          font-size="5" font-weight="700"
          fill="rgb(0 0 0 / 0.5)"
          text-anchor="start"
          letter-spacing="0.1em">ЛАБОСФЕРА</text>
  </g>

  <!-- ШКАЛА: левая колонка делений -->
  <g class="scale-left" font-family="var(--font-mono, monospace)" font-size="9"
     fill="#14233a">
    <!-- генерируем в JS через #renderTicks -->
  </g>
  <g class="scale-right" font-family="var(--font-mono, monospace)" font-size="9"
     fill="#14233a">
    <!-- генерируем в JS -->
  </g>

  <!-- Невидимый клик-слой для шкалы -->
  <rect class="scale-area"
        x="${m}" y="${I}"
        width="${A}" height="${D}"
        fill="transparent" />

  <!-- Запись ученика (синяя риска поверх с бейджем "F = X.X Н") -->
  <g class="reading-mark" style="display:none">
    <rect x="${m-3}" y="-1.4" width="${A+6}" height="2.8"
          fill="#0d6efd" opacity="0.9" />
    <rect class="reading-bg" x="${m+A+4}" y="-7" width="46" height="14" rx="2.5"
          fill="#0d6efd" />
    <text class="reading-value" x="${m+A+27}" y="2.6"
          font-family="var(--font-mono, monospace)" font-size="9" font-weight="800"
          fill="#fff" text-anchor="middle"></text>
  </g>

  <!-- Hover: пунктирная линия + бейдж с цифрой Н -->
  <g class="hover-group" style="opacity:0; pointer-events:none">
    <line class="hover-tick" x1="${m-2}" y1="0" x2="${m+A+2}" y2="0"
          stroke="var(--color-brand-orange, #ffbe0b)" stroke-width="0.9"
          stroke-dasharray="2 1.5" />
    <rect class="hover-bg" x="${m+A+4}" y="-7" width="42" height="14" rx="2.5"
          fill="var(--color-brand-orange, #ffbe0b)" />
    <text class="hover-text" x="${m+A+25}" y="2.6"
          font-family="var(--font-mono, monospace)" font-size="9" font-weight="800"
          fill="#1a1b1f" text-anchor="middle"></text>
  </g>

  <!-- ПРУЖИНА (path обновляется в JS); clipPath прячет верхнюю часть за корпусом. -->
  <path class="dyno-coil"
        stroke="url(#dyno-coil)" stroke-width="2"
        fill="none" stroke-linecap="round" stroke-linejoin="round"
        clip-path="url(#dyno-window-clip)" />

  <!-- ШТОК (тонкий металлический стержень от пружины вниз к крюку) -->
  <line class="dyno-rod"
        stroke="url(#dyno-hook)" stroke-width="1.4" stroke-linecap="round" />

  <!-- КРАСНАЯ ГОРИЗОНТАЛЬНАЯ РИСКА-УКАЗАТЕЛЬ через всё окно -->
  <g class="dyno-pointer">
    <rect x="${m-1}" y="-1.4" width="${A+2}" height="2.8"
          fill="var(--equip-pointer, #e63946)" />
    <!-- Маленький треугольный носик слева и справа -->
    <polygon points="${m-4},0 ${m-1},-2 ${m-1},2"
             fill="var(--equip-pointer, #e63946)" />
    <polygon points="${m+A+4},0 ${m+A+1},-2 ${m+A+1},2"
             fill="var(--equip-pointer, #e63946)" />
  </g>

  <!-- НИЖНИЙ КРЮК для подвеса груза -->
  <g class="bottom-hook">
    <line class="hook-stem" stroke="url(#dyno-hook)" stroke-width="1.5" stroke-linecap="round" />
    <ellipse class="hook-loop" rx="4.5" ry="3.8" fill="none"
             stroke="url(#dyno-hook)" stroke-width="1.5" />
  </g>

  <!-- Focus ring -->
  <rect class="focus-ring" x="2" y="2" width="${re-4}" height="${oe-4}" rx="6" />
</svg>
`;class gs extends HTMLElement{static observedAttributes=["range","force","interactive"];#t;#e;#s;#r;#o;#i;#a;#n;#l;#d;#c;#h;#u;#g;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild(qe.content.cloneNode(!0)),this.#t=t.querySelector(".scale-left"),this.#e=t.querySelector(".scale-right"),this.#s=t.querySelector(".scale-area"),this.#r=t.querySelector(".dyno-coil"),this.#o=t.querySelector(".dyno-rod"),this.#i=t.querySelector(".dyno-pointer"),this.#a=t.querySelector(".hook-stem"),this.#n=t.querySelector(".hook-loop"),this.#l=t.querySelector(".brand-range-top"),this.#d=t.querySelector(".hover-group"),this.#c=t.querySelector(".hover-text"),this.#h=t.querySelector(".reading-mark"),this.#u=t.querySelector(".reading-value"),this.#g=t.querySelector(".readout-text"),this.#s.addEventListener("click",this.#p),this.#s.addEventListener("pointermove",this.#f),this.#s.addEventListener("pointerleave",this.#y)}connectedCallback(){this.tabIndex<0&&this.hasAttribute("interactive")&&(this.tabIndex=0),this.#w(),this.#m()}attributeChangedCallback(){this.#w(),this.#m()}get range(){return Number(this.getAttribute("range")??1)}get force(){return Number(this.getAttribute("force")??0)}getTopHookY(){return this.#x(45,8).y}getHookPosition(){return this.#x(45,8)}getWeightHookPosition(){const e=this.#v()+ue;return this.#x(M,e+8)}getWeightHookY(){return this.getWeightHookPosition().y}#p=t=>{if(!this.hasAttribute("interactive"))return;const e=this.#$(t);e!==null&&this.dispatchEvent(new CustomEvent("scale-click",{detail:{valueN:e},bubbles:!0,composed:!0}))};#f=t=>{if(!this.hasAttribute("interactive"))return;const e=this.#$(t);if(e===null)return;const s=e/this.range,r=I+s*D;this.#d.setAttribute("transform",`translate(0 ${r})`),this.#c.textContent=this.#k(e),this.#d.style.opacity="1"};#y=()=>{this.#d.style.opacity="0"};setReadingMark(t){if(t===null){this.#h.style.display="none";return}const e=Math.max(0,Math.min(1,t/this.range)),s=I+e*D;this.#h.setAttribute("transform",`translate(0 ${s})`),this.#u.textContent=`${this.#k(t)} Н`,this.#h.style.display=""}#k(t){return this.range===1?t.toFixed(2):t.toFixed(1)}#$(t){const e=this.#s.getBoundingClientRect(),r=(t.clientY-e.top)/e.height;if(r<0||r>1)return null;const a=this.range===1?.02:.1,o=r*this.range;return Math.round(o/a)*a}#x(t,e){const s=this.getBoundingClientRect();return{x:t/re*s.width,y:e/oe*s.height}}#v(){const t=Math.max(0,Math.min(1,this.force/this.range));return I+t*D}#m(){this.#l.textContent=`${this.range}Н`;{const i=this.range,l=Math.max(0,Math.min(i,this.force)),c=i===1?2:1,d=l.toFixed(c).replace(".",",");this.#g.textContent=`${d} Н`}const t=this.#v(),e=hs,s=t-e,r=[`M ${M} ${e}`];for(let i=0;i<Nt;i++){const l=(i+.5)/Nt,c=(i+1)/Nt,d=i%2===0?1:-1;r.push(`Q ${M+d*ps} ${e+l*s} ${M} ${e+c*s}`)}this.#r.setAttribute("d",r.join(" "));const a=t,o=a+ue;this.#o.setAttribute("x1",String(M)),this.#o.setAttribute("y1",String(a)),this.#o.setAttribute("x2",String(M)),this.#o.setAttribute("y2",String(o)),this.#i.setAttribute("transform",`translate(0 ${t})`),this.#a.setAttribute("x1",String(M)),this.#a.setAttribute("y1",String(o)),this.#a.setAttribute("x2",String(M)),this.#a.setAttribute("y2",String(o+4)),this.#n.setAttribute("cx",String(M)),this.#n.setAttribute("cy",String(o+8)),this.setAttribute("aria-label",`Динамометр 0…${this.range} Н, текущее показание ${this.force.toFixed(this.range===1?2:1)} Н`)}#w(){const t=this.range;this.#t.replaceChildren(),this.#e.replaceChildren();const e=10;for(let s=0;s<=e;s++){const r=s/e,a=I+r*D,o=s*t/e,i=t===1?o.toFixed(1):o===0?"0":o.toString();this.#t.appendChild(this.#b($t,a,$t+5,a,"#0f2747",.6)),this.#t.appendChild(this.#S(us,a+1.6,i,"#14233a")),this.#e.appendChild(this.#b(St-5,a,St,a,"#0f2747",.6)),this.#e.appendChild(this.#A(fs,a+1.6,i,"#14233a"))}for(let s=0;s<e;s++){const r=I+(s+.5)/e*D;this.#t.appendChild(this.#b($t,r,$t+3,r,"#1f3a5c",.4)),this.#e.appendChild(this.#b(St-3,r,St,r,"#1f3a5c",.4))}}#b(t,e,s,r,a,o){const i=document.createElementNS("http://www.w3.org/2000/svg","line");return i.setAttribute("x1",String(t)),i.setAttribute("y1",String(e)),i.setAttribute("x2",String(s)),i.setAttribute("y2",String(r)),i.setAttribute("stroke",a),i.setAttribute("stroke-width",String(o)),i}#S(t,e,s,r){const a=document.createElementNS("http://www.w3.org/2000/svg","text");return a.setAttribute("x",String(t)),a.setAttribute("y",String(e)),a.setAttribute("fill",r),a.setAttribute("font-weight","700"),a.textContent=s,a}#A(t,e,s,r){const a=this.#S(t,e,s,r);return a.setAttribute("text-anchor","end"),a}}customElements.define("lab-dynamometer",gs);const Le=document.createElement("template");Le.innerHTML=`
<style>
  :host {
    --tray-bg: #16181d;
    --tray-bg-edge: #0a0b0e;
    --tray-rim: #2c2f36;
    --tray-cell-bg: rgb(255 255 255 / 0.025);
    --tray-cell-border: rgb(255 255 255 / 0.06);
    --tray-label: var(--color-text-secondary, #b8c0cc);

    display: block;
    background: linear-gradient(180deg, var(--tray-bg) 0%, var(--tray-bg-edge) 100%);
    border: 1px solid var(--tray-rim);
    border-top-color: rgb(255 255 255 / 0.05);
    border-radius: var(--radius-lg, 12px);
    box-shadow:
      inset 0 2px 6px rgb(0 0 0 / 0.6),
      inset 0 -1px 0 rgb(255 255 255 / 0.04),
      0 8px 20px rgb(0 0 0 / 0.45);
    padding: var(--space-3, 12px) var(--space-4, 16px) var(--space-4, 16px);
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4, 16px);
    margin-bottom: var(--space-3, 12px);
    padding: 0 var(--space-2, 8px);
    border-bottom: 1px dashed rgb(255 255 255 / 0.08);
    padding-bottom: var(--space-2, 8px);
  }

  .header-title {
    font-family: var(--font-display, sans-serif);
    font-weight: 600;
    font-size: var(--text-sm, 14px);
    color: var(--color-text-primary, #e0e1dd);
    letter-spacing: 0.02em;
  }

  .header-spec {
    font-family: var(--font-mono, monospace);
    font-size: var(--text-xs, 12px);
    color: var(--color-text-muted, #8a93a0);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .grid {
    display: grid;
    grid-template-columns:
      minmax(160px, 1.4fr)
      minmax(140px, 1fr)
      minmax(220px, 2fr)
      minmax(120px, 1fr);
    gap: var(--space-3, 12px);
    align-items: stretch;
  }

  .cell {
    background: var(--tray-cell-bg);
    border: 1px solid var(--tray-cell-border);
    border-radius: var(--radius-md, 8px);
    padding: var(--space-3, 12px) var(--space-2, 8px) var(--space-2, 8px);
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 8px);
    position: relative;
    min-height: 220px;
  }

  .cell-label {
    font-family: var(--font-display, sans-serif);
    font-size: var(--text-xs, 12px);
    font-weight: 600;
    color: var(--tray-label);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  .cell-content {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: center;
    gap: var(--space-3, 12px);
  }

  /* Планшеты пружин в лотке — компактнее, чем на сцене */
  .cell-content[data-cell="springs"] ::slotted(*) {
    --board-w: 84px;
    --board-h: 200px;
  }

  /* Динамометры — компактнее в лотке, чем на сцене */
  .cell-content[data-cell="dynamometers"] ::slotted(*) {
    --dyno-w: 70px;
    --dyno-h: 220px;
  }

  /* Грузы среднего размера */
  .cell-content[data-cell="weights"] ::slotted(*) {
    --weight-size: 52px;
  }

  /* Аксессуары — затенены, недоступны */
  .cell-content[data-cell="accessories"] {
    opacity: 0.45;
    filter: grayscale(0.4);
  }

  .cell-content[data-cell="accessories"]::after {
    content: 'Для других опытов';
    position: absolute;
    bottom: var(--space-2, 8px);
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-display, sans-serif);
    font-size: 10px;
    color: var(--color-text-muted, #8a93a0);
    font-style: italic;
    pointer-events: none;
  }

  @media (max-width: 1024px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<header class="header">
  <span class="header-title"><slot name="title">Комплект №2 «Силы и пружины»</slot></span>
  <span class="header-spec">FIPI-комплект · ОГЭ-2026</span>
</header>

<div class="grid">
  <section class="cell">
    <div class="cell-label">Пружины на планшетах</div>
    <div class="cell-content" data-cell="springs">
      <slot name="springs"></slot>
    </div>
  </section>
  <section class="cell">
    <div class="cell-label">Динамометры</div>
    <div class="cell-content" data-cell="dynamometers">
      <slot name="dynamometers"></slot>
    </div>
  </section>
  <section class="cell">
    <div class="cell-label">Грузы</div>
    <div class="cell-content" data-cell="weights">
      <slot name="weights"></slot>
    </div>
  </section>
  <section class="cell">
    <div class="cell-label">Принадлежности</div>
    <div class="cell-content" data-cell="accessories">
      <slot name="accessories"></slot>
    </div>
  </section>
</div>
`;class bs extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}).appendChild(Le.content.cloneNode(!0))}connectedCallback(){this.hasAttribute("role")||this.setAttribute("role","region"),this.hasAttribute("aria-label")||this.setAttribute("aria-label","Лоток оборудования комплекта №2")}}customElements.define("lab-tray",bs);const Te=document.createElement("template");Te.innerHTML=`
<style>
  :host {
    --card-bg: #0f1f3a;
    --card-bg-hover: #14263f;
    --card-border: rgb(255 255 255 / 0.08);
    --card-border-active: rgb(56 189 175 / 0.5);
    --card-accent: #38bdaf;

    display: block;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg, 12px);
    padding: 8px;
    transition:
      border-color var(--dur-fast, 150ms) var(--ease-out),
      background var(--dur-fast, 150ms) var(--ease-out),
      transform var(--dur-fast, 150ms) var(--ease-out);
    position: relative;
  }

  :host(:hover:not([status="disabled"])) {
    background: var(--card-bg-hover);
    border-color: var(--card-border-active);
    transform: translateY(-1px);
  }

  :host([status="in-use"]) {
    opacity: 0.55;
  }

  :host([status="disabled"]) {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .thumb {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    min-height: 56px;
    padding: 0;
  }

  /* Миниатюры внутри карточек: задаём размеры подкомпонентам */
  .thumb ::slotted(lab-dynamometer) {
    --dyno-w: 32px;
    --dyno-h: 84px;
  }

  .thumb ::slotted(lab-spring-board) {
    --board-w: 42px;
    --board-h: 96px;
  }

  .thumb ::slotted(lab-weight) {
    --weight-size: 32px;
  }

  .thumb ::slotted(lab-composite-weight) {
    --piece-size: 38px;
  }

  .meta {
    margin-top: 4px;
    text-align: center;
  }

  .title {
    font-family: var(--font-display, sans-serif);
    font-size: 12px;
    font-weight: 700;
    color: var(--color-text-primary, #e0e1dd);
    line-height: 1.2;
    margin-bottom: 1px;
  }

  .status {
    font-family: var(--font-display, sans-serif);
    font-size: 10px;
    color: var(--color-text-muted, #8a93a0);
    font-style: italic;
  }

  :host([status="in-use"]) .status {
    color: var(--card-accent);
    font-style: normal;
    font-weight: 600;
  }

  /* Кнопка-«пилюля»: компактная, появляется на hover */
  .action {
    width: 100%;
    margin-top: 4px;
    padding: 3px 6px;
    background: rgb(56 189 175 / 0.12);
    border: 1px solid rgb(56 189 175 / 0.4);
    border-radius: var(--radius-md, 8px);
    font-family: var(--font-display, sans-serif);
    font-size: 10px;
    color: var(--card-accent);
    cursor: pointer;
    transition:
      background var(--dur-fast, 150ms) var(--ease-out),
      border-color var(--dur-fast, 150ms) var(--ease-out),
      opacity var(--dur-fast, 150ms) var(--ease-out);
    min-height: 22px;
    line-height: 1.1;
    opacity: 0.6;
  }

  :host(:hover) .action,
  .action:focus-visible {
    opacity: 1;
  }

  .action:hover:not(:disabled) {
    background: rgb(56 189 175 / 0.22);
    border-color: var(--card-accent);
  }

  .action:focus-visible {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: 2px;
  }

  .action:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
<div class="thumb"><slot></slot></div>
<div class="meta">
  <div class="title"></div>
  <div class="status">В комплекте</div>
</div>
<button class="action" type="button">Перетащите на установку</button>
`;class ms extends HTMLElement{static observedAttributes=["title","status"];#t;#e;#s;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild(Te.content.cloneNode(!0)),this.#t=t.querySelector(".title"),this.#e=t.querySelector(".status"),this.#s=t.querySelector(".action"),this.#s.addEventListener("click",()=>{this.getAttribute("status")!=="in-use"&&this.dispatchEvent(new CustomEvent("equipment-pick",{bubbles:!0,composed:!0,detail:{title:this.getAttribute("title")??""}}))})}connectedCallback(){this.#r()}attributeChangedCallback(){this.#r()}#r(){const t=this.getAttribute("title")??"",e=this.getAttribute("status")??"available";this.#t.textContent=t,e==="in-use"?(this.#e.textContent="На установке",this.#s.textContent="Установлено",this.#s.disabled=!0):e==="disabled"?(this.#e.textContent="Недоступно",this.#s.textContent="—",this.#s.disabled=!0):(this.#e.textContent="В комплекте",this.#s.textContent="Перетащить →",this.#s.disabled=!1)}}customElements.define("lab-equipment-card",ms);const At={10:{rx:22,ry:3.2,height:6},20:{rx:24,ry:3.4,height:8},50:{rx:26,ry:3.6,height:12}};function ys(n){return[...n].sort((t,e)=>e-t)}const He=document.createElement("template");He.innerHTML=`
<style>
  :host {
    --piece-size: 64px;
    --metal: var(--equip-metal, #a8afb8);
    --metal-light: var(--equip-metal-light, #d5dbe3);
    --metal-shadow: var(--equip-metal-shadow, #4a5260);
    --disc-body: var(--equip-weight-dark, #6e7682);
    --disc-edge: var(--equip-weight-edge, #4a5260);

    display: inline-flex;
    align-items: flex-end;
    justify-content: center;
    width: var(--piece-size);
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    transition: transform var(--dur-fast, 150ms) var(--ease-out, ease-out);
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.35));
  }

  :host([kind="rod"]),
  :host([kind="composite"]) {
    height: 130px;
  }

  /* Размер диска (standalone в tray) — больше для лучшей кликабельности. */
  :host([kind="disc"][mass="10"]) { height: 30px; }
  :host([kind="disc"][mass="20"]) { height: 36px; }
  :host([kind="disc"][mass="50"]) { height: 44px; }

  :host(:hover:not([attached])) {
    transform: translateY(-2px);
    filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.5));
  }

  :host([dragging]) {
    cursor: grabbing;
    transform: scale(1.06);
    z-index: 100;
  }

  :host([kind="composite"][attached]:hover) {
    transform: none;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  /* На SVG-элементах HTML-атрибут [hidden] браузерами не всегда уважается
     (намного надёжнее display:none напрямую). Иначе все 3 режимных SVG
     рисуются разом → "две штанги" в композите. */
  svg[hidden] { display: none; }

  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 4 3;
    opacity: 0;
  }

  :host(:focus-visible) {
    outline: none;
  }

  :host(:focus-visible) .focus-ring {
    opacity: 1;
  }

  /* Анимация «диск приземлился» */
  .disc-stacked {
    transform-origin: center 100%;
    animation: disc-land 320ms cubic-bezier(.34, 1.56, .64, 1);
  }

  @keyframes disc-land {
    0% { transform: translateY(-18px) scale(1.08); opacity: 0.4; }
    60% { transform: translateY(2px) scale(0.98); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .disc-stacked { animation: none; }
  }

  /* Slot-marker (snap-zone) — gold-glow контур куда встанет следующий диск. */
  .slot-marker {
    fill: rgb(242 201 76 / 0.18);
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 1.4;
    stroke-dasharray: 3 2;
    opacity: 0;
    pointer-events: none;
  }

  :host([data-slot-target]) .slot-marker {
    opacity: 1;
    animation: slot-pulse 1.2s ease-in-out infinite;
  }

  @keyframes slot-pulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    :host([data-slot-target]) .slot-marker { animation: none; opacity: 1; }
  }
</style>

<!-- ─── Общие defs (gradients) — переиспользуем во всех режимах ─────────────
     ID'ы уникальные с префиксом lcw- чтобы не конфликтовать с другими SVG. -->
<svg width="0" height="0" style="position:absolute;" aria-hidden="true">
  <defs>
    <linearGradient id="lcw-stem" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--metal-shadow)" />
      <stop offset="22%" stop-color="var(--metal)" />
      <stop offset="50%" stop-color="var(--metal-light)" />
      <stop offset="78%" stop-color="var(--metal)" />
      <stop offset="100%" stop-color="var(--metal-shadow)" />
    </linearGradient>
    <linearGradient id="lcw-eyelet" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7a828e" />
      <stop offset="50%" stop-color="#dde2e8" />
      <stop offset="100%" stop-color="#7a828e" />
    </linearGradient>
    <linearGradient id="lcw-disc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="color-mix(in srgb, var(--disc-body) 60%, white 40%)" />
      <stop offset="45%" stop-color="var(--disc-body)" />
      <stop offset="100%" stop-color="var(--disc-edge)" />
    </linearGradient>
    <radialGradient id="lcw-disc-top" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="color-mix(in srgb, var(--disc-body) 50%, white 50%)" />
      <stop offset="70%" stop-color="var(--disc-body)" />
      <stop offset="100%" stop-color="var(--disc-edge)" />
    </radialGradient>
  </defs>
</svg>

<!-- ─── ROD (standalone в tray) — чистый стержень без подписей ───────────── -->
<svg class="rod" viewBox="0 0 60 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden>
  <!-- Eyelet (петля для крепления к крюку пружины/динамометра) -->
  <ellipse cx="30" cy="9" rx="6.4" ry="6.4" fill="none"
           stroke="url(#lcw-eyelet)" stroke-width="2.8" />
  <ellipse cx="30" cy="9" rx="3.2" ry="3.2" fill="rgb(0 0 0 / 0.55)" />

  <!-- Переход от eyelet к стержню (узкая шейка) -->
  <rect x="28.6" y="14.5" width="2.8" height="3.5" fill="url(#lcw-eyelet)" />

  <!-- Основной стержень -->
  <rect x="26" y="18" width="8" height="98" fill="url(#lcw-stem)" rx="1.2" />
  <!-- Тонкий блик -->
  <rect x="28.5" y="18" width="0.9" height="98" fill="rgb(255 255 255 / 0.55)" />

  <rect class="focus-ring" x="2" y="2" width="56" height="126" rx="8" />
</svg>

<!-- ─── DISC (standalone в tray) — чистый металлический диск без подписей.
     Только side + top + hole. БЕЗ нижнего эллипса (он создавал визуальный
     эффект «дополнительной грани» под диском). -->
<svg class="disc" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden>
  <!-- Боковая поверхность (rect) -->
  <rect class="disc-side" fill="url(#lcw-disc)" stroke="var(--disc-edge)" stroke-width="0.5" />
  <!-- Верхняя плоскость -->
  <ellipse class="disc-top" fill="url(#lcw-disc-top)"
           stroke="var(--disc-edge)" stroke-width="0.5" />
  <!-- Центральное отверстие — стержень виден сквозь него -->
  <ellipse class="disc-hole" fill="rgb(0 0 0 / 0.55)" />

  <rect class="focus-ring" x="2" y="2" width="56" height="26" rx="4" />
</svg>

<!-- ─── COMPOSITE (rod + надетые диски как единое целое) ───────────────────
     Та же геометрия host'а (60×130), что и у rod — getTopHookY/getWeightHookY
     возвращают те же значения, поэтому chain-algorithm DragController'а
     работает прозрачно. -->
<svg class="composite" viewBox="0 0 60 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" hidden>
  <!-- Eyelet — крошечная петля. Iter 3 сделал её предельно маленькой (rx=3):
       любой кружок наверху стержня глаз учеников считал «верхним диском»
       пирамиды. См. memory/reference_svg_perceptual_doubling.md -->
  <ellipse cx="30" cy="6" rx="3" ry="3" fill="none"
           stroke="url(#lcw-eyelet)" stroke-width="1.2" />
  <ellipse cx="30" cy="6" rx="1.2" ry="1.2" fill="rgb(0 0 0 / 0.5)" />
  <rect x="29" y="9" width="2" height="4" fill="url(#lcw-eyelet)" />

  <!-- Стержень — заканчивается ВНУТРИ нижнего 50г диска (y=110), не торчит
       снизу. 50г диск (height=12) занимает y=104..116, стержень y=13..110
       исчезает в нём через центральное отверстие. -->
  <rect x="26" y="13" width="8" height="97" fill="url(#lcw-stem)" rx="1.2" />
  <rect x="28.5" y="13" width="0.9" height="97" fill="rgb(255 255 255 / 0.55)" />

  <!-- Slot-marker (gold-glow контур ожидаемой позиции следующего диска).
       Геометрия задаётся в JS. -->
  <ellipse class="slot-marker" cx="30" />

  <!-- Iter 3: flange удалён ПОЛНОСТЬЮ. Он был плоским эллипсом и глаз
       читал его как 4-й диск. Его роль «основания» теперь играет
       bottom-ellipse у нижнего 50г диска (рисуется в #renderComposite). -->

  <!-- Группа надетых дисков (JS добавляет <g class="disc-stacked"> сюда). -->
  <g class="discs-stack"></g>

  <rect class="focus-ring" x="2" y="2" width="56" height="126" rx="8" />
</svg>
`;class xs extends HTMLElement{static observedAttributes=["kind","mass","discs"];#t;#e;#s;#r;#o;#i;#a;#n;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild(He.content.cloneNode(!0)),this.#t=t.querySelector("svg.rod"),this.#e=t.querySelector("svg.disc"),this.#s=t.querySelector("svg.composite"),this.#r=this.#e.querySelector(".disc-side"),this.#o=this.#e.querySelector(".disc-top"),this.#i=this.#e.querySelector(".disc-hole"),this.#a=this.#s.querySelector(".discs-stack"),this.#n=this.#s.querySelector(".slot-marker")}connectedCallback(){this.hasAttribute("role")||this.setAttribute("role","button"),this.tabIndex<0&&(this.tabIndex=0),this.#l()}attributeChangedCallback(){this.#l()}get kind(){return this.getAttribute("kind")??"rod"}get mass(){return this.kind==="composite"?this.getMass():Number(this.getAttribute("mass")??10)}get discs(){if(this.kind!=="composite")return[];const t=this.getAttribute("discs")??"";return t?ys(t.split(",").map(e=>Number(e.trim())).filter(e=>e===10||e===20||e===50)):[]}getMass(){return this.kind!=="composite"?Number(this.getAttribute("mass")??10):10+this.discs.reduce((t,e)=>t+e,0)}setDiscs(t){const e=t.filter(s=>s===10||s===20||s===50);this.setAttribute("discs",e.join(","))}getTopHookY(){const t=this.getBoundingClientRect();return this.kind==="rod"?9/130*t.height:this.kind==="composite"?6/130*t.height:8/30*t.height}getWeightHookY(){const t=this.getBoundingClientRect();return this.kind==="rod"||this.kind==="composite"?118.5/130*t.height:t.height}#l(){if(this.kind==="rod")this.#t.removeAttribute("hidden"),this.#e.setAttribute("hidden",""),this.#s.setAttribute("hidden",""),this.setAttribute("aria-label","Штанга-основа наборного груза. Нажмите Enter чтобы взять.");else if(this.kind==="disc")this.#t.setAttribute("hidden",""),this.#e.removeAttribute("hidden"),this.#s.setAttribute("hidden",""),this.#d(),this.setAttribute("aria-label",`Диск ${this.mass} г для наборного груза. Нажмите Enter чтобы взять.`);else{this.#t.setAttribute("hidden",""),this.#e.setAttribute("hidden",""),this.#s.removeAttribute("hidden"),this.#c();const t=this.discs,e=t.length===0?"Штанга-узел без дисков.":`Штанга-узел с дисками ${t.join(" г, ")} г.`;this.setAttribute("aria-label",`${e} Нажмите Enter чтобы взять.`)}}#d(){const t=At[this.mass]??At[10],e=30,s=12;this.#o.setAttribute("cx",String(e)),this.#o.setAttribute("cy",String(s)),this.#o.setAttribute("rx",String(t.rx)),this.#o.setAttribute("ry",String(t.ry)),this.#r.setAttribute("x",String(e-t.rx)),this.#r.setAttribute("y",String(s)),this.#r.setAttribute("width",String(t.rx*2)),this.#r.setAttribute("height",String(t.height));const r=this.mass===50?3.2:this.mass===20?2.6:2;this.#i.setAttribute("cx",String(e)),this.#i.setAttribute("cy",String(s)),this.#i.setAttribute("rx",String(r)),this.#i.setAttribute("ry","0.8")}#c(){this.#a.replaceChildren();const t=116,e=30,s=this.discs;let r=t;for(let o=0;o<s.length;o++){const i=s[o],l=o===0,c=o===s.length-1,d=At[i],v=r-d.height,k=r,p=document.createElementNS("http://www.w3.org/2000/svg","g");if(p.classList.add("disc-stacked"),p.dataset.mass=String(i),l){const f=document.createElementNS("http://www.w3.org/2000/svg","ellipse");f.setAttribute("cx",String(e)),f.setAttribute("cy",String(k)),f.setAttribute("rx",String(d.rx)),f.setAttribute("ry","0.8"),f.setAttribute("fill","var(--disc-edge)"),p.appendChild(f)}const b=document.createElementNS("http://www.w3.org/2000/svg","rect");b.setAttribute("x",String(e-d.rx)),b.setAttribute("y",String(v)),b.setAttribute("width",String(d.rx*2)),b.setAttribute("height",String(d.height)),b.setAttribute("fill","url(#lcw-disc)"),b.setAttribute("stroke","var(--disc-edge)"),b.setAttribute("stroke-width","0.5"),p.appendChild(b);const h=document.createElementNS("http://www.w3.org/2000/svg","ellipse");if(h.setAttribute("cx",String(e)),h.setAttribute("cy",String(v)),h.setAttribute("rx",String(d.rx)),h.setAttribute("ry",String(d.ry)),h.setAttribute("fill","url(#lcw-disc-top)"),h.setAttribute("stroke","var(--disc-edge)"),h.setAttribute("stroke-width","0.5"),p.appendChild(h),c){const f=i===50?3.2:i===20?2.6:2,w=document.createElementNS("http://www.w3.org/2000/svg","ellipse");w.setAttribute("cx",String(e)),w.setAttribute("cy",String(v)),w.setAttribute("rx",String(f)),w.setAttribute("ry","0.8"),w.setAttribute("fill","rgb(0 0 0 / 0.55)"),p.appendChild(w)}this.#a.appendChild(p),r=v}const a=this.#h();if(a!==null){const o=At[a],i=r-o.height/2;this.#n.setAttribute("cy",String(i)),this.#n.setAttribute("rx",String(o.rx)),this.#n.setAttribute("ry",String(o.ry+1.2))}else this.#n.setAttribute("rx","0"),this.#n.setAttribute("ry","0")}#h(){const t=new Set(this.discs),e=[50,20,10];for(const s of e)if(!t.has(s))return s;return null}}customElements.define("lab-composite-weight",xs);const Xt=[50,20,10];class vs extends HTMLElement{#t=null;#e=new Map;#s=null;#r="available";connectedCallback(){this.hasAttribute("role")||this.setAttribute("role","group"),this.setAttribute("aria-label","Сборочный верстак наборного груза"),this.children.length===0&&this.#o(),this.#i()}#o(){this.innerHTML=`
      <div class="ct-title">Наборный груз</div>
      <div class="ct-hint">Перетащите диски на штангу. Массу узла взвесите на динамометре.</div>
      <div class="ct-workshop">
        <div class="ct-rod-area">
          <lab-composite-weight kind="composite" data-eq="composite-load" discs=""></lab-composite-weight>
        </div>
        <div class="ct-disc-tray" aria-label="Лоток дисков">
          ${Xt.map(t=>`
            <div class="ct-disc-slot" data-disc-mass="${t}" data-state="available">
              <lab-composite-weight kind="disc" mass="${t}" data-eq="disc-${t}"></lab-composite-weight>
              <span class="ct-disc-slot-placeholder" aria-hidden="true">Надет</span>
            </div>`).join("")}
        </div>
      </div>
      <div class="ct-status" role="status" aria-live="polite">В комплекте</div>
    `,this.#t=this.querySelector('lab-composite-weight[kind="composite"]'),this.#s=this.querySelector(".ct-status");for(const t of Xt){const e=this.querySelector(`lab-composite-weight[kind="disc"][mass="${t}"]`);e&&this.#e.set(t,e)}}#i(){for(const[t,e]of this.#e){const s=e.parentElement;s&&(s.tabIndex=0,s.setAttribute("role","button"),s.setAttribute("aria-label",`Слот диска ${t} г. Enter — переключить.`),s.addEventListener("click",r=>{r.target.closest("lab-composite-weight")&&s.dataset.state!=="used"||s.dataset.state==="used"&&this.removeDisc(t)}),s.addEventListener("keydown",r=>{r.key!=="Enter"&&r.key!==" "||this.#r!=="in-use"&&(r.preventDefault(),this.hasDisc(t)?this.removeDisc(t):this.addDisc(t))}))}}getCompositeEl(){return this.#t}getDiscEls(){return Array.from(this.#e.values())}getCompositeRect(){return this.#t?.getBoundingClientRect()??null}getMass(){return this.#t?.getMass()??10}hasDisc(t){return this.#t?.discs.includes(t)??!1}addDisc(t,e){if(!this.#t||this.hasDisc(t))return!1;const s=[...this.#t.discs,t];return this.#t.setDiscs(s),this.#a(t,"used"),e&&this.#n(t,e),this.dispatchEvent(new CustomEvent("composite:disc-toggled",{bubbles:!0,composed:!0,detail:{mass:t,action:"added",total:this.#t.getMass()}})),!0}removeDisc(t){if(!this.#t||!this.hasDisc(t))return!1;const e=this.#t.discs.filter(s=>s!==t);return this.#t.setDiscs(e),this.#a(t,"available"),this.dispatchEvent(new CustomEvent("composite:disc-toggled",{bubbles:!0,composed:!0,detail:{mass:t,action:"removed",total:this.#t.getMass()}})),!0}reset(){if(this.#t){this.#t.setDiscs([]);for(const t of Xt)this.#a(t,"available");this.setStatus("available")}}setStatus(t){this.#r=t,this.dataset.status=t,this.#s&&(this.#s.textContent=t==="in-use"?"На установке":"В комплекте")}#a(t,e){const s=this.querySelector(`.ct-disc-slot[data-disc-mass="${t}"]`);s&&(s.dataset.state=e)}#n(t,e){const s=this.querySelector(`.ct-disc-slot[data-disc-mass="${t}"]`);if(!s)return;e.style.position="",e.style.left="",e.style.top="",e.style.zIndex="",e.style.transform="",e.style.marginTop="",e.removeAttribute("dragging"),e.removeAttribute("attached"),e.removeAttribute("data-slot-target");const r=s.querySelector(".ct-disc-slot-placeholder");s.insertBefore(e,r)}}customElements.define("lab-composite-tray",vs);const bt=160,P=84,C=18,q=18,T=132,X=52,Q=bt-8,N=q+X/2,R=5,Me=document.createElement("template");Me.innerHTML=`
<style>
  :host {
    --block-w: ${bt}px;
    --block-h: ${P}px;
    display: inline-block;
    width: var(--block-w);
    height: var(--block-h);
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  :host([interactive]:not([attached])) {
    cursor: grab;
  }

  :host([dragging]) {
    cursor: grabbing;
  }

  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 4 3;
    opacity: 0;
  }

  :host(:focus-visible) {
    outline: none;
  }

  :host(:focus-visible) .focus-ring {
    opacity: 1;
  }
</style>
<svg viewBox="0 0 ${bt} ${P}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Светло-древесный градиент (берёза) с лёгкой текстурой -->
    <linearGradient id="wood-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-wood, #e8dcb8)" />
      <stop offset="50%" stop-color="var(--equip-wood, #e8dcb8)" />
      <stop offset="100%" stop-color="var(--equip-wood-dark, #c8b888)" />
    </linearGradient>

    <linearGradient id="wood-side" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--equip-wood-edge, #8d7e58)" />
      <stop offset="50%" stop-color="var(--equip-wood, #e8dcb8)" />
      <stop offset="100%" stop-color="var(--equip-wood-edge, #8d7e58)" />
    </linearGradient>

    <!-- Хром-крючок -->
    <linearGradient id="block-hook" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="var(--equip-metal-shadow, #4a5260)" />
      <stop offset="40%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="60%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="100%" stop-color="var(--equip-metal-shadow, #4a5260)" />
    </linearGradient>

    <!-- Узор «древесных волокон» — горизонтальные тонкие линии -->
    <pattern id="wood-grain" width="40" height="6" patternUnits="userSpaceOnUse">
      <line x1="0" y1="3" x2="40" y2="3" stroke="var(--equip-wood-edge, #8d7e58)" stroke-width="0.4" opacity="0.35" />
      <line x1="0" y1="5.5" x2="40" y2="5.5" stroke="var(--equip-wood-edge, #8d7e58)" stroke-width="0.25" opacity="0.18" />
    </pattern>

    <filter id="block-shadow" x="-15%" y="-10%" width="130%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Тень-«опора» под бруском (если он стоит на поверхности) -->
  <ellipse class="block-floor-shadow" cx="${C+T/2}" cy="${q+X+6}"
           rx="${T/2}" ry="3" fill="rgb(0 0 0 / 0.25)" opacity="0" />

  <!-- КРЮЧОК СПРАВА: планка от корпуса наружу + петля -->
  <g class="hook">
    <!-- Планка от правой грани корпуса до петли -->
    <line x1="${C+T}" y1="${N}" x2="${Q-R}" y2="${N}"
          stroke="url(#block-hook)" stroke-width="2.4" stroke-linecap="round" />
    <!-- Тень петли -->
    <ellipse cx="${Q}" cy="${N+1.5}" rx="${R+.5}" ry="1.2" fill="rgb(0 0 0 / 0.3)" />
    <!-- Внешнее кольцо петли -->
    <circle cx="${Q}" cy="${N}" r="${R}" fill="none"
            stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="2" />
    <!-- Блик на верхней половине -->
    <path d="M ${Q-R+.5} ${N} A ${R-.5} ${R-.5} 0 0 1 ${Q+R-.5} ${N}"
          stroke="var(--equip-metal-shine, #f0f2f5)" stroke-width="1" fill="none" />
  </g>

  <!-- Корпус бруска (с тенью, древесной текстурой и боковой гранью) -->
  <g filter="url(#block-shadow)">
    <!-- Боковая (фасадная) грань — главный плоский прямоугольник -->
    <rect x="${C}" y="${q}" width="${T}" height="${X}"
          rx="2" fill="url(#wood-grad)"
          stroke="var(--equip-wood-edge, #8d7e58)" stroke-width="0.7" />
    <!-- Текстура волокон (overlay) -->
    <rect x="${C}" y="${q}" width="${T}" height="${X}"
          rx="2" fill="url(#wood-grain)" pointer-events="none" />

    <!-- Верхняя грань-площадка (с лёгким перспективным сдвигом для глубины) -->
    <path d="M ${C+4} ${q}
             L ${C+T-4} ${q}
             L ${C+T} ${q-5}
             L ${C} ${q-5} Z"
          fill="var(--equip-wood, #e8dcb8)"
          stroke="var(--equip-wood-edge, #8d7e58)" stroke-width="0.7" />
    <!-- Тонкая тень-канавка между «верхом» и «фасадом» -->
    <line x1="${C+1}" y1="${q+.2}" x2="${C+T-1}" y2="${q+.2}"
          stroke="var(--equip-wood-edge, #8d7e58)" stroke-width="0.4" opacity="0.5" />
  </g>

  <!-- Подпись «?» на боковой грани (масса НЕИЗВЕСТНА — ученик измеряет динамометром).
       На карточках в правой панели подпись скрыта (через CSS), а на сцене — видна как «?». -->
  <text x="${C+T/2}" y="${q+X/2+4}"
        text-anchor="middle"
        font-family="var(--font-display, sans-serif)"
        font-size="14" font-weight="800"
        fill="var(--equip-wood-edge, #8d7e58)"
        opacity="0.6">
    <tspan class="mass-label">m = ?</tspan>
  </text>

  <!-- Focus-ring -->
  <rect class="focus-ring" x="2" y="2" width="${bt-4}" height="${P-4}" rx="6" />
</svg>
`;class ws extends HTMLElement{static observedAttributes=["mass","interactive","on-surface"];#t;#e;#s;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(Me.content.cloneNode(!0)),this.#e=this.#t.querySelector(".mass-label"),this.#s=this.#t.querySelector(".block-floor-shadow"),this.#o()}connectedCallback(){this.tabIndex<0&&this.hasAttribute("interactive")&&(this.tabIndex=0)}attributeChangedCallback(t){t==="mass"&&this.#o(),t==="interactive"&&(this.tabIndex=this.hasAttribute("interactive")?0:-1),t==="on-surface"&&this.#s.setAttribute("opacity",this.hasAttribute("on-surface")?"1":"0")}get mass(){return Number(this.getAttribute("mass")??50)}getHookPosition(){return this.#r(Q,N)}getTopCenterPosition(){return this.#r(C+T/2,q-2)}getBlockHeightHost(){const t=this.getBoundingClientRect();return X/P*t.height}getVisualBottomY(){const t=this.getBoundingClientRect();return(q+X)/P*t.height}getVisualTopY(){const t=this.getBoundingClientRect();return(q-5)/P*t.height}getLeftEdgeX(){return this.#r(C,0).x}getRightEdgeX(){return this.#r(C+T,0).x}#r(t,e){const s=this.getBoundingClientRect();return{x:t/bt*s.width,y:e/P*s.height}}#o(){this.#e.textContent="m = ?",this.setAttribute("aria-label","Деревянный брусок неизвестной массы с крючком справа. Используется в опытах по трению.")}}customElements.define("lab-block",ws);const mt=720,ie=120,g=30,S=660,y=50,ht=28,U=y+ht,pt=22,nt=18,ge=g+20,be=g+S-20-pt,W=30,me=14,_e=document.createElement("template");_e.innerHTML=`
<style>
  :host {
    --track-w: ${mt}px;
    --track-h: ${ie}px;
    display: inline-block;
    width: var(--track-w);
    height: var(--track-h);
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .surface-A,
  .surface-B {
    transition: opacity 250ms ease-out;
  }

  :host([surface='A']) .surface-B,
  :host([surface='B']) .surface-A,
  :host(:not([surface])) .surface-B {
    opacity: 0;
    pointer-events: none;
  }

  :host([surface='B']) .clamps {
    opacity: 1;
  }

  .clamps {
    opacity: 0;
    transition: opacity 250ms ease-out;
  }
</style>
<svg viewBox="0 0 ${mt} ${ie}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Поверхность А: светлое дерево с мелкими волокнами -->
    <linearGradient id="surface-a-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e2c094" />
      <stop offset="50%" stop-color="#d2a87a" />
      <stop offset="100%" stop-color="#a07c50" />
    </linearGradient>
    <pattern id="surface-a-pattern" width="60" height="6" patternUnits="userSpaceOnUse">
      <line x1="0" y1="2" x2="60" y2="2" stroke="#8d6a40" stroke-width="0.4" opacity="0.4" />
      <line x1="0" y1="5" x2="60" y2="5" stroke="#8d6a40" stroke-width="0.25" opacity="0.25" />
    </pattern>

    <!-- Поверхность Б: тёмная ткань (диагональная штриховка) -->
    <linearGradient id="surface-b-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7a6450" />
      <stop offset="50%" stop-color="#5d4a3a" />
      <stop offset="100%" stop-color="#3d2f25" />
    </linearGradient>
    <pattern id="surface-b-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
      <path d="M -1 1 L 7 9 M -1 -5 L 7 3" stroke="#a09080" stroke-width="0.5" opacity="0.45" />
    </pattern>

    <!-- Ножки опоры — тёмный пластик/металл -->
    <linearGradient id="foot-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a3d44" />
      <stop offset="100%" stop-color="#1a1b1f" />
    </linearGradient>

    <!-- Канцелярский зажим — металлический серебристый -->
    <linearGradient id="clamp-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#dde2e8" />
      <stop offset="50%" stop-color="#a8afb8" />
      <stop offset="100%" stop-color="#6e7682" />
    </linearGradient>

    <filter id="track-shadow" x="-5%" y="-20%" width="110%" height="170%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- НОЖКИ-ОПОРЫ (рисуются ПЕРВЫМИ, под направляющей) -->
  <g class="feet">
    <rect x="${ge}" y="${U}" width="${pt}" height="${nt}"
          fill="url(#foot-grad)" rx="2" />
    <rect x="${be}" y="${U}" width="${pt}" height="${nt}"
          fill="url(#foot-grad)" rx="2" />
    <!-- Хром-канты ножек -->
    <rect x="${ge}" y="${U+nt-1.5}" width="${pt}" height="1.5"
          fill="#6e7682" />
    <rect x="${be}" y="${U+nt-1.5}" width="${pt}" height="1.5"
          fill="#6e7682" />
  </g>

  <!-- НАПРАВЛЯЮЩАЯ (всегда есть деревянная база — поверхность А) -->
  <g class="surface-A" filter="url(#track-shadow)">
    <rect x="${g}" y="${y}" width="${S}" height="${ht}"
          fill="url(#surface-a-grad)" rx="1.5"
          stroke="#7a5a30" stroke-width="0.7" />
    <!-- Волокна -->
    <rect x="${g}" y="${y}" width="${S}" height="${ht}"
          fill="url(#surface-a-pattern)" rx="1.5" pointer-events="none" />
    <!-- Боковая грань (немного темнее снизу — даёт глубину) -->
    <rect x="${g}" y="${U-4}" width="${S}" height="4"
          fill="rgb(0 0 0 / 0.18)" rx="1.5" />
  </g>

  <!-- ПОВЕРХНОСТЬ Б (гибкая полоса — рисуется поверх А, видна только при surface=B) -->
  <g class="surface-B">
    <rect x="${g+4}" y="${y-3}"
          width="${S-8}" height="${ht-4}"
          fill="url(#surface-b-grad)" rx="1.5" />
    <rect x="${g+4}" y="${y-3}"
          width="${S-8}" height="${ht-4}"
          fill="url(#surface-b-pattern)" rx="1.5" pointer-events="none" />
  </g>

  <!-- ЗАЖИМЫ канцелярские (видны только при surface=B) -->
  <g class="clamps">
    <!-- Левый зажим -->
    <rect x="${g-2}" y="${y-6}"
          width="${W}" height="${me}" rx="2"
          fill="url(#clamp-grad)" stroke="#4a5260" stroke-width="0.6" />
    <!-- "Усики" зажима -->
    <line x1="${g+4}" y1="${y-8}" x2="${g+4}" y2="${y-14}"
          stroke="#6e7682" stroke-width="1.2" stroke-linecap="round" />
    <line x1="${g+18}" y1="${y-8}" x2="${g+18}" y2="${y-14}"
          stroke="#6e7682" stroke-width="1.2" stroke-linecap="round" />

    <!-- Правый зажим -->
    <rect x="${g+S-W+2}" y="${y-6}"
          width="${W}" height="${me}" rx="2"
          fill="url(#clamp-grad)" stroke="#4a5260" stroke-width="0.6" />
    <line x1="${g+S-W+8}" y1="${y-8}"
          x2="${g+S-W+8}" y2="${y-14}"
          stroke="#6e7682" stroke-width="1.2" stroke-linecap="round" />
    <line x1="${g+S-W+22}" y1="${y-8}"
          x2="${g+S-W+22}" y2="${y-14}"
          stroke="#6e7682" stroke-width="1.2" stroke-linecap="round" />
  </g>

  <!-- Шкала-линейка снизу направляющей (мм деления, для оценки расстояния) -->
  <g class="ruler" font-family="var(--font-mono, monospace)" font-size="6" fill="#5d6e8a">
    ${(()=>{const n=[],t=U+nt+8;n.push(`<line x1="${g}" y1="${t}" x2="${g+S}" y2="${t}" stroke="#5d6e8a" stroke-width="0.5" />`);for(let e=0;e<=500;e+=50){const s=g+e/500*S,r=e%100===0?5:3;n.push(`<line x1="${s}" y1="${t}" x2="${s}" y2="${t+r}" stroke="#5d6e8a" stroke-width="0.6" />`),e%100===0&&n.push(`<text x="${s}" y="${t+r+6}" text-anchor="middle">${e}</text>`)}return n.join(`
`)})()}
  </g>
</svg>
`;class ks extends HTMLElement{static observedAttributes=["surface","length-mm"];#t;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(_e.content.cloneNode(!0)),this.hasAttribute("surface")||this.setAttribute("surface","A"),this.#e()}attributeChangedCallback(t,e,s){t==="surface"&&e!==s&&s!==null&&(this.#e(),this.dispatchEvent(new CustomEvent("surface-change",{detail:{surfaceId:s},bubbles:!0,composed:!0})))}get surfaceId(){return this.getAttribute("surface")==="B"?"B":"A"}set surfaceId(t){this.setAttribute("surface",t)}getTopSurfaceY(){const t=this.getBoundingClientRect();return(this.surfaceId==="B"?y-3:y)/ie*t.height}getBounds(){const t=this.getBoundingClientRect();return{left:g/mt*t.width,right:(g+S)/mt*t.width}}hostPxToMm(t){const e=this.getBoundingClientRect(),s=S/mt*e.width;return t/s*500}#e(){const t=this.surfaceId;this.setAttribute("aria-label",t==="A"?"Направляющая — деревянная поверхность А, длина 500 миллиметров.":"Направляющая с гибкой полосой — поверхность Б, тканевая накладка, длина 500 миллиметров.")}}customElements.define("lab-friction-track",ks);const Ht=280,Mt=92,B=30,et=220,j=18,yt=40,Ot=B+8,ae=et-16,E=j+6,ut=yt-12,_t=Ot+6,$s=Ot+ae-6,jt=$s-_t,J=B-12,L=j+yt/2,F=5,ft=B+et+12,gt=22,Kt=28,Z=64,ye=13,lt=B+et-Z-4,Ct=j+yt+2,Oe=document.createElement("template");Oe.innerHTML=`
<style>
  :host {
    --dyno-w: ${Ht}px;
    --dyno-h: ${Mt}px;
    display: inline-block;
    width: var(--dyno-w);
    height: var(--dyno-h);
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .pull-handle {
    cursor: ew-resize;
    pointer-events: all;
  }

  :host(:not([interactive])) .pull-handle {
    cursor: default;
    pointer-events: none;
  }

  :host([dragging-pull]) .pull-handle {
    cursor: grabbing;
  }

  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 4 3;
    opacity: 0;
  }

  :host(:focus-visible) {
    outline: none;
  }

  :host(:focus-visible) .focus-ring {
    opacity: 1;
  }
</style>
<svg viewBox="0 0 ${Ht} ${Mt}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Жёлтый корпус (как реальный динамометр в комплекте ФИПИ) -->
    <linearGradient id="dynoH-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-dyno-body, #f5c842)" />
      <stop offset="50%" stop-color="var(--equip-dyno-body, #f5c842)" />
      <stop offset="100%" stop-color="var(--equip-dyno-body-dark, #c89c1f)" />
    </linearGradient>

    <!-- Прозрачное окно для шкалы -->
    <linearGradient id="dynoH-window" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgb(255 255 255 / 0.85)" />
      <stop offset="100%" stop-color="rgb(220 235 255 / 0.7)" />
    </linearGradient>

    <!-- Хром -->
    <linearGradient id="dynoH-chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-metal-shadow, #4a5260)" />
      <stop offset="40%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="60%" stop-color="var(--equip-metal-shine, #f0f2f5)" />
      <stop offset="100%" stop-color="var(--equip-metal-shadow, #4a5260)" />
    </linearGradient>

    <filter id="dynoH-shadow" x="-5%" y="-30%" width="115%" height="180%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- РУЧКА справа (за неё тянет ученик ВПРАВО) -->
  <g class="pull-handle">
    <!-- Ось от корпуса к ручке -->
    <line x1="${B+et}" y1="${L}" x2="${ft}" y2="${L}"
          stroke="url(#dynoH-chrome)" stroke-width="3" stroke-linecap="round" />
    <!-- Сама петля-ручка (с правой стороны) -->
    <ellipse cx="${ft+gt/2}" cy="${L}"
             rx="${gt/2}" ry="${Kt/2}"
             fill="none" stroke="url(#dynoH-chrome)" stroke-width="3" />
    <!-- Шарик-«указатель» в центре петли (для grab) -->
    <circle cx="${ft+gt/2}" cy="${L}" r="4"
            fill="var(--equip-metal-shine, #f0f2f5)" stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="0.6" />
    <!-- Прозрачная хитзона для удобного захвата мышью -->
    <rect x="${ft-4}" y="${L-Kt/2-4}"
          width="${gt+8}" height="${Kt+8}"
          fill="transparent" />
  </g>

  <!-- КОРПУС с тенью -->
  <g filter="url(#dynoH-shadow)">
    <rect x="${B}" y="${j}" width="${et}" height="${yt}"
          rx="6" fill="url(#dynoH-body)"
          stroke="var(--equip-dyno-body-edge, #8a6a14)" stroke-width="0.7" />
    <!-- Прозрачное окно для шкалы -->
    <rect x="${Ot}" y="${E}" width="${ae}" height="${ut}"
          rx="2" fill="url(#dynoH-window)"
          stroke="var(--equip-dyno-body-edge, #8a6a14)" stroke-width="0.5" />
  </g>

  <!-- ШКАЛА: вертикальные деления (major/mid/minor), цифры под major -->
  <g class="scale" font-family="var(--font-mono, monospace)" font-size="6.5"
     fill="#14233a" text-anchor="middle"></g>

  <!-- HOVER-индикатор: вертикальная пунктирная линия + бейдж со значением (стандарт REFERENCE.md). -->
  <g class="hover-group" style="opacity:0; pointer-events:none">
    <line class="hover-tick" x1="0" y1="${E-1}" x2="0" y2="${E+ut+1}"
          stroke="var(--color-brand-orange, #ffbe0b)" stroke-width="0.9"
          stroke-dasharray="2 1.5" />
    <rect class="hover-bg" x="-15" y="${E-12}" width="30" height="9" rx="1.5"
          fill="var(--color-brand-orange, #ffbe0b)" />
    <text class="hover-text" x="0" y="${E-5.5}"
          font-family="var(--font-mono, monospace)" font-size="6"
          font-weight="800" fill="#1a1b1f" text-anchor="middle">0.00</text>
  </g>

  <!-- Невидимая интерактивная зона над окном — для hover. -->
  <rect class="scale-area" x="${Ot}" y="${E}"
        width="${ae}" height="${ut}" fill="transparent" />

  <!-- Маркер «Н» (единицы) справа на корпусе -->
  <text x="${B+et-8}" y="${j+12}"
        text-anchor="end"
        font-family="var(--font-display, sans-serif)" font-size="8"
        font-weight="700" fill="var(--equip-dyno-body-dark, #c89c1f)"
        class="unit-label">Н</text>

  <!-- Бренд ЛАБОСФЕРА -->
  <text x="${B+6}" y="${j+12}"
        text-anchor="start"
        font-family="var(--font-display, sans-serif)" font-size="6.5"
        font-weight="700" fill="var(--equip-dyno-body-dark, #c89c1f)"
        letter-spacing="0.06em">ЛАБОСФЕРА</text>

  <!-- ВЕРТИКАЛЬНАЯ КРАСНАЯ РИСКА-УКАЗАТЕЛЬ (двигается по горизонтали в зависимости от force) -->
  <g class="pointer">
    <line x1="0" y1="${E-1}" x2="0" y2="${E+ut+1}"
          stroke="var(--equip-pointer, #e63946)" stroke-width="2.4" stroke-linecap="round" />
    <!-- Треугольный носик сверху -->
    <polygon points="0,${E-5} -3,${E-1} 3,${E-1}"
             fill="var(--equip-pointer, #e63946)" />
  </g>

  <!-- КРЮК слева (туда крепится нитка к крючку бруска) -->
  <g class="hook-left">
    <!-- Ось от петли к корпусу -->
    <line x1="${J+F}" y1="${L}" x2="${B}" y2="${L}"
          stroke="url(#dynoH-chrome)" stroke-width="2.4" stroke-linecap="round" />
    <!-- Тень петли -->
    <ellipse cx="${J}" cy="${L+1.5}" rx="${F+.5}" ry="1.2" fill="rgb(0 0 0 / 0.3)" />
    <!-- Внешнее кольцо петли -->
    <circle cx="${J}" cy="${L}" r="${F}" fill="none"
            stroke="var(--equip-metal-shadow, #4a5260)" stroke-width="2" />
    <!-- Блик -->
    <path d="M ${J-F+.5} ${L} A ${F-.5} ${F-.5} 0 0 1 ${J+F-.5} ${L}"
          stroke="var(--equip-metal-shine, #f0f2f5)" stroke-width="1" fill="none" />
  </g>

  <!-- LCD-плашка с цифровым показанием. Чёрный фон + янтарные моноширинные цифры
       (как у настоящих демо-приборов Vernier/PASCO). Ученик одновременно видит и
       аналоговую шкалу, и точное число. -->
  <g class="readout">
    <!-- Маленькая «ножка» от корпуса к плашке (визуально соединяет) -->
    <line x1="${lt+Z/2}" y1="${j+yt}"
          x2="${lt+Z/2}" y2="${Ct}"
          stroke="var(--equip-dyno-body-edge, #8a6a14)" stroke-width="0.6" />
    <!-- Корпус LCD-плашки -->
    <rect x="${lt}" y="${Ct}" width="${Z}" height="${ye}"
          rx="1.5" fill="#0a0e16"
          stroke="var(--equip-dyno-body-edge, #8a6a14)" stroke-width="0.5" />
    <!-- Лёгкое глянцевое отражение по верху -->
    <rect x="${lt+1}" y="${Ct+1}" width="${Z-2}" height="3"
          rx="1" fill="rgb(255 255 255 / 0.05)" />
    <!-- Цифры -->
    <text class="readout-text"
          x="${lt+Z-4}" y="${Ct+ye-3}"
          text-anchor="end"
          font-family="var(--font-mono, monospace)" font-size="8.5"
          font-weight="800" letter-spacing="0.05em"
          fill="var(--color-brand-orange, #ffbe0b)">0,00 Н</text>
  </g>

  <!-- Focus-ring -->
  <rect class="focus-ring" x="2" y="2" width="${Ht-4}" height="${Mt-4}" rx="6" />
</svg>
`;class Ss extends HTMLElement{static observedAttributes=["range","force","interactive"];#t;#e;#s;#r;#o;#i;#a;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(Oe.content.cloneNode(!0)),this.#e=this.#t.querySelector(".scale"),this.#s=this.#t.querySelector(".pointer"),this.#r=this.#t.querySelector(".scale-area"),this.#o=this.#t.querySelector(".hover-group"),this.#i=this.#t.querySelector(".hover-text"),this.#a=this.#t.querySelector(".readout-text"),this.#c(),this.#h(),this.#u(),this.#r.addEventListener("pointermove",this.#n),this.#r.addEventListener("pointerleave",this.#l)}#n=t=>{const e=this.#r.getBoundingClientRect(),s=t.clientX-e.left,r=Math.max(0,Math.min(1,s/e.width)),a=r*this.range,o=_t+r*jt;this.#o.setAttribute("transform",`translate(${o} 0)`),this.#i.textContent=this.range===1?a.toFixed(2):a.toFixed(1),this.#o.style.opacity="1"};#l=()=>{this.#o.style.opacity="0"};connectedCallback(){this.tabIndex<0&&this.hasAttribute("interactive")&&(this.tabIndex=0),this.#g()}attributeChangedCallback(t){t==="range"&&(this.#c(),this.#h(),this.#u(),this.#g()),t==="force"&&(this.#h(),this.#u()),t==="interactive"&&(this.tabIndex=this.hasAttribute("interactive")?0:-1)}get range(){return this.getAttribute("range")==="1"?1:5}get force(){return Number(this.getAttribute("force")??0)}getHookPosition(){return this.#d(J,L)}getHandlePosition(){return this.#d(ft+gt/2,L)}#d(t,e){const s=this.getBoundingClientRect();return{x:t/Ht*s.width,y:e/Mt*s.height}}#c(){const t=this.range,e=t===1?.02:.1,s=t===1?5:10,r=t===1?0:5,a=Math.round(t/e),o="http://www.w3.org/2000/svg";for(;this.#e.firstChild;)this.#e.removeChild(this.#e.firstChild);for(let i=0;i<=a;i++){const l=i*e,c=_t+i/a*jt,d=i%s===0,v=!d&&r>0&&i%r===0,k=d?7:v?5:3,p=d?"0.9":v?"0.6":"0.4",b=d?"#0f2747":"#1f3a5c",h=document.createElementNS(o,"line");if(h.setAttribute("x1",String(c)),h.setAttribute("y1",String(E)),h.setAttribute("x2",String(c)),h.setAttribute("y2",String(E+k)),h.setAttribute("stroke",b),h.setAttribute("stroke-width",p),this.#e.appendChild(h),d){const f=document.createElementNS(o,"text");f.setAttribute("x",String(c)),f.setAttribute("y",String(E+ut-2)),f.setAttribute("font-weight","700");let w;t===1?Math.abs(l)<1e-9?w="0":Math.abs(l-1)<1e-9?w="1":w=l.toFixed(1):w=String(Math.round(l)),f.textContent=w,this.#e.appendChild(f)}}}#h(){const t=this.range,e=Math.max(0,Math.min(t,this.force)),s=_t+e/t*jt;this.#s.setAttribute("transform",`translate(${s} 0)`)}#u(){const t=this.range,e=Math.max(0,Math.min(t,this.force)),s=t===1?2:1,r=e.toFixed(s).replace(".",",");this.#a.textContent=`${r} Н`}#g(){this.setAttribute("aria-label",`Динамометр горизонтальный, предел измерения ${this.range} ньютон. Тяните за петлю слева, чтобы приложить силу.`)}}customElements.define("lab-dynamometer-h",Ss);const z=64,Ut=28,xe=4,ct=z-8,dt=4,Et=18,Ge=document.createElement("template");Ge.innerHTML=`
<style>
  :host {
    --weight-w: ${z}px;
    --weight-h: ${Ut}px;
    display: inline-block;
    width: var(--weight-w);
    height: var(--weight-h);
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  :host([interactive]:not([attached])) {
    cursor: grab;
  }

  :host([dragging]) {
    cursor: grabbing;
  }
</style>
<svg viewBox="0 0 ${z} ${Ut}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Хром-цилиндр (вид сбоку): тёмный сверху и снизу, светлый в центре -->
    <linearGradient id="flatw-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-weight-edge, #4a5260)" />
      <stop offset="20%" stop-color="var(--equip-weight-dark, #6e7682)" />
      <stop offset="50%" stop-color="var(--equip-weight-light, #d6dce4)" />
      <stop offset="80%" stop-color="var(--equip-weight, #a8afb8)" />
      <stop offset="100%" stop-color="var(--equip-weight-edge, #4a5260)" />
    </linearGradient>

    <!-- Эллиптическая «крышка» сверху (создаёт ощущение цилиндра) -->
    <linearGradient id="flatw-top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--equip-weight-light, #d6dce4)" />
      <stop offset="100%" stop-color="var(--equip-weight, #a8afb8)" />
    </linearGradient>

    <filter id="flatw-shadow" x="-10%" y="-10%" width="120%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Тень-«опора» под грузом (если он лежит) -->
  <ellipse class="floor-shadow" cx="${z/2}" cy="${Ut-1}"
           rx="${ct/2-2}" ry="1.5" fill="rgb(0 0 0 / 0.35)" />

  <!-- Корпус-цилиндр (прямоугольник + овальная крышка сверху) -->
  <g filter="url(#flatw-shadow)">
    <rect x="${xe}" y="${dt+2}" width="${ct}" height="${Et-2}"
          fill="url(#flatw-body)"
          stroke="var(--equip-weight-edge, #4a5260)" stroke-width="0.6" />
    <!-- Эллиптическая крышка сверху (создаёт перспективу) -->
    <ellipse cx="${z/2}" cy="${dt+2}"
             rx="${ct/2}" ry="2.5"
             fill="url(#flatw-top)"
             stroke="var(--equip-weight-edge, #4a5260)" stroke-width="0.6" />
    <!-- Эллиптический низ (повторяет верх для симметрии) -->
    <ellipse cx="${z/2}" cy="${dt+Et}"
             rx="${ct/2}" ry="2"
             fill="var(--equip-weight-dark, #6e7682)" />
  </g>

  <!-- Наклейка с массой (белая бумажная) -->
  <rect x="${xe+6}" y="${dt+5}"
        width="${ct-12}" height="${Et-9}"
        rx="1.5"
        fill="var(--equip-weight-label-bg, #f8f8f4)"
        stroke="var(--equip-weight-edge, #4a5260)" stroke-width="0.3" />
  <text x="${z/2}" y="${dt+Et/2+2}"
        text-anchor="middle"
        font-family="var(--font-display, sans-serif)"
        font-size="9" font-weight="700"
        fill="var(--equip-weight-label-text, #1a1b1f)"
        class="mass-label">100 г</text>
</svg>
`;class As extends HTMLElement{static observedAttributes=["mass","interactive","number"];#t;#e;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(Ge.content.cloneNode(!0)),this.#e=this.#t.querySelector(".mass-label"),this.#s()}connectedCallback(){this.tabIndex<0&&this.hasAttribute("interactive")&&(this.tabIndex=0)}attributeChangedCallback(t){(t==="mass"||t==="number")&&this.#s(),t==="interactive"&&(this.tabIndex=this.hasAttribute("interactive")?0:-1)}get mass(){return Number(this.getAttribute("mass")??100)}get number(){return this.getAttribute("number")}#s(){this.number!==null?(this.#e.textContent=this.number,this.setAttribute("aria-label",`Плоский груз №${this.number} для бруска. Массу взвесьте на динамометре.`)):(this.#e.textContent="",this.setAttribute("aria-label","Плоский груз, кладётся на брусок."))}}customElements.define("lab-flat-weight",As);const Ie={spring:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M16 4 L16 7" />
      <path d="M10 9 L22 11 L10 13 L22 15 L10 17 L22 19 L10 21 L22 23" />
      <path d="M16 25 L16 28" />
    </svg>`,force:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 16 L26 16" />
      <path d="M21 11 L26 16 L21 21" />
      <circle cx="6" cy="16" r="2" fill="currentColor" />
    </svg>`,friction:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="8" y="11" width="12" height="8" rx="1" />
      <line x1="4" y1="22" x2="28" y2="22" />
      <line x1="4" y1="22" x2="6" y2="25" />
      <line x1="9" y1="22" x2="11" y2="25" />
      <line x1="14" y1="22" x2="16" y2="25" />
      <line x1="19" y1="22" x2="21" y2="25" />
      <line x1="24" y1="22" x2="26" y2="25" />
      <path d="M20 15 L26 15" />
      <path d="M24 12 L26 15 L24 18" />
    </svg>`,work:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <!-- Оси F (вертикаль) и Δl (горизонталь) -->
      <path d="M6 26 L6 6" />
      <path d="M6 26 L28 26" />
      <!-- Прямая F = k·Δl -->
      <path d="M6 26 L24 8" />
      <!-- Закрашенный треугольник (площадь = работа) -->
      <path d="M6 26 L24 26 L24 8 Z" fill="currentColor" fill-opacity="0.32" stroke="none" />
      <!-- Метка W -->
      <text x="13" y="22" font-size="9" font-weight="700" fill="currentColor" stroke="none"
            font-family="ui-sans-serif, system-ui">W</text>
    </svg>`,home:`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 12 L12 3 L21 12" />
      <path d="M5 10 L5 21 L19 21 L19 10" />
    </svg>`},De=document.createElement("template");De.innerHTML=`
<style>
  :host {
    display: block;
    position: relative;
    width: 100%;
    background: var(--color-surface-elevated, #1a1f2e);
    border-top: 1px solid var(--color-border, rgb(255 255 255 / 0.08));
    box-shadow: 0 -4px 16px rgb(0 0 0 / 0.25);
    z-index: 100;
    /* Безопасная зона для устройств с notch / home-indicator */
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 5px 14px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .screens {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .screens::-webkit-scrollbar { height: 3px; }
  .screens::-webkit-scrollbar-thumb {
    background: rgb(255 255 255 / 0.15);
    border-radius: 2px;
  }

  button {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    border: 1.5px solid transparent;
    border-radius: 10px;
    padding: 3px 10px 4px;
    cursor: pointer;
    color: var(--color-text-secondary, #a8b3c7);
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 10px;
    font-weight: 600;
    line-height: 1.1;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    min-width: 68px;
    min-height: 44px;
    transition:
      background-color var(--dur-fast, 160ms) var(--ease-out, ease-out),
      color var(--dur-fast, 160ms) var(--ease-out, ease-out),
      border-color var(--dur-fast, 160ms) var(--ease-out, ease-out);
  }

  button:hover {
    background: rgb(255 255 255 / 0.04);
    color: var(--color-text-primary, #e8eef9);
  }

  button:focus-visible {
    outline: none;
    border-color: var(--color-brand-orange, #ffbe0b);
  }

  button[aria-current='true'] {
    background: var(--color-brand-teal-50, rgb(20 184 166 / 0.16));
    color: var(--color-brand-teal, #14b8a6);
  }

  button[aria-current='true'] svg { stroke: var(--color-brand-teal, #14b8a6); }

  button .icon-wrap {
    display: inline-flex;
    width: 22px;
    height: 22px;
    align-items: center;
    justify-content: center;
  }

  button svg {
    width: 20px;
    height: 20px;
  }

  button .kicker {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.03em;
    color: var(--color-brand-orange, #ffbe0b);
    margin-bottom: -1px;
    line-height: 1;
  }

  button[aria-current='true'] .kicker {
    color: var(--color-brand-teal, #14b8a6);
  }

  button .label {
    font-size: 10px;
    text-align: center;
    max-width: 80px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.1;
  }

  .home-btn {
    flex-shrink: 0;
    border-left: 1px solid var(--color-border, rgb(255 255 255 / 0.08));
    margin-left: 4px;
    padding-left: 12px;
    min-width: 56px;
  }

  .home-btn .kicker { display: none; }

  @media (max-width: 720px) {
    button .label { display: none; }
    button { min-width: 50px; padding: 4px 6px; }
  }
</style>

<nav class="nav" role="tablist" aria-label="Опыты комплекта">
  <div class="screens" role="presentation"></div>
  <button class="home-btn" type="button" data-action="home" aria-label="К списку комплектов" title="К списку комплектов">
    <span class="icon-wrap">${Ie.home}</span>
    <span class="label">К комплектам</span>
  </button>
</nav>
`;class Cs extends HTMLElement{static observedAttributes=["active"];#t;#e;#s=[];constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(De.content.cloneNode(!0)),this.#e=this.#t.querySelector(".screens"),this.#t.addEventListener("click",this.#o)}attributeChangedCallback(t){t==="active"&&this.#r()}setScreens(t){this.#e.replaceChildren(),this.#s=t.map(e=>{const s=document.createElement("button");return s.type="button",s.dataset.screenId=e.id,s.setAttribute("role","tab"),s.setAttribute("aria-controls","screen-content"),s.title=e.tooltip,s.innerHTML=`
        <span class="kicker">${e.kicker}</span>
        <span class="icon-wrap">${Ie[e.icon]}</span>
        <span class="label">${e.label}</span>
      `,this.#e.appendChild(s),{id:e.id,meta:e,el:s}}),this.#r()}#r(){const t=this.getAttribute("active");for(const e of this.#s){const s=e.id===t;e.el.setAttribute("aria-current",s?"true":"false"),e.el.tabIndex=s?0:-1}}#o=t=>{const e=t.target.closest("button");if(!e)return;if(e.dataset.action==="home"){this.dispatchEvent(new CustomEvent("home-click",{bubbles:!0,composed:!0}));return}const s=e.dataset.screenId;s&&this.dispatchEvent(new CustomEvent("screen-select",{detail:{id:s},bubbles:!0,composed:!0}))}}customElements.define("lab-kit-nav",Cs);const Be=document.createElement("template");Be.innerHTML=`
<style>
  :host {
    display: block;
    width: 100%;
    background: var(--color-surface-elevated, #1a1f2e);
    border-bottom: 1px solid var(--color-border, rgb(255 255 255 / 0.08));
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 16px;
    padding: 10px 24px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .left { text-align: left; }
  .center { text-align: center; }
  .right { text-align: right; }

  .brand {
    font-family: var(--font-display, system-ui, sans-serif);
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 0.08em;
    color: var(--color-brand-teal, #14b8a6);
  }
  .kit-label {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 11px;
    color: var(--color-text-secondary, #a8b3c7);
    letter-spacing: 0.04em;
  }
  .exp-kicker {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 11px;
    color: var(--color-brand-orange, #ffbe0b);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .exp-title {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 17px;
    font-weight: 700;
    color: var(--color-text-primary, #e8eef9);
    margin-top: 2px;
  }
  .spec {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 11px;
    color: var(--color-text-secondary, #a8b3c7);
    letter-spacing: 0.04em;
  }
  @media (max-width: 720px) {
    .left, .right { display: none; }
    .row { grid-template-columns: 1fr; padding: 8px 16px; }
  }
</style>
<div class="row">
  <div class="left">
    <div class="brand">ЛАБОСФЕРА</div>
    <div class="kit-label">Комплект №2 · Силы (механика)</div>
  </div>
  <div class="center">
    <div class="exp-kicker" id="kicker"></div>
    <div class="exp-title" id="title"></div>
  </div>
  <div class="right">
    <div class="spec">ФИПИ ОГЭ-2026</div>
  </div>
</div>
`;class Es extends HTMLElement{static observedAttributes=["experiment","experiment-kicker"];#t;#e;#s;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(Be.content.cloneNode(!0)),this.#e=this.#t.getElementById("title"),this.#s=this.#t.getElementById("kicker")}attributeChangedCallback(){this.#e.textContent=this.getAttribute("experiment")??"",this.#s.textContent=this.getAttribute("experiment-kicker")??""}}customElements.define("lab-kit-header",Es);const Vt="screen";class qs{#t;#e;constructor(t,e){this.#e=new Set(t),this.#t=e,window.addEventListener("popstate",this.#r)}start(){this.#s(this.read())}destroy(){window.removeEventListener("popstate",this.#r)}read(){const e=new URLSearchParams(window.location.search).get(Vt);return e&&this.#e.has(e)?e:null}navigate(t){if(!this.#e.has(t))throw new RangeError(`Router.navigate: неизвестный screenId «${t}»`);const e=new URLSearchParams(window.location.search);if(e.get(Vt)===t)return;e.set(Vt,t);const s=`${window.location.pathname}?${e.toString()}${window.location.hash}`;window.history.replaceState({screen:t},"",s),this.#s(t)}#s(t){this.#t(t)}#r=()=>{this.#s(this.read())}}let Ls=class{#t;#e;#s;#r=null;#o;#i;#a=null;constructor(t,e,s,r){this.#t=t,this.#i=r,this.#e=new Map;for(const o of e)this.#e.set(o.meta.id,o);if(!this.#e.has(s))throw new RangeError(`KitShell: defaultId «${s}» не найден в реестре экранов`);this.#o=s;const a=e.map(o=>o.meta.id);this.#s=new qs(a,o=>{const i=o??this.#o;this.#n(i)})}onScreenChanged(t){this.#a=t}get activeId(){return this.#r}get screens(){return[...this.#e.values()]}start(){window.addEventListener("beforeunload",this.#c),this.#s.start()}navigate(t){this.#s.navigate(t)}destroy(){if(window.removeEventListener("beforeunload",this.#c),this.#s.destroy(),this.#r){const t=this.#e.get(this.#r);t&&(this.#l(t),t.unmount())}this.#r=null}async#n(t){if(this.#r===t)return;const e=this.#e.get(t);if(!e){this.#n(this.#o);return}if(this.#r){const s=this.#e.get(this.#r);if(s){this.#l(s);try{await s.unmount()}catch(r){console.error("KitShell: unmount failed",r)}}}this.#t.replaceChildren();try{await e.mount(this.#t)}catch(s){console.error("KitShell: mount failed",s);return}this.#d(e),this.#r=t,this.#a?.(t)}#l(t){if(typeof t.saveState=="function")try{const e=t.saveState(),s=`${this.#i}:${t.meta.id}`;e==null?localStorage.removeItem(s):localStorage.setItem(s,JSON.stringify(e))}catch(e){console.warn("KitShell: saveState failed",e)}}#d(t){if(typeof t.loadState=="function")try{const e=localStorage.getItem(`${this.#i}:${t.meta.id}`);if(!e)return;const s=JSON.parse(e);t.loadState(s)}catch(e){console.warn("KitShell: loadState failed",e)}}#c=()=>{if(!this.#r)return;const t=this.#e.get(this.#r);t&&this.#l(t)}};const Ts="kit-2-forces:screen";class Hs extends Ls{constructor(t,e,s){super(t,e,s,Ts)}}function qt(n,t){if(n<=0)throw new RangeError(`Жёсткость пружины должна быть > 0, получено: ${n}`);const e=t/100;return .5*n*e*e}function ve(n,t){const e=t/100;return .5*n*e}function we(n,t,e=Ye){const s=n/1e3,r=t/100;return s*e*r}function V(n){return Math.abs(n)<1e-4?"0.0000":n.toFixed(4)}class Ms{meta={id:"spring-work",label:"Работа упругости",kicker:"Опыт 2.4",icon:"work",tooltip:"Измерение работы силы упругости — закон W = k·Δl²/2 и баланс энергии"};#t=null;#e=null;mount(t){if(this.#t)return;this.#e=t,t.innerHTML=Pe,t.dataset.mode="work";const e=t.querySelector(".experiment-eyebrow");e&&(e.textContent="Опыт 2.4");const s=t.querySelector(".experiment-title");s&&(s.textContent="Работа силы упругости");const r=t.querySelector("#hint-bar");r&&(r.textContent="Подвесьте пружину и динамометр. Затем повесьте груз, запишите Δl и l₀ — система посчитает работу W = k·Δl²/2 и сравнит её с работой силы тяжести."),this.#s(t),this.#r(t);const a={stage:t.querySelector("#stage"),standContainer:t.querySelector("#stand-container"),stand:t.querySelector("#stand"),dragOverlay:t.querySelector("#drag-overlay"),dropZoneSpring:t.querySelector("#drop-zone-spring"),dropZoneBottom:t.querySelector("#drop-zone-bottom"),hintBar:t.querySelector("#hint-bar"),journalEmpty:t.querySelector("#journal-empty"),journalTable:t.querySelector("#journal-table"),journalBody:t.querySelector("#journal-body"),liveRegion:t.querySelector("#live-region"),resultPanel:t.querySelector("#result-panel"),graph:t.querySelector("#graph"),recordBtn:t.querySelector("#record-btn"),resetBtn:t.querySelector("#reset-btn"),cards:t.querySelectorAll("lab-equipment-card"),compositeTray:t.querySelector("#composite-tray"),measurementPanel:t.querySelector("#measurement-panel"),measurementToggle:t.querySelector("#measurement-toggle"),measurementCount:t.querySelector("#measurement-count"),steps:t.querySelector("#steps"),overloadBanner:t.querySelector("#overload-banner"),recordForm:t.querySelector("#record-form"),rfL0:t.querySelector("#rf-l0"),rfL1:t.querySelector("#rf-l1"),rfMass:t.querySelector("#rf-mass"),rfCancel:t.querySelector("#rf-cancel"),rfSubmit:t.querySelector("#rf-submit")},o={journal:(i,{journalBody:l})=>{l.replaceChildren(),i.measurements.forEach((c,d)=>{const v=document.createElement("tr"),k=c.extension,p=c.force,b=c.k,h=qt(b,k),f=ve(p,k),w=we(c.totalMass,k);v.innerHTML=`
            <td>${d+1}</td>
            <td>${c.totalMass}</td>
            <td>${k.toFixed(2)}</td>
            <td>${p.toFixed(2)}</td>
            <td>${V(h)}</td>
            <td>${V(f)}</td>
            <td>${V(w)}</td>
          `,l.appendChild(v)})},result:(i,{resultPanel:l})=>{if(i.measurements.length===0||!i.spring){l.innerHTML="",l.setAttribute("hidden","");return}const c=i.measurements[i.measurements.length-1],d=c.k,v=c.extension,k=c.force,p=c.totalMass,b=qt(d,v),h=ve(k,v),f=we(p,v),w=b>0?f/b:0;let ce="";if(i.measurements.length>=2){const Dt=i.measurements[0],Bt=c,Rt=Bt.extension/Dt.extension,Fe=qt(Dt.k,Dt.extension),Ne=qt(Bt.k,Bt.extension)/Fe,ze=Rt*Rt;ce=`
            <p class="result-success" style="margin-top:8px">
              Квадратичный рост: при Δl₂/Δl₁ = ${Rt.toFixed(2)}
              работа выросла в ${Ne.toFixed(2)}× (теория: ${ze.toFixed(2)}×).
            </p>`}l.innerHTML=`
          <h3 class="result-title">Результат (последнее измерение)</h3>
          <div class="result-grid">
            <div class="result-row"><span><em>W</em><sub>упр</sub> через k·Δl²/2</span><strong>${V(b)} Дж</strong></div>
            <div class="result-row"><span><em>W</em><sub>упр</sub> через F·Δl/2</span><strong>${V(h)} Дж</strong></div>
            <div class="result-row"><span><em>A</em><sub>грав</sub> = m·g·Δl</span><strong>${V(f)} Дж</strong></div>
            <div class="result-row"><span>Отношение A<sub>грав</sub> / W<sub>упр</sub></span><strong>${w.toFixed(2)} ≈ 2</strong></div>
          </div>
          <p class="result-success">
            ✓ A<sub>грав</sub> ровно в 2 раза больше W<sub>упр</sub>.
            Половина работы силы тяжести запасается в пружине, половина —
            в кинетической энергии груза при колебаниях (или поглощается
            рукой при медленном опускании). Это закон сохранения энергии.
          </p>
          ${ce}
        `,l.removeAttribute("hidden")}};this.#t=new Xe(a,o),window.springWorkExperiment=this.#t}unmount(){this.#t&&(this.#t.destroy(),this.#t.reset(),delete window.springWorkExperiment,this.#t=null,this.#e&&this.#e.replaceChildren(),this.#e=null)}reset(){this.#t?.reset()}#s(t){const e=t.querySelector("#journal-table thead tr");e&&(e.innerHTML=`
      <th>№</th>
      <th><em>m</em>, г</th>
      <th>Δ<em>l</em>, см</th>
      <th><em>F</em>, Н</th>
      <th><em>W</em> = k·Δl²/2, Дж</th>
      <th><em>W</em> = F·Δl/2, Дж</th>
      <th><em>A</em><sub>грав</sub>, Дж</th>
    `)}#r(t){const e=t.querySelector("#formula-display");e&&(e.innerHTML=`
      <span class="formula-label">Формула</span>
      <span class="formula-expr">
        <em>W</em><sub>упр</sub> = <em>k</em> · Δ<em>l</em>² / 2
        = <em>F</em> · Δ<em>l</em> / 2
      </span>
      <span class="formula-units">
        Δ<em>l</em> в метрах (см ÷ 100), <em>k</em> в Н/м, <em>F</em> в Н
        → <em>W</em> в джоулях.
      </span>
    `)}}function Re(){return"../home/"}function _s(){const t=new URLSearchParams(window.location.search).get("role");return t==="teacher"||t==="student"?t:null}const We="kit-2-forces:role";function Os(n){try{localStorage.setItem(We,n)}catch{}}function Gs(){try{const n=localStorage.getItem(We);return n==="teacher"||n==="student"?n:null}catch{return null}}const ne=_s();ne&&Os(ne);const Lt=ne??Gs();if(Lt){document.body.dataset.role=Lt;const n=document.createElement("a");n.className="role-badge",n.href=Re(),n.setAttribute("aria-label",`Текущая роль: ${Lt==="teacher"?"Учитель":"Ученик"}. Вернуться на каталог`),n.innerHTML=`
    <span>${Lt==="teacher"?"Учитель":"Ученик"}</span>
    <span class="role-badge-arrow" aria-hidden="true">↗</span>
  `,document.body.appendChild(n)}const Is=document.getElementById("screen-content"),Gt=document.getElementById("kit-nav"),ke=document.getElementById("kit-header"),le=[new je,new Ke,new Ms,new Ue];Gt.setScreens(le.map(n=>n.meta));const It=new Hs(Is,le,"spring-stiffness");It.onScreenChanged(n=>{Gt.setAttribute("active",n);const t=le.find(e=>e.meta.id===n);t&&(ke.setAttribute("experiment-kicker",t.meta.kicker),ke.setAttribute("experiment",t.meta.label))});Gt.addEventListener("screen-select",n=>{const t=n.detail.id;It.navigate(t)});Gt.addEventListener("home-click",()=>{window.location.href=Re()});It.start();window.kitShell=It;
//# sourceMappingURL=index-CFtImnmv.js.map
