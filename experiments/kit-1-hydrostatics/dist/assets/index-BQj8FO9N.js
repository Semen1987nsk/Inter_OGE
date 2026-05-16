import{S as he,i as ue,b as pe,c as fe,a as me,g as q,r as be,A as Lt,p as ge,v as ye,D as xe}from"./screen-density-solid-BmfnwpLV.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))r(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const n of s.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function e(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(i){if(i.ep)return;i.ep=!0;const s=e(i);fetch(i.href,s)}})();const Kt=document.createElement("template");Kt.innerHTML=`
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

  /* in-use карточка визуально приглушена. Раньше использовали opacity:0.55,
     но это рушит цветовой контраст текста (.status) ниже WCAG AA 4.5:1.
     Теперь — приглушаем только thumb (миниатюра), а .meta остаётся читаемым. */
  :host([status="in-use"]) .thumb {
    opacity: 0.5;
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
    font-size: 11px;
    /* WCAG AA: цвет #a4b0bf на bg #0f1f3a даёт контраст ~7.2 — выше 4.5. */
    color: #a4b0bf;
    font-style: italic;
  }

  :host([status="in-use"]) .status {
    /* #7adcd0 на #0f1f3a → контраст 8.16 — WCAG AA с большим запасом. */
    color: #7adcd0;
    font-style: normal;
    font-weight: 600;
  }

  /* Кнопка-«пилюля»: компактная. Этап 10 a11y: opacity=1 всегда + светлый
     цвет (#7adcd0) для контраста ≥ 4.5 на тёмном card-bg #0f1f3a, как
     требует WCAG 2.2 AA. Hover-эффект через насыщенность фона/бордера. */
  .action {
    width: 100%;
    margin-top: 4px;
    padding: 3px 6px;
    background: rgb(56 189 175 / 0.18);
    border: 1px solid rgb(56 189 175 / 0.5);
    border-radius: var(--radius-md, 8px);
    font-family: var(--font-display, sans-serif);
    font-size: 11px;
    font-weight: 600;
    color: #7adcd0;
    cursor: pointer;
    transition:
      background var(--dur-fast, 150ms) var(--ease-out),
      border-color var(--dur-fast, 150ms) var(--ease-out);
    min-height: 22px;
    line-height: 1.1;
  }

  .action:hover:not(:disabled) {
    background: rgb(56 189 175 / 0.32);
    border-color: var(--card-accent);
    color: #a8ebe2;
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
`;class we extends HTMLElement{static observedAttributes=["title","status"];#t;#e;#i;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild(Kt.content.cloneNode(!0)),this.#t=t.querySelector(".title"),this.#e=t.querySelector(".status"),this.#i=t.querySelector(".action"),this.#i.addEventListener("click",()=>{this.getAttribute("status")!=="in-use"&&this.dispatchEvent(new CustomEvent("equipment-pick",{bubbles:!0,composed:!0,detail:{title:this.getAttribute("title")??""}}))})}connectedCallback(){this.#r()}attributeChangedCallback(){this.#r()}#r(){const t=this.getAttribute("title")??"",e=this.getAttribute("status")??"available";this.#t.textContent=t,e==="in-use"?(this.#e.textContent="На установке",this.#i.textContent="Установлено",this.#i.disabled=!0):e==="disabled"?(this.#e.textContent="Недоступно",this.#i.textContent="—",this.#i.disabled=!0):(this.#e.textContent="В комплекте",this.#i.textContent="Перетащить →",this.#i.disabled=!1)}}customElements.define("lab-equipment-card",we);const Ut=document.createElement("template");Ut.innerHTML=`
<style>
  :host {
    --w-size: 96px;
    /* Все цилиндры имеют одинаковую длину (по реальному ФИПИ-комплекту,
       фото слайд №24 спецификации), отличаются ДИАМЕТРОМ. Поэтому высота
       host'а фиксирована: --w-size · 1.65 ≈ 158px при дефолте 96.
       Default 96 (was 64) приведён к реальному соотношению dyno:cyl=2.67:1
       по ФИПИ slide09_img26 — см. §19.11.16 REFERENCE. На сцене опыта 1.2
       override до 56 (было 36) — see archimedes-experiment.css:301. */
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    width: var(--w-size);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
                filter 200ms ease-out;
    filter: drop-shadow(0 5px 8px rgb(0 0 0 / 0.4));
  }

  :host(:hover) {
    transform: translateY(-3px) rotate(-1deg);
    filter: drop-shadow(0 9px 14px rgb(0 0 0 / 0.5));
  }
  :host([selected]) {
    transform: translateY(-3px) scale(1.06);
    filter: drop-shadow(0 0 0 2.5px var(--color-brand-orange, #ffbe0b))
            drop-shadow(0 8px 14px rgb(0 0 0 / 0.55));
  }
  :host([attached]) {
    cursor: default;
    opacity: 0.55;
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3)) saturate(0.7);
  }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }

  /* Используется в overlay — скрывает подпись под SVG. */
  :host([no-legend]) .legend { display: none; }
  :host([hidden]) { display: none; }

  .frame {
    width: 100%;
    height: calc(var(--w-size) * 1.65);
    pointer-events: none;
  }

  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
    transition: opacity 150ms;
  }

  .label-text {
    pointer-events: none;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-weight: 800;
    font-size: 12px;
    text-anchor: middle;
    dominant-baseline: middle;
    letter-spacing: 0.04em;
  }
  .legend {
    margin-top: 5px;
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-secondary, #a8b3c7);
    text-align: center;
    pointer-events: none;
    line-height: 1.15;
  }
  .legend-mass {
    display: block;
    color: var(--color-text-muted, #6a7081);
    font-size: 9px;
    font-weight: 500;
    margin-top: 1px;
  }
</style>

<svg id="root-svg" class="frame" viewBox="0 0 64 110" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Сталь: тёмная полированная -->
    <linearGradient id="bodySteel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1f2228" />
      <stop offset="20%" stop-color="#363b46" />
      <stop offset="48%" stop-color="#7a818f" />
      <stop offset="55%" stop-color="#7a818f" />
      <stop offset="80%" stop-color="#363b46" />
      <stop offset="100%" stop-color="#1f2228" />
    </linearGradient>
    <!-- Алюминий: светлый матовый -->
    <linearGradient id="bodyAluminum" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#737a85" />
      <stop offset="20%" stop-color="#a8b0bb" />
      <stop offset="48%" stop-color="#dde2e8" />
      <stop offset="55%" stop-color="#dde2e8" />
      <stop offset="80%" stop-color="#a8b0bb" />
      <stop offset="100%" stop-color="#737a85" />
    </linearGradient>
    <!-- Пластик: бежево-белый -->
    <linearGradient id="bodyPlastic" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a8a294" />
      <stop offset="20%" stop-color="#d8d3c4" />
      <stop offset="48%" stop-color="#f5f1e6" />
      <stop offset="55%" stop-color="#f5f1e6" />
      <stop offset="80%" stop-color="#d8d3c4" />
      <stop offset="100%" stop-color="#a8a294" />
    </linearGradient>
    <!-- Крючок (хром-сталь) -->
    <linearGradient id="hookGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5a606e" />
      <stop offset="50%" stop-color="#cdd1d8" />
      <stop offset="100%" stop-color="#5a606e" />
    </linearGradient>
    <!-- Верхняя/нижняя кромка корпуса (более тёмная фаска) -->
    <linearGradient id="rimDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.45)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.05)" />
    </linearGradient>
    <linearGradient id="rimLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.30)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.0)" />
    </linearGradient>
    <!-- Тонкая микро-текстура (для алюминия — параллельные риски) -->
    <pattern id="aluminumLines" x="0" y="0" width="4" height="3" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,0,0,0.07)" stroke-width="0.4" />
    </pattern>
  </defs>

  <!-- Тень. cy динамически в #applyMaterial. -->
  <ellipse id="shadow-ellipse" cx="32" cy="104" rx="22" ry="2.5" fill="rgba(0,0,0,0.4)" />

  <!-- Крючок (S-образный, хром-сталь) -->
  <g>
    <!-- Часть, выходящая из корпуса вверх -->
    <line x1="32" y1="22" x2="32" y2="14" stroke="url(#hookGrad)" stroke-width="2.4" stroke-linecap="round" />
    <!-- Изгиб -->
    <path d="M32 14 Q 24 14, 24 8 Q 24 4, 28 4"
          fill="none" stroke="url(#hookGrad)" stroke-width="2.4" stroke-linecap="round" />
    <!-- Highlight на крючке -->
    <line x1="33" y1="22" x2="33" y2="14" stroke="rgba(255,255,255,0.5)" stroke-width="0.5" />
  </g>

  <!-- Корпус-цилиндр (steel/aluminum/plastic в зависимости от material) -->
  <g id="body-group">
    <!-- Основная заливка -->
    <rect id="body-rect" x="14" y="22" width="36" height="78" rx="2"
          fill="url(#bodySteel)" stroke="rgba(0,0,0,0.35)" stroke-width="0.6" />
    <!-- Микро-текстура для алюминия -->
    <rect id="body-texture" x="14" y="22" width="36" height="78" rx="2"
          fill="url(#aluminumLines)" opacity="0" />
    <!-- Верхняя фаска -->
    <rect x="14" y="22" width="36" height="3.5" rx="1.5" fill="url(#rimDark)" />
    <rect x="14" y="22.5" width="36" height="1.5" fill="url(#rimLight)" />
    <!-- Нижняя фаска. y динамически в #applyMaterial. -->
    <rect id="body-rim-bottom" x="14" y="96" width="36" height="3.5" rx="1.5" fill="url(#rimDark)" transform="scale(1,-1) translate(0,-200)" />
    <!-- Боковые тонкие отражения. y2 динамически. -->
    <line id="body-glint-l" x1="16" y1="26" x2="16" y2="98" stroke="rgba(255,255,255,0.18)" stroke-width="0.5" />
    <line id="body-glint-r" x1="48" y1="26" x2="48" y2="98" stroke="rgba(0,0,0,0.18)" stroke-width="0.5" />
  </g>

  <!-- Шкала на пластиковом цилиндре №3 (по ФИПИ — со шкалой 1мм вдоль образующей).
       Заполняется программно в #applyMaterial под актуальную высоту корпуса. -->
  <g id="cyl-scale" opacity="0"></g>

  <!-- Гравированный номер (на белой/тёмной этикетке в центре). y динамически. -->
  <g>
    <rect id="lbl-bg" x="20" y="50" width="24" height="22" rx="1.5"
          fill="#f5f5f0" stroke="rgba(0,0,0,0.45)" stroke-width="0.5" />
    <text id="lbl-num" class="label-text" x="32" y="62" fill="#1a1b1f">№ ?</text>
  </g>

  <!-- Focus ring. height динамически. -->
  <rect id="focus-ring-rect" class="focus-ring" x="6" y="2" width="52" height="106" rx="4" />
</svg>

<span class="legend" id="legend">
  <span id="legend-name"></span>
  <span class="legend-mass" id="legend-mass"></span>
