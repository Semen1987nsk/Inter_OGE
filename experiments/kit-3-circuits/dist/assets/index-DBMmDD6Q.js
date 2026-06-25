import{M as A}from"./screen-measurements-BGeZ_wc1.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const r of o.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function e(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(s){if(s.ep)return;s.ep=!0;const o=e(s);fetch(s.href,o)}})();const w={spring:`
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
    </svg>`,gauge:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="16" cy="18" r="10" />
      <path d="M8 18 A8 8 0 0 1 24 18" />
      <line x1="16" y1="18" x2="16" y2="10" />
      <line x1="16" y1="18" x2="22" y2="14" stroke-width="1.5" />
    </svg>`,iv:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 28 L4 4" />
      <path d="M4 28 L28 28" />
      <path d="M4 28 L22 8" stroke-dasharray="3 2" />
    </svg>`,wire:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 16 L10 16" />
      <rect x="10" y="12" width="12" height="8" rx="2" />
      <path d="M22 16 L28 16" />
    </svg>`,link:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 16 L28 16" />
      <rect x="6" y="12" width="6" height="8" rx="1" />
      <rect x="20" y="12" width="6" height="8" rx="1" />
    </svg>`,home:`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 12 L12 3 L21 12" />
      <path d="M5 10 L5 21 L19 21 L19 10" />
    </svg>`},k=document.createElement("template");k.innerHTML=`
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
    <span class="icon-wrap">${w.home}</span>
    <span class="label">К комплектам</span>
  </button>
</nav>
`;class $ extends HTMLElement{static observedAttributes=["active"];#e;#t;#i=[];constructor(){super(),this.#e=this.attachShadow({mode:"open"}),this.#e.appendChild(k.content.cloneNode(!0)),this.#t=this.#e.querySelector(".screens"),this.#e.addEventListener("click",this.#s)}attributeChangedCallback(t){t==="active"&&this.#r()}setScreens(t){this.#t.replaceChildren(),this.#i=t.map(e=>{const i=document.createElement("button");return i.type="button",i.dataset.screenId=e.id,i.setAttribute("role","tab"),i.setAttribute("aria-controls","screen-content"),i.title=e.tooltip,i.innerHTML=`
        <span class="kicker">${e.kicker}</span>
        <span class="icon-wrap">${w[e.icon]}</span>
        <span class="label">${e.label}</span>
      `,this.#t.appendChild(i),{id:e.id,meta:e,el:i}}),this.#r()}#r(){const t=this.getAttribute("active");for(const e of this.#i){const i=e.id===t;e.el.setAttribute("aria-current",i?"true":"false"),e.el.tabIndex=i?0:-1}}#s=t=>{const e=t.target.closest("button");if(!e)return;if(e.dataset.action==="home"){this.dispatchEvent(new CustomEvent("home-click",{bubbles:!0,composed:!0}));return}const i=e.dataset.screenId;i&&this.dispatchEvent(new CustomEvent("screen-select",{detail:{id:i},bubbles:!0,composed:!0}))}}customElements.define("lab-kit-nav",$);const S=document.createElement("template");S.innerHTML=`
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
    <div class="kit-label">Комплект №3 · Электрические цепи</div>
  </div>
  <div class="center">
    <div class="exp-kicker" id="kicker"></div>
    <div class="exp-title" id="title"></div>
  </div>
  <div class="right">
    <div class="spec">ФИПИ ОГЭ-2026</div>
  </div>
</div>
`;class z extends HTMLElement{static observedAttributes=["experiment","experiment-kicker"];#e;#t;#i;constructor(){super(),this.#e=this.attachShadow({mode:"open"}),this.#e.appendChild(S.content.cloneNode(!0)),this.#t=this.#e.getElementById("title"),this.#i=this.#e.getElementById("kicker")}attributeChangedCallback(){this.#t.textContent=this.getAttribute("experiment")??"",this.#i.textContent=this.getAttribute("experiment-kicker")??""}}customElements.define("lab-kit-header",z);const L=document.createElement("template");L.innerHTML=`
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
`;class I extends HTMLElement{static observedAttributes=["title","status"];#e;#t;#i;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild(L.content.cloneNode(!0)),this.#e=t.querySelector(".title"),this.#t=t.querySelector(".status"),this.#i=t.querySelector(".action"),this.#i.addEventListener("click",()=>{this.getAttribute("status")!=="in-use"&&this.dispatchEvent(new CustomEvent("equipment-pick",{bubbles:!0,composed:!0,detail:{title:this.getAttribute("title")??""}}))})}connectedCallback(){this.#r()}attributeChangedCallback(){this.#r()}#r(){const t=this.getAttribute("title")??"",e=this.getAttribute("status")??"available";this.#e.textContent=t,e==="in-use"?(this.#t.textContent="На установке",this.#i.textContent="Установлено",this.#i.disabled=!0):e==="disabled"?(this.#t.textContent="Недоступно",this.#i.textContent="—",this.#i.disabled=!0):(this.#t.textContent="В комплекте",this.#i.textContent="Перетащить →",this.#i.disabled=!1)}}customElements.define("lab-equipment-card",I);const h={top:16,right:16,bottom:32,left:40},C=document.createElement("template");C.innerHTML=`
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

  svg[hidden] { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .point { animation: none; }
  }
