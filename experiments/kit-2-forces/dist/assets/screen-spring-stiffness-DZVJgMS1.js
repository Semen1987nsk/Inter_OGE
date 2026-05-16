const O=`<main class="app-main-v3">\r
        <section class="workbench" aria-label="Рабочая зона">\r
          <header class="workbench-header">\r
            <ol class="steps" id="steps" aria-label="Этапы измерения">\r
              <li class="step" data-step="1">\r
                <span class="step-num">1</span>\r
                <span class="step-label">Закрепите пружину</span>\r
              </li>\r
              <li class="step" data-step="2">\r
                <span class="step-num">2</span>\r
                <span class="step-label">Запишите l₀ <small>(клик по шкале)</small></span>\r
              </li>\r
              <li class="step" data-step="3">\r
                <span class="step-num">3</span>\r
                <span class="step-label">Подвесьте груз</span>\r
              </li>\r
              <li class="step" data-step="4">\r
                <span class="step-num">4</span>\r
                <span class="step-label">Запишите l₁ <small>(клик по шкале)</small></span>\r
              </li>\r
              <li class="step" data-step="5">\r
                <span class="step-num">5</span>\r
                <span class="step-label">В журнал</span>\r
              </li>\r
            </ol>\r
            <div class="workbench-hint" id="hint-bar">\r
              Возьмите оборудование из правой панели и перетащите на установку.\r
            </div>\r
            <button id="reset-btn" class="reset-btn" type="button" aria-label="Сбросить опыт" title="Сбросить опыт">\r
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4">\r
                <path d="M3 12a9 9 0 1 0 9-9 9.74 9.74 0 0 0-7 3l-2 2"/>\r
                <path d="M3 4v5h5"/>\r
              </svg>\r
            </button>\r
          </header>\r
\r
          <div class="workbench-stage" id="stage">\r
            <!-- Угловые скобки-«фреймер» в стиле технического чертежа: визуально замыкают рабочее поле -->\r
            <span class="stage-corner stage-corner--tl" aria-hidden="true"></span>\r
            <span class="stage-corner stage-corner--tr" aria-hidden="true"></span>\r
            <span class="stage-corner stage-corner--bl" aria-hidden="true"></span>\r
            <span class="stage-corner stage-corner--br" aria-hidden="true"></span>\r
\r
            <!-- Баннер «указатель за шкалой» — мягкое предупреждение при перерастяжении пружины\r
                 (актуально для пружины №2 / k10 при подвесе тяжёлых грузов). Не блокирует\r
                 эксперимент, но помогает выбрать правильный комплект груза. -->\r
            <div\r
              id="overload-banner"\r
              class="overload-banner"\r
              role="status"\r
              aria-live="polite"\r
              hidden\r
            >\r
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">\r
                <path d="M12 9v4M12 17h.01" />\r
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />\r
              </svg>\r
              <span class="overload-banner-text"></span>\r
            </div>\r
            <div class="stand-container" id="stand-container">\r
              <lab-stand id="stand"></lab-stand>\r
              <div class="hook-slot" data-slot="0" id="hook-0"></div>\r
              <div class="hook-slot" data-slot="1" id="hook-1"></div>\r
              <div class="hook-slot" data-slot="2" id="hook-2"></div>\r
\r
              <!-- Пульсирующая зона-приёмник у крюка штатива (для пружины) -->\r
              <div class="drop-zone" id="drop-zone-spring" aria-hidden="true" hidden>\r
                <span class="drop-zone-label">Закрепите пружину</span>\r
              </div>\r
              <!-- Пульсирующая зона-приёмник у нижней петли цепочки (для динамометра/груза) -->\r
              <div class="drop-zone" id="drop-zone-bottom" aria-hidden="true" hidden>\r
                <span class="drop-zone-label">Подвесьте сюда</span>\r
              </div>\r
            </div>\r
\r
            <!-- Floating measurement panel — выезжает снизу-справа сцены при первом измерении.\r
                 PhET-стиль: сцена доминирует, журнал/график — opt-in оверлей. -->\r
            <aside\r
              id="measurement-panel"\r
              class="measurement-panel"\r
              data-state="empty"\r
              aria-collapsed="false"\r
              aria-label="Панель измерений"\r
            >\r
              <header class="measurement-panel-header">\r
                <button\r
                  id="measurement-toggle"\r
                  class="measurement-toggle"\r
                  type="button"\r
                  aria-expanded="true"\r
                  aria-controls="measurement-body"\r
                >\r
                  <svg class="chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">\r
                    <polyline points="6 9 12 15 18 9" />\r
                  </svg>\r
                  <span class="measurement-title">Журнал измерений</span>\r
                  <span id="measurement-count" class="measurement-count" hidden>0</span>\r
                </button>\r
                <!-- §20.4 — record-mode toggle (semi-auto / fully-manual / fully-auto). -->\r
                <div id="record-mode-slot" class="record-mode-slot"></div>\r
                <button\r
                  id="record-btn"\r
                  class="record-btn"\r
                  type="button"\r
                  disabled\r
                  hidden\r
                >\r
                  Записать в журнал\r
                </button>\r
              </header>\r
\r
              <div id="measurement-body" class="measurement-body">\r
                <div class="journal-empty" id="journal-empty">\r
                  Подвесьте груз и кликните по делению шкалы напротив указателя пружины.\r
                </div>\r
\r
                <!-- Форма ручного ввода в журнал. Открывается после нажатия «Записать в журнал».\r
                     Префилл: l₀, l₁ из кликов по шкале, m из суммы наклеек грузов. Ученик может\r
                     скорректировать значения перед сохранением. -->\r
                <form id="record-form" class="record-form" hidden>\r
                  <h4 class="record-form-title">Запишите значения с приборов</h4>\r
                  <div class="record-field">\r
                    <label for="rf-l0"><em>l</em><sub>0</sub>, мм:</label>\r
                    <input type="number" id="rf-l0" inputmode="numeric" step="1" min="0" max="100" placeholder="напр. 30" />\r
                    <small class="hint">Положение указателя без нагрузки (клик по шкале — авто-префилл).</small>\r
                  </div>\r
                  <div class="record-field">\r
                    <label for="rf-l1"><em>l</em><sub>1</sub>, мм:</label>\r
                    <input type="number" id="rf-l1" inputmode="numeric" step="1" min="0" max="100" placeholder="напр. 50" />\r
                    <small class="hint">Положение указателя с нагрузкой.</small>\r
                  </div>\r
                  <div class="record-field record-field-readonly">\r
                    <label>Масса <em>m</em>, г:</label>\r
                    <output id="rf-mass">0</output>\r
                    <small class="hint">Авто (сумма наклеек на грузах).</small>\r
                  </div>\r
                  <div class="record-form-actions">\r
                    <button type="button" id="rf-cancel" class="rf-cancel">Отмена</button>\r
                    <button type="submit" id="rf-submit" class="rf-submit">В журнал</button>\r
                  </div>\r
                </form>\r
\r
                <!-- Формула расчёта (видна когда есть журнал) -->\r
                <div class="formula-display" id="formula-display" hidden>\r
                  <span class="formula-label">Формула:</span>\r
                  <span class="formula-expr">\r
                    <em>F</em> = <em>m</em> · <em>g</em>,\r
                    <em>Δl</em> = <em>l</em><sub>1</sub> − <em>l</em><sub>0</sub>,\r
                    <em>k</em> = <em>F</em> / <em>Δl</em>\r
                  </span>\r
                  <span class="formula-units">массу — в кг, <em>Δl</em> — в метрах, <em>g</em> = 9,8 м/с²</span>\r
                </div>\r
\r
                <!-- §21 — журнал v2: контейнер для shared \`renderJournalTable\` (SPRING_SPEC). -->\r
                <div id="journal-host" class="journal-host" hidden></div>\r
\r
                <!-- §21.10 — pending-плашка для semi-auto (видна когда ready && signature changed). -->\r
                <div id="record-pending-slot" class="record-pending-slot" hidden>\r
                  <button id="record-pending-btn" class="record-pending-btn" type="button">\r
                    Записать в журнал <span id="record-pending-summary"></span>\r
                  </button>\r
                </div>\r
\r
                <!-- LEGACY: fallback таблица v1, скрыта если используется journal-host (v2). -->\r
                <table class="journal-table" id="journal-table" hidden>\r
                  <thead>\r
                    <tr>\r
                      <th>№</th>\r
                      <th><em>m</em>, г</th>\r
                      <th><em>F</em>, Н</th>\r
                      <th><em>l</em><sub>1</sub>, мм</th>\r
                      <th><em>Δl</em>, мм</th>\r
                      <th><em>k</em>, Н/м</th>\r
                    </tr>\r
                  </thead>\r
                  <tbody id="journal-body"></tbody>\r
                </table>\r
                <div id="result-panel" class="result-panel" hidden></div>\r
                <div id="graph-wrap" class="graph-wrap" hidden>\r
                  <h3 class="graph-title">График F(Δl)</h3>\r
                  <lab-graph id="graph"></lab-graph>\r
                </div>\r
              </div>\r
            </aside>\r
          </div>\r
        </section>\r
\r
        <!-- Overlay для drag&drop (position:fixed) — должен быть выше всех элементов -->\r
        <div id="drag-overlay" class="drag-overlay" aria-hidden="true"></div>\r
\r
        <aside class="equipment-panel" aria-label="Оборудование комплекта">\r
          <section class="equipment-group">\r
            <h3 class="equipment-group-title">Оборудование</h3>\r
            <div class="equipment-grid">\r
              <lab-equipment-card title="Динамометр 1Н" status="available" data-eq="dyno-1">\r
                <lab-dynamometer range="1" force="0"></lab-dynamometer>\r
              </lab-equipment-card>\r
              <lab-equipment-card title="Динамометр 5Н" status="available" data-eq="dyno-5">\r
                <lab-dynamometer range="5" force="0"></lab-dynamometer>\r
              </lab-equipment-card>\r
              <lab-equipment-card title="Пружина №1" status="available" data-eq="spring-k50">\r
                <lab-spring-board spring-id="k50" extension="0"></lab-spring-board>\r
              </lab-equipment-card>\r
              <lab-equipment-card title="Пружина №2" status="available" data-eq="spring-k10">\r
                <lab-spring-board spring-id="k10" extension="0"></lab-spring-board>\r
              </lab-equipment-card>\r
            </div>\r
          </section>\r
\r
          <section class="equipment-group">\r
            <h3 class="equipment-group-title">Готовые грузы</h3>\r
            <div class="equipment-grid equipment-grid-3">\r
              <lab-equipment-card title="Груз №1" status="available" data-eq="w-100-1">\r
                <lab-weight mass="100" number="1"></lab-weight>\r
              </lab-equipment-card>\r
              <lab-equipment-card title="Груз №2" status="available" data-eq="w-100-2">\r
                <lab-weight mass="100" number="2"></lab-weight>\r
              </lab-equipment-card>\r
              <lab-equipment-card title="Груз №3" status="available" data-eq="w-100-3">\r
                <lab-weight mass="100" number="3"></lab-weight>\r
              </lab-equipment-card>\r
            </div>\r
          </section>\r
\r
          <section class="equipment-group">\r
            <h3 class="equipment-group-title">Наборный груз</h3>\r
            <p class="equipment-group-hint">\r
              Штанга 10 г + диски 10/20/50. Перетащите диски на штангу — соберите массу\r
              10/20/30/40/60/70/80/90 г. Затем повесьте узел на пружину.\r
            </p>\r
            <lab-composite-tray\r
              id="composite-tray"\r
              data-eq="composite-load"\r
            ></lab-composite-tray>\r
          </section>\r
        </aside>\r
      </main>\r
<div id="live-region" role="status" aria-live="polite" aria-atomic="true" class="sr-only"></div>\r
`;class Z{#t;#s=new Set;constructor(t){this.#t=t}get(){return this.#t}set(t){this.#t={...this.#t,...t},this.#e()}update(t){const e=t(this.#t);this.set(e)}subscribe(t){return this.#s.add(t),()=>this.#s.delete(t)}#e(){for(const t of this.#s)t(this.#t)}}const H=80,z=320,Y="cubic-bezier(0.34, 1.4, 0.64, 1)";class U{#t=new Map;#s=null;#e;#o;#i=new Map;constructor(t){this.#e=t,this.#o=window.matchMedia("(prefers-reduced-motion: reduce)").matches}addSnapZone(t){this.#t.set(t.id,t)}removeSnapZone(t){this.#t.delete(t)}attach(t,e){const n=r=>this.#h(t,e,r);t.addEventListener("pointerdown",n);const s=r=>{r.key!=="Enter"&&r.key!==" "||(r.preventDefault(),this.#u(t,e))};return t.addEventListener("keydown",s),()=>{t.removeEventListener("pointerdown",n),t.removeEventListener("keydown",s)}}isDragging(){return this.#s!==null}cancel(){this.#s&&this.#c(!1,this.#s.homeRect.left,this.#s.homeRect.top);for(const t of this.#i.values())t();this.#i.clear()}#h(t,e,n){if(this.#s!==null||n.button!==void 0&&n.button!==0||t.hasAttribute("attached"))return;const s=this.#i.get(t);s&&(s(),this.#i.delete(t)),n.preventDefault();const r=t.getBoundingClientRect(),a=n.clientX-r.left,o=n.clientY-r.top,l={position:t.style.position,left:t.style.left,top:t.style.top,zIndex:t.style.zIndex,transform:t.style.transform},c=t.parentNode,d=t.nextSibling;this.#e.appendChild(t),t.style.position="fixed",t.style.left=`${r.left}px`,t.style.top=`${r.top}px`,t.style.zIndex="1000",t.style.transform="",t.setAttribute("dragging","");try{t.setPointerCapture(n.pointerId)}catch{}this.#s={element:t,options:e,pointerId:n.pointerId,homeRect:r,homeParent:c,homeNextSibling:d,offsetX:a,offsetY:o,savedStyles:l,hoverZoneId:null},e.onDragStart?.();const u=f=>this.#p(f,u,h),h=f=>{window.removeEventListener("pointermove",u),window.removeEventListener("pointerup",h),window.removeEventListener("pointercancel",h),this.#n(f)};window.addEventListener("pointermove",u),window.addEventListener("pointerup",h),window.addEventListener("pointercancel",h)}#p(t,e,n){const s=this.#s;!s||t.pointerId!==s.pointerId||(s.element.style.left=`${t.clientX-s.offsetX}px`,s.element.style.top=`${t.clientY-s.offsetY}px`,this.#r(t.clientX,t.clientY))}#n(t){const e=this.#s;if(!e||t.pointerId!==e.pointerId)return;this.#a(t.clientX,t.clientY)?this.#c(!0,t.clientX,t.clientY):this.#c(!1,e.homeRect.left,e.homeRect.top)}#r(t,e){const n=this.#s;let s=null;for(const a of this.#t.values()){if(!a.accepts.includes(n.options.kind))continue;const o=a.getRect(),l=o.left+o.width/2,c=o.top+o.height/2,d=Math.hypot(t-l,e-c),u=a.snapRadius??H;if(d<=u){s=a;break}}const r=s?.id??null;r!==n.hoverZoneId&&(n.hoverZoneId&&this.#t.get(n.hoverZoneId)?.onHover?.(!1),r&&this.#t.get(r)?.onHover?.(!0),n.hoverZoneId=r)}#a(t,e){const n=this.#s;if(!n.hoverZoneId)return!1;const s=this.#t.get(n.hoverZoneId);return s?s.onDrop({element:n.element,kind:n.options.kind,equipmentId:n.options.equipmentId,pointerX:t,pointerY:e}):!1}#c(t,e,n){const s=this.#s;if(!s)return;this.#s=null,s.hoverZoneId&&this.#t.get(s.hoverZoneId)?.onHover?.(!1);try{s.element.releasePointerCapture(s.pointerId)}catch{}if(s.element.removeAttribute("dragging"),s.options.onDragEnd?.(t),t)return;const r=s.homeRect.left,a=s.homeRect.top,o=this.#o?0:z;let l=!1;const c=()=>{if(l)return;l=!0,this.#i.delete(s.element),s.homeNextSibling&&s.homeNextSibling.parentNode===s.homeParent?s.homeParent.insertBefore(s.element,s.homeNextSibling):s.homeParent.appendChild(s.element);const h=s.savedStyles;s.element.style.position=h.position,s.element.style.left=h.left,s.element.style.top=h.top,s.element.style.zIndex=h.zIndex,s.element.style.transform=h.transform};if(o===0){c();return}this.#i.set(s.element,c);const d=s.element.animate([{left:s.element.style.left,top:s.element.style.top},{left:`${r}px`,top:`${a}px`}],{duration:o,easing:Y,fill:"forwards"}),u=()=>{try{d.cancel()}catch{}c()};d.addEventListener("finish",u,{once:!0}),d.addEventListener("cancel",u,{once:!0}),setTimeout(()=>{if(!l){try{d.cancel()}catch{}c()}},o+100)}#u(t,e){const n=Array.from(this.#t.values()).find(r=>r.accepts.includes(e.kind));if(!n)return;const s=n.getRect();n.onDrop({element:t,kind:e.kind,equipmentId:e.equipmentId,pointerX:s.left+s.width/2,pointerY:s.top+s.height/2})}}const G=2400;class X{#t;#s;#e=null;#o=!1;constructor(t,e){this.#t=t,this.#s=e}update(t){if(this.#o)return;const e=this.#i(t);e!==this.#t.textContent&&(this.#t.textContent=e)}flash(t){this.#o=!0,this.#t.textContent=t,this.#t.setAttribute("data-flash","true"),this.#s.textContent=t,this.#e&&clearTimeout(this.#e),this.#e=setTimeout(()=>{this.#o=!1,this.#t.removeAttribute("data-flash")},G)}#i(t){return t.spring===null&&t.dynamometer?.attachedTo==="stand"?t.weights.length===0?"Подвесьте груз на крюк динамометра — он покажет силу тяжести (вес).":"Можно подвесить ещё груз или снять текущий, нажав ×.":t.spring===null&&t.dynamometer===null?"Возьмите пружину или динамометр из правой панели и подвесьте на штатив.":t.measurementStep==="reading-l0"?"Кликните по делению шкалы напротив указателя пружины — это l₀ (без нагрузки).":t.measurementStep==="l0-recorded"&&t.weights.length===0?"Положение l₀ записано. Подвесьте груз на крюк пружины.":t.measurementStep==="reading-l1"?"Дождитесь окончания колебаний и кликните по новому положению указателя.":t.measurementStep==="ready-to-record"?"Нажмите «Записать в журнал» для фиксации измерения.":t.measurements.length===1?"Подвесьте ещё один груз для следующего измерения.":t.measurements.length>=2?"Можно подвешивать дополнительные грузы или нажмите «Сбросить».":"Соберите установку и проведите измерения."}}const E={stage:"empty",spring:null,dynamometer:null,weights:[],dragging:null,oscillationStartTime:null,displayedExtensionMm:0,measurementStep:"idle",scaleClickL0:null,scaleClickL1:null,scaleClickF:null,measurements:[],hintsEnabled:!0},V={k50:{k:50,restLengthMm:30},k10:{k:10,restLengthMm:30}},W={"w-100-1":{mass:100,equipmentId:"w-100-1"},"w-100-2":{mass:100,equipmentId:"w-100-2"},"w-100-3":{mass:100,equipmentId:"w-100-3"},rod:{mass:10,equipmentId:"rod"},"disc-10":{mass:10,equipmentId:"disc-10"},"disc-20":{mass:20,equipmentId:"disc-20"},"disc-50":{mass:50,equipmentId:"disc-50"},"composite-load":{mass:10,equipmentId:"composite-load"}},C={"dyno-1":{range:1,equipmentId:"dyno-1"},"dyno-5":{range:5,equipmentId:"dyno-5"}},K=9.8,k={min:48,max:52};function y(i){return i/1e3*K}function J(i,t){if(t<=0)throw new RangeError(`Жёсткость пружины должна быть > 0, получено: ${t}`);return i/t*100}function Q(i,t){return t===0?null:i/(t/100)}function tt(i,t,e,n,s=.15){if(t<=0)throw new RangeError(`Жёсткость пружины должна быть > 0, получено: ${t}`);if(e<=0)throw new RangeError(`Суммарная масса должна быть > 0, получено: ${e}`);const r=Math.sqrt(t/e);return i*Math.exp(-s*n)*Math.cos(r*n)}function et(i=.15){return-Math.log(.01)/i}function p(i){return i.reduce((t,e)=>t+e.mass,0)}function b(i,t){const e=10**t;return Math.round(i*e)/e}function M(i,t,e){if(i<=0)return null;const n=e!==void 0?e:y(i),s=Q(n,t);return s===null?null:{id:`m-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,timestamp:Date.now(),totalMass:i,force:b(n,3),extension:b(t,2),k:b(s,1)}}function nt(i){if(i.length===0)return 0;let t=0,e=0;for(const n of i){const s=n.extension/100;t+=s*n.force,e+=s*s}return e>0?t/e:0}function st(i){if(i.length===0)return{mean:0,stdDev:0};const t=i.reduce((n,s)=>n+s,0)/i.length,e=i.reduce((n,s)=>n+(s-t)**2,0)/i.length;return{mean:t,stdDev:Math.sqrt(e)}}function A(i,t=50){if(i.length===0)return null;const e=i.map(o=>o.k),{mean:n,stdDev:s}=st(e),r=nt(i);let a=null;return t!==null&&t===50&&(a=n>=k.min&&n<=k.max),{mean:b(n,1),stdDev:b(s,2),byLeastSquares:b(r,1),isInValidRange:a}}const F="semi-auto";function I(i){return i==="semi-auto"||i==="fully-manual"||i==="fully-auto"?i:i==="manual"||i==="auto"?"semi-auto":F}function D(){try{if(typeof globalThis>"u")return null;const i=globalThis.location;if(!i?.search)return null;const e=new URLSearchParams(i.search).get("mode");return e===null?null:e==="semi-auto"||e==="fully-manual"||e==="fully-auto"?e:e==="manual"?"semi-auto":e==="auto"?"fully-auto":null}catch{return null}}function B(){return D()!==null}function L(i,t=document){try{t.body&&(t.body.dataset.recordMode=i)}catch{}}const $="inter-oge.record-mode.";function j(){try{if(typeof globalThis>"u")return null;const i=globalThis.localStorage;if(!i)return null;const t="__inter-oge-record-mode-probe__";return i.setItem(t,"1"),i.removeItem(t),i}catch{return null}}function N(i){const t=D();if(t!==null)return t;const e=j();if(!e)return F;const n=e.getItem($+i);return I(n)}function rt(i,t){if(B())return;const e=j();e&&e.setItem($+i,I(t))}function it(i,t){const e=document.createElement("div");e.className="lab-record-mode-toggle",e.setAttribute("role","radiogroup"),e.setAttribute("aria-label","Режим записи в журнал");const n=B();n?(e.dataset.locked="true",e.setAttribute("aria-disabled","true"),e.title="Режим зафиксирован учителем (URL-параметр ?mode=…). Изменить нельзя."):e.title="Полу-авто (по умолчанию): клик «Записать» → программа пишет показания приборов; ученик вводит расчётные. Ручной: ученик вводит ВСЁ. Авто: программа пишет автоматически.";const s=N(t.kitId);L(s);const r=[{mode:"semi-auto",label:"Полу-авто",hint:"Программа пишет показания, ученик — расчётные"},{mode:"fully-manual",label:"Ручной",hint:"Ученик вводит все значения сам"},{mode:"fully-auto",label:"Авто",hint:"Программа пишет всё автоматически"}],a=[];for(const o of r){const l=document.createElement("button");l.type="button",l.className="lab-record-mode-toggle__segment",l.setAttribute("role","radio"),l.setAttribute("aria-checked",o.mode===s?"true":"false"),o.mode===s&&(l.dataset.active="true"),l.dataset.mode=o.mode,l.textContent=o.label,l.title=o.hint,n&&(l.disabled=!0,l.setAttribute("aria-disabled","true")),l.addEventListener("click",()=>{if(!n&&l.dataset.active!=="true"){for(const c of a)delete c.dataset.active,c.setAttribute("aria-checked","false");l.dataset.active="true",l.setAttribute("aria-checked","true"),rt(t.kitId,o.mode),L(o.mode),t.onChange?.(o.mode)}}),l.addEventListener("keydown",c=>{if(c.key==="ArrowLeft"||c.key==="ArrowRight"){c.preventDefault();const d=a.indexOf(l),u=c.key==="ArrowLeft"?(d-1+a.length)%a.length:(d+1)%a.length;a[u]?.focus(),a[u]?.click()}}),a.push(l),e.appendChild(l)}return i.appendChild(e),()=>{e.remove()}}const at=`
.lab-record-mode-toggle {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-family: var(--font-display, system-ui, sans-serif);
  user-select: none;
  -webkit-user-select: none;
}
.lab-record-mode-toggle__segment {
  appearance: none;
  background: transparent;
  border: none;
  border-radius: 999px;
  padding: 5px 12px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: background-color 140ms ease-out, color 140ms ease-out;
}
.lab-record-mode-toggle__segment:hover:not([data-active='true']) {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
}
.lab-record-mode-toggle__segment[data-active='true'] {
  background: #ffbe0b;
  color: #1a1a1a;
  font-weight: 600;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
}
.lab-record-mode-toggle__segment:focus-visible {
  outline: 2px solid #ffbe0b;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .lab-record-mode-toggle__segment {
    transition: none;
  }
}
`;function ot(i=document){const t="lab-record-mode-toggle-styles";if(i.getElementById(t))return;const e=i.createElement("style");e.id=t,e.textContent=at,i.head.appendChild(e)}function q(i,t="fixed2"){if(i==null)return"—";if(typeof i=="string")return i;if(!Number.isFinite(i))return"—";let e;switch(t){case"int":e=Math.round(i).toString();break;case"fixed1":e=i.toFixed(1);break;case"fixed2":e=i.toFixed(2);break;case"fixed3":e=i.toFixed(3);break;case"percent":e=i.toFixed(1)+"%";break}return e.replace(".",",")}function P(i){if(i==null)return null;const t=String(i).trim();if(t===""||t==="—")return null;const e=t.replace(",",".").replace(/\s+/g,""),n=Number(e);return Number.isFinite(n)?n:null}function lt(i,t,e,n){let s=null;try{const d=document.activeElement;d instanceof HTMLInputElement&&typeof i.contains=="function"&&i.contains(d)&&d.dataset.row&&(s={row:d.dataset.row,key:d.dataset.key,selStart:d.selectionStart,selEnd:d.selectionEnd})}catch{}i.replaceChildren();const r=document.createElement("table");r.className="lab-journal-table",r.setAttribute("data-experiment",t.experimentId),r.setAttribute("data-mode",n.mode);const a=document.createElement("thead"),o=document.createElement("tr");for(const d of t.columns){const u=document.createElement("th");u.textContent=d.label,u.setAttribute("data-key",d.key),u.setAttribute("data-source",d.source),o.appendChild(u)}if(t.columns.some(d=>d.source==="derived")&&n.mode==="semi-auto"){const d=document.createElement("th");d.textContent="✓",d.setAttribute("aria-label","Проверить"),o.appendChild(d)}a.appendChild(o),r.appendChild(a);const c=document.createElement("tbody");c.className="lab-journal-body";for(const d of e){const u=dt(t,d,n);c.appendChild(u)}if(r.appendChild(c),i.appendChild(r),s?.row&&s?.key)try{const d=i.querySelector(`input[data-row="${s.row}"][data-key="${s.key}"]`);d&&typeof d.focus=="function"&&(d.focus(),s.selStart!==null&&s.selEnd!==null&&d.setSelectionRange(s.selStart,s.selEnd))}catch{}}function dt(i,t,e){const n=document.createElement("tr");n.dataset.rowIdx=String(t.idx),n.dataset.ts=String(t.timestamp),e.editingRowIdx===t.idx&&(n.dataset.editing="true"),e.onEdit&&n.addEventListener("dblclick",r=>{const a=r.target;a.tagName==="INPUT"||a.tagName==="BUTTON"||e.onEdit?.(t.idx)});for(const r of i.columns){const a=ct(r,t,e);n.appendChild(a)}if(i.columns.some(r=>r.source==="derived")&&e.mode==="semi-auto"){const r=document.createElement("td"),a=document.createElement("button");a.type="button",a.className="j-check",a.textContent="✓",a.setAttribute("aria-label",`Проверить значения в строке ${t.idx}`),a.dataset.row=String(t.idx),a.addEventListener("click",()=>e.onVerify(t.idx)),r.appendChild(a),n.appendChild(r)}return n}function ct(i,t,e){const n=document.createElement("td");n.dataset.key=i.key,n.dataset.source=i.source;const s=t.verdicts?.[i.key];s&&(n.dataset.verdict=s,e.mode==="semi-auto"&&s!=="empty"&&n.classList.add("j-verdict",`j-verdict--${s}`));const r=t.values[i.key]??null,a=e.editingRowIdx===t.idx;let o=!1;if(i.source==="meta"?o=!1:i.source==="derived"?o=e.mode!=="fully-auto":o=e.mode==="fully-manual"||a,o){const l=document.createElement("input");l.type="text",l.inputMode="decimal",l.className=`j-input j-input--${i.source}`,l.dataset.row=String(t.idx),l.dataset.key=i.key,s&&e.mode==="semi-auto"&&(l.dataset.verdict=s),l.value=r!==null?q(r,i.format):"",l.placeholder=e.mode==="fully-manual"?"":i.unit??"",l.setAttribute("aria-label",i.ariaLabel??`${i.label}${i.unit?" ("+i.unit+")":""}`),l.addEventListener("input",()=>{const c=P(l.value);e.onCellInput(t.idx,i.key,c)}),n.appendChild(l)}else n.textContent=q(r,i.format);return n}const R=9.8,_={experimentId:"2.1",columns:[{key:"idx",label:"№",source:"meta",format:"int"},{key:"m_g",label:"m, г",source:"direct",unit:"г",format:"int"},{key:"l0_mm",label:"l₀, мм",source:"direct",unit:"мм",format:"int"},{key:"l1_mm",label:"l₁, мм",source:"direct",unit:"мм",format:"int"},{key:"dL_mm",label:"ΔL, мм",source:"derived",unit:"мм",format:"int",tolerance:.05,expectedFromRow:i=>(i.l1_mm??0)-(i.l0_mm??0)},{key:"F_N",label:"F, Н",source:"derived",unit:"Н",format:"fixed2",tolerance:.05,expectedFromRow:i=>(i.m_g??0)*R/1e3},{key:"k_N_m",label:"k, Н/м",source:"derived",unit:"Н/м",format:"int",tolerance:.1,expectedFromRow:i=>{const t=(i.m_g??0)*R/1e3,e=((i.l1_mm??0)-(i.l0_mm??0))/1e3;return e<=0?0:t/e}}]},ut=.05,ht=.4;function mt(i,t,e){if(e===null||!Number.isFinite(e))return"empty";if(i.source!=="derived"||typeof i.expectedFromRow!="function")return"wrong";const n={};for(const[o,l]of Object.entries(t.values))typeof l=="number"&&Number.isFinite(l)&&(n[o]=l);let s;try{s=i.expectedFromRow(n)}catch{return"wrong"}if(!Number.isFinite(s))return"wrong";const r=i.tolerance??ut;if(Math.abs(s)<1e-9){const o=r*.001;return Math.abs(e)<=o?"ok":"wrong"}const a=Math.abs(e-s)/Math.abs(s);return a<=r*ht?"ok":a<=r?"close":"wrong"}function pt(i,t){const e={};for(const n of i){if(n.source!=="derived")continue;const s=t.values[n.key],r=typeof s=="number"?s:null;e[n.key]=mt(n,t,r)}return e}const T="kit-2";class ft{#t;#s;#e;#o;#i;#h;#p;#n=null;#r=null;#a=[];#c=new Map;#u=null;#m=new Map;#A=new Map;#L=null;#q="";constructor(t,e={}){this.#t=t,this.#s=e,this.#e=new Z({...E}),this.#o=new U(t.dragOverlay),this.#i=new X(t.hintBar,t.liveRegion),this.#h=document.createElement("div"),this.#h.className="hung-mount",this.#p=document.createElement("div"),this.#p.className="hung-stack",this.#h.appendChild(this.#p),t.standContainer.appendChild(this.#h),this.#H(),this.#d(),this.#i.update(this.#e.get())}attachSpringById(t){const e=this.#c.get(t);if(!e)return!1;const n=e.querySelector("lab-spring-board");return n?this.#R(n,t):!1}attachDynamometerById(t,e="spring"){const n=this.#c.get(t);if(!n)return!1;const s=n.querySelector("lab-dynamometer");return s?e==="stand"?this.#T(s,t):this.#_(s,t):!1}attachWeightById(t){if(t==="composite-load"){const r=this.#t.compositeTray?.getCompositeEl();return r?this.#E(r,t):!1}const e=this.#c.get(t);if(!e)return!1;const n=e.querySelector("lab-weight, lab-composite-weight");return n?this.#E(n,t):!1}recordScaleClick(t){this.#O(t)}recordMeasurement(){this.#S()}destroy(){this.#L?.(),this.#L=null}reset(){if(this.#o.cancel(),this.#n){const t=this.#e.get().spring?.equipmentId;t&&this.#g(t,this.#n)}if(this.#r){const t=this.#e.get().dynamometer?.equipmentId;t&&this.#g(t,this.#r)}for(const t of[...this.#a]){const e=t.dataset.equipmentId;e&&this.#g(e,t)}this.#n=null,this.#r=null,this.#a=[],this.#N(),this.#e.set({...E}),this.#o.removeSnapZone("bottom-hook"),this.#m.clear(),this.#A.clear(),this.#q="",this.#t.compositeTray?.reset(),this.#t.stand.rodExtra=0,this.#t.overloadBanner&&(this.#t.overloadBanner.hidden=!0),requestAnimationFrame(()=>this.#x()),this.#d(),this.#l("Установка сброшена. Все приборы вернулись в комплект.")}#H(){this.#t.cards.forEach(t=>{const e=t.dataset.eq;if(!e)return;this.#c.set(e,t);const n=t.querySelector("lab-spring-board, lab-dynamometer, lab-weight, lab-composite-weight");if(!n)return;n.dataset.equipmentId=e;const s=this.#B(e);this.#o.attach(n,{equipmentId:e,kind:s,onDragStart:()=>{this.#e.set({dragging:e}),this.#b()},onDragEnd:r=>{this.#e.set({dragging:null}),r||this.#i.flash("Поднесите ближе к точке крепления."),this.#b(),this.#w()}}),t.addEventListener("equipment-pick",()=>{s==="spring"?this.#R(n,e):s==="dynamometer"?!this.#n&&!this.#r?this.#T(n,e):this.#_(n,e):this.#E(n,e)})}),this.#o.addSnapZone(this.#U()),this.#z(),this.#t.recordModeSlot&&(ot(),this.#L=it(this.#t.recordModeSlot,{kitId:T,onChange:()=>this.#it()})),this.#t.recordPendingBtn&&this.#t.recordPendingBtn.addEventListener("click",()=>{this.#S()}),this.#t.recordBtn.addEventListener("click",()=>{this.#M()==="fully-auto"?this.#S():this.#J()}),this.#t.rfCancel.addEventListener("click",()=>this.#Z()),this.#t.recordForm.addEventListener("submit",t=>{t.preventDefault(),this.#Q()}),this.#t.resetBtn.addEventListener("click",()=>{if(this.#e.get().measurements.length===0&&!this.#e.get().spring){this.reset();return}confirm("Сбросить все измерения и вернуть оборудование в комплект?")&&this.reset()}),this.#t.measurementToggle.addEventListener("click",()=>{const t=this.#t.measurementPanel.getAttribute("aria-collapsed")==="true";this.#t.measurementPanel.setAttribute("aria-collapsed",t?"false":"true"),this.#t.measurementToggle.setAttribute("aria-expanded",t?"true":"false")}),window.addEventListener("resize",()=>{this.#x(),this.#y()}),requestAnimationFrame(()=>requestAnimationFrame(()=>{this.#x(),this.#y()}))}#B(t){return t==="spring-k50"||t==="spring-k10"?"spring":t==="dyno-1"||t==="dyno-5"?"dynamometer":t==="disc-10"||t==="disc-20"||t==="disc-50"?"disc":"weight"}#z(){const t=this.#t.compositeTray;if(!t)return;const e=t.getCompositeEl();if(e){e.dataset.equipmentId="composite-load",this.#o.attach(e,{equipmentId:"composite-load",kind:"weight",onDragStart:()=>{this.#e.set({dragging:"composite-load"}),this.#b()},onDragEnd:n=>{this.#e.set({dragging:null}),n||this.#i.flash("Поднесите ближе к нижнему крюку."),this.#b(),this.#w()}});for(const n of t.getDiscEls()){const s=n.dataset.eq;s&&(n.dataset.equipmentId=s,this.#o.attach(n,{equipmentId:s,kind:"disc",onDragStart:()=>{this.#e.set({dragging:s})},onDragEnd:r=>{this.#e.set({dragging:null}),r||this.#i.flash("Перетащите диск на штангу — на стержень узла."),this.#b(),this.#w()}}))}this.#o.addSnapZone({id:"composite-rod",accepts:["disc"],snapRadius:110,getRect:()=>e.getBoundingClientRect(),onHover:n=>{n?e.setAttribute("data-slot-target",""):e.removeAttribute("data-slot-target")},onDrop:({element:n,equipmentId:s})=>{const r=s==="disc-10"?10:s==="disc-20"?20:50;return t.addDisc(r,n)?(e.removeAttribute("data-slot-target"),this.#a.includes(e)&&(this.#Y(),this.#C(),this.#n?this.#D():this.#r&&this.#F()),this.#l(`Диск ${r} г надет на штангу. Масса узла ${t.getMass()} г.`),!0):(this.#i.flash(`Диск ${r} г уже надет.`),!1)}}),t.addEventListener("keydown",n=>{n.target?.dataset?.discMass})}}#Y(){const t=this.#t.compositeTray;if(!t)return;const e=t.getCompositeEl();if(!e)return;const n=e.getMass();this.#e.update(s=>({weights:s.weights.map(r=>r.equipmentId==="composite-load"?{...r,mass:n}:r)}))}#U(){return{id:"spring-hook",accepts:["spring","dynamometer"],snapRadius:110,getRect:()=>this.#t.dropZoneSpring.getBoundingClientRect(),onHover:t=>this.#t.dropZoneSpring.classList.toggle("drop-zone--active",t),onDrop:({element:t,kind:e,equipmentId:n})=>e==="spring"?this.#R(t,n):e==="dynamometer"?this.#T(t,n):!1}}#f(){if(this.#o.removeSnapZone("bottom-hook"),!this.#n&&!this.#r)return;const t=["weight"];this.#n&&!this.#r&&this.#a.length===0&&t.push("dynamometer"),this.#o.addSnapZone({id:"bottom-hook",accepts:t,snapRadius:120,getRect:()=>this.#t.dropZoneBottom.getBoundingClientRect(),onHover:e=>{this.#t.dropZoneBottom.classList.toggle("drop-zone--active",e),this.#G(e)},onDrop:({element:e,kind:n,equipmentId:s})=>n==="dynamometer"&&this.#e.get().dynamometer===null?this.#_(e,s):n==="weight"?this.#E(e,s):!1})}#G(t){if(this.#w(),!t)return;const n=this.#$()?.parentElement;n?.classList.contains("attached-eq")&&n.classList.add("snap-target")}#w(){(this.#t.standContainer??document).querySelectorAll(".attached-eq.snap-target").forEach(e=>{e.classList.remove("snap-target")})}#$(){return this.#a.length>0?this.#a[this.#a.length-1]??null:this.#r?this.#r:this.#n}#R(t,e){if(this.#n||this.#r||e!=="spring-k50"&&e!=="spring-k10")return!1;const n=V[e==="spring-k50"?"k50":"k10"],s={equipmentId:e,springId:e==="spring-k50"?"k50":"k10",k:n.k,restLengthMm:n.restLengthMm};return this.#I(t),t.setAttribute("interactive",""),t.setAttribute("extension","0"),t.restLengthMm=n.restLengthMm,t.dataset.scaleBound||(t.dataset.scaleBound="true",t.addEventListener("scale-click",r=>{const a=r.detail;this.#O(a.valueMm)})),this.#n=t,this.#e.set({spring:s,stage:"spring-attached",measurementStep:"reading-l0"}),this.#v(e,"in-use"),this.#f(),this.#d(),this.#l(`Пружина №${s.springId==="k50"?"1":"2"} закреплена на штативе.`),!0}#_(t,e){if(this.#r||!this.#n)return!1;if(this.#a.length>0)return this.#i.flash("Динамометр крепится между пружиной и грузом, до подвеса грузов."),!1;if(e!=="dyno-1"&&e!=="dyno-5")return!1;const n=C[e];return n?(this.#j(t,n.range),this.#r=t,this.#e.set({dynamometer:{equipmentId:e,range:n.range,attachedTo:"spring"}}),this.#v(e,"in-use"),this.#f(),this.#d(),this.#l(`Динамометр ${n.range} Н подвешен на пружину.`),!0):!1}#T(t,e){if(this.#n||this.#r||e!=="dyno-1"&&e!=="dyno-5")return!1;const n=C[e];return n?(this.#j(t,n.range),this.#r=t,this.#e.set({dynamometer:{equipmentId:e,range:n.range,attachedTo:"stand"},stage:"spring-attached",measurementStep:"idle"}),this.#v(e,"in-use"),this.#f(),this.#d(),this.#l(`Динамометр ${n.range} Н подвешен на штатив. Подвесьте груз для измерения силы тяжести.`),!0):!1}#j(t,e){this.#I(t),t.setAttribute("range",String(e)),t.setAttribute("force","0"),t.setAttribute("interactive",""),t.dataset.scaleBound||(t.dataset.scaleBound="true",t.addEventListener("scale-click",n=>{const s=n.detail;this.#K(s.valueN)}))}#E(t,e){const n=W[e];if(!n)return!1;const r=this.#e.get().dynamometer?.attachedTo==="stand";if(!this.#n&&!r)return this.#i.flash("Сначала подвесьте пружину или динамометр на штатив."),!1;let a=n.mass;if(e==="composite-load"){const l=t;typeof l.getMass=="function"&&(a=l.getMass()),this.#t.compositeTray?.setStatus("in-use")}this.#I(t);const o={equipmentId:e,mass:a,chainIndex:this.#a.length};if(this.#a.push(t),this.#e.update(l=>({weights:[...l.weights,o],measurementStep:l.spring&&l.scaleClickL0!==null?"reading-l1":l.measurementStep})),this.#v(e,"in-use"),this.#f(),this.#n)this.#D(),this.#l(`Подвешен груз ${n.mass} грамм. Дождитесь конца колебаний.`);else{this.#F();const l=y(p(this.#e.get().weights));this.#l(`Подвешен груз ${n.mass} грамм. Динамометр показывает ${l.toFixed(2)} Н.`)}return this.#d(),!0}#F(){if(!this.#r)return;const t=p(this.#e.get().weights),e=y(t);this.#r.setAttribute("force",e.toFixed(2)),this.#C(),this.#y()}#I(t){t.style.position="",t.style.left="",t.style.top="",t.style.zIndex="",t.style.transform="",t.style.marginTop="",t.setAttribute("attached","");const e=document.createElement("div");e.className="attached-eq",e.dataset.equipmentId=t.dataset.equipmentId??"",e.style.position="absolute",e.style.left="50%",e.style.top="0px",e.style.transform="translateX(-50%)",e.appendChild(t);const n=document.createElement("button");n.className="detach-btn",n.type="button",n.setAttribute("aria-label","Снять с установки"),n.title="Снять с установки",n.textContent="×",n.addEventListener("click",s=>{s.stopPropagation(),this.#X(t)}),e.appendChild(n),this.#p.appendChild(e),requestAnimationFrame(()=>this.#C())}#g(t,e){if(t==="composite-load"){const r=this.#t.compositeTray;if(!r)return;const a=e.parentElement?.classList.contains("attached-eq")?e.parentElement:null;e.style.position="",e.style.left="",e.style.top="",e.style.zIndex="",e.style.transform="",e.style.marginTop="",e.removeAttribute("interactive"),e.removeAttribute("attached"),e.removeAttribute("data-slot-target");const o=r.querySelector(".ct-rod-area");o&&o.appendChild(e),a?.remove(),r.setStatus("available");return}const n=this.#c.get(t);if(!n)return;const s=e.parentElement?.classList.contains("attached-eq")?e.parentElement:null;e.style.position="",e.style.left="",e.style.top="",e.style.zIndex="",e.style.transform="",e.style.marginTop="",e.removeAttribute("interactive"),e.removeAttribute("attached"),e.setAttribute("extension","0"),e.setAttribute("force","0"),"setReadingMark"in e&&e.setReadingMark(null),n.appendChild(e),s?.remove(),this.#v(t,"available")}#X(t){if(!t.dataset.equipmentId)return;if(t===this.#n){this.reset();return}if(t===this.#r){if(!this.#n){this.reset();return}const r=this.#e.get().dynamometer?.equipmentId;for(const a of[...this.#a].reverse()){const o=a.dataset.equipmentId;o&&this.#g(o,a)}r&&this.#g(r,this.#r),this.#r=null,this.#a=[],this.#e.set({dynamometer:null,weights:[],scaleClickF:null}),this.#N(),this.#f(),this.#d();return}const n=this.#a.indexOf(t);if(n===-1)return;const s=this.#a.slice(n);for(const r of s.reverse()){const a=r.dataset.equipmentId;a&&this.#g(a,r)}this.#a=this.#a.slice(0,n),this.#e.update(r=>({weights:r.weights.slice(0,n)})),this.#f(),this.#n?this.#D():this.#F(),this.#d(),this.#l("Груз снят с установки.")}#C(){const t=[];this.#n&&t.push(this.#n),this.#r&&t.push(this.#r),t.push(...this.#a);let e=0;for(let n=0;n<t.length;n++){const s=t[n],r=s.parentElement;if(!r?.classList.contains("attached-eq"))continue;const a=s,o=typeof a.getTopHookY=="function"?a.getTopHookY():0,l=typeof a.getWeightHookY=="function"?a.getWeightHookY():s.getBoundingClientRect().height,c=e-o;r.style.top=`${c}px`,e=c+l}this.#V(e)}#V(t){const e=this.#t.stand;if(!e)return;const n=e.getBoundingClientRect();if(n.height===0)return;const s=480,r=72,a=e.rodExtra,o=n.height/(s+a);if(o<=0)return;const c=r+t/o+30,u=Math.max(0,Math.ceil(c-430));Math.abs(u-a)<8||(e.rodExtra=u,requestAnimationFrame(()=>{this.#x(),this.#y()}))}#v(t,e){this.#c.get(t)?.setAttribute("status",e)}#D(){const t=this.#e.get();if(!t.spring)return;this.#u!==null&&cancelAnimationFrame(this.#u);const e=this.#P(),n=window.matchMedia("(prefers-reduced-motion: reduce)").matches,s=t.displayedExtensionMm;if(Math.abs(s-e)<.01){this.#e.set({displayedExtensionMm:e,oscillationStartTime:null}),this.#k();return}if(n){this.#e.set({displayedExtensionMm:e,oscillationStartTime:null}),this.#k();return}const r=1.6,a=et(r),o=performance.now();this.#e.set({oscillationStartTime:o});const l=t.weights.length>0?p(t.weights)/1e3:.1,c=d=>{const u=(d-o)/1e3;if(u>a){this.#e.set({displayedExtensionMm:e,oscillationStartTime:null}),this.#k(),this.#u=null;return}const h=t.spring.k,f=s-e,S=tt(f,h,l,u,r);this.#e.set({displayedExtensionMm:Math.max(0,e+S)}),this.#k(),this.#u=requestAnimationFrame(c)};this.#u=requestAnimationFrame(c)}#N(){this.#u!==null&&(cancelAnimationFrame(this.#u),this.#u=null),this.#e.set({oscillationStartTime:null,displayedExtensionMm:0}),this.#k()}#P(){const t=this.#e.get();if(!t.spring)return 0;const e=p(t.weights);if(e===0)return 0;const n=y(e);return J(n,t.spring.k)*10}#k(){const t=this.#e.get(),e=Math.round(t.displayedExtensionMm*10)/10;if(this.#n&&this.#n.setAttribute("extension",String(e)),this.#r&&t.spring){const n=y(p(t.weights));this.#r.setAttribute("force",n.toFixed(2))}this.#C(),this.#y(),this.#W()}#W(){const t=this.#t.overloadBanner;if(!t)return;const e=this.#e.get();if(!e.spring){t.hidden=!0;return}const n=100,s=e.spring.restLengthMm,r=this.#P(),a=s+r;if(a<=n){t.hidden=!0;return}const o=e.spring.k<30,l=t.querySelector(".overload-banner-text");l&&(l.textContent=o?`Указатель ушёл за шкалу (положение ≈ ${Math.round(a)} мм при шкале 0–100). Для пружины №2 используйте наборный груз 60–80 г.`:`Указатель ушёл за шкалу (положение ≈ ${Math.round(a)} мм при шкале 0–100). Снимите часть груза, чтобы измерение поместилось в шкалу.`),t.hidden=!1}#O(t){const e=this.#e.get();if(e.spring){if(e.weights.length===0)this.#e.set({scaleClickL0:t,measurementStep:"l0-recorded"}),this.#n?.setReadingMark(t,"l₀"),this.#l(`Записано начальное положение l₀ = ${t} мм. Подвесьте груз.`);else{if(e.scaleClickL0===null){this.#i.flash("Сначала запишите положение пружины без нагрузки.");return}this.#e.set({scaleClickL1:t,measurementStep:"ready-to-record"}),this.#n?.setReadingMark(t,"l₁"),this.#l(`Записано положение под нагрузкой l₁ = ${t} мм. Нажмите «Записать в журнал».`)}this.#d()}}#K(t){const e=this.#e.get();if(!e.dynamometer)return;this.#e.set({scaleClickF:t}),this.#r?.setReadingMark(t);const n=e.dynamometer.range===1?t.toFixed(2):t.toFixed(1);this.#l(`Записана сила по динамометру: F = ${n} Н.`)}#S(t){const e=this.#e.get();if(e.spring===null||e.weights.length===0)return;const n=t?.l0Mm??e.scaleClickL0,s=t?.l1Mm??e.scaleClickL1;if(n===null||s===null)return;const r=s-n;if(r<=0){this.#i.flash("Δl должно быть положительным. Перепроверьте l₁.");return}const a=p(e.weights),o=e.scaleClickF!==null?M(a,r/10,e.scaleClickF):M(a,r/10);o&&(this.#e.update(l=>({measurements:[...l.measurements,o],scaleClickL1:null,scaleClickF:null,measurementStep:"l0-recorded"})),this.#q=`${a}|${n}|${s}`,this.#n?.setReadingMark(n,"l₀"),this.#r?.setReadingMark(null),this.#l(`Измерение записано: F = ${o.force.toFixed(2)} Н, Δl = ${r} мм, k = ${o.k.toFixed(0)} Н/м.`),this.#d())}#J(){const t=this.#e.get();t.measurementStep==="ready-to-record"&&(t.scaleClickL0!==null&&(this.#t.rfL0.value=String(t.scaleClickL0)),t.scaleClickL1!==null&&(this.#t.rfL1.value=String(t.scaleClickL1)),this.#t.rfMass.value=String(p(t.weights)),this.#t.recordForm.hidden=!1,this.#t.rfL1.focus())}#Z(){this.#t.recordForm.hidden=!0}#Q(){const t=parseFloat(this.#t.rfL0.value),e=parseFloat(this.#t.rfL1.value);if(!Number.isFinite(t)||t<0||t>100){this.#i.flash("Введите l₀ — положительное число от 0 до 100 мм."),this.#t.rfL0.focus();return}if(!Number.isFinite(e)||e<=t||e>100){this.#i.flash("l₁ должно быть больше l₀ и не больше 100 мм."),this.#t.rfL1.focus();return}this.#S({l0Mm:t,l1Mm:e}),this.#Z()}#d(){const t=this.#e.get();this.#b(),this.#rt(),this.#st(),this.#et(),this.#nt(),this.#at(),this.#dt(),this.#ct(),this.#i.update(t),this.#x()}#tt(){const t=this.#e.get();return t.spring===null?1:t.scaleClickL0===null?2:t.weights.length===0?3:t.scaleClickL1===null?4:t.measurementStep==="ready-to-record"?5:0}#et(){const t=this.#tt();this.#t.steps.querySelectorAll(".step").forEach(n=>{const s=Number(n.dataset.step);t===0||s<t?n.dataset.state="done":s===t?n.dataset.state="active":n.removeAttribute("data-state")})}#nt(){const t=this.#e.get(),e=this.#n!==null&&(t.measurementStep==="reading-l0"||t.measurementStep==="reading-l1");this.#n&&(e?this.#n.dataset.attention="true":delete this.#n.dataset.attention),t.measurementStep==="ready-to-record"?this.#t.recordBtn.classList.add("ready-pulse"):this.#t.recordBtn.classList.remove("ready-pulse")}#st(){const e=this.#e.get().measurements.length,n=e>0,s=this.#t.measurementPanel.getAttribute("data-state"),r=n&&s!=="has-data";this.#t.measurementPanel.setAttribute("data-state",n?"has-data":"empty");const a=document.getElementById("formula-display");if(a&&(a.hidden=!n),n?(this.#t.measurementCount.removeAttribute("hidden"),this.#t.measurementCount.textContent=String(e)):(this.#t.measurementCount.setAttribute("hidden",""),this.#t.measurementCount.textContent=""),r){this.#t.measurementPanel.setAttribute("aria-collapsed","false"),this.#t.measurementToggle.setAttribute("aria-expanded","true");const o=this.#t.measurementPanel.querySelector(".measurement-body");o&&(o.scrollTop=0)}}#b(){const e=this.#e.get().dragging,n=e!==null?this.#B(e):null;this.#n===null&&this.#r===null&&(n==="spring"||n==="dynamometer")?this.#t.dropZoneSpring.removeAttribute("hidden"):(this.#t.dropZoneSpring.setAttribute("hidden",""),this.#t.dropZoneSpring.classList.remove("drop-zone--active"));const a=this.#n!==null||this.#r!==null,o=this.#n!==null&&this.#r===null&&this.#a.length===0;a&&(n==="weight"||n==="dynamometer"&&o)?this.#t.dropZoneBottom.removeAttribute("hidden"):(this.#t.dropZoneBottom.setAttribute("hidden",""),this.#t.dropZoneBottom.classList.remove("drop-zone--active")),this.#y()}#y(){if(!this.#t.stand||!this.#t.standContainer)return;const t=this.#t.standContainer.getBoundingClientRect();if(!this.#t.dropZoneSpring.hasAttribute("hidden")){const e=this.#t.stand.getBoundingClientRect(),n=this.#t.stand.getHookPosition(1),s=e.left-t.left+n.x,r=e.top-t.top+n.y,a=this.#t.dropZoneSpring.offsetWidth||130;this.#t.dropZoneSpring.style.left=`${s-a/2}px`,this.#t.dropZoneSpring.style.top=`${r+10}px`}if(!this.#t.dropZoneBottom.hasAttribute("hidden")){const e=this.#$();if(e){const n=e.getBoundingClientRect(),s=n.left+n.width/2,r=n.bottom-12,a=this.#t.dropZoneBottom.offsetWidth||130;this.#t.dropZoneBottom.style.left=`${s-t.left-a/2}px`,this.#t.dropZoneBottom.style.top=`${r-t.top}px`}}}#rt(){const t=this.#e.get();this.#t.recordBtn.disabled=t.measurementStep!=="ready-to-record",t.spring===null?this.#t.recordBtn.setAttribute("hidden",""):this.#t.recordBtn.removeAttribute("hidden")}#M(){return N(T)}#it(){this.#M()==="fully-auto"&&this.#e.get().measurementStep==="ready-to-record"&&this.#S(),this.#d()}#at(){const t=this.#e.get(),e=this.#M(),n=e==="fully-manual"&&t.measurements.length===0&&t.spring!==null,s=t.measurements.length>0||n;if(s?this.#t.journalEmpty.setAttribute("hidden",""):this.#t.journalEmpty.removeAttribute("hidden"),this.#s.journal){s?this.#t.journalTable.removeAttribute("hidden"):this.#t.journalTable.setAttribute("hidden",""),this.#s.journal(t,{journalEmpty:this.#t.journalEmpty,journalTable:this.#t.journalTable,journalBody:this.#t.journalBody});return}if(this.#t.journalTable.setAttribute("hidden",""),!this.#t.journalHost){this.#ot();return}s?this.#t.journalHost.removeAttribute("hidden"):this.#t.journalHost.setAttribute("hidden","");const r=t.scaleClickL0,a=t.measurements.map((o,l)=>{const c=Math.round(o.extension*10),d=r!==null?r+c:0,u=this.#m.get(o.timestamp)??{};return{idx:l+1,timestamp:o.timestamp,values:{idx:l+1,m_g:o.totalMass,l0_mm:r??0,l1_mm:d,dL_mm:e==="fully-auto"?c:u.dL_mm??null,F_N:e==="fully-auto"?o.force:u.F_N??null,k_N_m:e==="fully-auto"?o.k:u.k_N_m??null},verdicts:this.#A.get(o.timestamp)??{}}});if(n){const o=this.#m.get(-1)??{};a.push({idx:1,timestamp:-1,values:{idx:1,m_g:o.m_g??null,l0_mm:o.l0_mm??null,l1_mm:o.l1_mm??null,dL_mm:o.dL_mm??null,F_N:o.F_N??null,k_N_m:o.k_N_m??null},verdicts:{}})}lt(this.#t.journalHost,_,a,{mode:e,onCellInput:(o,l,c)=>{const d=t.measurements[o-1],u=d?d.timestamp:-1,h=this.#m.get(u)??{};c===null?delete h[l]:h[l]=c,this.#m.set(u,h)},onVerify:o=>{const l=t.measurements[o-1];if(!l)return;const c=l.timestamp,d={...this.#m.get(c)??{}},u=this.#t.journalHost?.querySelector(`tr[data-row-idx="${o}"]`);u&&u.querySelectorAll("input[data-key]").forEach(v=>{const g=v.dataset.key;if(!g)return;const m=P(v.value);m!==null&&(d[g]=m)}),this.#m.set(c,d);const h=Math.round(l.extension*10),f=r!==null?r+h:0,S={values:{m_g:l.totalMass,l0_mm:r??0,l1_mm:f,dL_mm:d.dL_mm??null,F_N:d.F_N??null,k_N_m:d.k_N_m??null}},x=pt(_.columns,S);if(this.#A.set(c,x),u)for(const[v,g]of Object.entries(x)){const m=u.querySelector(`td[data-key="${v}"]`);if(!m)continue;m.classList.remove("j-verdict","j-verdict--ok","j-verdict--close","j-verdict--wrong","j-verdict--empty"),m.dataset.verdict=g,g!=="empty"&&m.classList.add("j-verdict",`j-verdict--${g}`);const w=m.querySelector("input[data-key]");w&&(w.dataset.verdict=g)}}}),this.#lt()}#ot(){const t=this.#e.get();t.measurements.length>0?this.#t.journalTable.removeAttribute("hidden"):this.#t.journalTable.setAttribute("hidden",""),this.#t.journalBody.replaceChildren();const e=t.scaleClickL0;t.measurements.forEach((n,s)=>{const r=document.createElement("tr"),a=Math.round(n.extension*10),o=e!==null?e+a:"—";r.innerHTML=`
        <td>${s+1}</td>
        <td>${n.totalMass}</td>
        <td>${n.force.toFixed(2)}</td>
        <td>${o}</td>
        <td>${a}</td>
        <td>${n.k.toFixed(0)}</td>
      `,this.#t.journalBody.appendChild(r)})}#lt(){if(!this.#t.recordPendingSlot)return;const t=this.#t.recordPendingSlot,e=this.#M(),n=this.#e.get(),s=n.measurementStep==="ready-to-record",r=p(n.weights),a=n.scaleClickL0,o=n.scaleClickL1,l=`${r}|${a}|${o}`;e==="semi-auto"&&s&&l!==this.#q?(t.removeAttribute("hidden"),this.#t.recordPendingSummary&&(this.#t.recordPendingSummary.textContent=` (m=${r} г, l₀=${a??"—"} мм, l₁=${o??"—"} мм)`)):t.setAttribute("hidden","")}#dt(){const t=this.#e.get();if(this.#s.result){this.#s.result(t,{resultPanel:this.#t.resultPanel});return}if(t.measurements.length<2||!t.spring){this.#t.resultPanel.innerHTML="",this.#t.resultPanel.setAttribute("hidden","");return}const e=t.spring.springId==="k50"?50:null,n=A(t.measurements,e);if(!n)return;const s=`${k.min}…${k.max}`,r=n.isInValidRange===!0?`<p class="result-success">✓ Жёсткость попадает в допустимый интервал ${s} Н/м (паспорт пружины 50 ± 2 Н/м по ФИПИ)</p>`:n.isInValidRange===!1?`<p class="result-warning">⚠ Среднее не в интервале ${s} Н/м, проверьте измерения</p>`:"";this.#t.resultPanel.innerHTML=`
      <h3 class="result-title">Результат</h3>
      <div class="result-grid">
        <div class="result-row"><span>Среднее k̄</span><strong>${n.mean.toFixed(1)} Н/м</strong></div>
        <div class="result-row"><span>Стандартное отклонение σ</span><strong>±${n.stdDev.toFixed(2)}</strong></div>
        <div class="result-row"><span>МНК через 0</span><strong>${n.byLeastSquares.toFixed(1)} Н/м</strong></div>
      </div>
      ${r}
    `,this.#t.resultPanel.removeAttribute("hidden")}#ct(){const t=this.#e.get();if(!this.#t.graph)return;const e=document.getElementById("graph-wrap");if(t.measurements.length===0){e?.setAttribute("hidden",""),this.#t.graph.data={measurements:[],fitSlope:null};return}e?.removeAttribute("hidden");const n=t.measurements.length>=2?A(t.measurements)?.byLeastSquares??null:null;this.#t.graph.data={measurements:t.measurements,fitSlope:n}}#x(){if(!this.#t.stand||!this.#t.standContainer)return;const t=this.#t.stand.getHookPosition(1),e=this.#t.stand.getBoundingClientRect(),n=this.#t.standContainer.getBoundingClientRect(),s=e.left-n.left+t.x,r=e.top-n.top+t.y;this.#h.style.left=`${s}px`,this.#h.style.top=`${r}px`}#l(t){this.#t.liveRegion.textContent=t}}class gt{meta={id:"spring-stiffness",label:"Жёсткость пружины",kicker:"Опыт 2.1",icon:"spring",tooltip:"Измерение жёсткости пружины k = F / Δl"};#t=null;#s=null;#e=null;mount(t){if(this.#t)return;this.#s=t,this.#e=new AbortController,t.innerHTML=O;const e={stage:t.querySelector("#stage"),standContainer:t.querySelector("#stand-container"),stand:t.querySelector("#stand"),dragOverlay:t.querySelector("#drag-overlay"),dropZoneSpring:t.querySelector("#drop-zone-spring"),dropZoneBottom:t.querySelector("#drop-zone-bottom"),hintBar:t.querySelector("#hint-bar"),journalEmpty:t.querySelector("#journal-empty"),journalTable:t.querySelector("#journal-table"),journalBody:t.querySelector("#journal-body"),liveRegion:t.querySelector("#live-region"),resultPanel:t.querySelector("#result-panel"),graph:t.querySelector("#graph"),recordBtn:t.querySelector("#record-btn"),resetBtn:t.querySelector("#reset-btn"),cards:t.querySelectorAll("lab-equipment-card"),compositeTray:t.querySelector("#composite-tray"),measurementPanel:t.querySelector("#measurement-panel"),measurementToggle:t.querySelector("#measurement-toggle"),measurementCount:t.querySelector("#measurement-count"),steps:t.querySelector("#steps"),overloadBanner:t.querySelector("#overload-banner"),recordForm:t.querySelector("#record-form"),rfL0:t.querySelector("#rf-l0"),rfL1:t.querySelector("#rf-l1"),rfMass:t.querySelector("#rf-mass"),rfCancel:t.querySelector("#rf-cancel"),rfSubmit:t.querySelector("#rf-submit"),recordModeSlot:t.querySelector("#record-mode-slot")??void 0,journalHost:t.querySelector("#journal-host")??void 0,recordPendingSlot:t.querySelector("#record-pending-slot")??void 0,recordPendingBtn:t.querySelector("#record-pending-btn")??void 0,recordPendingSummary:t.querySelector("#record-pending-summary")??void 0};this.#t=new ft(e),window.springExperiment=this.#t}unmount(){this.#t&&(this.#t.destroy(),this.#t.reset(),delete window.springExperiment,this.#e?.abort(),this.#e=null,this.#t=null,this.#s&&this.#s.replaceChildren(),this.#s=null)}saveState(){if(!this.#t)return null;const t=this.#t;return t.state?{measurements:t.state.measurements}:null}reset(){this.#t?.reset()}}export{K as G,ft as S,gt as a,Z as b,O as t};
//# sourceMappingURL=screen-spring-stiffness-DZVJgMS1.js.map