</span>
`;const O=64,Pt=110,X=22,vt=100,Rt=vt-X,ve=36,Mt=25,ke=28,Ae=4,_e={1:25,2:25,3:56,4:34},Se={steel:{bodyFill:"url(#bodySteel)",labelFill:"#1f2228",labelText:"#f5f5f0"},aluminum:{bodyFill:"url(#bodyAluminum)",labelFill:"#ffffff",labelText:"#1a1b1f"},plastic:{bodyFill:"url(#bodyPlastic)",labelFill:"#2a2d36",labelText:"#f5f5f0"}};class Ee extends HTMLElement{static observedAttributes=["material","id-num","selected","attached"];#t;#e;#i;#r;#o;#s;#a;#c;#n;#l;#h;#u;#y=Rt;#g=Pt;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(Ut.content.cloneNode(!0)),this.#e=this.#t.getElementById("lbl-num"),this.#i=this.#t.getElementById("lbl-bg"),this.#r=this.#t.getElementById("body-rect"),this.#o=this.#t.getElementById("body-texture"),this.#s=this.#t.getElementById("body-rim-bottom"),this.#a=this.#t.getElementById("body-glint-l"),this.#c=this.#t.getElementById("body-glint-r"),this.#n=this.#t.getElementById("shadow-ellipse"),this.#l=this.#t.getElementById("cyl-scale"),this.#h=this.#t.getElementById("legend-name"),this.#u=this.#t.getElementById("legend-mass"),this.addEventListener("click",this.#f),this.addEventListener("keydown",this.#p),this.#x()}connectedCallback(){this.#b(),this.#x()}attributeChangedCallback(){this.isConnected&&this.#b(),this.#x()}#b(){this.hasAttribute("attached")?(this.setAttribute("tabindex","-1"),this.removeAttribute("role")):(this.hasAttribute("tabindex")||(this.tabIndex=0),this.hasAttribute("role")||this.setAttribute("role","button"))}#x(){const t=this.getAttribute("id-num")??"?",e=this.getAttribute("material")??"steel",r=Se[e];r&&(this.#r.setAttribute("fill",r.bodyFill),this.#i.setAttribute("fill",r.labelFill),this.#e.setAttribute("fill",r.labelText)),this.#o.style.opacity=e==="aluminum"?"1":"0",this.#e.textContent=`№ ${t}`,this.#h.textContent=`Цилиндр № ${t}`,this.#u.textContent="",this.isConnected&&this.setAttribute("aria-label",`Цилиндр № ${t}.`);const i=_e[t]??Mt,s=Math.sqrt(i/Mt),n=ve*s,a=O/2-n/2;this.#y=Rt,this.#g=Pt,this.#r.setAttribute("x",String(a)),this.#r.setAttribute("width",String(n)),this.#o.setAttribute("x",String(a)),this.#o.setAttribute("width",String(n));const c=3.5;this.#s.removeAttribute("transform"),this.#s.setAttribute("x",String(a)),this.#s.setAttribute("width",String(n)),this.#s.setAttribute("y",String(vt-c)),this.#s.setAttribute("height",String(c)),this.#a.setAttribute("x1",String(a+2)),this.#a.setAttribute("x2",String(a+2)),this.#c.setAttribute("x1",String(a+n-2)),this.#c.setAttribute("x2",String(a+n-2)),this.#n.setAttribute("rx",String(n/2+4));const l=O/2-24/2;for(this.#i.setAttribute("x",String(l)),this.#e.setAttribute("x",String(O/2));this.#l.firstChild;)this.#l.removeChild(this.#l.firstChild);if(e==="plastic"){this.#l.style.opacity="1";const d="http://www.w3.org/2000/svg",p=X+10,u=vt-8,f=4,k=a+n-4,A=k-4,C=k-2;let tt=0;for(let M=p;M<=u;M+=f){const I=tt%2===0,_=document.createElementNS(d,"line");_.setAttribute("x1",String(I?A:C)),_.setAttribute("y1",String(M)),_.setAttribute("x2",String(k)),_.setAttribute("y2",String(M)),_.setAttribute("stroke",I?"rgba(0,0,0,0.4)":"rgba(0,0,0,0.3)"),_.setAttribute("stroke-width",I?"0.4":"0.3"),this.#l.appendChild(_),tt++}}else this.#l.style.opacity="0"}getThreadHookPosition(){const t=this.getBoundingClientRect();return{x:ke/O*t.width,y:Ae/this.#g*t.height}}getThreadHookY(){return this.getThreadHookPosition().y}getBottomY(){const t=this.getBoundingClientRect();if(t.height===0)return t.bottom;const e=X+this.#y,r=t.height/this.#g;return t.top+e*r}getBodyTopY(){const t=this.getBoundingClientRect();if(t.height===0)return t.top;const e=t.height/this.#g;return t.top+X*e}getBodyHeightPx(){const t=this.getBoundingClientRect();if(t.height===0)return 0;const e=t.height/this.#g;return this.#y*e}#f=()=>{this.hasAttribute("attached")||this.dispatchEvent(new CustomEvent("weight-tap",{detail:{material:this.getAttribute("material"),idNum:this.getAttribute("id-num")},bubbles:!0,composed:!0}))};#p=t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.#f())}}customElements.define("lab-metal-weight",Ee);const Xt=document.createElement("template");Xt.innerHTML=`
<style>
  :host {
    --case-top: #3a4150;
    --case-mid: #2a2f3a;
    --case-low: #1a1d24;
    --case-edge: #0d1015;
    --case-light: #4f5666;
    --platform-light: #f0f2f5;
    --platform-mid: #c0c5cc;
    --platform-dark: #8a8f96;
    --platform-edge: #555a62;
    --lcd-bg: #0a0604;
    --lcd-frame: #1d1612;
    --lcd-glow: rgba(255, 200, 60, 0.35);
    --lcd-text: #ffc220;
    --lcd-dim: rgba(255, 200, 60, 0.18);
    --button-color: #4d5260;
    --button-edge: #2a2d36;
    --led-on: #3dd97d;

    display: inline-block;
    width: 220px;
    cursor: pointer;
  }
  :host([hidden]) { display: none; }
  :host {
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    filter: drop-shadow(0 8px 14px rgb(0 0 0 / 0.45));
    transition: filter 200ms ease-out, transform 200ms ease-out;
  }
  :host(:hover) {
    filter: drop-shadow(0 14px 20px rgb(0 0 0 / 0.55));
    transform: translateY(-2px);
  }
  :host([active]) {
    filter: drop-shadow(0 0 0 2.5px var(--color-brand-orange, #ffbe0b))
            drop-shadow(0 10px 16px rgb(0 0 0 / 0.55));
  }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }

  .frame { width: 100%; height: auto; display: block; pointer-events: none; }

  /* LCD цифры (имитация семисегментника, но в очень читаемом моно-шрифте) */
  .lcd-text {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 24px;
    font-weight: 700;
    fill: var(--lcd-text);
    text-anchor: end;
    dominant-baseline: middle;
    letter-spacing: 0.06em;
    paint-order: stroke;
    stroke: rgba(255, 200, 60, 0.18);
    stroke-width: 0.5;
  }
  .lcd-shadow {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 24px;
    font-weight: 700;
    fill: var(--lcd-dim);
    text-anchor: end;
    dominant-baseline: middle;
    letter-spacing: 0.06em;
  }
  .lcd-unit {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    fill: var(--lcd-text);
    opacity: 0.9;
    text-anchor: start;
    dominant-baseline: middle;
  }
  .label-text {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 7.5px;
    font-weight: 800;
    fill: #6a6f78;
    text-anchor: middle;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .button-text {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 6px;
    font-weight: 700;
    fill: #aab0bb;
    text-anchor: middle;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
    transition: opacity 150ms;
  }
</style>

<svg class="frame" viewBox="0 0 220 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Корпус: верхний край (светлее) → низ (темнее) -->
    <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--case-light)" />
      <stop offset="22%" stop-color="var(--case-top)" />
      <stop offset="55%" stop-color="var(--case-mid)" />
      <stop offset="100%" stop-color="var(--case-low)" />
    </linearGradient>
    <!-- Платформа: серебристая, выпуклая по центру -->
    <radialGradient id="platformGrad" cx="0.5" cy="0.4" r="0.7">
      <stop offset="0%" stop-color="var(--platform-light)" />
      <stop offset="70%" stop-color="var(--platform-mid)" />
      <stop offset="100%" stop-color="var(--platform-dark)" />
    </radialGradient>
    <!-- Ободок платформы -->
    <linearGradient id="platformRim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d6dae0" />
      <stop offset="100%" stop-color="var(--platform-edge)" />
    </linearGradient>
    <!-- Стойки платформы -->
    <linearGradient id="standGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3a3f49" />
      <stop offset="50%" stop-color="#5a606e" />
      <stop offset="100%" stop-color="#3a3f49" />
    </linearGradient>
    <!-- LCD glow -->
    <radialGradient id="lcdGlow" cx="0.5" cy="0.5" r="0.55">
      <stop offset="0%" stop-color="var(--lcd-glow)" />
      <stop offset="100%" stop-color="rgba(255, 200, 60, 0)" />
    </radialGradient>
    <!-- Кнопки -->
    <linearGradient id="buttonGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5a606e" />
      <stop offset="100%" stop-color="#3a3f49" />
    </linearGradient>
    <!-- LED светодиод -->
    <radialGradient id="ledOn" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#88f7b3" />
      <stop offset="50%" stop-color="var(--led-on)" />
      <stop offset="100%" stop-color="#1d8c4d" />
    </radialGradient>
  </defs>

  <!-- Тень от корпуса (под основанием) -->
  <ellipse cx="110" cy="124" rx="92" ry="4" fill="rgba(0,0,0,0.4)" />

  <!-- Платформа: ободок -->
  <ellipse cx="110" cy="20" rx="68" ry="8" fill="url(#platformRim)" />
  <!-- Платформа: верхняя поверхность -->
  <ellipse cx="110" cy="16" rx="68" ry="7.5" fill="url(#platformGrad)"
           stroke="var(--platform-edge)" stroke-width="0.8" />
  <!-- Контур платформы (тонкая линия) -->
  <ellipse cx="110" cy="16" rx="66" ry="6.8" fill="none"
           stroke="rgba(255,255,255,0.18)" stroke-width="0.4" />

  <!-- Стойки платформы (две, симметрично) -->
  <rect x="68" y="22" width="6" height="14" rx="1.2" fill="url(#standGrad)" />
  <rect x="146" y="22" width="6" height="14" rx="1.2" fill="url(#standGrad)" />

  <!-- Корпус -->
  <rect x="20" y="32" width="180" height="78" rx="9"
        fill="url(#caseGrad)" stroke="var(--case-edge)" stroke-width="1.2" />

  <!-- Верхний highlight (плёнка) -->
  <rect x="22" y="34" width="176" height="3" rx="1.5" fill="rgba(255,255,255,0.10)" />
  <!-- Внутренний рисунок (тонкая линия по краю корпуса) -->
  <rect x="24" y="36" width="172" height="70" rx="6.5" fill="none"
        stroke="rgba(255,255,255,0.06)" stroke-width="0.6" />

  <!-- LCD-окно: рамка -->
  <rect x="40" y="46" width="140" height="38" rx="4"
        fill="var(--lcd-frame)" stroke="var(--case-edge)" stroke-width="0.6" />
  <!-- LCD: внутренняя поверхность -->
  <rect x="42" y="48" width="136" height="34" rx="3" fill="var(--lcd-bg)" />
  <!-- LCD: glow -->
  <ellipse cx="110" cy="65" rx="60" ry="16" fill="url(#lcdGlow)" />
  <!-- LCD: лёгкий vertical scan -->
  <rect x="42" y="48" width="136" height="34" rx="3" fill="url(#lcdGlow)" opacity="0.18" />

  <!-- LCD: «теневые» сегменты (как у настоящего LCD: видно «888.8») -->
  <text class="lcd-shadow" x="158" y="65">888.8</text>
  <!-- LCD: реальное значение -->
  <text id="lcd-mass" class="lcd-text" x="158" y="65">--.-</text>
  <text class="lcd-unit" x="161" y="65">g</text>

  <!-- Кнопки управления (TARE + ON/OFF + UNIT) -->
  <g>
    <!-- TARE -->
    <rect x="40" y="90" width="36" height="14" rx="3" fill="url(#buttonGrad)"
          stroke="var(--button-edge)" stroke-width="0.7" />
    <text class="button-text" x="58" y="100">TARE</text>
    <!-- ON/OFF -->
    <rect x="92" y="90" width="36" height="14" rx="3" fill="url(#buttonGrad)"
          stroke="var(--button-edge)" stroke-width="0.7" />
    <text class="button-text" x="110" y="100">ON / OFF</text>
    <!-- UNIT -->
    <rect x="144" y="90" width="36" height="14" rx="3" fill="url(#buttonGrad)"
          stroke="var(--button-edge)" stroke-width="0.7" />
    <text class="button-text" x="162" y="100">UNIT</text>
  </g>

  <!-- Бренд-плашка -->
  <text class="label-text" x="110" y="42">ЛАБОСФЕРА · 200 g · 0.1 g</text>

  <!-- LED питания -->
  <circle cx="194" cy="42" r="1.8" fill="url(#ledOn)" />
  <circle cx="194" cy="42" r="3.5" fill="var(--led-on)" opacity="0.18" />

  <!-- Ножки (4 шт под корпусом, видны на боковой проекции) -->
  <rect x="32" y="108" width="8" height="3" rx="0.8" fill="#0d1015" />
  <rect x="180" y="108" width="8" height="3" rx="0.8" fill="#0d1015" />
  <!-- центральная подсветка-тень -->
  <ellipse cx="110" cy="111" rx="60" ry="2" fill="rgba(0,0,0,0.4)" />

  <!-- Focus ring -->
  <rect class="focus-ring" x="14" y="6" width="192" height="116" rx="11" />
</svg>
`;class Ce extends HTMLElement{static observedAttributes=["mass-g","active"];#t;#e;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(Xt.content.cloneNode(!0)),this.#e=this.#t.getElementById("lcd-mass"),this.tabIndex=0,this.setAttribute("role","button"),this.setAttribute("aria-label","Электронные весы 200 г, цена деления 0.1 г."),this.addEventListener("click",this.#r),this.addEventListener("keydown",this.#o),this.#i()}attributeChangedCallback(){this.#i()}#i(){const t=this.getAttribute("mass-g"),e=t?parseFloat(t):0;!Number.isFinite(e)||e<=0?(this.#e.textContent="   0.0",this.#e.style.opacity="0.45"):(this.#e.textContent=e.toFixed(1),this.#e.style.opacity="1")}#r=()=>{this.dispatchEvent(new CustomEvent("balance-tap",{bubbles:!0,composed:!0}))};#o=t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.#r())}}customElements.define("lab-balance",Ce);const R=150,et=280,b=28,v=94,m=36,y=230,Jt=(y-m)/250,rt=b+v,Te=12,$e=8,Le=4;function Pe(){const o=[];for(let t=0;t<=250;t+=2){const e=y-t*Jt;let r,i;t%50===0?(r=Te,i="tick-major",o.push(`<text class="scale-major-text" x="${rt-2}" y="${e+2.5}">${t}</text>`)):t%10===0?(r=$e,i="tick-mid"):(r=Le,i="tick-minor"),o.push(`<line class="${i}" x1="${rt}" y1="${e}" x2="${rt+r}" y2="${e}" />`)}return o.join(`
`)}const Qt=document.createElement("template");Qt.innerHTML=`
<style>
  :host {
    --glass-stroke: rgba(220, 235, 245, 0.85);
    --glass-stroke-thin: rgba(180, 220, 240, 0.4);
    --water-color: #4ba8d4;
    --water-color-light: #87cae8;
    --water-color-deep: #2c7ea8;
    /* Шкала: высокий контраст для считывания учеником.
       Делениям дают тёмный краевой stroke, чтобы они оставались видимыми
       и на воде (тёмно-синяя), и на стекле (светлое). */
    --scale-stroke: #ffffff;
    --scale-stroke-mid: rgba(255, 255, 255, 0.78);
    --scale-stroke-minor: rgba(255, 255, 255, 0.55);
    --scale-text: #ffffff;
    --scale-text-edge: rgba(0, 0, 0, 0.65);
    --base-color: #1f2530;
    --base-edge: #0a0d12;

    display: inline-block;
    width: 150px;
    cursor: pointer;
  }
  :host([hidden]) { display: none; }
  :host {
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    filter: drop-shadow(0 8px 14px rgb(0 0 0 / 0.4));
    transition: filter 200ms ease-out, transform 200ms ease-out;
  }
  :host(:hover) {
    filter: drop-shadow(0 14px 20px rgb(0 0 0 / 0.55));
    transform: translateY(-2px);
  }
  :host([active]) {
    filter: drop-shadow(0 0 0 2.5px var(--color-brand-orange, #ffbe0b))
            drop-shadow(0 10px 16px rgb(0 0 0 / 0.55));
  }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }

  .frame { width: 100%; height: auto; display: block; pointer-events: none; }

  .water-rect {
    transition: y 520ms cubic-bezier(0.34, 0.6, 0.4, 1),
                height 520ms cubic-bezier(0.34, 0.6, 0.4, 1);
  }
  .meniscus {
    transition: cy 520ms cubic-bezier(0.34, 0.6, 0.4, 1),
                opacity 320ms ease-out;
  }
  .bubble {
    opacity: 0;
  }

  .tick-major { stroke: var(--scale-stroke); stroke-width: 1.6; stroke-linecap: round;
                paint-order: stroke; vector-effect: non-scaling-stroke; }
  .tick-mid   { stroke: var(--scale-stroke-mid); stroke-width: 1.1; stroke-linecap: round; }
  .tick-minor { stroke: var(--scale-stroke-minor); stroke-width: 0.7; stroke-linecap: round; }

  .scale-major-text {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 800;
    fill: var(--scale-text);
    /* Двойная заливка: тёмный обводка снаружи + белая заливка внутри —
       цифры остаются читаемыми и на синей воде, и на светлом стекле. */
    paint-order: stroke;
    stroke: var(--scale-text-edge);
    stroke-width: 0.9px;
    stroke-linejoin: round;
    text-anchor: end;
    dominant-baseline: middle;
  }
  .label-text {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 7px;
    font-weight: 800;
    fill: rgba(255, 255, 255, 0.78);
    text-anchor: middle;
    letter-spacing: 0.10em;
    text-transform: uppercase;
  }
  .label-cap {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 6.5px;
    font-weight: 700;
    fill: rgba(255, 255, 255, 0.55);
    text-anchor: middle;
    letter-spacing: 0.04em;
  }
  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
    transition: opacity 150ms;
  }
</style>

<svg class="frame" viewBox="0 0 ${R} ${et}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <!-- Стекло: тройной gradient — края светлее, центр прозрачнее -->
    <linearGradient id="cylGlass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0.28)" />
      <stop offset="12%" stop-color="rgba(200,230,245,0.20)" />
      <stop offset="35%" stop-color="rgba(180,220,240,0.06)" />
      <stop offset="65%" stop-color="rgba(180,220,240,0.06)" />
      <stop offset="88%" stop-color="rgba(200,230,245,0.20)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.28)" />
    </linearGradient>
    <!-- Стекло горловины (носик) -->
    <linearGradient id="cylSpout" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0.32)" />
      <stop offset="50%" stop-color="rgba(180,220,240,0.10)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.32)" />
    </linearGradient>
    <!-- Вода: верх светлее, низ темнее -->
    <linearGradient id="cylWater" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--water-color-light)" stop-opacity="0.85" />
      <stop offset="40%" stop-color="var(--water-color)" stop-opacity="0.92" />
      <stop offset="100%" stop-color="var(--water-color-deep)" stop-opacity="0.96" />
    </linearGradient>
    <!-- Боковое отражение в воде -->
    <linearGradient id="cylWaterSide" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0.30)" />
      <stop offset="20%" stop-color="rgba(255,255,255,0.05)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.05)" />
    </linearGradient>
    <!-- Мениск (поверхность воды): эллипс с лёгким отражением -->
    <radialGradient id="cylMeniscusGrad" cx="0.5" cy="0.3" r="0.6">
      <stop offset="0%" stop-color="rgba(255,255,255,0.5)" />
      <stop offset="40%" stop-color="var(--water-color-light)" stop-opacity="0.7" />
      <stop offset="100%" stop-color="var(--water-color)" stop-opacity="0.4" />
    </radialGradient>
    <!-- Подставка -->
    <linearGradient id="cylBaseGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a4150" />
      <stop offset="50%" stop-color="var(--base-color)" />
      <stop offset="100%" stop-color="var(--base-edge)" />
    </linearGradient>
    <!-- ClipPath для воды -->
    <clipPath id="cylInnerClip">
      <rect x="${b}" y="${m}" width="${v}" height="${y-m}" rx="2" />
    </clipPath>
  </defs>

  <!-- Тень -->
  <ellipse cx="${R/2}" cy="${et-4}" rx="58" ry="3" fill="rgba(0,0,0,0.45)" />

  <!-- Носик (наклонная фаска) -->
  <path d="M${b-6} ${m-18} L${b+v+6} ${m-18} L${b+v} ${m-4} L${b} ${m-4} Z"
        fill="url(#cylSpout)" stroke="var(--glass-stroke)" stroke-width="1" stroke-linejoin="round" />
  <!-- Сливная кромка слева (skewed) -->
  <path d="M${b-6} ${m-18} L${b-14} ${m-14} L${b-10} ${m-4} L${b} ${m-4} Z"
        fill="url(#cylSpout)" stroke="var(--glass-stroke)" stroke-width="1" stroke-linejoin="round" />

  <!-- Корпус (основной цилиндр) -->
  <rect x="${b}" y="${m-4}" width="${v}" height="${y-m+14}" rx="2"
        fill="url(#cylGlass)" stroke="var(--glass-stroke)" stroke-width="1.3" />

  <!-- Дно -->
  <ellipse cx="${R/2}" cy="${y+10}" rx="${v/2}" ry="4"
           fill="rgba(180,220,240,0.20)" stroke="var(--glass-stroke)" stroke-width="1" />

  <!-- Вода (clipped) -->
  <g clip-path="url(#cylInnerClip)">
    <rect id="cyl-water" class="water-rect" x="${b}" y="${y}"
          width="${v}" height="0" fill="url(#cylWater)" />
    <!-- Боковое отражение на воде -->
    <rect id="cyl-water-side" class="water-rect" x="${b}" y="${y}"
          width="${v}" height="0" fill="url(#cylWaterSide)" />
    <!-- Мениск -->
    <ellipse id="cyl-meniscus" class="meniscus" cx="${R/2}" cy="${y}"
             rx="${v/2-2}" ry="2.5"
             fill="url(#cylMeniscusGrad)" opacity="0" />
  </g>

  <!-- Шкала с делениями (генерируется JS — здесь placeholder) -->
  <g id="scale-group">${Pe()}</g>

  <!-- Подставка (синий пластик) -->
  <rect x="${b-12}" y="${y+8}" width="${v+24}" height="14" rx="2"
        fill="url(#cylBaseGrad)" stroke="var(--base-edge)" stroke-width="0.8" />
  <!-- Базовый highlight -->
  <line x1="${b-10}" y1="${y+10}" x2="${b+v+10}" y2="${y+10}"
        stroke="rgba(255,255,255,0.10)" stroke-width="0.5" />

  <!-- Verical highlight (на стекле слева) -->
  <rect x="${b+4}" y="${m}" width="3.5" height="${y-m-8}" rx="1.5"
        fill="rgba(255,255,255,0.40)" />
  <!-- Тонкое отражение справа от шкалы (внутри стекла) -->
  <rect x="${b+v-6}" y="${m}" width="1.5" height="${y-m-8}" rx="0.7"
        fill="rgba(255,255,255,0.18)" />

  <!-- Лейбл «250 мл · ЛАБОСФЕРА» сверху -->
  <text class="label-text" x="${R/2}" y="${m-22}">250 мл · ЛАБОСФЕРА</text>
  <!-- C=2 мл -->
  <text class="label-cap" x="${R/2}" y="${m-12}">C = 2 мл</text>

  <!-- Focus ring -->
  <rect class="focus-ring" x="6" y="6" width="${R-12}" height="${et-12}" rx="6" />