</style>

<div class="container">
  <svg part="svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"></svg>
</div>
`;class B extends HTMLElement{#e;#t={points:[],xLabel:"x",yLabel:"y",xMax:10,yMax:10,fitSlope:null};#i;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild(C.content.cloneNode(!0)),this.#e=t.querySelector("svg"),this.#i=new ResizeObserver(()=>this.#r())}connectedCallback(){this.#i.observe(this),this.#r()}disconnectedCallback(){this.#i.disconnect()}set data(t){this.#t=t,this.#r()}get data(){return this.#t}#r(){const t=this.#e.getBoundingClientRect(),e=t.width||400,i=t.height||280;this.#e.setAttribute("viewBox",`0 0 ${e} ${i}`),this.#e.innerHTML="";const s=e-h.left-h.right,o=i-h.top-h.bottom,r=h.left,l=h.top+o,c=this.#t.xMax,a=this.#t.yMax,d=p=>r+p/c*s,u=p=>l-p/a*o;if(this.#s(r,s,o,d,u),this.#n(r,l,s,o),this.#c(r,l,d,u),this.#d(i,r,l,s,o),this.#t.points.length===0){this.#h(e,i);return}this.#t.points.length>=2&&this.#t.fitSlope!==null&&this.#a(this.#t.fitSlope,d,u);for(const p of this.#t.points)this.#p(p,d,u)}#s(t,e,i,s,o){const r=this.#t.xMax,l=this.#t.yMax;for(let c=1;c<=r;c++){const a=s(c);this.#e.appendChild(this.#o(a,h.top,a,h.top+i,"grid-line"))}for(let c=1;c<=l;c++){const a=o(c);this.#e.appendChild(this.#o(t,a,t+e,a,"grid-line"))}}#n(t,e,i,s){this.#e.appendChild(this.#o(t,e,t+i,e,"axis")),this.#e.appendChild(this.#o(t,e,t,e-s,"axis"))}#c(t,e,i,s){const o=this.#t.xMax,r=this.#t.yMax,l=Math.max(1,Math.floor(o/5)),c=Math.max(1,Math.floor(r/4));for(let a=0;a<=o;a+=l){const d=i(a);this.#e.appendChild(this.#o(d,e,d,e+4,"axis-tick")),this.#e.appendChild(this.#l(String(a),d,e+16,"axis-label","middle"))}for(let a=0;a<=r;a+=c){const d=s(a);this.#e.appendChild(this.#o(t-4,d,t,d,"axis-tick")),this.#e.appendChild(this.#l(String(a),t-8,d+4,"axis-label","end"))}}#d(t,e,i,s,o){this.#e.appendChild(this.#l(this.#t.xLabel,e+s/2,t-8,"axis-title","middle"));const r=this.#l(this.#t.yLabel,12,i-o/2,"axis-title","middle");r.setAttribute("transform",`rotate(-90, 12, ${i-o/2})`),this.#e.appendChild(r)}#a(t,e,i){const r=this.#t.xMax,l=t*r,c=this.#o(e(0),i(0),e(r),i(Math.min(l,this.#t.yMax)),"fit-line");this.#e.appendChild(c)}#p(t,e,i){const s=e(t.x),o=i(t.y),r=document.createElementNS("http://www.w3.org/2000/svg","circle");r.setAttribute("cx",String(s)),r.setAttribute("cy",String(o)),r.setAttribute("r","5"),r.classList.add("point"),r.dataset.pointId=t.id;const l=document.createElementNS("http://www.w3.org/2000/svg","title");l.textContent=t.label??`x=${t.x}, y=${t.y}`,r.appendChild(l),r.addEventListener("click",()=>{this.dispatchEvent(new CustomEvent("delete-point",{detail:{id:t.id},bubbles:!0}))}),this.#e.appendChild(r)}#h(t,e){this.#e.appendChild(this.#l("Запишите хотя бы одно измерение",t/2,e/2,"empty-state","middle"))}#o(t,e,i,s,o){const r=document.createElementNS("http://www.w3.org/2000/svg","line");return r.setAttribute("x1",String(t)),r.setAttribute("y1",String(e)),r.setAttribute("x2",String(i)),r.setAttribute("y2",String(s)),r.classList.add(o),r}#l(t,e,i,s,o){const r=document.createElementNS("http://www.w3.org/2000/svg","text");return r.setAttribute("x",String(e)),r.setAttribute("y",String(i)),r.setAttribute("text-anchor",o),r.classList.add(s),r.textContent=t,r}}customElements.define("lab-graph",B);const x="screen";class N{#e;#t;constructor(t,e){this.#t=new Set(t),this.#e=e,window.addEventListener("popstate",this.#r)}start(){this.#i(this.read())}destroy(){window.removeEventListener("popstate",this.#r)}read(){const e=new URLSearchParams(window.location.search).get(x);return e&&this.#t.has(e)?e:null}navigate(t){if(!this.#t.has(t))throw new RangeError(`Router.navigate: неизвестный screenId «${t}»`);const e=new URLSearchParams(window.location.search);if(e.get(x)===t)return;e.set(x,t);const i=`${window.location.pathname}?${e.toString()}${window.location.hash}`;window.history.replaceState({screen:t},"",i),this.#i(t)}#i(t){this.#e(t)}#r=()=>{this.#i(this.read())}}let R=class{#e;#t;#i;#r=null;#s;#n;#c=null;constructor(t,e,i,s){this.#e=t,this.#n=s,this.#t=new Map;for(const r of e)this.#t.set(r.meta.id,r);if(!this.#t.has(i))throw new RangeError(`KitShell: defaultId «${i}» не найден в реестре экранов`);this.#s=i;const o=e.map(r=>r.meta.id);this.#i=new N(o,r=>{const l=r??this.#s;this.#d(l)})}onScreenChanged(t){this.#c=t}get activeId(){return this.#r}get screens(){return[...this.#t.values()]}start(){window.addEventListener("beforeunload",this.#h),this.#i.start()}navigate(t){this.#i.navigate(t)}destroy(){if(window.removeEventListener("beforeunload",this.#h),this.#i.destroy(),this.#r){const t=this.#t.get(this.#r);t&&(this.#a(t),t.unmount())}this.#r=null}async#d(t){if(this.#r===t)return;const e=this.#t.get(t);if(!e){this.#d(this.#s);return}if(this.#r){const i=this.#t.get(this.#r);if(i){this.#a(i);try{await i.unmount()}catch(s){console.error("KitShell: unmount failed",s)}}}this.#e.replaceChildren();try{await e.mount(this.#e)}catch(i){console.error("KitShell: mount failed",i);return}this.#p(e),this.#r=t,this.#c?.(t)}#a(t){if(typeof t.saveState=="function")try{const e=t.saveState(),i=`${this.#n}:${t.meta.id}`;e==null?localStorage.removeItem(i):localStorage.setItem(i,JSON.stringify(e))}catch(e){console.warn("KitShell: saveState failed",e)}}#p(t){if(typeof t.loadState=="function")try{const e=localStorage.getItem(`${this.#n}:${t.meta.id}`);if(!e)return;const i=JSON.parse(e);t.loadState(i)}catch(e){console.warn("KitShell: loadState failed",e)}}#h=()=>{if(!this.#r)return;const t=this.#t.get(this.#r);t&&this.#a(t)}};const T="kit-3-circuits:screen";class j extends R{constructor(t,e,i){super(t,e,i,T)}}function E(){return"../home/"}function K(){const t=new URLSearchParams(window.location.search).get("role");return t==="teacher"||t==="student"?t:null}const M="kit-3-circuits:role";function O(n){try{localStorage.setItem(M,n)}catch{}}function P(){try{const n=localStorage.getItem(M);return n==="teacher"||n==="student"?n:null}catch{return null}}const v=K();v&&O(v);const f=v??P();if(f){document.body.dataset.role=f;const n=document.createElement("a");n.className="role-badge",n.href=E(),n.setAttribute("aria-label",`Текущая роль: ${f==="teacher"?"Учитель":"Ученик"}. Вернуться на каталог`);const t=document.createElement("span");t.textContent=f==="teacher"?"Учитель":"Ученик";const e=document.createElement("span");e.className="role-badge-arrow",e.setAttribute("aria-hidden","true"),e.textContent="↗",n.appendChild(t),n.appendChild(e),document.body.appendChild(n)}const H=document.getElementById("screen-content"),b=document.getElementById("kit-nav"),y=document.getElementById("kit-header"),g=[new A];b.setScreens(g.map(n=>n.meta));const m=new j(H,g,"measurements");m.onScreenChanged(n=>{b.setAttribute("active",n);const t=g.find(e=>e.meta.id===n);t&&(y.setAttribute("experiment-kicker",t.meta.kicker),y.setAttribute("experiment",t.meta.label))});b.addEventListener("screen-select",n=>{const t=n.detail.id;m.navigate(t)});b.addEventListener("home-click",()=>{window.location.href=E()});m.start();window.kitShell=m;
//# sourceMappingURL=index-DBMmDD6Q.js.map