</svg>
`;class Re extends HTMLElement{static observedAttributes=["level","submerged","active"];#t;#e;#i;#r;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(Qt.content.cloneNode(!0)),this.#e=this.#t.getElementById("cyl-water"),this.#i=this.#t.getElementById("cyl-water-side"),this.#r=this.#t.getElementById("cyl-meniscus"),this.tabIndex=0,this.setAttribute("role","button"),this.setAttribute("aria-label","Мензурка 250 мл, цена деления 2 мл."),this.addEventListener("click",this.#s),this.addEventListener("keydown",this.#a),this.#o()}attributeChangedCallback(){this.#o()}#o(){const t=parseFloat(this.getAttribute("level")??"0")||0,e=parseFloat(this.getAttribute("submerged")??"0")||0,r=t===0?0:Math.max(0,Math.min(250,t+e)),i=y-r*Jt,s=y-i;this.#e.setAttribute("y",`${i}`),this.#e.setAttribute("height",`${s}`),this.#i.setAttribute("y",`${i}`),this.#i.setAttribute("height",`${s}`),this.#r.setAttribute("cy",`${i}`),this.#r.style.opacity=r>0?"0.85":"0",this.setAttribute("aria-label",`Мензурка, уровень воды ${r.toFixed(0)} мл из 250.`)}#s=()=>{this.dispatchEvent(new CustomEvent("cylinder-tap",{bubbles:!0,composed:!0}))};#a=t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.#s())}}customElements.define("lab-graduated-cylinder",Re);const kt=76,At=220,G=11,N=20,it=54,_t=165,st=N+_t,g=14,S=42,x=48,E=130,w=38,Me=28,Ie=6,ot=12,nt=14,W=17,z=59,Ne=23,at=g,lt=x,ct=S+E+2,It=11,Zt=document.createElement("template");Zt.innerHTML=`
<style>
  :host {
    --dyno-w: 76px;
    --dyno-h: 220px;
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

  /* §19.11.16: плавная анимация указателя/штока/крюка/LCD при смене force.
     Раньше плавность обеспечивал RAF-anim в orchestrator (state.forceN
     анимировалось от старого к target за DIP_ANIM_MS). После рефактора
     state.forceN сразу = target, а визуальный transition — через CSS на
     самих SVG-атрибутах (modern browsers поддерживают transition на y/x/y1/y2/cy
     и transform). Длительность 600ms cubic-bezier совпадает с dyno-host
     transform — синхронно с погружением цилиндра. */
  .dyno-pointer,
  .dyno-rod,
  .bottom-hook,
  .dyno-coil,
  .readout-text {
    transition: transform 600ms cubic-bezier(0.42, 0, 0.58, 1),
                y 600ms cubic-bezier(0.42, 0, 0.58, 1),
                y1 600ms cubic-bezier(0.42, 0, 0.58, 1),
                y2 600ms cubic-bezier(0.42, 0, 0.58, 1),
                cy 600ms cubic-bezier(0.42, 0, 0.58, 1),
                d 600ms cubic-bezier(0.42, 0, 0.58, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .dyno-pointer, .dyno-rod, .bottom-hook, .dyno-coil, .readout-text {
      transition: none;
    }
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
<svg viewBox="0 0 ${kt} ${At}" xmlns="http://www.w3.org/2000/svg">
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
      <rect x="${g}" y="${S}" width="${x}" height="${E}" />
    </clipPath>
  </defs>

  <!-- ВЕРХНИЙ КРЮК (центр SPRING_CX=38) -->
  <path
    d="M 38 4 Q 33 6 33 11 Q 33 17 38 17 Q 43 17 43 22 L 43 ${N}"
    stroke="url(#dyno-hook)" stroke-width="2.2" fill="none" stroke-linecap="round"
  />

  <!-- КОРПУС -->
  <g filter="url(#dyno-shadow)">
    <rect
      x="${G}" y="${N}" width="${it}" height="${_t}"
      rx="3" fill="url(#dyno-body)"
      stroke="#3d434c" stroke-width="0.6"
    />
    <!-- Внутренняя обводка -->
    <rect
      x="${G+1}" y="${N+1}" width="${it-2}" height="${_t-2}"
      rx="2" fill="none" stroke="rgb(255 255 255 / 0.15)" stroke-width="0.5"
    />
  </g>

  <!-- ПРОЗРАЧНОЕ ОКНО (за стеклом — пружина и шкала) -->
  <rect
    x="${g}" y="${S}" width="${x}" height="${E}"
    rx="1.5" fill="url(#dyno-window)"
    stroke="#3d434c" stroke-width="0.5"
  />

  <!-- LCD-плашка с цифровым показанием — встроена в корпус под окном шкалы.
       Вместо аналоговой маркировки диапазона. Чёрный фон + янтарные моноширинные
       цифры (как у Vernier/PASCO). Ученик одновременно видит и аналоговую шкалу,
       и точное число. Маркировка диапазона перенесена наверх (см. ниже). -->
  <g class="readout">
    <rect x="${at}" y="${ct}" width="${lt}" height="${It}"
          rx="2" fill="#0a0e16"
          stroke="#3d434c" stroke-width="0.5" />
    <rect x="${at+1}" y="${ct+1}" width="${lt-2}" height="3"
          rx="1.5" fill="rgb(255 255 255 / 0.05)" />
    <text class="readout-text"
          x="${at+lt-4}" y="${ct+It-2.5}"
          text-anchor="end"
          font-family="var(--font-mono, monospace)" font-size="7.5"
          font-weight="800" letter-spacing="0.03em"
          fill="var(--color-brand-orange, #ffbe0b)">0,00 Н</text>
  </g>

  <!-- Маркировка диапазона СВЕРХУ корпуса (рядом с подписью ЛАБОСФЕРА) -->
  <g class="brand-top" transform="translate(${G+it-4}, ${N+11})">
    <text class="brand-range-top"
          font-family="var(--font-display, sans-serif)"
          font-size="7" font-weight="800"
          fill="rgb(0 0 0 / 0.7)"
          text-anchor="end"
          dominant-baseline="middle">1Н</text>
  </g>

  <!-- Подпись ЛАБОСФЕРА мелким текстом сверху корпуса -->
  <g transform="translate(${G+4}, ${N+11})">
    <text font-family="var(--font-display, sans-serif)"
          font-size="4" font-weight="700"
          fill="rgb(0 0 0 / 0.5)"
          text-anchor="start"
          letter-spacing="0.08em">ЛАБОСФЕРА</text>
  </g>

  <!-- ШКАЛА: одна колонка делений (после сжатия до 76×220 двойная не помещается) -->
  <g class="scale-left" font-family="var(--font-mono, monospace)" font-size="8"
     fill="#14233a">
    <!-- генерируем в JS через #renderTicks -->
  </g>
  <g class="scale-right" font-family="var(--font-mono, monospace)" font-size="8"
     fill="#14233a">
    <!-- только риски без цифр -->
  </g>

  <!-- Невидимый клик-слой для шкалы -->
  <rect class="scale-area"
        x="${g}" y="${S}"
        width="${x}" height="${E}"
        fill="transparent" />

  <!-- Запись ученика (синяя риска поверх с бейджем "F = X.X Н") -->
  <g class="reading-mark" style="display:none">
    <rect x="${g-3}" y="-1.4" width="${x+6}" height="2.8"
          fill="#0d6efd" opacity="0.9" />
    <rect class="reading-bg" x="${g+x+4}" y="-7" width="46" height="14" rx="2.5"
          fill="#0d6efd" />
    <text class="reading-value" x="${g+x+27}" y="2.6"
          font-family="var(--font-mono, monospace)" font-size="9" font-weight="800"
          fill="#fff" text-anchor="middle"></text>
  </g>

  <!-- Hover: пунктирная линия + бейдж с цифрой Н -->
  <g class="hover-group" style="opacity:0; pointer-events:none">
    <line class="hover-tick" x1="${g-2}" y1="0" x2="${g+x+2}" y2="0"
          stroke="var(--color-brand-orange, #ffbe0b)" stroke-width="0.9"
          stroke-dasharray="2 1.5" />
    <rect class="hover-bg" x="${g+x+4}" y="-7" width="42" height="14" rx="2.5"
          fill="var(--color-brand-orange, #ffbe0b)" />
    <text class="hover-text" x="${g+x+25}" y="2.6"
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
    <rect x="${g-1}" y="-1.4" width="${x+2}" height="2.8"
          fill="var(--equip-pointer, #e63946)" />
    <!-- Маленький треугольный носик слева и справа -->
    <polygon points="${g-4},0 ${g-1},-2 ${g-1},2"
             fill="var(--equip-pointer, #e63946)" />
    <polygon points="${g+x+4},0 ${g+x+1},-2 ${g+x+1},2"
             fill="var(--equip-pointer, #e63946)" />
  </g>

  <!-- НИЖНИЙ КРЮК для подвеса груза -->
  <g class="bottom-hook">
    <line class="hook-stem" stroke="url(#dyno-hook)" stroke-width="1.5" stroke-linecap="round" />
    <ellipse class="hook-loop" rx="4.5" ry="3.8" fill="none"
             stroke="url(#dyno-hook)" stroke-width="1.5" />
  </g>

  <!-- Focus ring -->
  <rect class="focus-ring" x="2" y="2" width="${kt-4}" height="${At-4}" rx="6" />
</svg>
`;class Fe extends HTMLElement{static observedAttributes=["range","force","interactive"];#t;#e;#i;#r;#o;#s;#a;#c;#n;#l;#h;#u;#y;#g;constructor(){super();const t=this.attachShadow({mode:"open"});t.appendChild(Zt.content.cloneNode(!0)),this.#t=t.querySelector(".scale-left"),this.#e=t.querySelector(".scale-right"),this.#i=t.querySelector(".scale-area"),this.#r=t.querySelector(".dyno-coil"),this.#o=t.querySelector(".dyno-rod"),this.#s=t.querySelector(".dyno-pointer"),this.#a=t.querySelector(".hook-stem"),this.#c=t.querySelector(".hook-loop"),this.#n=t.querySelector(".brand-range-top"),this.#l=t.querySelector(".hover-group"),this.#h=t.querySelector(".hover-text"),this.#u=t.querySelector(".reading-mark"),this.#y=t.querySelector(".reading-value"),this.#g=t.querySelector(".readout-text"),this.#i.addEventListener("click",this.#x),this.#i.addEventListener("pointermove",this.#f),this.#i.addEventListener("pointerleave",this.#p)}connectedCallback(){this.tabIndex<0&&this.hasAttribute("interactive")&&(this.tabIndex=0),this.#E(),this.#$()}attributeChangedCallback(){this.#E(),this.#$()}get range(){return Number(this.getAttribute("range")??1)}get force(){return Number(this.getAttribute("force")??0)}getTopHookY(){return this.#v(w,6).y}getHookPosition(){return this.#v(w,6)}getWeightHookPosition(){return this.#v(w,this.#b())}#b(){const t=this.#S();return Math.max(st+8,t+nt)+8}getWeightHookY(){return this.getWeightHookPosition().y}predictWeightHookY(t){const e=this.range||1,r=Math.max(0,Math.min(1,t/e)),i=S+r*E,n=Math.max(st+8,i+nt)+8;return this.#v(w,n).y}#x=t=>{if(!this.hasAttribute("interactive"))return;const e=this.#w(t);e!==null&&this.dispatchEvent(new CustomEvent("scale-click",{detail:{valueN:e},bubbles:!0,composed:!0}))};#f=t=>{if(!this.hasAttribute("interactive"))return;const e=this.#w(t);if(e===null)return;const r=e/this.range,i=S+r*E;this.#l.setAttribute("transform",`translate(0 ${i})`),this.#h.textContent=this.#m(e),this.#l.style.opacity="1"};#p=()=>{this.#l.style.opacity="0"};setReadingMark(t){if(t===null){this.#u.style.display="none";return}const e=Math.max(0,Math.min(1,t/this.range)),r=S+e*E;this.#u.setAttribute("transform",`translate(0 ${r})`),this.#y.textContent=`${this.#m(t)} Н`,this.#u.style.display=""}#m(t){return(this.range===1?t.toFixed(2):t.toFixed(1)).replace(".",",")}#w(t){const e=this.#i.getBoundingClientRect(),i=(t.clientY-e.top)/e.height;if(i<0||i>1)return null;const s=this.range===1?.02:.1,n=i*this.range;return Math.round(n/s)*s}#v(t,e){const r=this.getBoundingClientRect();return{x:t/kt*r.width,y:e/At*r.height}}#S(){const t=Math.max(0,Math.min(1,this.force/this.range));return S+t*E}#$(){this.#n.textContent=`${this.range}Н`;{const a=Math.max(0,Math.min(this.range,this.force));this.#g.textContent=`${this.#m(a)} Н`}const t=this.#S(),e=Me,r=t-e,i=[`M ${w} ${e}`];for(let a=0;a<ot;a++){const c=(a+.5)/ot,h=(a+1)/ot,l=a%2===0?1:-1;i.push(`Q ${w+l*Ie} ${e+c*r} ${w} ${e+h*r}`)}this.#r.setAttribute("d",i.join(" "));const s=t,n=Math.max(st+8,s+nt);this.#o.setAttribute("x1",String(w)),this.#o.setAttribute("y1",String(s)),this.#o.setAttribute("x2",String(w)),this.#o.setAttribute("y2",String(n)),this.#s.setAttribute("transform",`translate(0 ${t})`),this.#a.setAttribute("x1",String(w)),this.#a.setAttribute("y1",String(n)),this.#a.setAttribute("x2",String(w)),this.#a.setAttribute("y2",String(n+4)),this.#c.setAttribute("cx",String(w)),this.#c.setAttribute("cy",String(n+8)),this.setAttribute("aria-label",`Динамометр 0…${this.range} Н, текущее показание ${this.#m(Math.max(0,Math.min(this.range,this.force)))} Н`)}#E(){const t=this.range;this.#t.replaceChildren(),this.#e.replaceChildren();const e=10;for(let r=0;r<=e;r++){const i=r/e,s=S+i*E,n=r*t/e,a=t===1?n.toFixed(1).replace(".",","):n===0?"0":n.toString();this.#t.appendChild(this.#_(W,s,W+4,s,"#0f2747",.6)),this.#t.appendChild(this.#L(Ne,s+1.4,a,"#14233a")),this.#e.appendChild(this.#_(z-4,s,z,s,"#0f2747",.6))}for(let r=0;r<e;r++){const i=S+(r+.5)/e*E;this.#t.appendChild(this.#_(W,i,W+3,i,"#1f3a5c",.4)),this.#e.appendChild(this.#_(z-3,i,z,i,"#1f3a5c",.4))}}#_(t,e,r,i,s,n){const a=document.createElementNS("http://www.w3.org/2000/svg","line");return a.setAttribute("x1",String(t)),a.setAttribute("y1",String(e)),a.setAttribute("x2",String(r)),a.setAttribute("y2",String(i)),a.setAttribute("stroke",s),a.setAttribute("stroke-width",String(n)),a}#L(t,e,r,i){const s=document.createElementNS("http://www.w3.org/2000/svg","text");return s.setAttribute("x",String(t)),s.setAttribute("y",String(e)),s.setAttribute("fill",i),s.setAttribute("font-weight","700"),s.textContent=r,s}}customElements.define("lab-dynamometer",Fe);const te=document.createElement("template");te.innerHTML=`
<style>
  :host {
    --glass-stroke: rgba(180, 220, 240, 0.7);
    --glass-fill-edge: rgba(180, 220, 240, 0.18);
    --glass-fill-center: rgba(180, 220, 240, 0.05);
    --water-color: #4a9fc7;
    --water-color-light: #7ec1e2;
    --salt-water-color: #84a8c4;
    --salt-water-color-light: #b3cde0;
    --oil-color: #d4b85a;
    --oil-color-light: #e8d27e;
    display: inline-block;
    /* width: 125px (was 96) — соотношение beaker:cyl = 1.6:1 по ФИПИ
       (slide09_img26). Высота host'а пропорционально растёт через
       aspect-ratio SVG (96×130) → ≈ 169 px при width 125. См. §19.11.16
       REFERENCE. */
    width: 125px;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.35));
    transition: filter 160ms ease-out, transform 160ms ease-out;
  }
  :host(:hover) {
    filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.45));
  }
  :host([active]) {
    filter: drop-shadow(0 0 0 2.5px var(--color-brand-orange, #ffbe0b))
            drop-shadow(0 8px 12px rgb(0 0 0 / 0.5));
  }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }

  :host([liquid="salt-water"]) {
    --water-color: var(--salt-water-color);
    --water-color-light: var(--salt-water-color-light);
  }
  :host([liquid="oil"]) {
    --water-color: var(--oil-color);
    --water-color-light: var(--oil-color-light);
  }

  .frame { width: 100%; height: auto; display: block; pointer-events: none; }
  .water-rect { transition: y 480ms cubic-bezier(0.42, 0, 0.58, 1), height 480ms cubic-bezier(0.42, 0, 0.58, 1); }
  .label-text {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 7px;
    font-weight: 700;
    fill: rgba(255, 255, 255, 0.65);
    text-anchor: middle;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
    transition: opacity 150ms;
  }
</style>

<svg class="frame" viewBox="0 0 96 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="bkGlass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0.20)" />
      <stop offset="20%" stop-color="var(--glass-fill-edge)" />
      <stop offset="50%" stop-color="var(--glass-fill-center)" />
      <stop offset="80%" stop-color="var(--glass-fill-edge)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.20)" />
    </linearGradient>
    <linearGradient id="bkWater" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--water-color-light)" stop-opacity="0.85" />
      <stop offset="100%" stop-color="var(--water-color)" stop-opacity="0.95" />
    </linearGradient>
    <clipPath id="bkClip">
      <path d="M14 22 L82 22 L78 116 L18 116 Z" />
    </clipPath>
  </defs>

  <!-- Носик-сливная кромка -->
  <path d="M14 16 L24 12 L20 22 L14 22 Z"
        fill="url(#bkGlass)" stroke="var(--glass-stroke)" stroke-width="0.8" />

  <!-- Корпус -->
  <path d="M14 22 L82 22 L78 116 L18 116 Z"
        fill="url(#bkGlass)" stroke="var(--glass-stroke)" stroke-width="1" />

  <!-- Дно -->
  <ellipse cx="48" cy="116" rx="30" ry="3" fill="rgba(180,220,240,0.20)"
           stroke="var(--glass-stroke)" stroke-width="0.8" />

  <!-- Жидкость (clipped) -->
  <g clip-path="url(#bkClip)">
    <rect id="bk-water" class="water-rect" x="14" y="116" width="68" height="0"
          fill="url(#bkWater)" />
    <ellipse id="bk-meniscus" cx="48" cy="116" rx="28" ry="1.5"
             fill="var(--water-color-light)" opacity="0" />
  </g>

  <!-- Highlight стекла -->
  <rect x="20" y="28" width="2.5" height="84" rx="1.2" fill="rgba(255,255,255,0.30)" />

  <!-- Лейбл «ЛАБОСФЕРА» -->
  <text class="label-text" x="48" y="32">ЛАБОСФЕРА · 250 мл</text>

  <!-- Focus ring -->
  <rect class="focus-ring" x="6" y="6" width="84" height="118" rx="4" />
</svg>
`;const B=116,Be=30,He=(B-Be)/250;class De extends HTMLElement{static observedAttributes=["level","liquid","active"];#t;#e;#i;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(te.content.cloneNode(!0)),this.#e=this.#t.getElementById("bk-water"),this.#i=this.#t.getElementById("bk-meniscus"),this.addEventListener("click",this.#o),this.addEventListener("keydown",this.#s),this.#r()}connectedCallback(){this.hasAttribute("tabindex")||(this.tabIndex=0),this.hasAttribute("role")||this.setAttribute("role","button"),this.hasAttribute("aria-label")||this.setAttribute("aria-label","Стакан 250 мл. Нажмите чтобы перетащить на стол.")}attributeChangedCallback(){this.#r()}#r(){const t=parseFloat(this.getAttribute("level")??"0")||0,e=Math.max(0,Math.min(250,t)),r=B-e*He,i=B-r;this.#e.setAttribute("y",`${r}`),this.#e.setAttribute("height",`${i}`),this.#i.setAttribute("cy",`${r}`),this.#i.style.opacity=e>0?"0.55":"0"}getWaterSurfaceY(){const t=this.getBoundingClientRect();if(t.height===0)return t.top;const e=parseFloat(this.#e.getAttribute("y")??`${B}`),r=t.height/130;return t.top+e*r}getWaterBottomY(){const t=this.getBoundingClientRect();if(t.height===0)return t.bottom;const e=t.height/130;return t.top+B*e}getWaterColumnHeightPx(){return Math.max(0,this.getWaterBottomY()-this.getWaterSurfaceY())}#o=()=>{this.dispatchEvent(new CustomEvent("beaker-tap",{bubbles:!0,composed:!0}))};#s=t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.#o())}}customElements.define("lab-beaker",De);const qe=`
<style id="thread-style">
  :host {
    display: inline-block;
    width: 70px;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3));
  }
  :host(:hover) { filter: drop-shadow(0 7px 10px rgb(0 0 0 / 0.45)); }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }
  .frame { width: 100%; height: auto; display: block; pointer-events: none; }
  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
  }
</style>
<svg class="frame" viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="threadCoil" cx="0.4" cy="0.4" r="0.6">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="#e8e0d0" />
      <stop offset="100%" stop-color="#a89860" />
    </radialGradient>
  </defs>
  <!-- Моток нити — спиральный круг -->
  <circle cx="35" cy="32" r="22" fill="url(#threadCoil)" stroke="#7a6f4a" stroke-width="0.6" />
  <!-- Кольца обмотки -->
  <ellipse cx="35" cy="32" rx="20" ry="7" fill="none" stroke="#a89860" stroke-width="0.5" opacity="0.6" />
  <ellipse cx="35" cy="32" rx="14" ry="5" fill="none" stroke="#a89860" stroke-width="0.5" opacity="0.5" />
  <ellipse cx="35" cy="32" rx="9" ry="3" fill="none" stroke="#a89860" stroke-width="0.5" opacity="0.4" />
  <!-- Свободный конец нити -->
  <path d="M50 30 Q 58 24, 62 32 T 60 50" fill="none" stroke="#d8c890" stroke-width="0.8" stroke-linecap="round" />
  <!-- Тень на низу -->
  <ellipse cx="35" cy="58" rx="20" ry="3" fill="rgba(0,0,0,0.25)" />
  <rect class="focus-ring" x="8" y="6" width="54" height="58" rx="3" />
</svg>
`,Oe=.025,Ge=1.5,ee=6;function We(o,t,e,r){const i=e-o,s=r-t,n=Math.hypot(i,s);if(n<.5)return`M${o} ${t} L${e} ${r}`;const a=Math.max(Ge,Math.min(ee,n*Oe)),c=(o+e)/2,h=(t+r)/2+a;return`M${o} ${t} Q${c} ${h} ${e} ${r}`}class ze extends HTMLElement{static observedAttributes=["mode","taut-from-x","taut-from-y","taut-to-x","taut-to-y"];#t;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#i()}attributeChangedCallback(){this.#i(),this.isConnected&&this.#r()}connectedCallback(){this.#r()}#e(){return this.getAttribute("mode")==="taut"?"taut":"coil"}#i(){this.#e()==="taut"?this.#s():this.#o()}#r(){this.#e()==="taut"?(this.tabIndex=-1,this.setAttribute("aria-hidden","true"),this.removeAttribute("role"),this.removeAttribute("aria-label")):(this.tabIndex=0,this.setAttribute("role","button"),this.setAttribute("aria-label","Нить, 1 м. Используется для подвеса цилиндров."),this.removeAttribute("aria-hidden"))}#o(){this.#t.innerHTML=qe}#s(){const t=Number(this.getAttribute("taut-from-x")??0),e=Number(this.getAttribute("taut-from-y")??0),r=Number(this.getAttribute("taut-to-x")??0),i=Number(this.getAttribute("taut-to-y")??0),s=Math.min(t,r)-4,n=Math.min(e,i)-4,a=Math.max(t,r)+4,c=Math.max(e,i)+ee+4,h=Math.max(1,a-s),l=Math.max(1,c-n),d=We(t-s,e-n,r-s,i-n);this.#t.innerHTML=`
<style id="thread-style">
  :host {
    /* Декоративный overlay: позиционируется тем, кто его монтирует. */
    display: block;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    width: ${h}px;
    height: ${l}px;
    /* Сдвиг, чтобы svg визуально совпал с координатами from/to host-space. */
    transform: translate(${s}px, ${n}px);
  }
  .taut-svg { width: 100%; height: 100%; display: block; overflow: visible; }
  .taut-line {
    fill: none;
    stroke: #d8c890;
    stroke-width: 1.2;
    stroke-linecap: round;
    /* Лёгкая тень для читаемости на любом фоне. */
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25));
  }
</style>
<svg class="taut-svg" viewBox="0 0 ${h} ${l}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path class="taut-line" d="${d}" />
</svg>
`}}customElements.define("lab-thread",ze);const re=document.createElement("template");re.innerHTML=`
<style>
  :host {
    display: inline-block;
    width: 70px;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.3));
  }
  :host(:hover) { filter: drop-shadow(0 7px 10px rgb(0 0 0 / 0.45)); }
  :host(:focus-visible) { outline: none; }
  :host(:focus-visible) .focus-ring { opacity: 1; }
  .frame { width: 100%; height: auto; display: block; pointer-events: none; }
  .label-text {
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 5.5px;
    font-weight: 800;
    fill: #2a2d36;
    text-anchor: middle;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .focus-ring {
    fill: none;
    stroke: var(--color-brand-orange, #ffbe0b);
    stroke-width: 3;
    stroke-dasharray: 5 3;
    opacity: 0;
  }
</style>
<svg class="frame" viewBox="0 0 70 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="saltJar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0.7)" />
      <stop offset="50%" stop-color="rgba(255,255,255,0.95)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.7)" />
    </linearGradient>
    <linearGradient id="saltCap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3da17a" />
      <stop offset="100%" stop-color="#287353" />
    </linearGradient>
    <linearGradient id="stickWood" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a07840" />
      <stop offset="50%" stop-color="#d6a360" />
      <stop offset="100%" stop-color="#7a5c30" />
    </linearGradient>
  </defs>

  <!-- Палочка (слева, наклонена) -->
  <g transform="translate(8, 12) rotate(-12)">
    <rect x="0" y="0" width="3.5" height="60" rx="1.5" fill="url(#stickWood)" />
    <rect x="0" y="0" width="3.5" height="60" rx="1.5" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.4" />
  </g>

  <!-- Баночка соли -->
  <g transform="translate(22, 14)">
    <!-- Крышка -->
    <rect x="0" y="0" width="36" height="10" rx="2" fill="url(#saltCap)" stroke="#1a4f38" stroke-width="0.6" />
    <line x1="2" y1="3" x2="34" y2="3" stroke="rgba(255,255,255,0.4)" stroke-width="0.5" />
    <!-- Корпус (стеклянный) -->
    <rect x="2" y="9" width="32" height="58" rx="2" fill="url(#saltJar)" stroke="#9aa0a8" stroke-width="0.7" />
    <!-- Соль внутри (мелкие точки) -->
    <g fill="#f5f5f5" opacity="0.85">
      <rect x="4" y="35" width="28" height="30" />
    </g>
    <!-- Текстура соли -->
    <g fill="#cdd1d6" opacity="0.6">
      <circle cx="8" cy="42" r="0.6" />
      <circle cx="14" cy="48" r="0.5" />
      <circle cx="22" cy="40" r="0.7" />
      <circle cx="28" cy="46" r="0.5" />
      <circle cx="11" cy="55" r="0.6" />
      <circle cx="20" cy="58" r="0.5" />
      <circle cx="26" cy="52" r="0.6" />
      <circle cx="6" cy="50" r="0.4" />
      <circle cx="30" cy="60" r="0.5" />
      <circle cx="16" cy="62" r="0.5" />
    </g>
    <!-- Этикетка -->
    <rect x="5" y="22" width="26" height="11" rx="1" fill="white" stroke="#9aa0a8" stroke-width="0.4" />
    <text class="label-text" x="18" y="28">NaCl</text>
    <text class="label-text" x="18" y="32" style="font-size:3.5px">соль</text>
    <!-- Highlight стекла -->
    <rect x="5" y="38" width="2" height="22" rx="1" fill="rgba(255,255,255,0.5)" />
  </g>

  <!-- Тень -->
  <ellipse cx="35" cy="84" rx="22" ry="2.5" fill="rgba(0,0,0,0.3)" />

  <rect class="focus-ring" x="2" y="6" width="66" height="80" rx="3" />
</svg>
`;class je extends HTMLElement{#t;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(re.content.cloneNode(!0)),this.tabIndex=0,this.setAttribute("role","button"),this.setAttribute("aria-label","Поваренная соль и палочка для перемешивания.")}}customElements.define("lab-salt-set",je);const Tt=9.8,ie=1e3;function Ye(o,t){if(!Number.isFinite(o)||!Number.isFinite(t))throw new RangeError(`ρ и V должны быть конечными числами; получено ρ=${o}, V=${t}`);if(t<0)throw new RangeError(`ρ и V должны быть ≥ 0; получено ρ=${o}, V=${t}`);return o*Tt*t}function T(o){if(!Number.isFinite(o))throw new RangeError(`m должна быть конечным числом; получено ${o}`);if(o<0)throw new RangeError(`m должна быть ≥ 0; получено ${o}`);return o*Tt}function j(o,t,e){if(!Number.isFinite(o)||!Number.isFinite(t)||!Number.isFinite(e))throw new RangeError(`P_air, F_A_full и submersionFraction должны быть конечными; получено P_air=${o}, F_A_full=${t}, frac=${e}`);if(o<0||t<0)throw new RangeError(`P_air и F_A_full должны быть ≥ 0; получено P_air=${o}, F_A_full=${t}`);const r=Math.max(0,Math.min(1,e));return Math.max(0,o-t*r)}function Ve(o,t){if(!Number.isFinite(o)||!Number.isFinite(t))throw new RangeError(`P_air и P_liquid должны быть конечными; получено P_air=${o}, P_liquid=${t}`);return o-t}function se(o){if(!Number.isFinite(o))throw new RangeError(`V должно быть конечным; получено ${o}`);return o/1e6}function $(o){if(!Number.isFinite(o))throw new RangeError(`m должно быть конечным; получено ${o}`);return o/1e3}function dt(o){if(o===null||!Number.isFinite(o))return"pending";const t=Math.abs(o);return t<=2?"ok":t<=5?"close":"wrong"}const Nt={ok:"Отличный результат",close:"Близко, попробуйте точнее",wrong:"Проверьте: цилиндр полностью под водой?",pending:""},Ft={ok:"✓",close:"≈",wrong:"✗",pending:""};function P(o,t){return Number.isFinite(o)?o.toFixed(t).replace(".",","):"—"}function Ke(o){return o===null||!Number.isFinite(o)?"—":`${o>=0?"+":"−"}${P(Math.abs(o),1)}`}function Bt(o){const t=se(o.V_cm3),e=ie*Tt*t;let r=null,i=null;return o.P_air_N!==null&&o.P_liquid_N!==null&&(r=Ve(o.P_air_N,o.P_liquid_N),e>0&&(i=(r-e)/e*100)),{F_A_meas_N:r,F_A_theor_N:e,delta_pct:i}}const Ht={No2:"№2",No3:"№3",No4:"№4"};function Dt(o){return o<10?`0${o}`:String(o)}function Ue(){const o=new Date;return`${o.getFullYear()}-${Dt(o.getMonth()+1)}-${Dt(o.getDate())}`}function Xe(o,t,e,r){const i=Ue(),s=e&&e.trim()?e.trim().replace(/[\\/:*?"<>|]+/g,"_"):null,n=["Кит1",`Опыт${o||"1.2"}`,t];return s&&n.push(s),n.push(i),`${n.join("_")}.${r}`}const Je="rgb(6 13 20 / 0.78)",Qe="rgb(255 255 255 / 0.08)",Ze="rgb(255 255 255 / 0.05)",tr="#3ddc97",er="#f5b94a",rr="#ff6b6b",ir=`
  :host {
    display: block;
    --panel-bg: ${Je};
    --panel-border: ${Qe};
    --panel-rule: ${Ze};
    --color-brand-teal: var(--color-brand-teal-override, #38bdaf);
    --color-ok: ${tr};
    --color-close: ${er};
    --color-wrong: ${rr};
    --panel-text: var(--color-text-primary, #e8eef9);
    --panel-text-muted: var(--color-text-secondary, #a8b3c7);
    --panel-radius: var(--radius-lg, 12px);
    --rule-step: 28px;
    --fade-dur: 200ms;
    color: var(--panel-text);
    font-family: var(--font-display, 'Inter', system-ui, sans-serif);
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: var(--panel-radius);
    box-shadow:
      0 8px 24px rgb(0 0 0 / 0.4),
      inset 0 1px 0 rgb(255 255 255 / 0.04);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    overflow: hidden;
  }
  @media (prefers-reduced-motion: reduce) {
    :host { --fade-dur: 0ms; }
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--panel-border);
    background: rgb(56 189 175 / 0.06);
  }
  .title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--panel-text);
  }
  .actions {
    display: inline-flex;
    gap: 6px;
  }
  .btn {
    appearance: none;
    border: 1px solid var(--panel-border);
    background: rgb(255 255 255 / 0.04);
    color: var(--panel-text);
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
  }
  .btn:hover {
    background: rgb(56 189 175 / 0.12);
    border-color: rgb(56 189 175 / 0.4);
    color: #38bdaf;
  }
  .btn:focus-visible {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: 2px;
  }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .formula-card {
    margin: 10px 14px 0;
    padding: 8px 12px;
    background: rgb(56 189 175 / 0.06);
    border: 1px dashed rgb(56 189 175 / 0.3);
    border-radius: 6px;
    font-size: 13px;
    color: var(--panel-text-muted);
    opacity: 0;
    transition: opacity var(--fade-dur) ease-out;
  }
  .formula-card[data-visible="true"] {
    opacity: 1;
  }
  .formula-card[hidden] {
    display: none !important;
  }
  .formula-card .formula {
    font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace);
    color: var(--panel-text);
    font-weight: 600;
    margin-left: 4px;
  }

  .table-wrap {
    padding: 10px 14px 14px;
  }
  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .table thead th {
    text-align: left;
    font-size: 10px;
    font-weight: 600;
    color: var(--panel-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 6px 8px;
    border-bottom: 1px solid var(--panel-border);
    background: transparent;
  }
  .table tbody tr {
    border-bottom: 1px solid var(--panel-rule);
  }
  .table tbody tr:last-child {
    border-bottom: none;
  }
  .table tbody td {
    padding: 6px 8px;
    height: var(--rule-step);
    vertical-align: middle;
    color: var(--panel-text);
  }
  .num {
    font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace);
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }
  .unit {
    /* На тёмном фоне teal #38bdaf даёт контраст ≥ 4.5 — WCAG AA. */
    color: #38bdaf;
    margin-left: 3px;
    font-size: 11px;
    font-variant-numeric: normal;
  }
  .col-num    { width: 36px;  text-align: center; color: var(--panel-text-muted); }
  .col-cyl    { width: 60px; }
  .col-V      { width: 92px; }
  .col-pair   { width: 100px; }
  .col-pliq   { width: 100px; }
  .col-Fmeas  { width: 110px; }
  .col-Ftheor { width: 110px; }
  .col-delta  { width: 78px; }
  .col-status { width: 36px; text-align: center; }
  .col-teach  { width: 110px; }

  .status-cell {
    text-align: center;
    font-weight: 600;
    font-size: 14px;
    cursor: help;
  }
  .status-cell[data-verdict="ok"]    { color: var(--color-ok);    background: rgba(61,220,151,0.10); }
  .status-cell[data-verdict="close"] { color: var(--color-close); background: rgba(245,185,74,0.10); }
  .status-cell[data-verdict="wrong"] { color: var(--color-wrong); background: rgba(255,107,107,0.10); }

  .empty {
    padding: 24px 16px;
    text-align: center;
    color: var(--panel-text-muted);
    font-size: 13px;
    font-style: italic;
  }
  .col-num    { color: var(--panel-text-muted); }

  .summary {
    margin-top: 10px;
    padding: 8px 10px;
    background: rgb(56 189 175 / 0.06);
    border: 1px solid rgb(56 189 175 / 0.25);
    border-radius: 6px;
    font-size: 12px;
    color: var(--panel-text-muted);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .summary strong {
    color: var(--panel-text);
    font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace);
    font-variant-numeric: tabular-nums;
  }

  /* Печать: переключаемся на светлую paper-aesthetic — на бумаге
     тёмный glass читается плохо, нужен высокий контраст для учителя.
     Тонкая голубая линейка имитирует тетрадный лист. */
  @media print {
    :host {
      background: #fdfcf7 !important;
      color: #1f2933 !important;
      border-color: #000 !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
    }
    .header { background: transparent !important; border-color: #d4dde8 !important; }
    .title { color: #1f2933 !important; }
    .table thead th { color: #5b6b7c !important; border-color: #d4dde8 !important; }
    .table tbody td { color: #1f2933 !important; }
    .table tbody tr { border-color: #d4dde8 !important; }
    .unit { color: #0d6e62 !important; }
    .formula-card { background: #fff !important; border-color: #c8d2dc !important; color: #5b6b7c !important; }
    .formula-card .formula { color: #1f2933 !important; }
    .summary { background: #f6f8fb !important; border-color: #d4dde8 !important; color: #5b6b7c !important; }
    .summary strong { color: #1f2933 !important; }
    .actions { display: none !important; }
  }
`,St=";",qt=["№","Цилиндр","V (см³)","P_возд (Н)","P_жид (Н)","F_A_изм (Н)","F_A_теор (Н)","Δ (%)","Статус","V_воды (мл)","Жидкость","Время"],sr=["F_A_теор_учитель (Н)","Оценка (%)"];function oe(o){return o.includes(St)||o.includes('"')||o.includes(`
`)?`"${o.replace(/"/g,'""')}"`:o}function or(o){return o==null?"":oe(typeof o=="number"?P(o,4):String(o))}class nr extends HTMLElement{static observedAttributes=["role","data-role","experiment-id","student-name"];#t=[];#e;#i=0;constructor(){super(),this.#e=this.attachShadow({mode:"open"})}connectedCallback(){this.#c()}attributeChangedCallback(){this.#e.childNodes.length&&this.#c()}getRows(){return this.#t.slice()}addRow(t){const e=Bt(t),r=Date.now(),i=r>this.#i?r:this.#i+1;this.#i=i;const s={...t,F_A_meas_N:e.F_A_meas_N,F_A_theor_N:e.F_A_theor_N,delta_pct:e.delta_pct,timestamp:i};return this.#t.push(s),this.#c(),this.dispatchEvent(new CustomEvent("row-added",{detail:{row:s},bubbles:!0,composed:!0})),i}updateRow(t,e){const r=this.#t.findIndex(a=>a.timestamp===t);if(r<0)return;const i=this.#t[r],s={...i,...e,timestamp:i.timestamp,context:e.context?{...i.context,...e.context}:i.context},n=Bt({V_cm3:s.V_cm3,P_air_N:s.P_air_N,P_liquid_N:s.P_liquid_N});s.F_A_meas_N=n.F_A_meas_N,s.F_A_theor_N=n.F_A_theor_N,s.delta_pct=n.delta_pct,this.#t[r]=s,this.#c()}removeRow(t){const e=this.#t.findIndex(r=>r.timestamp===t);e<0||(this.#t.splice(e,1),this.#c(),this.dispatchEvent(new CustomEvent("row-removed",{detail:{ts:t},bubbles:!0,composed:!0})))}clear(){this.#t.length!==0&&(this.#t=[],this.#c(),this.dispatchEvent(new CustomEvent("cleared",{bubbles:!0,composed:!0})))}exportPDF(t){const e=document.body;e.classList.add("printing-journal");const r=()=>{e.classList.remove("printing-journal"),window.removeEventListener("afterprint",r)};window.addEventListener("afterprint",r);try{window.print()}finally{typeof window.requestAnimationFrame=="function"?window.requestAnimationFrame(()=>r()):r()}this.dispatchEvent(new CustomEvent("exported",{detail:{format:"pdf"},bubbles:!0,composed:!0}))}exportCSV(t){const e=this.#r(),r=this.getAttribute("experiment-id")??"1.2",i=this.getAttribute("student-name"),s=t??Xe(r,e,i,"csv"),n=this.#a(e),a=new Blob(["\uFEFF",n],{type:"text/csv;charset=utf-8"}),c=URL.createObjectURL(a),h=document.createElement("a");h.href=c,h.download=s,h.style.display="none",document.body.appendChild(h),h.click(),document.body.removeChild(h),typeof URL.revokeObjectURL=="function"&&URL.revokeObjectURL(c),this.dispatchEvent(new CustomEvent("exported",{detail:{format:"csv",filename:s},bubbles:!0,composed:!0}))}#r(){return(this.getAttribute("data-role")??this.getAttribute("role")??"student")==="teacher"?"teacher":"student"}#o(){return this.#t.some(t=>t.P_air_N!==null&&t.P_liquid_N!==null)}#s(){if(this.#t.length===0)return 0;const t=this.#t.filter(e=>e.delta_pct!==null&&dt(e.delta_pct)==="ok").length;return Math.round(t/this.#t.length*100)}#a(t){const r=[(t==="teacher"?[...qt,...sr]:qt).map(oe).join(St)];for(let i=0;i<this.#t.length;i++){const s=this.#t[i],n=dt(s.delta_pct),a=[i+1,Ht[s.cylinder],s.V_cm3,s.P_air_N,s.P_liquid_N,s.F_A_meas_N,s.F_A_theor_N,s.delta_pct,n==="pending"?"":Ft[n],s.context.V_water_ml,s.context.liquid,new Date(s.timestamp).toISOString()];t==="teacher"&&(a.push(s.F_A_theor_N),a.push(this.#s())),r.push(a.map(or).join(St))}return r.join(`\r
`)}#c(){const e=this.#r()==="teacher",r=this.#t.length>0,i=this.#o(),s=['<th class="col-num" role="columnheader" scope="col">№</th>','<th class="col-cyl" role="columnheader" scope="col">Цилиндр</th>','<th class="col-V" role="columnheader" scope="col">V <span class="unit">см³</span></th>','<th class="col-pair" role="columnheader" scope="col">P_возд <span class="unit">Н</span></th>','<th class="col-pliq" role="columnheader" scope="col">P_жид <span class="unit">Н</span></th>','<th class="col-Fmeas" role="columnheader" scope="col">F_A_изм <span class="unit">Н</span></th>','<th class="col-Ftheor" role="columnheader" scope="col">F_A_теор <span class="unit">Н</span></th>','<th class="col-delta" role="columnheader" scope="col">Δ <span class="unit">%</span></th>','<th class="col-status" role="columnheader" scope="col" aria-label="Статус">·</th>'];e&&s.push('<th class="col-teach" role="columnheader" scope="col">F_A табл. <span class="unit">Н</span></th>');const n=this.#t.map((d,p)=>{const u=dt(d.delta_pct),f=[`<td class="col-num num">${p+1}</td>`,`<td class="col-cyl">${Ht[d.cylinder]}</td>`,`<td class="col-V num">${P(d.V_cm3,1)}</td>`,`<td class="col-pair num">${d.P_air_N===null?"—":P(d.P_air_N,2)}</td>`,`<td class="col-pliq num">${d.P_liquid_N===null?"—":P(d.P_liquid_N,2)}</td>`,`<td class="col-Fmeas num">${d.F_A_meas_N===null?"—":P(d.F_A_meas_N,3)}</td>`,`<td class="col-Ftheor num">${P(d.F_A_theor_N,3)}</td>`,`<td class="col-delta num">${Ke(d.delta_pct)}</td>`,u==="pending"?'<td class="col-status status-cell" aria-label="Нет данных"></td>':`<td class="col-status status-cell" data-verdict="${u}" title="${Nt[u]}" aria-label="${Nt[u]}">${Ft[u]}</td>`];return e&&f.push(`<td class="col-teach num">${P(d.F_A_theor_N,3)}</td>`),`<tr role="row" data-ts="${d.timestamp}">${f.join("")}</tr>`}).join(""),a=`
      <table class="table" role="table" aria-label="Журнал измерений архимедовой силы">
        <thead role="rowgroup">
          <tr role="row">
            ${s.join(`
            `)}
          </tr>
        </thead>
        <tbody role="rowgroup">
          ${n}
        </tbody>
      </table>
    `,c=e?`<div class="summary" role="status">
           <span>Оценка по доле ✓</span>
           <strong>${this.#s()}%</strong>
         </div>`:"";this.#e.innerHTML=`
      <style>${ir}</style>
      <header class="header">
        <h3 class="title" id="journal-title">Журнал · опыт ${this.getAttribute("experiment-id")??"1.2"} «Архимед»</h3>
        <div class="actions">
          <button class="btn" type="button" data-action="csv" aria-label="Экспорт CSV">CSV</button>
          <button class="btn" type="button" data-action="pdf" aria-label="Экспорт PDF (печать)">PDF</button>
        </div>
      </header>
      <div class="formula-card" data-visible="${i}" ${i?"":"hidden"}>
        У вас есть P_возд и P_жид —
        <span class="formula">F_A = P_возд − P_жид</span>
      </div>
      <div class="table-wrap">
        ${r?a:'<div class="empty">Записей пока нет. Подвесьте цилиндр, снимите P_возд и P_жид.</div>'}
        ${c}
      </div>
    `;const h=this.#e.querySelector('[data-action="csv"]'),l=this.#e.querySelector('[data-action="pdf"]');h&&(h.disabled=!r,h.addEventListener("click",()=>this.exportCSV())),l&&(l.disabled=!r,l.addEventListener("click",()=>this.exportPDF()))}}customElements.get("lab-journal")||customElements.define("lab-journal",nr);const ar=3,lr=8,Ot=24,cr=24,Gt=200,ht=150,Wt=5e3,dr={info:"#38bdaf",success:"#10b981",warning:"#f59e0b",error:"#ef4444"};function ut(){if(typeof window>"u"||typeof window.matchMedia!="function")return!1;try{return window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch{return!1}}class H extends HTMLElement{static observedAttributes=["message","action-label","duration","severity"];#t;#e=null;#i=null;#r=null;#o=null;#s=null;#a=0;#c=0;#n=!1;#l=t=>{t.key==="Escape"&&this.#n&&(t.stopPropagation(),this.dismiss("esc"))};constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#m()}connectedCallback(){this.hasAttribute("tabindex")||this.setAttribute("tabindex","0"),this.addEventListener("keydown",this.#l),this.#p()}disconnectedCallback(){this.#f(),this.removeEventListener("keydown",this.#l)}attributeChangedCallback(){this.#m(),this.#p()}show(){if(this.#n)return;if(H.#w(),this.#n=!0,this.dataset.shown="",this.#p(),H.#v(),this.#o){const e=ut();this.#o.style.transition=e?"none":`transform ${Gt}ms ease-out, opacity ${Gt}ms ease-out`,this.#o.style.transform="translateX(120%)",this.#o.style.opacity="0",requestAnimationFrame(()=>{this.#o&&(this.#o.style.transform="translateX(0)",this.#o.style.opacity="1")})}const t=this.#u();t>0&&(this.#a=t,this.#x())}dismiss(t="manual"){if(!this.#n)return;this.#n=!1,delete this.dataset.shown,this.#f();const e=ut(),r=()=>{H.#v(),this.dispatchEvent(new CustomEvent("dismissed",{detail:{reason:t},bubbles:!0,composed:!0})),this.remove()};this.#o&&!e?(this.#o.style.transition=`transform ${ht}ms ease-in, opacity ${ht}ms ease-in`,this.#o.style.transform="translateX(120%)",this.#o.style.opacity="0",window.setTimeout(r,ht)):r()}pauseTimer(){if(this.#s===null)return;const t=this.#h()-this.#c;if(this.#a=Math.max(0,this.#a-t),window.clearTimeout(this.#s),this.#s=null,this.#r){const e=window.getComputedStyle(this.#r).transform;this.#r.style.transition="none",this.#r.style.transform=e&&e!=="none"?e:this.#r.style.transform}}resumeTimer(){this.#s===null&&(this.#a<=0||this.#n&&this.#x())}#h(){return Date.now()}#u(){const t=this.getAttribute("duration");if(t===null)return Wt;const e=Number(t);return!Number.isFinite(e)||e<0?Wt:e}#y(){const t=this.getAttribute("severity");return t==="success"||t==="warning"||t==="error"?t:"info"}#g(){return this.getAttribute("message")??""}#b(){return this.getAttribute("action-label")??""}#x(){if(!(this.#a<=0))if(this.#c=this.#h(),this.#s=window.setTimeout(()=>{this.#s=null,this.#a=0,this.dismiss("timeout")},this.#a),this.#r&&!ut()){const t=this.#u(),e=t>0?this.#a/t:0;this.#r.style.transition="none",this.#r.style.transform=`scaleX(${e})`,requestAnimationFrame(()=>{this.#r&&(this.#r.style.transition=`transform ${this.#a}ms linear`,this.#r.style.transform="scaleX(0)")})}else this.#r&&(this.#r.style.transition="none",this.#r.style.transform="scaleX(0)")}#f(){this.#s!==null&&(window.clearTimeout(this.#s),this.#s=null)}#p(){if(!this.isConnected)return;this.#y()==="error"?(this.setAttribute("role","alert"),this.setAttribute("aria-live","assertive")):(this.setAttribute("role","status"),this.setAttribute("aria-live","polite")),this.setAttribute("aria-atomic","true")}#m(){const t=this.#y(),e=dr[t],r=this.#g(),i=this.#b();this.#t.innerHTML=`
<style>
  :host {
    position: fixed;
    right: ${cr}px;
    bottom: ${Ot}px;
    z-index: var(--z-toast, 600);
    display: block;
    /* Когда не показан — невидим, но в DOM (чтобы успеть навесить show()). */
    visibility: hidden;
    pointer-events: none;
  }
  :host([data-shown]) {
    visibility: visible;
    pointer-events: auto;
  }
  .toast {
    box-sizing: border-box;
    min-width: 280px;
    max-width: 360px;
    padding: 12px 16px;
    background: var(--color-surface-elevated, #1a1f2e);
    border-left: 4px solid ${e};
    border-radius: var(--radius-md, 8px);
    box-shadow: var(--shadow-lg, 0 10px 30px rgb(0 0 0 / 0.5));
    color: var(--color-text-primary, #e8eef9);
    font-family: var(--font-display, system-ui, -apple-system, sans-serif);
    font-size: 14px;
    line-height: 1.45;
    display: grid;
    grid-template-columns: 1fr auto auto;
    grid-template-rows: 1fr auto;
    column-gap: 12px;
    align-items: center;
    position: relative;
    overflow: hidden;
    will-change: transform, opacity;
  }
  .message {
    grid-row: 1;
    grid-column: 1;
    word-break: break-word;
  }
  .action-btn {
    grid-row: 1;
    grid-column: 2;
    appearance: none;
    background: transparent;
    border: 1px solid transparent;
    color: ${e};
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 8px 12px;
    min-width: 44px;
    min-height: 44px;
    border-radius: var(--radius-sm, 4px);
    cursor: pointer;
    transition: background var(--dur-fast, 150ms) var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1));
  }
  .action-btn:hover { background: rgb(255 255 255 / 0.08); }
  .action-btn:focus-visible {
    outline: 2px solid ${e};
    outline-offset: 2px;
  }
  .close-btn {
    grid-row: 1;
    grid-column: 3;
    appearance: none;
    background: transparent;
    border: none;
    color: var(--color-text-secondary, #b8c0cc);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm, 4px);
    transition: background var(--dur-fast, 150ms) var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1)),
                color var(--dur-fast, 150ms) var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1));
  }
  .close-btn:hover { background: rgb(255 255 255 / 0.08); color: var(--color-text-primary, #e8eef9); }
  .close-btn:focus-visible {
    outline: 2px solid var(--color-text-secondary, #b8c0cc);
    outline-offset: 2px;
  }
  .progress {
    grid-row: 2;
    grid-column: 1 / -1;
    height: 2px;
    background: ${e};
    transform-origin: left center;
    transform: scaleX(1);
    margin-top: 10px;
    margin-left: -16px;
    margin-right: -16px;
    margin-bottom: -12px;
    /* width устанавливается контейнером; transform управляет прогрессом. */
  }
  /* Скрываем полоску для duration=0 (не закрывается сам). */
  :host([data-no-progress]) .progress { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .toast { transition: none !important; }
    .progress { transition: none !important; }
  }
</style>
<div class="toast" part="toast">
  <span class="message" part="message">${Et(r)}</span>
  ${i?`<button type="button" class="action-btn" part="action-btn" aria-label="${hr(i)}">${Et(i)}</button>`:""}
  <button type="button" class="close-btn" part="close-btn" aria-label="Закрыть">×</button>
  <div class="progress" part="progress" aria-hidden="true"></div>
</div>
`,this.#o=this.#t.querySelector(".toast"),this.#e=this.#t.querySelector(".action-btn"),this.#i=this.#t.querySelector(".close-btn"),this.#r=this.#t.querySelector(".progress"),this.#u()===0?this.setAttribute("data-no-progress",""):this.removeAttribute("data-no-progress"),this.#e?.addEventListener("click",()=>{this.dispatchEvent(new CustomEvent("action-clicked",{bubbles:!0,composed:!0}))}),this.#i?.addEventListener("click",()=>this.dismiss("manual")),this.addEventListener("mouseenter",()=>this.pauseTimer()),this.addEventListener("mouseleave",()=>this.resumeTimer()),this.addEventListener("focusin",()=>this.pauseTimer()),this.addEventListener("focusout",()=>{window.setTimeout(()=>{this.contains(document.activeElement)||this.resumeTimer()},0)})}static#w(){const t=Array.from(document.querySelectorAll("lab-toast[data-shown]"));for(;t.length>=ar;)t.shift()?.dismiss("manual")}static#v(){const t=Array.from(document.querySelectorAll("lab-toast[data-shown]"));for(let e=0;e<t.length;e++){const r=t[t.length-1-e];if(!r)continue;const s=r.shadowRoot?.querySelector(".toast")?.offsetHeight??64;r.style.bottom=`${Ot+e*(s+lr)}px`}}}function Et(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function hr(o){return Et(o)}customElements.get("lab-toast")||customElements.define("lab-toast",H);const ur={density:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="11" y="6" width="10" height="20" rx="1.5" />
      <path d="M16 6 L16 3" />
      <circle cx="16" cy="2" r="1.5" />
      <line x1="13" y1="10" x2="15" y2="10" />
      <line x1="13" y1="14" x2="15" y2="14" />
      <line x1="13" y1="18" x2="15" y2="18" />
      <line x1="13" y1="22" x2="15" y2="22" />
    </svg>`,liquid:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M16 4 C 22 12, 24 18, 16 26 C 8 18, 10 12, 16 4 Z" fill="currentColor" fill-opacity="0.18" />
    </svg>`,archimedes:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M8 6 L24 6 L22 26 L10 26 Z" />
      <path d="M9.4 16 L22.6 16" />
      <rect x="13" y="12" width="6" height="8" fill="currentColor" fill-opacity="0.18" />
      <path d="M16 14 L16 8" />
      <path d="M14 10 L16 8 L18 10" />
    </svg>`,float:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 18 L29 18" />
      <path d="M3 18 Q 8 16, 13 18 T 23 18 T 29 18" stroke-opacity="0.5" />
      <rect x="11" y="13" width="10" height="6" fill="currentColor" fill-opacity="0.18" />
    </svg>`,hydrometer:`
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="16" y1="3" x2="16" y2="20" />
      <circle cx="16" cy="24" r="4" fill="currentColor" fill-opacity="0.18" />
      <line x1="14" y1="7"  x2="16" y2="7" />
      <line x1="14" y1="11" x2="16" y2="11" />
      <line x1="14" y1="15" x2="16" y2="15" />
    </svg>`},zt={check:`
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 8.5 L6.5 12 L13 4.5" />
    </svg>`,lock:`
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7 V5 a2.5 2.5 0 0 1 5 0 V7" />
    </svg>`},ne=document.createElement("template");ne.innerHTML=`
<style>
  :host {
    display: block;
    position: relative;
    width: 100%;
    background: var(--color-surface-elevated, #1a1f2e);
    border-bottom: 1px solid var(--color-border, rgb(255 255 255 / 0.08));
    /* высота 56px управляется содержимым: padding + line-height */
    z-index: 100;
  }

  /* Прогресс-полоска по комплекту: ambient, без цифр (research §2). */
  .kit-progress {
    position: absolute;
    top: 0;
    left: 0;
    height: 2px;
    width: var(--progress, 0%);
    background: var(--color-brand-teal, #14b8a6);
    transition: width var(--dur-base, 250ms) var(--ease-out, ease-out);
    pointer-events: none;
  }

  .nav {
    display: flex;
    align-items: stretch;
    height: 56px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 16px;
  }

  .screens {
    display: flex;
    align-items: stretch;
    gap: 0;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scrollbar-width: none; /* Firefox */
  }
  .screens::-webkit-scrollbar { display: none; }

  button {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    border: 0;
    border-bottom: 3px solid transparent;
    border-radius: 0;
    margin: 0;
    padding: 0 14px;
    cursor: pointer;
    color: var(--color-text-secondary, #a8b3c7);
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 13px;
    font-weight: 500;
    line-height: 1.2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 92px;
    height: 100%;
    scroll-snap-align: start;
    flex-shrink: 0;
    transition:
      color var(--dur-fast, 160ms) var(--ease-out, ease-out),
      background-color var(--dur-fast, 160ms) var(--ease-out, ease-out),
      border-color var(--dur-fast, 160ms) var(--ease-out, ease-out);
  }
  button:focus-visible {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: -3px;
  }

  .icon-wrap { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; flex-shrink: 0; }
  .icon-wrap svg { width: 18px; height: 18px; }

  .kicker {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--color-brand-orange, #ffbe0b);
    line-height: 1;
  }
  .label {
    font-size: 13px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }
  .state-icon {
    display: inline-flex;
    width: 14px;
    height: 14px;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .state-icon svg { width: 14px; height: 14px; }

  /* ─── Состояния ─────────────────────────────────────────────── */

  /* available — нейтральный, hover poke */
  button[data-state='available']:hover {
    color: var(--color-text-primary, #e8eef9);
    background: rgb(255 255 255 / 0.03);
  }

  /* current — gold underline + tinted bg + bold */
  button[data-state='current'] {
    color: var(--color-text-primary, #e8eef9);
    font-weight: 700;
    border-bottom-color: var(--color-brand-orange, #ffbe0b);
    background: color-mix(in oklch, var(--color-brand-orange, #ffbe0b) 6%, transparent);
  }
  button[data-state='current'] .kicker {
    color: var(--color-brand-orange, #ffbe0b);
  }

  /* done — teal checkmark рядом с лейблом, нормальный вес, hover тот же */
  button[data-state='done'] {
    color: var(--color-text-secondary, #a8b3c7);
  }
  button[data-state='done'] .state-icon {
    color: var(--color-brand-teal, #14b8a6);
  }
  button[data-state='done']:hover {
    color: var(--color-text-primary, #e8eef9);
    background: rgb(255 255 255 / 0.03);
  }

  /* locked — приглушённый, замочек, курсор not-allowed */
  button[data-state='locked'] {
    color: var(--color-text-muted, #6b7280);
    cursor: not-allowed;
  }
  button[data-state='locked'] .kicker { color: var(--color-text-muted, #6b7280); }
  button[data-state='locked'] .state-icon { color: var(--color-text-muted, #6b7280); }
  button[data-state='locked']:hover { background: transparent; color: var(--color-text-muted, #6b7280); }

  /* Мобильный: тот же горизонтальный layout, но без обрезания лейблов до конца */
  @media (max-width: 900px) {
    .nav { padding: 0 8px; }
    button { min-width: 88px; padding: 0 12px; gap: 6px; }
    .label { max-width: 120px; font-size: 12px; }
  }
  @media (max-width: 720px) {
    button { min-width: 78px; padding: 0 10px; }
    .label { max-width: 96px; }
  }
</style>

<div class="kit-progress" part="kit-progress" aria-hidden="true"></div>
<nav class="nav" role="tablist" aria-label="Опыты комплекта">
  <div class="screens" role="presentation"></div>
</nav>
`;class pr extends HTMLElement{static observedAttributes=["active"];#t;#e;#i;#r=[];#o={};constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(ne.content.cloneNode(!0)),this.#e=this.#t.querySelector(".screens"),this.#i=this.#t.querySelector(".kit-progress"),this.#t.addEventListener("click",this.#a)}attributeChangedCallback(t){t==="active"&&this.#s()}setScreens(t){this.#e.replaceChildren(),this.#r=t.map(e=>{const r=document.createElement("button");return r.type="button",r.dataset.screenId=e.id,r.setAttribute("role","tab"),r.title=e.tooltip,r.innerHTML=`
        <span class="kicker">${e.kicker}</span>
        <span class="icon-wrap">${ur[e.icon]}</span>
        <span class="label">${e.label}</span>
        <span class="state-icon" aria-hidden="true"></span>
      `,this.#e.appendChild(r),{id:e.id,meta:e,el:r,state:"available"}}),this.#s()}setStates(t){this.#o={...t},this.#s()}setProgress(t){const e=Math.max(0,Math.min(100,Number.isFinite(t)?t:0));this.#i.style.setProperty("--progress",`${e}%`)}#s(){const t=this.getAttribute("active");for(const e of this.#r){const i=this.#o[e.id]??(e.id===t?"current":"available");e.state=i,e.el.dataset.state=i,i==="current"?(e.el.setAttribute("aria-current","page"),e.el.removeAttribute("aria-disabled"),e.el.tabIndex=0,e.el.setAttribute("aria-label",`${e.meta.kicker} ${e.meta.label}`)):i==="done"?(e.el.removeAttribute("aria-current"),e.el.removeAttribute("aria-disabled"),e.el.tabIndex=-1,e.el.setAttribute("aria-label",`${e.meta.kicker} ${e.meta.label}, выполнен`)):i==="locked"?(e.el.removeAttribute("aria-current"),e.el.setAttribute("aria-disabled","true"),e.el.tabIndex=-1,e.el.setAttribute("aria-label",`${e.meta.kicker} ${e.meta.label}, недоступен. Завершите предыдущий опыт`),e.el.title="Завершите предыдущий опыт"):(e.el.removeAttribute("aria-current"),e.el.removeAttribute("aria-disabled"),e.el.tabIndex=-1,e.el.setAttribute("aria-label",`${e.meta.kicker} ${e.meta.label}`),e.el.title=e.meta.tooltip);const s=e.el.querySelector(".state-icon");s&&(i==="done"?s.innerHTML=zt.check:i==="locked"?s.innerHTML=zt.lock:s.innerHTML="")}}#a=t=>{const e=t.target.closest("button");if(!e||e.dataset.state==="locked")return;const r=e.dataset.screenId;r&&this.dispatchEvent(new CustomEvent("screen-select",{detail:{id:r},bubbles:!0,composed:!0}))}}customElements.define("lab-kit-nav",pr);const ae=document.createElement("template");ae.innerHTML=`
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

  .breadcrumb {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-secondary, #a8b3c7);
    text-decoration: none;
    background: transparent;
    border: 0;
    padding: 4px 8px;
    margin-left: -8px; /* визуально выравниваем по краю текста, не padding */
    border-radius: 6px;
    cursor: pointer;
    transition:
      color var(--dur-fast, 160ms) var(--ease-out, ease-out),
      background-color var(--dur-fast, 160ms) var(--ease-out, ease-out);
  }
  .breadcrumb:hover {
    color: var(--color-text-primary, #e8eef9);
    background: rgb(255 255 255 / 0.04);
  }
  .breadcrumb:focus-visible {
    outline: 2px solid var(--color-brand-orange, #ffbe0b);
    outline-offset: 2px;
  }
  .breadcrumb .arrow {
    display: inline-block;
    width: 14px;
    text-align: center;
    line-height: 1;
  }

  .kit-label {
    margin-top: 2px;
    font-family: var(--font-display, system-ui, sans-serif);
    font-size: 11px;
    color: var(--color-text-muted, #6b7280);
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
    .right { display: none; }
    .row { grid-template-columns: auto 1fr; padding: 8px 12px; gap: 10px; }
    .kit-label { display: none; }
    .breadcrumb { font-size: 12px; padding: 4px 6px; margin-left: -6px; }
    .exp-title { font-size: 15px; }
  }
</style>
<div class="row">
  <div class="left">
    <a class="breadcrumb" href="#" id="home-link" role="link" aria-label="Назад ко всем комплектам">
      <span class="arrow" aria-hidden="true">←</span>
      <span>Все комплекты</span>
    </a>
    <div class="kit-label">Комплект №1 · Гидростатика</div>
  </div>
  <div class="center">
    <div class="exp-kicker" id="kicker"></div>
    <div class="exp-title" id="title"></div>
  </div>
  <div class="right">
    <div class="spec">ФИПИ ОГЭ-2026</div>
  </div>
</div>
`;class fr extends HTMLElement{static observedAttributes=["experiment","experiment-kicker","home-href"];#t;#e;#i;#r;constructor(){super(),this.#t=this.attachShadow({mode:"open"}),this.#t.appendChild(ae.content.cloneNode(!0)),this.#e=this.#t.getElementById("title"),this.#i=this.#t.getElementById("kicker"),this.#r=this.#t.getElementById("home-link"),this.#r.addEventListener("click",this.#o)}attributeChangedCallback(t){if(t==="experiment")this.#e.textContent=this.getAttribute("experiment")??"";else if(t==="experiment-kicker")this.#i.textContent=this.getAttribute("experiment-kicker")??"";else if(t==="home-href"){const e=this.getAttribute("home-href");e?this.#r.setAttribute("href",e):this.#r.setAttribute("href","#")}}#o=t=>{t.button!==0||t.ctrlKey||t.metaKey||t.shiftKey||t.altKey||(t.preventDefault(),this.dispatchEvent(new CustomEvent("home-click",{bubbles:!0,composed:!0})))}}customElements.define("lab-kit-header",fr);const pt="screen";class mr{#t;#e;constructor(t,e){this.#e=new Set(t),this.#t=e,window.addEventListener("popstate",this.#r)}start(){this.#i(this.read())}destroy(){window.removeEventListener("popstate",this.#r)}read(){const e=new URLSearchParams(window.location.search).get(pt);return e&&this.#e.has(e)?e:null}navigate(t){if(!this.#e.has(t))throw new RangeError(`Router.navigate: неизвестный screenId «${t}»`);const e=new URLSearchParams(window.location.search);if(e.get(pt)===t)return;e.set(pt,t);const r=`${window.location.pathname}?${e.toString()}${window.location.hash}`;window.history.replaceState({screen:t},"",r),this.#i(t)}#i(t){this.#t(t)}#r=()=>{this.#i(this.read())}}let br=class{#t;#e;#i;#r=null;#o;#s;#a=null;constructor(t,e,r,i){this.#t=t,this.#s=i,this.#e=new Map;for(const n of e)this.#e.set(n.meta.id,n);if(!this.#e.has(r))throw new RangeError(`KitShell: defaultId «${r}» не найден в реестре экранов`);this.#o=r;const s=e.map(n=>n.meta.id);this.#i=new mr(s,n=>{const a=n??this.#o;this.#c(a)})}onScreenChanged(t){this.#a=t}get activeId(){return this.#r}get screens(){return[...this.#e.values()]}start(){window.addEventListener("beforeunload",this.#h),this.#i.start()}navigate(t){this.#i.navigate(t)}destroy(){if(window.removeEventListener("beforeunload",this.#h),this.#i.destroy(),this.#r){const t=this.#e.get(this.#r);t&&(this.#n(t),t.unmount())}this.#r=null}async#c(t){if(this.#r===t)return;const e=this.#e.get(t);if(!e){this.#c(this.#o);return}if(this.#r){const r=this.#e.get(this.#r);if(r){this.#n(r);try{await r.unmount()}catch(i){console.error("KitShell: unmount failed",i)}}}this.#t.replaceChildren();try{await e.mount(this.#t)}catch(r){console.error("KitShell: mount failed",r);return}this.#l(e),this.#r=t,this.#a?.(t)}#n(t){if(typeof t.saveState=="function")try{const e=t.saveState(),r=`${this.#s}:${t.meta.id}`;e==null?localStorage.removeItem(r):localStorage.setItem(r,JSON.stringify(e))}catch(e){console.warn("KitShell: saveState failed",e)}}#l(t){if(typeof t.loadState=="function")try{const e=localStorage.getItem(`${this.#s}:${t.meta.id}`);if(!e)return;const r=JSON.parse(e);t.loadState(r)}catch(e){console.warn("KitShell: loadState failed",e)}}#h=()=>{if(!this.#r)return;const t=this.#e.get(this.#r);t&&this.#n(t)}};const gr="kit-1-hydrostatics:screen";class yr extends br{constructor(t,e,r){super(t,e,r,gr)}}const xr=[{id:1,material:"steel",V_cm3:25,V_tolerance_cm3:.3,m_g:195,m_tolerance_g:2},{id:2,material:"aluminum",V_cm3:25,V_tolerance_cm3:.7,m_g:70,m_tolerance_g:2},{id:3,material:"plastic",V_cm3:56,V_tolerance_cm3:1.8,m_g:66,m_tolerance_g:2},{id:4,material:"aluminum",V_cm3:34,V_tolerance_cm3:.7,m_g:95,m_tolerance_g:2}],L=new Map(xr.map(o=>[o.id,o])),wr=10;class vr{#t=[];#e;constructor(t=wr){if(!Number.isFinite(t)||t<1)throw new RangeError(`maxDepth must be a finite positive integer, got ${t}`);this.#e=Math.floor(t)}push(t){for(this.#t.push(t);this.#t.length>this.#e;)this.#t.shift()}undo(){const t=this.#t.pop();return t?(t.undo(),t):null}size(){return this.#t.length}clear(){this.#t.length=0}peek(t){const e=this.#t[this.#t.length-1];return!e||t!==void 0&&e.id!==t?null:e}}const kr={inactivityTimeoutMs:6e3,failedDropsThreshold:3,ambientPulseDurationMs:1500,recordMode:"semi-auto"},jt={idle:"dynamometer-1","dyno-on-scene":"cyl-3","cyl-attached":null,"air-recorded":"beaker","beaker-on-scene":null,"water-poured":null,"cyl-in-water":null,"liquid-recorded":null},Ar={idle:"Возьмите динамометр и поставьте его на сцену.","dyno-on-scene":"Подвесьте цилиндр на крючок динамометра.","cyl-attached":"Запишите вес цилиндра в воздухе — нажмите «Записать P возд».","air-recorded":"Возьмите стакан со стола и поставьте на сцену.","beaker-on-scene":"Налейте воду в стакан — нажмите на стакан и выберите объём.","water-poured":"Опустите динамометр с цилиндром в воду.","cyl-in-water":"Запишите P жид — F_A появится автоматически.","liquid-recorded":"Готово. Повторите с другим цилиндром или сбросьте опыт."},_r={idle:"Возьмите динамометр и поставьте его на сцену.","dyno-on-scene":"Подвесьте цилиндр на крючок динамометра.","cyl-attached":"Снимите показание динамометра и запишите P возд в журнал.","air-recorded":"Возьмите стакан со стола и поставьте на сцену.","beaker-on-scene":"Налейте воду в стакан — нажмите на стакан и выберите объём.","water-poured":"Опустите динамометр с цилиндром в воду.","cyl-in-water":"Снимите показание динамометра и запишите P жид в журнал.","liquid-recorded":"Готово. Повторите с другим цилиндром или сбросьте опыт."},Sr="Перетащите прибор на жёлтую пунктирную область — она подсветится, когда совместима.";class Er{#t;#e=null;#i=null;#r="idle";#o=null;#s=0;#a=!1;#c=null;constructor(t={}){this.#t={...kr,...t}}setRecordMode(t){this.#t={...this.#t,recordMode:t}}onHint(t){this.#e=t}onAmbientPulse(t){this.#i=t,t(this.#c)}trackActivity(){this.#a||(this.#s=0,this.#n())}trackFailedDrop(){this.#a||(this.#s+=1,this.#s>=this.#t.failedDropsThreshold&&(this.#h({text:Sr,severity:"warning"}),this.#s=0))}setPhase(t){if(this.#a)return;this.#r!==t&&(this.#r=t,this.#s=0);const e=jt[t]??null;e!==this.#c&&(this.#c=e,this.#i?.(e)),this.#n()}dispose(){this.#a=!0,this.#l(),this.#e=null,this.#i=null}getCurrentPulseTarget(){return this.#c}getFailedDropCount(){return this.#s}getPhase(){return this.#r}#n(){this.#l(),!(this.#t.inactivityTimeoutMs<=0)&&(this.#o=setTimeout(()=>{this.#o=null;const e=(this.#t.recordMode==="fully-manual"?_r:Ar)[this.#r],r=jt[this.#r],i=r!==null?{text:e,targetCardId:r,severity:"info"}:{text:e,severity:"info"};this.#h(i)},this.#t.inactivityTimeoutMs))}#l(){this.#o!==null&&(clearTimeout(this.#o),this.#o=null)}#h(t){this.#a||this.#e?.(t)}}const ft="kit-1:archimedes:state",Yt=1,Cr=5e3,Tr=3600*1e3,Vt={throttleMs:Cr,ttlMs:Tr};function $r(){return(o,t)=>{const e=setTimeout(o,t);return()=>clearTimeout(e)}}function Lr(){try{if(typeof globalThis>"u")return null;const o=globalThis.localStorage;return o||null}catch{return null}}class Pr{#t;#e;#i;#r;#o;#s=null;#a=null;#c=0;constructor(t={}){this.#t=typeof t.throttleMs=="number"&&t.throttleMs>=0?t.throttleMs:Vt.throttleMs,this.#e=typeof t.ttlMs=="number"&&t.ttlMs>=0?t.ttlMs:Vt.ttlMs,this.#i=t.storage??Lr(),this.#r=t.now??(()=>Date.now()),this.#o=$r()}save(t){if(!this.#i||(this.#a=t,this.#s))return;this.#c=this.#r();const e=this.#t;this.#s=this.#o(()=>{this.#s=null;const r=this.#a;this.#a=null,r!==null&&this.#n(r)},e)}saveImmediate(t){this.#i&&(this.#s&&(this.#s(),this.#s=null),this.#a=null,this.#n(t))}load(){if(!this.#i)return null;let t;try{t=this.#i.getItem(ft)}catch{return null}if(t===null)return null;let e;try{e=JSON.parse(t)}catch{return this.clear(),null}if(typeof e!="object"||e===null||typeof e.version!="number"||typeof e.savedAt!="number"||!("payload"in e))return this.clear(),null;const r=e;if(r.version!==Yt)return this.clear(),null;const i=this.#r()-r.savedAt;return i<0||i>this.#e?(this.clear(),null):{payload:r.payload,ageMs:i,savedAt:r.savedAt}}clear(){if(this.#s&&(this.#s(),this.#s=null),this.#a=null,!!this.#i)try{this.#i.removeItem(ft)}catch{}}flush(){if(!this.#s||this.#a===null)return;this.#s(),this.#s=null;const t=this.#a;this.#a=null,this.#n(t)}hasPendingSave(){return this.#s!==null}getPendingScheduledAt(){return this.#c}#n(t){if(!this.#i)return;const e={version:Yt,savedAt:this.#r(),payload:t};let r;try{r=JSON.stringify(e)}catch{return}try{this.#i.setItem(ft,r)}catch{}}}const F="kit-1",mt=250,Rr=50,Mr=1500,bt=220,gt=.95,Ir=.85,Nr=8,Fr=12,yt={phase:"idle",dynoRange:null,cylinderId:null,beakerOnScene:!1,waterMl:0,inWater:!1,forceN:0,forceTargetN:0,overloaded:!1,partialDip:!1,bottomTouch:!1,stable:!0,currentRowTs:null,dosePickerOpen:!1,bannerText:null,completedCylinders:[],dipOffsetPx:0,submersionFraction:0},Br={idle:"Перетащите динамометр на сцену.","dyno-on-scene":"Подвесьте цилиндр (рекомендуем №3) на крючок динамометра.","cyl-attached":"Цилиндр висит в воздухе. Нажмите большую жёлтую кнопку «Записать P возд» в журнал.","air-recorded":"Возьмите стакан со стола и поставьте на сцену.","beaker-on-scene":"Налейте воду в стакан — рекомендуем 200 мл, этого хватит для полного погружения цилиндра №3.","water-poured":"Тяните цилиндр вниз по нити ↓ или нажмите на него — он опустится в воду.","cyl-in-water":"Цилиндр под водой. Нажмите «Записать P жид» — F_A появится автоматически.","liquid-recorded":"Готово! Можно повторить с другим цилиндром или сбросить опыт."},Hr={idle:"Перетащите динамометр на сцену.","dyno-on-scene":"Подвесьте цилиндр (рекомендуем №3) на крючок динамометра.","cyl-attached":"Цилиндр висит в воздухе. Снимите показание динамометра и запишите P возд в журнал.","air-recorded":"Возьмите стакан со стола и поставьте на сцену.","beaker-on-scene":"Налейте воду в стакан — рекомендуем 200 мл, этого хватит для полного погружения цилиндра №3.","water-poured":"Тяните цилиндр вниз по нити ↓ или нажмите на него — он опустится в воду.","cyl-in-water":"Цилиндр под водой. Снимите показание динамометра и запишите P жид в журнал.","liquid-recorded":"Готово! Можно повторить с другим цилиндром или сбросить опыт."},Dr={"cyl-attached":"Записать P возд","beaker-on-scene":"Записать P возд","water-poured":"Записать P возд","cyl-in-water":"Записать P жид"};class qr{#t;#e;#i=null;#r=null;#o=new Set;#s=new Map;#a=new Map;#c;#n=null;#l=null;#h=null;#u=null;#y=null;#g=null;#b=null;#x=0;#f;#p;#m=new vr(8);#w=new Map;#v=!1;constructor(t){this.#t=t,this.#e=new he({...yt}),t.resetBtn.addEventListener("click",this.#q),t.recordBtn.addEventListener("click",this.#O),t.detachDynoBtn.addEventListener("click",this.#G),t.detachCylBtn.addEventListener("click",this.#W),t.detachBeakerBtn.addEventListener("click",this.#z),ue(),pe(),this.#r=fe(t.recordModeSlot,{kitId:F,onChange:i=>this.#$(i)});for(const i of t.equipmentCards)i.addEventListener("click",this.#L);for(const i of Array.from(t.dosePicker.querySelectorAll(".dose-btn")))i.addEventListener("click",this.#J);this.#c=new me(t.rootHost,this.#_),t.rootHost.addEventListener("beaker-tap",this.#j),t.cylinderHost.addEventListener("pointerdown",this.#Y),t.cylinderHost.addEventListener("click",this.#V),t.cylinderHost.addEventListener("keydown",this.#K);const e=i=>{i.propertyName==="transform"&&(this.#D(this.#e.get()),this.#H())};t.cylinderHost.addEventListener("transitionend",e),t.dynoHost.addEventListener("transitionend",e),t.rootHost.addEventListener("keydown",this.#U),typeof ResizeObserver<"u"&&(this.#g=new ResizeObserver(()=>{const i=this.#e.get();if(this.#D(i),i.inWater){const{offsetPx:s}=this.#F();if(s>0&&s!==i.dipOffsetPx){this.#e.set({dipOffsetPx:s}),this.#H();return}}i.cylinderId!==null&&!this.#b&&this.#tt(this.#e.get()),this.#H()}),this.#g.observe(t.stage)),this.#f=new Er({recordMode:q(F)}),this.#f.onHint(this.#at),this.#f.onAmbientPulse(this.#lt),this.#p=new Pr;let r=yt.phase;this.#i=this.#e.subscribe(i=>{this.#B(i),this.#f.trackActivity(),i.phase!==r&&(r=i.phase,this.#f.setPhase(i.phase)),this.#S()==="fully-auto"&&this.#E(i),this.#v||this.#p.save(this.#T())}),this.#B(this.#e.get()),this.#f.setPhase(this.#e.get().phase),this.#ct()}destroy(){this.#k(),this.#A(),this.#g?.disconnect(),this.#g=null,this.#i?.(),this.#i=null,this.#c.destroy(),this.#r?.(),this.#r=null,this.#f.dispose(),this.#p.flush();for(const t of this.#w.values())try{t.dismiss("manual")}catch{}this.#w.clear(),this.#t.resetBtn.removeEventListener("click",this.#q),this.#t.recordBtn.removeEventListener("click",this.#O),this.#t.detachDynoBtn.removeEventListener("click",this.#G),this.#t.detachCylBtn.removeEventListener("click",this.#W),this.#t.detachBeakerBtn.removeEventListener("click",this.#z);for(const t of this.#t.equipmentCards)t.removeEventListener("click",this.#L);for(const t of Array.from(this.#t.dosePicker.querySelectorAll(".dose-btn")))t.removeEventListener("click",this.#J);this.#t.rootHost.removeEventListener("beaker-tap",this.#j),this.#t.cylinderHost.removeEventListener("pointerdown",this.#Y),this.#t.cylinderHost.removeEventListener("click",this.#V),this.#t.cylinderHost.removeEventListener("keydown",this.#K),this.#t.rootHost.removeEventListener("keydown",this.#U),this.#M()}placeDynamometer(t=1){this.#e.get().dynoRange===null&&(this.#e.set({dynoRange:t,forceN:0,forceTargetN:0,overloaded:!1,stable:!0,phase:"dyno-on-scene"}),this.#d(`Динамометр ${t} Н поставлен на сцену.`))}attachCylinderById(t){const e=this.#e.get();if(e.dynoRange===null){this.#d("Сначала поставьте динамометр.");return}if(e.cylinderId!==null){this.#d("Снимите предыдущий цилиндр перед подвешиванием нового.");return}const r=L.get(t);if(!r)return;const i=T($(r.m_g)),s=e.dynoRange,n=i>s,a=n?s:i,c=n?`Перегрузка! Возьмите динамометр ${s===1?"5":"1"} Н или другой цилиндр.`:null;this.#k(),this.#A(),this.#e.set({cylinderId:t,forceTargetN:i,forceN:a,overloaded:n,stable:!1,phase:"cyl-attached",bannerText:c}),this.#dt(a),this.#d(n?`Цилиндр №${t} подвешен. Перегрузка: вес ${i.toFixed(2)} Н превышает предел ${s} Н.`:`Цилиндр №${t} подвешен. Динамометр показывает вес в воздухе.`)}detachCylinder(){const t=this.#e.get();if(t.cylinderId===null)return;this.#k(),this.#A();const e=t.phase==="liquid-recorded",r=e&&!t.completedCylinders.includes(t.cylinderId)?[...t.completedCylinders,t.cylinderId]:t.completedCylinders,i=t.beakerOnScene?t.waterMl>=100?"water-poured":"beaker-on-scene":t.dynoRange!==null?"dyno-on-scene":"idle";this.#e.set({cylinderId:null,forceTargetN:0,forceN:0,overloaded:!1,partialDip:!1,bottomTouch:!1,inWater:!1,stable:!0,currentRowTs:e?null:t.currentRowTs,bannerText:null,completedCylinders:r,phase:i,dipOffsetPx:0,submersionFraction:0}),this.#d("Цилиндр снят с динамометра.")}placeBeaker(){const t=this.#e.get();if(!t.beakerOnScene){if(t.phase==="idle"||t.phase==="dyno-on-scene"||t.phase==="cyl-attached"){this.#e.set({beakerOnScene:!0}),this.#d("Стакан поставлен на стол.");return}this.#e.set({beakerOnScene:!0,phase:"beaker-on-scene"}),this.#d("Стакан поставлен на стол.")}}pourWater(t){const e=this.#e.get();if(!e.beakerOnScene){this.#d("Сначала поставьте стакан.");return}let r=Math.max(0,Math.floor(t)),i=e.bannerText;r>mt?(i=`Перелив! Налили больше, чем вмещает стакан (${mt} мл). Лишнее ушло на стол.`,r=mt):r>0&&r<150&&e.cylinderId!==null?i="Воды мало, цилиндр будет выглядывать из воды. Долейте до 200 мл.":r>=150&&e.bannerText&&/Воды мало/.test(e.bannerText)&&(i=null);const s=e.phase==="cyl-in-water"||e.phase==="liquid-recorded"?e.phase:r>=100?"water-poured":"beaker-on-scene";this.#e.set({waterMl:r,dosePickerOpen:!1,phase:s,bannerText:i}),this.#d(`Налито ${r} мл воды${r!==t?" (часть пролилась)":""}.`),e.inWater&&e.cylinderId!==null&&this.#nt(this.#e.get())}dipCylinderInWater(){const t=this.#e.get();if(t.cylinderId===null){this.#d("Подвесьте цилиндр перед погружением.");return}if(!t.beakerOnScene){this.#d("Поставьте стакан на стол.");return}if(t.waterMl<=0){this.#d("В стакане нет воды — нельзя погружать цилиндр."),this.#e.set({bannerText:"В стакан нужна вода — налейте, прежде чем погружать."});return}if(t.inWater)return;const e=L.get(t.cylinderId);if(!e)return;const{F_A_full:r,partial:i,bottom:s,low:n}=this.#N(e,t.waterMl),a=T($(e.m_g)),c=j(a,r,1),h=t.dynoRange??1,l=c>h,d=l?h:c,{offsetPx:p,partialDip:u}=this.#F(d);let f=null;u?f="Стакан мелкий — цилиндр не помещается полностью. F_A искажена.":n?f="Цилиндр касается дна — F_A искажена. Долейте воды.":i?f="Цилиндр не полностью под водой — F_A < теоретической.":l&&(f=`Перегрузка! Возьмите динамометр ${h===1?"5":"1"} Н.`),this.#k(),this.#A(),this.#e.set({inWater:!0,forceTargetN:c,forceN:d,overloaded:l,partialDip:i||u,bottomTouch:s,stable:!0,phase:"cyl-in-water",bannerText:f,dipOffsetPx:p,submersionFraction:1}),this.#d(i?`Цилиндр №${e.id} частично погружён. F_A меньше теоретической.`:s?`Цилиндр №${e.id} касается дна стакана.`:`Цилиндр №${e.id} полностью погружён. Динамометр показывает вес в воде.`)}liftCylinderFromWater(){const t=this.#e.get();if(!t.inWater||t.cylinderId===null)return;const e=L.get(t.cylinderId);if(!e)return;const r=T($(e.m_g)),i=t.dynoRange??1,s=r>i,n=s?i:r,a=t.phase==="liquid-recorded"?"liquid-recorded":t.beakerOnScene&&t.waterMl>0?"water-poured":t.beakerOnScene?"beaker-on-scene":"cyl-attached";this.#k(),this.#A(),this.#e.set({inWater:!1,forceTargetN:r,forceN:n,overloaded:s,partialDip:!1,bottomTouch:!1,stable:!0,phase:a,bannerText:s?`Перегрузка! Возьмите динамометр ${i===1?"5":"1"} Н.`:null,dipOffsetPx:0,submersionFraction:0}),this.#d(`Цилиндр №${e.id} поднят в воздух.`)}#S(){return q(F)}#$=t=>{this.#f.setRecordMode(t),t==="fully-auto"&&this.#E(this.#e.get()),this.#B(this.#e.get())};#E(t){if(!t.stable)return;const e=!t.inWater&&!t.overloaded&&t.cylinderId!==null&&(t.phase==="cyl-attached"||t.phase==="beaker-on-scene"||t.phase==="water-poured"),r=t.inWater&&!t.overloaded&&t.cylinderId!==null&&t.phase==="cyl-in-water";!e&&!r||this.#o.has(t.phase)||(this.#o.add(t.phase),this.recordCurrentReading())}recordCurrentReading(){const t=this.#e.get();if(t.cylinderId===null){this.#d("Цилиндр не подвешен.");return}const e=L.get(t.cylinderId);if(!e)return;if(!t.inWater&&(t.phase==="cyl-attached"||t.phase==="beaker-on-scene"||t.phase==="water-poured")){const i=Y(t.forceTargetN,t.dynoRange??1);if(t.currentRowTs!==null){const c=this.#I(e.id);if(c===null)return;const h=this.#t.journal.getRows().find(d=>d.timestamp===t.currentRowTs),l=t.currentRowTs;this.#t.journal.updateRow(l,{cylinder:c,V_cm3:e.V_cm3,P_air_N:i}),this.#d(`P возд обновлено: ${i.toFixed(2)} Н.`),h&&(this.#m.push({id:"record",do:()=>{},undo:()=>{this.#t.journal.updateRow(l,{cylinder:h.cylinder,V_cm3:h.V_cm3,P_air_N:h.P_air_N})},label:"Запись обновлена"}),this.#C({message:`Записано: P возд = ${V(i,2)} Н`,actionLabel:"Отменить",severity:"success",undoId:"record"}));return}const s=this.#I(e.id);if(s===null){this.#d("Цилиндр №1 исключён из этого опыта — попробуйте №2, №3 или №4.");return}const n=this.#t.journal.addRow({cylinder:s,V_cm3:e.V_cm3,P_air_N:i,P_liquid_N:null,F_A_meas_N:null,F_A_theor_N:0,delta_pct:null,context:{cylinder_id:String(e.id),liquid:"water",V_water_ml:t.waterMl}}),a=t.phase==="cyl-attached"?"air-recorded":t.phase;this.#e.set({currentRowTs:n,phase:a}),this.#d(`P возд = ${i.toFixed(2)} Н записано в журнал.`),this.#p.saveImmediate(this.#T()),this.#m.push({id:"record",do:()=>{},undo:()=>{this.#t.journal.removeRow(n),this.#e.get().phase==="air-recorded"?this.#e.set({currentRowTs:null,phase:"cyl-attached"}):this.#e.set({currentRowTs:null})},label:"Запись добавлена"}),this.#C({message:`Записано: P возд = ${V(i,2)} Н`,actionLabel:"Отменить",severity:"success",undoId:"record"});return}if(t.phase==="cyl-in-water"){const i=this.#I(e.id);if(i===null){this.#d("Цилиндр №1 не учитывается в журнале опыта 1.2.");return}const s=Y(t.forceTargetN,t.dynoRange??1);let n,a=t.phase,c=null;if(t.currentRowTs===null){const h=T($(e.m_g)),l=this.#t.journal.addRow({cylinder:i,V_cm3:e.V_cm3,P_air_N:Y(h,t.dynoRange??1),P_liquid_N:s,F_A_meas_N:null,F_A_theor_N:0,delta_pct:null,context:{cylinder_id:String(e.id),liquid:"water",V_water_ml:t.waterMl}});this.#e.set({currentRowTs:l,phase:"liquid-recorded"}),n=l,this.#m.push({id:"record",do:()=>{},undo:()=>{this.#t.journal.removeRow(n),this.#e.set({currentRowTs:null,phase:a})},label:"Запись добавлена"})}else{const h=t.currentRowTs;c=this.#t.journal.getRows().find(u=>u.timestamp===h)?.P_liquid_N??null,this.#t.journal.updateRow(h,{P_liquid_N:s,context:{cylinder_id:String(e.id),liquid:"water",V_water_ml:t.waterMl}}),this.#e.set({phase:"liquid-recorded"}),n=h;const d=a,p=c;this.#m.push({id:"record",do:()=>{},undo:()=>{this.#t.journal.updateRow(n,{P_liquid_N:p}),this.#e.set({phase:d})},label:"Запись P жид обновлена"})}this.#d(`P жид = ${s.toFixed(2)} Н записано. F_A = P возд − P жид появилась в журнале автоматически.`),this.#p.saveImmediate(this.#T()),this.#C({message:`Записано: P жид = ${V(s,2)} Н`,actionLabel:"Отменить",severity:"success",undoId:"record"});return}this.#d("Сейчас нечего записывать. Дождитесь стабилизации показания.")}returnDynamometerToKit(){const t=this.#e.get();if(t.dynoRange===null)return;t.cylinderId!==null&&this.detachCylinder(),this.#k(),this.#A();const e=this.#e.get();this.#e.set({dynoRange:null,forceN:0,forceTargetN:0,overloaded:!1,stable:!0,phase:e.beakerOnScene?e.waterMl>=100?"water-poured":"beaker-on-scene":"idle",bannerText:null,dipOffsetPx:0}),this.#d("Динамометр возвращён в комплект.")}returnBeakerToKit(){const t=this.#e.get();if(!t.beakerOnScene)return;t.inWater&&this.liftCylinderFromWater();const e=this.#e.get();this.#e.set({beakerOnScene:!1,waterMl:0,dosePickerOpen:!1,partialDip:!1,bottomTouch:!1,bannerText:null,phase:e.cylinderId!==null?"cyl-attached":e.dynoRange!==null?"dyno-on-scene":"idle"}),this.#d("Стакан возвращён в комплект — вода вылита.")}returnCylinderToKit(t){this.#e.get().cylinderId===t&&this.detachCylinder()}reset(t=!1){const e=this.#T(),r=e.dynoRange!==null||e.cylinderId!==null||e.beakerOnScene||e.journalRows.length>0;this.#k(),this.#A(),this.#e.set({...yt}),this.#t.journal.clear(),this.#o.clear(),this.#s.clear(),this.#a.clear(),this.#d("Опыт 1.2 сброшен."),t&&r&&(this.#m.push({id:"reset",do:()=>{},undo:()=>{this.#Z(e)},label:"Опыт сброшен"}),this.#C({message:"Опыт сброшен",actionLabel:"Отменить",severity:"info",undoId:"reset"}))}getState(){return this.#e.get().phase}getJournalRows(){return this.#t.journal.getRows()}getFullState(){return this.#e.get()}getBannerText(){return this.#e.get().bannerText}getOverloaded(){return this.#e.get().overloaded}getPartialDip(){return this.#e.get().partialDip}#_=t=>{const{eqId:e,dropzoneId:r}=t,i=this.#e.get();if(e==="dynamometer-1"&&r==="ar-stage-dyno"){this.placeDynamometer(1);return}if(e==="dynamometer-2"&&r==="ar-stage-dyno"){this.placeDynamometer(5);return}if((e==="dynamometer-1"||e==="dynamometer-2")&&/^card-dynamometer-/.test(r)){const n=`card-${e}`;if(r!==n){this.#d("Положи динамометр в его собственную ячейку комплекта.");return}this.returnDynamometerToKit();return}if(e==="beaker"&&r==="card-beaker"){this.returnBeakerToKit();return}const s=/^cyl-(\d+)$/.exec(e);if(s){const n=Number(s[1]),a=/^card-cyl-(\d+)$/.exec(r);if(a){if(Number(a[1])!==n){this.#d("Положи цилиндр в его собственную ячейку комплекта.");return}this.returnCylinderToKit(n);return}if(r==="ar-dyno-hook"){(n===1||n===2||n===3||n===4)&&this.attachCylinderById(n);return}if(r==="ar-beaker"){if(i.cylinderId===n){this.dipCylinderInWater();return}this.#e.set({bannerText:"Без динамометра не получится измерить F_A. Подвесьте цилиндр на крюк."}),this.#d("Цилиндр упал в стакан без подвеса. F_A не измерить — поднимите его и подвесьте.");return}}if(e==="beaker"&&r==="ar-stage-beaker"){this.placeBeaker();return}if(r==="ar-beaker"&&(e==="dynamometer-1"||e==="dynamometer-2")){if(i.cylinderId===null){this.#d("На динамометре нет цилиндра — нечего погружать.");return}this.dipCylinderInWater();return}};#L=t=>{const r=t.currentTarget.getAttribute("data-eq")??"";if(r==="dynamometer-1"){this.placeDynamometer(1);return}if(r==="dynamometer-2"){this.placeDynamometer(5);return}const i=/^cyl-(\d+)$/.exec(r);if(i){const s=Number(i[1]);(s===1||s===2||s===3||s===4)&&this.attachCylinderById(s);return}if(r==="beaker"){this.placeBeaker();return}};#q=()=>{this.reset(!0)};#O=()=>{this.recordCurrentReading()};#G=t=>{t.stopPropagation(),this.returnDynamometerToKit()};#W=t=>{t.stopPropagation(),this.detachCylinder()};#z=t=>{t.stopPropagation(),this.returnBeakerToKit()};#j=t=>{const e=this.#e.get();e.beakerOnScene&&(e.inWater||(t.stopPropagation(),this.#e.set({dosePickerOpen:!e.dosePickerOpen})))};#P(t){return t.cylinderId!==null&&t.cylinderId!==1&&t.beakerOnScene&&t.waterMl>0&&!t.inWater}#R(t){return t.cylinderId!==null&&t.inWater}#Y=t=>{if(t.button!==0&&t.pointerType==="mouse")return;const e=this.#e.get();if(!this.#P(e)&&!this.#R(e))return;this.#M();const r=e.inWater?e.dipOffsetPx||bt:(()=>{const{offsetPx:l}=this.#F();return l>0?l:bt})(),i=e.inWater?e.dipOffsetPx||bt:0,s=e.cylinderId!==null?L.get(e.cylinderId):null,n=e.dynoRange??1,a=l=>{if(!s)return e.forceN;const{F_A_full:d}=this.#N(s,e.waterMl),p=T($(s.m_g)),u=j(p,d,l);return u>n?n:u},c=l=>{const d=this.#b;if(!d||l.pointerId!==d.pointerId)return;l.preventDefault();const p=l.clientY-d.startY,u=Math.max(0,Math.min(r,d.startOffset+p));d.offset=u,Math.abs(p)>=6&&(d.didTrigger=!0),this.#it(u);const f=this.#st(u);d.submersionFraction=f;const k=a(f);d.liveForce=k,this.#rt(k)},h=l=>{const d=this.#b;if(!(!d||l.pointerId!==d.pointerId)){if(!d.didTrigger){this.#X(),this.#M();return}this.#et(d.submersionFraction,d.offset,d.liveForce),this.#x=typeof performance<"u"?performance.now():Date.now(),this.#X(),this.#M()}};this.#b={pointerId:t.pointerId,startY:t.clientY,startOffset:i,offset:i,didTrigger:!1,submersionFraction:e.submersionFraction,liveForce:e.forceN,moveListener:c,upListener:h},window.addEventListener("pointermove",c,{passive:!1}),window.addEventListener("pointerup",h),window.addEventListener("pointercancel",h);try{this.#t.cylinderHost.setPointerCapture(t.pointerId)}catch{}};#et(t,e,r){const i=this.#e.get();if(i.cylinderId===null)return;const s=L.get(i.cylinderId);if(!s)return;if(!i.inWater&&t>=.5){this.dipCylinderInWater();return}if(i.inWater&&t<.5){this.liftCylinderFromWater();return}if(!i.inWater&&t<.5){this.#e.set({submersionFraction:0,dipOffsetPx:0,forceN:T($(s.m_g)),forceTargetN:T($(s.m_g)),stable:!0,partialDip:!1});return}if(i.inWater&&t>=.5){this.dipCylinderInWater();return}const{F_A_full:n,partial:a,bottom:c}=this.#N(s,i.waterMl),h=T($(s.m_g)),l=j(h,n,t),d=i.dynoRange??1,p=l>d,u=p?d:l;let f=i.inWater;!i.inWater&&t>=gt?f=!0:i.inWater&&t<=Ir&&(f=!1);let k=i.phase;f&&!i.inWater?k="cyl-in-water":!f&&i.inWater&&(k=i.phase==="liquid-recorded"?"liquid-recorded":i.beakerOnScene&&i.waterMl>0?"water-poured":i.beakerOnScene?"beaker-on-scene":"cyl-attached");const A=a||t>0&&t<gt;let C=null;a&&f?C="Воды слишком мало — цилиндр не погружён полностью. F_A искажена.":A&&t>0&&t<gt&&f===!1?C="Цилиндр погружён частично — F_A пропорциональна объёму под водой.":p&&(C=`Перегрузка! Возьмите динамометр ${d===1?"5":"1"} Н.`),this.#k(),this.#A(),this.#e.set({inWater:f,submersionFraction:t,forceTargetN:l,forceN:u,overloaded:p,partialDip:A&&f,bottomTouch:c&&f,stable:!0,phase:k,bannerText:C,dipOffsetPx:f||t>0?e:0}),f&&!i.inWater?this.#d(a?`Цилиндр №${s.id} погружён частично (мало воды). F_A < теоретической.`:`Цилиндр №${s.id} погружён в воду. Динамометр показывает вес в воде.`):!f&&i.inWater&&this.#d(`Цилиндр №${s.id} поднят в воздух.`)}#rt(t){const e=this.#n;e&&e.setAttribute("force",t.toFixed(3))}#V=t=>{if(this.#b?.didTrigger){t.stopPropagation();return}if((typeof performance<"u"?performance.now():Date.now())-this.#x<250){t.stopPropagation();return}const r=this.#e.get();this.#P(r)?this.dipCylinderInWater():this.#R(r)&&this.liftCylinderFromWater()};#K=t=>{const e=this.#e.get();t.key==="Enter"||t.key===" "||t.key==="ArrowDown"?this.#P(e)&&(t.preventDefault(),this.dipCylinderInWater()):t.key==="ArrowUp"&&this.#R(e)&&(t.preventDefault(),this.liftCylinderFromWater())};#U=t=>{if(t.key!==" "&&t.key!=="Enter"||t.repeat)return;const e=t.target;if(e){const i=e.tagName;if(i==="INPUT"||i==="TEXTAREA"||i==="BUTTON"||e.isContentEditable)return}const r=this.#t.recordBtn;r.hidden||r.disabled||(t.preventDefault(),r.click())};#M(){const t=this.#b;if(t){window.removeEventListener("pointermove",t.moveListener),window.removeEventListener("pointerup",t.upListener),window.removeEventListener("pointercancel",t.upListener);try{this.#t.cylinderHost.releasePointerCapture(t.pointerId)}catch{}this.#b=null}}#it(t){this.#t.dynoHost.style.transform=`translate(-50%, ${t}px)`,this.#t.cylinderHost.style.transform=`translate(-50%, ${t}px)`,this.#t.dynoHost.style.transition="none",this.#t.cylinderHost.style.transition="none";const e=this.#t.detachCylBtn;if(!e.hidden){e.style.transition="none";const r=`translateY(${t}px)`;e.style.setProperty("--cyl-detach-transform",r),e.style.transform=r}this.#D(this.#e.get())}#X(){this.#t.dynoHost.style.transition="",this.#t.cylinderHost.style.transition="",this.#t.detachCylBtn.style.transition="",this.#B(this.#e.get())}#J=t=>{const e=t.currentTarget,r=Number(e.getAttribute("data-dose"));Number.isFinite(r)&&r>0&&this.pourWater(r)};#I(t){return t===2?"No2":t===3?"No3":t===4?"No4":null}#N(t,e){const r=t.V_cm3,i=e,s=i>0&&i<=Rr,n=s||i>0&&i<r,a=i>0&&i<r,c=Math.min(i,r);return{F_A_full:Ye(ie,se(c)),partial:a,bottom:n,low:s}}#st(t){if(typeof window>"u")return 0;const e=this.#l,r=this.#h;if(!e||!r||typeof e.getBottomY!="function"||typeof e.getBodyHeightPx!="function"||typeof r.getWaterSurfaceY!="function"||typeof r.getWaterColumnHeightPx!="function")return 0;const i=e.getBottomY(),s=r.getWaterSurfaceY(),n=e.getBodyHeightPx();if(n<=0)return 0;const a=Math.max(0,i-s),c=r.getWaterColumnHeightPx(),l=Math.min(a,c)/n;return Math.max(0,Math.min(1,l))}#F(t){if(typeof window>"u")return{offsetPx:0,partialDip:!1};const e=this.#t.cylinderHost,r=this.#t.beakerHost,i=this.#h;if(!e||!r||!i)return{offsetPx:0,partialDip:!1};const s=e.getBoundingClientRect(),n=r.getBoundingClientRect();if(s.height===0||n.height===0)return{offsetPx:0,partialDip:!1};let a=n.top+n.height;const h=i.shadowRoot?.getElementById("bk-water");if(h){const ce=parseFloat(h.getAttribute("y")??"116"),de=n.height/130;a=n.top+ce*de}const l=this.#Q(),d=s.top-l,p=s.height*(78/110),u=s.height*(22/110);let A=a+Nr-u-d;const C=u+p,M=d+A+C,I=n.bottom-Fr;let _=!1;return M>I&&(A=I-C-d,_=!0),A=Math.max(0,A),{offsetPx:A,partialDip:_}}#ot(){if(typeof window>"u")return 231;const r=this.#t.dynoHost,i=this.#n,s=this.#t.stage;if(!r||!i||!s)return 231;const n=r.getBoundingClientRect(),a=s.getBoundingClientRect();if(n.height===0||a.height===0)return 231;const c=typeof i.getWeightHookY=="function"?i.getWeightHookY():201;return r.offsetTop+c+18}#Q(){const t=this.#t.cylinderHost.style.transform;if(!t)return 0;const e=/translate\([^,]*,\s*(-?\d+(?:\.\d+)?)px\)/.exec(t);return e?parseFloat(e[1]):0}#nt(t){if(t.cylinderId===null||!t.inWater)return;const e=L.get(t.cylinderId);if(!e)return;const{F_A_full:r,partial:i,bottom:s}=this.#N(e,t.waterMl),n=T($(e.m_g)),a=j(n,r,t.submersionFraction),c=t.dynoRange??1,h=a>c,l=h?c:a;this.#e.set({forceTargetN:a,forceN:l,overloaded:h,partialDip:i,bottomTouch:s,stable:!0})}#at=t=>{const e=this.#t.hint;e.textContent=t.text,e.classList.toggle("hint--warning",t.severity==="warning")};#lt=t=>{for(const e of this.#t.equipmentCards){const r=e.getAttribute("data-eq")??"";e.classList.toggle("pulse-recommended",r===t)}};#C(t){if(typeof document>"u")return null;const e=this.#w.get(t.undoId);if(e){try{e.dismiss("manual")}catch{}this.#w.delete(t.undoId)}const r=document.createElement("lab-toast");r.setAttribute("message",t.message),r.setAttribute("action-label",t.actionLabel),r.setAttribute("severity",t.severity),r.setAttribute("duration",String(t.durationMs??5e3)),r.dataset.undoId=t.undoId;const i=()=>{this.#m.peek(t.undoId)&&this.#m.undo();try{r.dismiss("action")}catch{}},s=()=>{this.#w.delete(t.undoId),r.removeEventListener("action-clicked",i),r.removeEventListener("dismissed",s)};return r.addEventListener("action-clicked",i),r.addEventListener("dismissed",s),document.body.appendChild(r),r.show(),this.#w.set(t.undoId,r),r}#T(){const t=this.#e.get(),e=this.#t.journal.getRows().map(r=>{const{timestamp:i,...s}=r;return s});return{phase:t.phase,dynoRange:t.dynoRange,cylinderId:t.cylinderId,beakerOnScene:t.beakerOnScene,waterMl:t.waterMl,inWater:t.inWater,submersionFraction:t.submersionFraction,forceTargetN:t.forceTargetN,overloaded:t.overloaded,partialDip:t.partialDip,bottomTouch:t.bottomTouch,bannerText:t.bannerText,completedCylinders:t.completedCylinders,journalRows:e}}#Z(t){this.#v=!0;try{this.#k(),this.#A(),this.#t.journal.clear();let e=null;for(const i of t.journalRows)e=this.#t.journal.addRow(i);const r=typeof t.submersionFraction=="number"?t.submersionFraction:t.inWater?1:0;if(this.#e.set({phase:t.phase,dynoRange:t.dynoRange,cylinderId:t.cylinderId,beakerOnScene:t.beakerOnScene,waterMl:t.waterMl,inWater:t.inWater,submersionFraction:r,forceN:t.forceTargetN,forceTargetN:t.forceTargetN,overloaded:t.overloaded,partialDip:t.partialDip,bottomTouch:t.bottomTouch,bannerText:t.bannerText,completedCylinders:t.completedCylinders,currentRowTs:e,stable:!0,dosePickerOpen:!1,dipOffsetPx:0}),t.inWater){const i=()=>{const{offsetPx:s}=this.#F();s>0&&this.#e.set({dipOffsetPx:s})};typeof requestAnimationFrame<"u"?requestAnimationFrame(i):i()}}finally{this.#v=!1}this.#p.saveImmediate(this.#T())}#ct(){const t=this.#p.load();if(!t||t.payload.phase==="idle"&&t.payload.dynoRange===null&&t.payload.cylinderId===null&&!t.payload.beakerOnScene&&t.payload.journalRows.length===0)return;this.#Z(t.payload);const r=new Date(t.savedAt),i=String(r.getHours()).padStart(2,"0"),s=String(r.getMinutes()).padStart(2,"0");this.#C({message:`Восстановлено состояние от ${i}:${s}`,actionLabel:"Сбросить",severity:"info",undoId:"restore",durationMs:8e3}),this.#m.push({id:"restore",do:()=>{},undo:()=>{this.reset(!1),this.#p.clear()},label:"Восстановлено"})}flushAutoSave(){this.#p.flush()}getHintEngine(){return this.#f}getStateStore(){return this.#p}getUndoStack(){return this.#m}#k(){this.#u!==null&&(cancelAnimationFrame(this.#u),this.#u=null)}#A(){this.#y!==null&&(clearTimeout(this.#y),this.#y=null)}#dt(t){if(Or()){this.#e.set({forceN:t,stable:!0});return}const e=Date.now(),r=()=>{const i=Date.now()-e,s=Math.min(1,i/Mr),n=(1-s)*.04,a=(Math.random()*2-1)*n,c=t+a;this.#e.set({forceN:c}),s<1?this.#u=requestAnimationFrame(r):(this.#u=null,this.#e.set({forceN:t,stable:!0}))};this.#u=requestAnimationFrame(r)}#B(t){this.#ut(t),this.#tt(t),this.#pt(t),this.#ft(t),this.#bt(t),this.#gt(t),this.#yt(t),this.#xt(t),this.#wt(t),this.#vt(t),this.#D(t),this.#ht()}#ht(){const t=this.#t.journal.getRows(),e=this.#S(),r=t.map((i,s)=>{const n=this.#s.get(i.timestamp)??{},a=i.cylinder.replace("No","Цилиндр № ");return{idx:s+1,timestamp:i.timestamp,values:{idx:s+1,cylinder:a,V_cm3:i.V_cm3??null,P_air_N:i.P_air_N??null,P_liq_N:i.P_liquid_N??null,F_A_meas_N:e==="fully-auto"?i.F_A_meas_N??null:n.F_A_meas_N??null,F_A_theor_N:i.F_A_theor_N??null,delta_pct:e==="fully-auto"?i.delta_pct??null:n.delta_pct??null},verdicts:this.#a.get(i.timestamp)??{}}});be(this.#t.journalHost,Lt,r,{mode:e,onCellInput:(i,s,n)=>{const a=t[i-1]?.timestamp;if(a===void 0)return;const c=this.#s.get(a)??{};n===null?delete c[s]:c[s]=n,this.#s.set(a,c)},onVerify:i=>{const s=t[i-1];if(!s)return;const n={...this.#s.get(s.timestamp)??{}},a=this.#t.journalHost.querySelector(`tr[data-row-idx="${i}"]`);a&&a.querySelectorAll("input[data-key]").forEach(l=>{const d=l.dataset.key;if(!d)return;const p=ge(l.value);p!==null&&(n[d]=p)}),this.#s.set(s.timestamp,n);const c={timestamp:s.timestamp,values:{V_cm3:s.V_cm3,P_air_N:s.P_air_N??0,P_liq_N:s.P_liquid_N??0,F_A_meas_N:n.F_A_meas_N??null,F_A_theor_N:s.F_A_theor_N??0,delta_pct:n.delta_pct??null}},h=ye(Lt.columns,c);if(this.#a.set(s.timestamp,h),a)for(const[l,d]of Object.entries(h)){const p=a.querySelector(`td[data-key="${l}"]`);if(!p)continue;p.classList.remove("j-verdict","j-verdict--ok","j-verdict--close","j-verdict--wrong","j-verdict--empty"),p.dataset.verdict=d,d!=="empty"&&p.classList.add("j-verdict",`j-verdict--${d}`);const u=p.querySelector("input[data-key]");u&&(u.dataset.verdict=d)}}})}#ut(t){if(t.dynoRange===null){this.#t.dynoHost.hidden=!0,this.#t.dropzoneStage.hidden=!1,this.#t.detachDynoBtn.hidden=!0,this.#n&&(this.#n.remove(),this.#n=null);return}if(this.#t.dropzoneStage.hidden=!0,this.#t.dynoHost.hidden=!1,this.#t.detachDynoBtn.hidden=!1,!this.#n){const e=document.createElement("lab-dynamometer");e.setAttribute("range",String(t.dynoRange)),e.setAttribute("force","0"),e.setAttribute("attached",""),this.#t.dynoHost.appendChild(e),this.#n=e}if(this.#n.setAttribute("range",String(t.dynoRange)),this.#n.setAttribute("force",t.forceN.toFixed(3)),t.overloaded?this.#n.setAttribute("data-overload","true"):this.#n.removeAttribute("data-overload"),!this.#b){const e=t.inWater||t.submersionFraction>0?t.dipOffsetPx:0;this.#t.dynoHost.style.transform=`translate(-50%, ${e}px)`,this.#t.dynoHost.style.transition="transform 600ms cubic-bezier(0.42, 0, 0.58, 1)"}}#tt(t){if(t.cylinderId===null){this.#t.cylinderHost.hidden=!0,this.#t.cylinderHost.removeAttribute("data-can-dip"),this.#t.cylinderHost.removeAttribute("data-can-lift"),this.#t.cylinderHost.removeAttribute("tabindex"),this.#t.cylinderHost.removeAttribute("role"),this.#t.cylinderHost.removeAttribute("aria-label"),this.#t.detachCylBtn.hidden=!0,this.#t.detachCylBtn.style.transform="",this.#t.detachCylBtn.style.removeProperty("--cyl-detach-transform"),this.#l&&(this.#l.remove(),this.#l=null);return}const e=L.get(t.cylinderId);if(!e)return;if(this.#t.cylinderHost.hidden=!1,this.#t.detachCylBtn.hidden=!1,this.#l)this.#l.setAttribute("material",e.material),this.#l.setAttribute("id-num",String(e.id));else{const s=document.createElement("lab-metal-weight");s.setAttribute("material",e.material),s.setAttribute("id-num",String(e.id)),s.setAttribute("attached",""),s.setAttribute("no-legend",""),this.#t.cylinderHost.appendChild(s),this.#l=s}if(!this.#b){const s=this.#ot();this.#t.cylinderHost.style.top=`${s}px`,this.#t.cylinderHost.style.left="var(--scene-center-x, 50%)";const n=t.inWater||t.submersionFraction>0?t.dipOffsetPx:0;this.#t.cylinderHost.style.transform=`translate(-50%, ${n}px)`,this.#t.cylinderHost.style.transition="transform 600ms cubic-bezier(0.42, 0, 0.58, 1)"}const r=this.#P(t),i=this.#R(t);r?this.#t.cylinderHost.setAttribute("data-can-dip","true"):this.#t.cylinderHost.removeAttribute("data-can-dip"),i?this.#t.cylinderHost.setAttribute("data-can-lift","true"):this.#t.cylinderHost.removeAttribute("data-can-lift"),r||i?(this.#t.cylinderHost.setAttribute("tabindex","0"),this.#t.cylinderHost.setAttribute("role","button"),this.#t.cylinderHost.setAttribute("aria-label",i?"Цилиндр в воде. Нажмите Enter или потяните вверх, чтобы поднять.":"Цилиндр в воздухе. Нажмите Enter или потяните вниз, чтобы погрузить в воду.")):(this.#t.cylinderHost.removeAttribute("tabindex"),this.#t.cylinderHost.removeAttribute("role"),this.#t.cylinderHost.removeAttribute("aria-label")),this.#H()}#H(){const t=this.#t.detachCylBtn;if(t.hidden)return;const e=this.#t.cylinderHost,r=this.#t.stage;if(e.hidden||!r)return;const i=e.offsetTop,s=e.offsetLeft,n=e.getBoundingClientRect();if(n.width===0)return;const a=this.#Q(),c=24,h=n.width,l=i-c-6,d=s+(h-c)/2;t.style.position="absolute",t.style.top=`${l}px`,t.style.left=`${d}px`,t.style.right="auto";const p=`translateY(${a}px)`;t.style.setProperty("--cyl-detach-transform",p),t.style.transform=p}#pt(t){if(!t.beakerOnScene){this.#t.beakerHost.hidden=!0,this.#t.dropzoneBeaker.hidden=!1,this.#t.detachBeakerBtn.hidden=!0,this.#h&&(this.#h.remove(),this.#h=null);return}if(this.#t.dropzoneBeaker.hidden=!0,this.#t.beakerHost.hidden=!1,this.#t.detachBeakerBtn.hidden=!1,!this.#h){const e=document.createElement("lab-beaker");e.setAttribute("level","0"),this.#t.beakerHost.appendChild(e),this.#h=e}this.#h.setAttribute("level",String(t.waterMl)),t.inWater?(this.#h.removeAttribute("tabindex"),this.#h.removeAttribute("role")):(this.#h.hasAttribute("tabindex")||this.#h.setAttribute("tabindex","0"),this.#h.hasAttribute("role")||this.#h.setAttribute("role","button"))}#ft(t){this.#t.clamp.hidden=t.dynoRange===null}#mt(t){if(t.cylinderId===null)return;const e=L.get(t.cylinderId);if(!e)return;const r=this.#I(e.id);r===null||this.#t.journal.getRows().some(s=>s.cylinder===r)||this.#t.journal.addRow({cylinder:r,V_cm3:e.V_cm3,P_air_N:null,P_liquid_N:null,F_A_meas_N:null,F_A_theor_N:0,delta_pct:null,context:{cylinder_id:String(e.id),liquid:"water",V_water_ml:t.waterMl}})}#bt(t){const e=q(F);if(e!=="semi-auto"){this.#t.recordBtn.hidden=!0,this.#t.recordBtn.removeAttribute("data-pending"),this.#t.recordBtn.removeAttribute("data-mode"),e==="fully-manual"&&this.#mt(t);return}const r=Dr[t.phase];if(!r||t.cylinderId===null||t.cylinderId===1){this.#t.recordBtn.hidden=!0,this.#t.recordBtn.removeAttribute("data-pending"),this.#t.recordBtn.removeAttribute("data-mode");return}const s=this.#t.journal.getRows().some(c=>c.P_air_N!==null&&t.currentRowTs===c.timestamp);if(!t.inWater&&s&&t.phase!=="cyl-in-water"){this.#t.recordBtn.hidden=!0,this.#t.recordBtn.removeAttribute("data-pending"),this.#t.recordBtn.removeAttribute("data-mode");return}this.#t.recordBtn.hidden=!1;const n=!t.inWater,a=Y(t.forceTargetN,t.dynoRange??1);if(t.stable){const c=V(a,t.dynoRange===1?2:1),h=`✏  ${r} = ${c} Н`;this.#t.recordLabel.textContent=h,this.#t.recordBtn.setAttribute("aria-label",r),this.#t.recordBtn.removeAttribute("data-pending"),this.#t.recordBtn.disabled=!1,this.#t.recordBtn.setAttribute("data-mode",n?"air":"liquid")}else{const c="Подождите, прибор стабилизируется…";this.#t.recordLabel.textContent=c,this.#t.recordBtn.setAttribute("aria-label",r),this.#t.recordBtn.setAttribute("data-pending","true"),this.#t.recordBtn.disabled=!0,this.#t.recordBtn.setAttribute("data-mode",n?"air":"liquid")}}#gt(t){this.#t.dosePicker.hidden=!t.dosePickerOpen,t.dosePickerOpen&&(this.#t.dosePicker.style.bottom="100px",this.#t.dosePicker.style.left="var(--scene-center-x, 50%)",this.#t.dosePicker.style.transform="translateX(-50%)")}#yt(t){const r=q(F)==="fully-manual"?Hr:Br;this.#t.hint.textContent=r[t.phase]}#xt(t){const e=this.#t.journal.getRows(),r=e.some(l=>l.P_air_N!==null&&l.P_liquid_N!==null&&l.delta_pct!==null&&Math.abs(l.delta_pct)<=5),i=e.some(l=>l.P_air_N!==null),s=e.some(l=>l.P_air_N!==null&&l.P_liquid_N!==null),n={1:t.dynoRange!==null,2:t.cylinderId!==null,3:i,4:t.beakerOnScene&&t.waterMl>=100,5:t.inWater||s,6:s};let a=null;for(let l=1;l<=6;l++)if(!n[l]){a=l;break}const c=!i&&(t.beakerOnScene||t.inWater||t.waterMl>0);this.#t.steps.querySelectorAll(".step").forEach(l=>{const d=parseInt(l.dataset.step??"0",10);if(l.classList.contains("step-bonus")){if(!r){l.hidden=!0,delete l.dataset.state;return}l.hidden=!1,l.dataset.state=t.phase==="liquid-recorded"?"active":"pending";return}let u="pending";n[d]?u="done":d===a&&(u="active"),d===3&&c&&!n[3]&&(u="warning"),u==="pending"?delete l.dataset.state:l.dataset.state=u})}#wt(t){for(const e of this.#t.equipmentCards){const r=e.getAttribute("data-eq")??"";let i=!1;if(r==="dynamometer-1")i=t.dynoRange===1;else if(r==="dynamometer-2")i=t.dynoRange===5;else if(r==="beaker")i=t.beakerOnScene;else{const s=/^cyl-(\d+)$/.exec(r);if(s){const n=Number(s[1]);i=t.cylinderId===n}}e.setAttribute("status",i?"in-use":"available"),i?e.removeAttribute("data-draggable"):e.setAttribute("data-draggable",r)}}#vt(t){t.bannerText?(this.#t.banner.hidden=!1,this.#t.bannerText.textContent=t.bannerText):(this.#t.banner.hidden=!0,this.#t.bannerText.textContent="")}#D(t){const e=this.#t.stage,r=this.#t.sceneOverlay,i=e.getBoundingClientRect();if(r.setAttribute("viewBox",`0 0 ${Math.max(1,i.width)} ${Math.max(1,i.height)}`),t.dynoRange!==null&&this.#n){const s=K(this.#t.clamp,.5,.5,e),n=this.#kt(e);xt(this.#t.clampLine),this.#t.clampLine.setAttribute("x1",String(s.x)),this.#t.clampLine.setAttribute("y1",String(s.y)),this.#t.clampLine.setAttribute("x2",String(n.x)),this.#t.clampLine.setAttribute("y2",String(n.y))}else wt(this.#t.clampLine);if(t.cylinderId!==null&&this.#n&&this.#l){const s=this.#At(e),n=this.#_t(e);xt(this.#t.threadPath),this.#t.threadPath.setAttribute("d",Gr(s.x,s.y,n.x,n.y))}else wt(this.#t.threadPath);if(t.bottomTouch&&t.beakerOnScene){const s=this.#t.beakerHost.getBoundingClientRect(),n=s.bottom-i.top-12,a=s.left-i.left+8,c=s.right-i.left-8;xt(this.#t.bottomDanger),this.#t.bottomDanger.setAttribute("x1",String(a)),this.#t.bottomDanger.setAttribute("y1",String(n)),this.#t.bottomDanger.setAttribute("x2",String(c)),this.#t.bottomDanger.setAttribute("y2",String(n))}else wt(this.#t.bottomDanger)}#kt(t){if(!this.#n)return{x:0,y:0};const e=this.#n,r=typeof e.getHookPosition=="function"?e.getHookPosition():{x:45,y:8};return K(this.#n,this.#n.clientWidth?r.x/this.#n.clientWidth:.5,this.#n.clientHeight?r.y/this.#n.clientHeight:0,t)}#At(t){if(!this.#n)return{x:0,y:0};const e=this.#n,r=typeof e.getWeightHookPosition=="function"?e.getWeightHookPosition():{x:45,y:290},i=this.#n.clientWidth||1,s=this.#n.clientHeight||1;return K(this.#n,r.x/i,r.y/s,t)}#_t(t){if(!this.#l)return{x:0,y:0};const e=this.#l,r=typeof e.getThreadHookPosition=="function"?e.getThreadHookPosition():{x:32,y:8},i=this.#l.clientWidth||1,s=this.#l.clientHeight||1;return K(this.#l,r.x/i,r.y/s,t)}#d(t){this.#t.liveRegion&&(this.#t.liveRegion.textContent=t)}}function Or(){if(typeof window>"u"||"happyDOM"in window)return!0;if(typeof window.matchMedia=="function")try{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return!0}catch{}return!1}function xt(o){o.removeAttribute("display"),o.removeAttribute("hidden")}function wt(o){o.setAttribute("display","none"),o.setAttribute("hidden","hidden")}function Y(o,t){const e=t===1?.01:.1;return Math.round(o/e)*e}function V(o,t){return Number.isFinite(o)?o.toFixed(t).replace(".",","):"—"}function K(o,t,e,r){o.offsetHeight;const i=o.getBoundingClientRect(),s=r.getBoundingClientRect();return{x:i.left+i.width*t-s.left,y:i.top+i.height*e-s.top}}function Gr(o,t,e,r){const i=e-o,s=r-t,n=Math.hypot(i,s);if(n<.5)return`M${o} ${t} L${e} ${r}`;const a=Math.max(1.5,Math.min(6,n*.025)),c=(o+e)/2,h=(t+r)/2+a;return`M${o} ${t} Q${c} ${h} ${e} ${r}`}const Wr={id:"archimedes",label:"Архимедова сила",kicker:"Опыт 1.2",icon:"archimedes",tooltip:"Измерение архимедовой силы по разности веса цилиндра в воздухе и в воде"},zr=`<main class="archimedes-stage">\r
  <section class="archimedes-workbench" aria-label="Рабочая зона опыта 1.2">\r
    <header class="archimedes-header">\r
      <ol class="archimedes-steps" id="ar-steps" aria-label="Этапы измерения архимедовой силы">\r
        <li class="step" data-step="1"><span class="step-num">1</span><span class="step-label">Повесьте динамометр</span></li>\r
        <li class="step" data-step="2"><span class="step-num">2</span><span class="step-label">Подвесьте цилиндр</span></li>\r
        <li class="step" data-step="3"><span class="step-num">3</span><span class="step-label">Запишите P возд</span></li>\r
        <li class="step" data-step="4"><span class="step-num">4</span><span class="step-label">Налейте воду</span></li>\r
        <li class="step" data-step="5"><span class="step-num">5</span><span class="step-label">Опустите в воду</span></li>\r
        <li class="step" data-step="6"><span class="step-num">6</span><span class="step-label">Запишите P жид</span></li>\r
        <!-- Шаг 7 показывается только после первой полной строки журнала\r
             (явный «следующий уровень» — research §1 implicit scaffolding). -->\r
        <li class="step step-bonus" data-step="7" hidden><span class="step-num">7</span><span class="step-label">Сравните с теорией</span></li>\r
      </ol>\r
      <div class="archimedes-hint" id="ar-hint" aria-live="polite">\r
        Перетащите динамометр на сцену, затем подвесьте цилиндр на его крючок.\r
      </div>\r
      <button id="ar-reset-btn" class="archimedes-reset-btn" type="button"\r
              aria-label="Сбросить опыт" title="Сбросить опыт 1.2">\r
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4">\r
          <path d="M3 12a9 9 0 1 0 9-9 9.74 9.74 0 0 0-7 3l-2 2"/>\r
          <path d="M3 4v5h5"/>\r
        </svg>\r
      </button>\r
    </header>\r
\r
    <div class="archimedes-stage-area" id="ar-stage">\r
      <span class="stage-corner stage-corner--tl" aria-hidden="true"></span>\r
      <span class="stage-corner stage-corner--tr" aria-hidden="true"></span>\r
      <span class="stage-corner stage-corner--bl" aria-hidden="true"></span>\r
      <span class="stage-corner stage-corner--br" aria-hidden="true"></span>\r
\r
      <!-- Невидимый зажим — точка фиксации динамометра «как будто его держит лаборант».\r
           Видимый только при наличии динамометра, opacity 0.3. Линия от него до\r
           верхнего крюка динамометра рисуется JS-ом в #ar-clamp-line svg ниже. -->\r
      <div class="ar-clamp" id="ar-clamp" hidden aria-hidden="true">\r
        <svg viewBox="0 0 16 16" width="16" height="16">\r
          <circle cx="8" cy="8" r="3" fill="none" stroke="#9aa3b0" stroke-width="1.2"/>\r
        </svg>\r
      </div>\r
\r
      <!-- Drop-zone «динамометр на сцене» — без постоянной надписи. Подсветка\r
           появляется только пока drag активен (body.has-drag-active). -->\r
      <div class="ar-dropzone ar-dropzone--dyno"\r
           id="ar-dropzone-stage"\r
           data-dropzone="dynamometer-1,dynamometer-2"\r
           data-dropzone-id="ar-stage-dyno"\r
           data-drop-active="false"\r
           data-drop-hover="false">\r
      </div>\r
\r
      <!-- Mount-точка для динамометра. Появится после drop. -->\r
      <div class="ar-mount ar-mount--dyno" id="ar-dyno-host" hidden\r
           data-dropzone="cyl-1,cyl-2,cyl-3,cyl-4"\r
           data-dropzone-id="ar-dyno-hook"\r
           data-drop-active="false"\r
           data-drop-hover="false">\r
        <!-- сюда оркестратор положит <lab-dynamometer> -->\r
        <button id="ar-detach-dyno"\r
                class="detach-btn lab-detach-btn"\r
                type="button"\r
                aria-label="Убрать динамометр со стола"\r
                title="Убрать динамометр со стола"\r
                hidden>×</button>\r
      </div>\r
\r
      <!-- Цилиндр, висящий под динамометром (overlay; позиция считается из dyno geometry).\r
           NB: detach-кнопка НЕ внутри cylinderHost (он сам role="button" для жеста\r
           dip/lift), а на уровне stage — иначе axe выдаёт «no-focusable-content»\r
           (фокусируемая кнопка внутри role=button). См. §19.11.15 / §19.11.11. -->\r
      <div class="ar-mount ar-mount--cylinder" id="ar-cylinder-host" hidden>\r
      </div>\r
      <button id="ar-detach-cyl"\r
              class="detach-btn lab-detach-btn detach-btn--floating"\r
              type="button"\r
              aria-label="Снять цилиндр с динамометра"\r
              title="Снять цилиндр с динамометра"\r
              hidden>×</button>\r
\r
      <!-- SVG-overlay для нити taut + линии-зажима от точки клипа к динамометру.\r
           Полные координаты сцены — рисуем напрямую <line>/<path> в этом svg,\r
           чтобы не зависеть от relative-host'ов lab-thread. -->\r
      <svg class="ar-scene-overlay" id="ar-scene-overlay" aria-hidden="true">\r
        <line id="ar-clamp-line" x1="0" y1="0" x2="0" y2="0"\r
              stroke="#9aa3b0" stroke-width="1" stroke-linecap="round"\r
              opacity="0.45" hidden />\r
        <path id="ar-thread-path" d="" fill="none"\r
              stroke="#d8c890" stroke-width="1.2" stroke-linecap="round"\r
              filter="drop-shadow(0 1px 1px rgba(0,0,0,0.25))" hidden />\r
        <line id="ar-bottom-danger" x1="0" y1="0" x2="0" y2="0"\r
              stroke="#ef4444" stroke-width="2" stroke-linecap="round"\r
              stroke-dasharray="4 3" opacity="0.85" hidden />\r
      </svg>\r
\r
      <!-- Soft-warning банер (перегрузка / частичное погружение / мало воды).\r
           Не блокирует, но даёт ученику нейтральную подсказку. -->\r
      <div class="ar-banner" id="ar-banner" hidden role="status" aria-live="polite">\r
        <span class="ar-banner-icon" aria-hidden="true">⚠</span>\r
        <span class="ar-banner-text" id="ar-banner-text"></span>\r
      </div>\r
\r
      <!-- Стакан -->\r
      <div class="ar-mount ar-mount--beaker"\r
           id="ar-beaker-host"\r
           hidden\r
           data-dropzone="dynamometer-1,dynamometer-2,cyl-1,cyl-2,cyl-3,cyl-4"\r
           data-dropzone-id="ar-beaker"\r
           data-drop-active="false"\r
           data-drop-hover="false">\r
        <!-- сюда оркестратор положит <lab-beaker> -->\r
        <button id="ar-detach-beaker"\r
                class="detach-btn lab-detach-btn"\r
                type="button"\r
                aria-label="Убрать стакан со стола"\r
                title="Убрать стакан со стола"\r
                hidden>×</button>\r
      </div>\r
\r
      <!-- Drop-zone для стакана из карточки. По умолчанию виден только когда стакан НЕ на сцене. -->\r
      <div class="ar-dropzone ar-dropzone--beaker"\r
           id="ar-dropzone-beaker"\r
           data-dropzone="beaker"\r
           data-dropzone-id="ar-stage-beaker"\r
           data-drop-active="false"\r
           data-drop-hover="false">\r
      </div>\r
\r
      <!-- Простой dose-picker для воды: 4 кнопки рядом с beaker. Появляется по тапу.\r
           300 мл — целенаправленный «перелив», ставит warning-banner. -->\r
      <div class="ar-dose-picker" id="ar-dose-picker" hidden role="menu" aria-label="Сколько воды налить">\r
        <button type="button" class="dose-btn" data-dose="100" role="menuitem">100 мл</button>\r
        <button type="button" class="dose-btn" data-dose="150" role="menuitem">150 мл</button>\r
        <button type="button" class="dose-btn" data-dose="200" role="menuitem"\r
                data-recommended\r
                aria-label="Налить 200 мл — рекомендованный объём">200 мл</button>\r
        <button type="button" class="dose-btn" data-dose="300" role="menuitem">300 мл</button>\r
      </div>\r
\r
      <!-- CTA «Записать показание» — единая кнопка, оркестратор управляет состоянием -->\r
      <button id="ar-record-btn" class="ar-record-btn" type="button" hidden>\r
        <span id="ar-record-label">Записать P возд</span>\r
      </button>\r
\r
      <!-- Журнал (floating panel внизу-справа, как в 1.1) -->\r
      <aside id="ar-journal-panel" class="ar-journal-panel" aria-label="Журнал измерений">\r
        <!-- §20.4 REFERENCE.md — toggle «manual / auto» (инжектируется JS-ом). -->\r
        <div id="ar-record-mode-slot" class="ar-record-mode-slot"></div>\r
        <!-- §21 — shared \`renderJournalTable\` рендерит сюда таблицу с\r
             ARCHIMEDES_SPEC. Ученик в semi-auto вводит F_A_изм и Δ\r
             в input'ы, ✓ проверяет. -->\r
        <div id="ar-journal-host" class="ar-journal-host"></div>\r
        <!-- lab-journal остаётся скрытым data-store: rows для CSV/PDF\r
             экспорта и getJournalRows() API. Визуально не показывается\r
             (CSS \`display: none\` в archimedes-experiment.css §21). -->\r
        <lab-journal id="ar-journal" experiment-id="1.2" data-role="student" hidden></lab-journal>\r
      </aside>\r
    </div>\r
  </section>\r
\r
  <aside class="archimedes-equipment-panel" aria-label="Оборудование комплекта №1 для опыта 1.2">\r
    <section class="equipment-group">\r
      <h3 class="equipment-group-title">Динамометры</h3>\r
      <div class="equipment-grid equipment-grid-2">\r
        <lab-equipment-card\r
          title="Динамометр 1 Н"\r
          status="available"\r
          data-eq="dynamometer-1"\r
          data-draggable="dynamometer-1"\r
          data-dropzone="dynamometer-1"\r
          data-dropzone-id="card-dynamometer-1"\r
        >\r
          <lab-dynamometer range="1" force="0"></lab-dynamometer>\r
        </lab-equipment-card>\r
        <lab-equipment-card\r
          title="Динамометр 5 Н"\r
          status="available"\r
          data-eq="dynamometer-2"\r
          data-draggable="dynamometer-2"\r
          data-dropzone="dynamometer-2"\r
          data-dropzone-id="card-dynamometer-2"\r
        >\r
          <lab-dynamometer range="5" force="0"></lab-dynamometer>\r
        </lab-equipment-card>\r
      </div>\r
    </section>\r
\r
    <section class="equipment-group">\r
      <h3 class="equipment-group-title">Цилиндры</h3>\r
      <p class="equipment-group-hint">Подвешивайте на крючок динамометра. Цилиндр №3 рекомендован.</p>\r
      <div class="equipment-grid equipment-grid-4">\r
        <lab-equipment-card title="Цилиндр № 1" status="available"\r
          data-eq="cyl-1" data-draggable="cyl-1"\r
          data-dropzone="cyl-1" data-dropzone-id="card-cyl-1">\r
          <lab-metal-weight material="steel" id-num="1"></lab-metal-weight>\r
        </lab-equipment-card>\r
        <lab-equipment-card title="Цилиндр № 2" status="available"\r
          data-eq="cyl-2" data-draggable="cyl-2"\r
          data-dropzone="cyl-2" data-dropzone-id="card-cyl-2">\r
          <lab-metal-weight material="aluminum" id-num="2"></lab-metal-weight>\r
        </lab-equipment-card>\r
        <lab-equipment-card title="Цилиндр № 3" status="available"\r
          data-eq="cyl-3" data-draggable="cyl-3"\r
          data-recommended\r
          data-dropzone="cyl-3" data-dropzone-id="card-cyl-3">\r
          <lab-metal-weight material="plastic" id-num="3"></lab-metal-weight>\r
        </lab-equipment-card>\r
        <lab-equipment-card title="Цилиндр № 4" status="available"\r
          data-eq="cyl-4" data-draggable="cyl-4"\r
          data-dropzone="cyl-4" data-dropzone-id="card-cyl-4">\r
          <lab-metal-weight material="aluminum" id-num="4"></lab-metal-weight>\r
        </lab-equipment-card>\r
      </div>\r
    </section>\r
\r
    <section class="equipment-group">\r
      <h3 class="equipment-group-title">Посуда</h3>\r
      <div class="equipment-grid equipment-grid-1">\r
        <lab-equipment-card title="Стакан 250 мл" status="available"\r
          data-eq="beaker" data-draggable="beaker"\r
          data-dropzone="beaker" data-dropzone-id="card-beaker">\r
          <lab-beaker level="0"></lab-beaker>\r
        </lab-equipment-card>\r
      </div>\r
    </section>\r
  </aside>\r
</main>\r
<div id="ar-live-region" role="status" aria-live="polite" aria-atomic="true" class="sr-only"></div>\r
`;class jr{meta=Wr;#t=null;#e=null;mount(t){if(this.#t===t)return;this.#t=t,t.innerHTML=zr;const e={rootHost:t,steps:t.querySelector("#ar-steps"),hint:t.querySelector("#ar-hint"),resetBtn:t.querySelector("#ar-reset-btn"),stage:t.querySelector("#ar-stage"),clamp:t.querySelector("#ar-clamp"),dropzoneStage:t.querySelector("#ar-dropzone-stage"),dropzoneBeaker:t.querySelector("#ar-dropzone-beaker"),dynoHost:t.querySelector("#ar-dyno-host"),cylinderHost:t.querySelector("#ar-cylinder-host"),sceneOverlay:t.querySelector("#ar-scene-overlay"),clampLine:t.querySelector("#ar-clamp-line"),threadPath:t.querySelector("#ar-thread-path"),bottomDanger:t.querySelector("#ar-bottom-danger"),beakerHost:t.querySelector("#ar-beaker-host"),banner:t.querySelector("#ar-banner"),bannerText:t.querySelector("#ar-banner-text"),dosePicker:t.querySelector("#ar-dose-picker"),recordBtn:t.querySelector("#ar-record-btn"),recordLabel:t.querySelector("#ar-record-label"),journal:t.querySelector("#ar-journal"),journalHost:t.querySelector("#ar-journal-host"),liveRegion:t.querySelector("#ar-live-region"),equipmentCards:Array.from(t.querySelectorAll("lab-equipment-card[data-eq]")),detachDynoBtn:t.querySelector("#ar-detach-dyno"),detachCylBtn:t.querySelector("#ar-detach-cyl"),detachBeakerBtn:t.querySelector("#ar-detach-beaker"),recordModeSlot:t.querySelector("#ar-record-mode-slot")};this.#e=new qr(e),window.archimedesExperiment=this.#e}unmount(){this.#e?.destroy(),this.#e=null,this.#t&&(this.#t.replaceChildren(),this.#t=null),delete window.archimedesExperiment}reset(){this.#e?.reset()}}function $t(){return"../home/"}function Yr(){const t=new URLSearchParams(window.location.search).get("role");return t==="teacher"||t==="student"?t:null}const le="kit-1-hydrostatics:role";function Vr(o){try{localStorage.setItem(le,o)}catch{}}function Kr(){try{const o=localStorage.getItem(le);return o==="teacher"||o==="student"?o:null}catch{return null}}const Ct=Yr();Ct&&Vr(Ct);const U=Ct??Kr();if(U){document.body.dataset.role=U;const o=document.createElement("a");o.className="role-badge",o.href=$t(),o.setAttribute("aria-label",`Текущая роль: ${U==="teacher"?"Учитель":"Ученик"}. Вернуться на каталог`),o.innerHTML=`
    <span>${U==="teacher"?"Учитель":"Ученик"}</span>
    <span class="role-badge-arrow" aria-hidden="true">↗</span>
  `,document.body.appendChild(o)}const Ur=document.getElementById("screen-content"),D=document.getElementById("kit-nav"),J=document.getElementById("kit-header"),Q=[new xe,new jr];D.setScreens(Q.map(o=>o.meta));D.setProgress(0);const Z=new yr(Ur,Q,"density-solid");Z.onScreenChanged(o=>{D.setAttribute("active",o);const t={};for(const r of Q)t[r.meta.id]=r.meta.id===o?"current":"available";D.setStates(t);const e=Q.find(r=>r.meta.id===o);e&&(J.setAttribute("experiment-kicker",e.meta.kicker),J.setAttribute("experiment",e.meta.label))});D.addEventListener("screen-select",o=>{const t=o.detail.id;Z.navigate(t)});J.setAttribute("home-href",$t());J.addEventListener("home-click",()=>{window.location.href=$t()});Z.start();window.kitShell=Z;
//# sourceMappingURL=index-BQj8FO9N.js.map
