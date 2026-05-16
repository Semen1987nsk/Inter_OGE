import{G as C,b as M}from"./screen-spring-stiffness-DZVJgMS1.js";const R=`<main class="app-main-v3">\r
        <section class="workbench" aria-label="Рабочая зона">\r
          <header class="workbench-header">\r
            <ol class="steps" id="steps" aria-label="Задача в опыте">\r
              <li class="step" data-task="A-coefficient" data-state="active" tabindex="0" role="button" aria-current="true">\r
                <span class="step-num">A</span>\r
                <span class="step-label">Измерение μ <small>(один груз)</small></span>\r
              </li>\r
              <li class="step" data-task="B-work" tabindex="0" role="button">\r
                <span class="step-num">B</span>\r
                <span class="step-label">Работа силы трения</span>\r
              </li>\r
              <li class="step" data-task="C-force-vs-N" tabindex="0" role="button">\r
                <span class="step-num">C</span>\r
                <span class="step-label">F<sub>тр</sub> от N <small>(график)</small></span>\r
              </li>\r
              <li class="step" data-task="D-force-vs-surface" tabindex="0" role="button">\r
                <span class="step-num">D</span>\r
                <span class="step-label">F<sub>тр</sub> от поверхности</span>\r
              </li>\r
            </ol>\r
            <div class="workbench-hint" id="hint-bar">\r
              Возьмите деревянный брусок и поставьте на направляющую.\r
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
            <span class="stage-corner stage-corner--tl" aria-hidden="true"></span>\r
            <span class="stage-corner stage-corner--tr" aria-hidden="true"></span>\r
            <span class="stage-corner stage-corner--bl" aria-hidden="true"></span>\r
            <span class="stage-corner stage-corner--br" aria-hidden="true"></span>\r
\r
            <!-- Переключатель поверхности (вверху сцены слева) -->\r
            <div class="surface-toggle" id="surface-toggle" role="group" aria-label="Поверхность направляющей">\r
              <button type="button" data-surface="A" data-state="active" aria-pressed="true" class="surface-btn">\r
                <span class="surface-swatch surface-swatch--A" aria-hidden="true"></span>\r
                Поверхность А <small>(направляющая)</small>\r
              </button>\r
              <button type="button" data-surface="B" data-state="inactive" aria-pressed="false" class="surface-btn">\r
                <span class="surface-swatch surface-swatch--B" aria-hidden="true"></span>\r
                Поверхность Б <small>(гибкая полоса)</small>\r
              </button>\r
            </div>\r
\r
            <!-- Кнопка «Взвесить брусок» — показывает F с динамометра, ученик считает m -->\r
            <button type="button" id="weigh-btn" class="weigh-btn" aria-label="Взвесить брусок динамометром">\r
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">\r
                <path d="M12 3v18M5 8l7-5 7 5M5 8h14l-2 9H7L5 8z" />\r
              </svg>\r
              Взвесить брусок\r
            </button>\r
\r
            <!-- Горизонтальная направляющая, центрирована в сцене -->\r
            <div class="track-container" id="track-container">\r
              <lab-friction-track id="track" surface="A"></lab-friction-track>\r
\r
              <!-- Snap-зоны (видимость управляется JS-ом) -->\r
              <div class="drop-zone drop-zone--track" id="drop-zone-track" aria-hidden="true" hidden>\r
                <span class="drop-zone-label">Поставьте брусок на направляющую</span>\r
              </div>\r
              <div class="drop-zone drop-zone--block-top" id="drop-zone-block-top" aria-hidden="true" hidden>\r
                <span class="drop-zone-label">Положите груз сверху</span>\r
              </div>\r
              <div class="drop-zone drop-zone--block-hook" id="drop-zone-block-hook" aria-hidden="true" hidden>\r
                <span class="drop-zone-label">Прицепите динамометр к крючку</span>\r
              </div>\r
            </div>\r
\r
            <!-- Floating measurement panel (PhET-стиль), правый нижний угол -->\r
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
                  Поставьте брусок, прицепите динамометр и потяните до начала скольжения. Затем нажмите «Записать в журнал».\r
                </div>\r
\r
                <!-- Форма ручного ввода в журнал. Появляется после нажатия «Записать в журнал»\r
                     при готовом измерении. Ученик САМ списывает значения с приборов. -->\r
                <form id="record-form" class="record-form" hidden>\r
                  <h4 class="record-form-title">Запишите значения с приборов</h4>\r
                  <div class="record-field">\r
                    <label for="rf-mblock">Масса бруска <em>m</em><sub>бр</sub>, г:</label>\r
                    <input type="number" id="rf-mblock" inputmode="numeric" step="1" min="0" max="500" placeholder="напр. 50" />\r
                    <small class="hint">Если ещё не взвешивали — нажмите «Взвесить брусок» наверху сцены.</small>\r
                  </div>\r
                  <div class="record-field record-field-readonly">\r
                    <label>Масса грузов <em>m</em><sub>гр</sub>, г:</label>\r
                    <output id="rf-mweights">0</output>\r
                    <small class="hint">Авто (сумма наклеек на грузах).</small>\r
                  </div>\r
                  <div class="record-field">\r
                    <label for="rf-friction">Показание динамометра <em>F</em><sub>тр</sub>, Н:</label>\r
                    <input type="number" id="rf-friction" inputmode="decimal" step="0.01" min="0" max="5" placeholder="напр. 0.30" />\r
                  </div>\r
                  <div class="record-form-actions">\r
                    <button type="button" id="rf-cancel" class="rf-cancel">Отмена</button>\r
                    <button type="submit" id="rf-submit" class="rf-submit">В журнал</button>\r
                  </div>\r
                </form>\r
                <!-- Формула расчёта (видна когда есть журнал) — стандарт REFERENCE -->\r
                <div class="formula-display" id="formula-display" hidden>\r
                  <span class="formula-label">Формула:</span>\r
                  <span class="formula-expr">\r
                    <em>m</em><sub>общ</sub> = <em>m</em><sub>бр</sub> + <em>m</em><sub>гр</sub>,\r
                    <em>N</em> = <em>m</em><sub>общ</sub> · <em>g</em>,\r
                    <em>μ</em> = <em>F</em><sub>тр</sub> / <em>N</em>\r
                  </span>\r
                  <span class="formula-units">массу — в кг, <em>g</em> = 9,8 м/с²</span>\r
                </div>\r
\r
                <table class="journal-table" id="journal-table" hidden>\r
                  <thead>\r
                    <tr>\r
                      <th>№</th>\r
                      <th>Пов.</th>\r
                      <th><em>m</em><sub>общ</sub>, г</th>\r
                      <th><em>N</em>, Н</th>\r
                      <th><em>F</em><sub>тр</sub>, Н</th>\r
                      <th><em>μ</em></th>\r
                    </tr>\r
                  </thead>\r
                  <tbody id="journal-body"></tbody>\r
                </table>\r
                <div id="result-panel" class="result-panel" hidden></div>\r
                <div id="graph-wrap" class="graph-wrap" hidden>\r
                  <h3 class="graph-title">График F<sub>тр</sub>(N)</h3>\r
                  <lab-graph id="graph"></lab-graph>\r
                </div>\r
              </div>\r
            </aside>\r
          </div>\r
        </section>\r
\r
        <div id="drag-overlay" class="drag-overlay" aria-hidden="true"></div>\r
\r
        <aside class="equipment-panel" aria-label="Оборудование комплекта">\r
          <section class="equipment-group">\r
            <h3 class="equipment-group-title">Оборудование</h3>\r
            <div class="equipment-grid">\r
              <lab-equipment-card title="Брусок 50 г" status="available" data-eq="block">\r
                <lab-block mass="50"></lab-block>\r
              </lab-equipment-card>\r
              <lab-equipment-card title="Динамометр 1Н" status="available" data-eq="dyno-1">\r
                <lab-dynamometer-h range="1" force="0"></lab-dynamometer-h>\r
              </lab-equipment-card>\r
              <lab-equipment-card title="Динамометр 5Н" status="available" data-eq="dyno-5">\r
                <lab-dynamometer-h range="5" force="0"></lab-dynamometer-h>\r
              </lab-equipment-card>\r
            </div>\r
          </section>\r
\r
          <section class="equipment-group">\r
            <h3 class="equipment-group-title">Готовые грузы</h3>\r
            <div class="equipment-grid equipment-grid-3">\r
              <lab-equipment-card title="Груз №1" status="available" data-eq="w-100-1">\r
                <lab-flat-weight mass="100" number="1"></lab-flat-weight>\r
              </lab-equipment-card>\r
              <lab-equipment-card title="Груз №2" status="available" data-eq="w-100-2">\r
                <lab-flat-weight mass="100" number="2"></lab-flat-weight>\r
              </lab-equipment-card>\r
              <lab-equipment-card title="Груз №3" status="available" data-eq="w-100-3">\r
                <lab-flat-weight mass="100" number="3"></lab-flat-weight>\r
              </lab-equipment-card>\r
            </div>\r
          </section>\r
\r
          <!-- Наборный груз НЕ используется в опыте 2.2 — убран.\r
               Для трения достаточно 3×100г. Если понадобится — добавить отдельную сцену. -->\r
        </aside>\r
      </main>\r
<div id="live-region" role="status" aria-live="polite" aria-atomic="true" class="sr-only"></div>\r
`,A=80,I=320,T="cubic-bezier(0.34, 1.4, 0.64, 1)";class L{#t=new Map;#e=null;#a;#o;#r=new Map;constructor(t){this.#a=t,this.#o=window.matchMedia("(prefers-reduced-motion: reduce)").matches}addSnapZone(t){this.#t.set(t.id,t)}removeSnapZone(t){this.#t.delete(t)}attach(t,e){const n=r=>this.#m(t,e,r);t.addEventListener("pointerdown",n);const s=r=>{r.key!=="Enter"&&r.key!==" "||(r.preventDefault(),this.#f(t,e))};return t.addEventListener("keydown",s),()=>{t.removeEventListener("pointerdown",n),t.removeEventListener("keydown",s)}}isDragging(){return this.#e!==null}cancel(){this.#e&&this.#d(!1,this.#e.homeRect.left,this.#e.homeRect.top);for(const t of this.#r.values())t();this.#r.clear()}#m(t,e,n){if(this.#e!==null||n.button!==void 0&&n.button!==0||t.hasAttribute("attached"))return;const s=this.#r.get(t);s&&(s(),this.#r.delete(t)),n.preventDefault();const r=t.getBoundingClientRect(),i=n.clientX-r.left,o=n.clientY-r.top,a={position:t.style.position,left:t.style.left,top:t.style.top,zIndex:t.style.zIndex,transform:t.style.transform},l=t.parentNode,d=t.nextSibling;this.#a.appendChild(t),t.style.position="fixed",t.style.left=`${r.left}px`,t.style.top=`${r.top}px`,t.style.zIndex="1000",t.style.transform="",t.setAttribute("dragging","");try{t.setPointerCapture(n.pointerId)}catch{}this.#e={element:t,options:e,pointerId:n.pointerId,homeRect:r,homeParent:l,homeNextSibling:d,offsetX:i,offsetY:o,savedStyles:a,hoverZoneId:null},e.onDragStart?.();const u=p=>this.#c(p,u,c),c=p=>{window.removeEventListener("pointermove",u),window.removeEventListener("pointerup",c),window.removeEventListener("pointercancel",c),this.#n(p)};window.addEventListener("pointermove",u),window.addEventListener("pointerup",c),window.addEventListener("pointercancel",c)}#c(t,e,n){const s=this.#e;!s||t.pointerId!==s.pointerId||(s.element.style.left=`${t.clientX-s.offsetX}px`,s.element.style.top=`${t.clientY-s.offsetY}px`,this.#s(t.clientX,t.clientY))}#n(t){const e=this.#e;if(!e||t.pointerId!==e.pointerId)return;this.#i(t.clientX,t.clientY)?this.#d(!0,t.clientX,t.clientY):this.#d(!1,e.homeRect.left,e.homeRect.top)}#s(t,e){const n=this.#e;let s=null;for(const i of this.#t.values()){if(!i.accepts.includes(n.options.kind))continue;const o=i.getRect(),a=o.left+o.width/2,l=o.top+o.height/2,d=Math.hypot(t-a,e-l),u=i.snapRadius??A;if(d<=u){s=i;break}}const r=s?.id??null;r!==n.hoverZoneId&&(n.hoverZoneId&&this.#t.get(n.hoverZoneId)?.onHover?.(!1),r&&this.#t.get(r)?.onHover?.(!0),n.hoverZoneId=r)}#i(t,e){const n=this.#e;if(!n.hoverZoneId)return!1;const s=this.#t.get(n.hoverZoneId);return s?s.onDrop({element:n.element,kind:n.options.kind,equipmentId:n.options.equipmentId,pointerX:t,pointerY:e}):!1}#d(t,e,n){const s=this.#e;if(!s)return;this.#e=null,s.hoverZoneId&&this.#t.get(s.hoverZoneId)?.onHover?.(!1);try{s.element.releasePointerCapture(s.pointerId)}catch{}if(s.element.removeAttribute("dragging"),s.options.onDragEnd?.(t),t)return;const r=s.homeRect.left,i=s.homeRect.top,o=this.#o?0:I;let a=!1;const l=()=>{if(a)return;a=!0,this.#r.delete(s.element),s.homeNextSibling&&s.homeNextSibling.parentNode===s.homeParent?s.homeParent.insertBefore(s.element,s.homeNextSibling):s.homeParent.appendChild(s.element);const c=s.savedStyles;s.element.style.position=c.position,s.element.style.left=c.left,s.element.style.top=c.top,s.element.style.zIndex=c.zIndex,s.element.style.transform=c.transform};if(o===0){l();return}this.#r.set(s.element,l);const d=s.element.animate([{left:s.element.style.left,top:s.element.style.top},{left:`${r}px`,top:`${i}px`}],{duration:o,easing:T,fill:"forwards"}),u=()=>{try{d.cancel()}catch{}l()};d.addEventListener("finish",u,{once:!0}),d.addEventListener("cancel",u,{once:!0}),setTimeout(()=>{if(!a){try{d.cancel()}catch{}l()}},o+100)}#f(t,e){const n=Array.from(this.#t.values()).find(r=>r.accepts.includes(e.kind));if(!n)return;const s=n.getRect();n.onDrop({element:t,kind:e.kind,equipmentId:e.equipmentId,pointerX:s.left+s.width/2,pointerY:s.top+s.height/2})}}const P=2400;class ${#t;#e;#a=null;#o=!1;constructor(t,e){this.#t=t,this.#e=e}update(t){if(this.#o)return;const e=this.#r(t);e!==this.#t.textContent&&(this.#t.textContent=e)}flash(t){this.#o=!0,this.#t.textContent=t,this.#t.setAttribute("data-flash","true"),this.#e.textContent=t,this.#a&&clearTimeout(this.#a),this.#a=setTimeout(()=>{this.#o=!1,this.#t.removeAttribute("data-flash")},P)}#r(t){if(t.block===null)return"Возьмите деревянный брусок из правой панели и поставьте на направляющую.";if(t.dynamometer===null)switch(t.activeTask){case"A-coefficient":case"B-work":return"Прицепите динамометр (5Н) к крючку бруска слева — будем измерять силу трения.";case"C-force-vs-N":return"Положите 1-й груз на брусок, затем прицепите динамометр.";case"D-force-vs-surface":return"Прицепите динамометр и проведите измерение для текущей поверхности."}switch(t.measurementStep){case"awaiting-pull":return"Тяните за корпус динамометра вправо — равномерно, до начала скольжения.";case"pulling-static":return"Брусок ещё держит покой — увеличивайте силу плавно.";case"sliding":return"Скольжение пошло! Удерживайте равномерное движение и зафиксируйте показание.";case"ready-to-record":return"Хорошо. Нажмите «Записать в журнал» для фиксации измерения.";case"recorded":return t.activeTask==="C-force-vs-N"?"Запись сохранена. Добавьте ещё груз — снимите следующую точку для графика.":t.activeTask==="D-force-vs-surface"?"Запись сохранена. Переключите поверхность (А/Б) и повторите измерение.":"Запись сохранена. Можно добавить груз и повторить, либо «Сбросить»."}return"Соберите установку и начните измерение."}}const v={A:{label:"Направляющая (А)",description:"Деревянная направляющая",muStatic:.22,muKinetic:.2,color:"#d2a87a"},B:{label:"Гибкая полоса (Б)",description:"Тканевая накладка",muStatic:.65,muKinetic:.6,color:"#5d4a3a"}};function x(h){return h/1e3*C}function w(h){return x(h)}function N(h,t){if(h<0)throw new RangeError(`Сила трения должна быть >= 0, получено: ${h}`);if(t<0)throw new RangeError(`Нормальная сила должна быть >= 0, получено: ${t}`);return t===0?null:h/t}function D(h,t,e,n){const s=e*t;if(h<=s)return{actualFrictionN:h,isSliding:!1,excessForce:0};const r=n*t;return{actualFrictionN:r,isSliding:!0,excessForce:h-r}}function y(h){return h.reduce((t,e)=>t+e.mass,0)}function b(h,t){const e=10**t;return Math.round(h*e)/e}const S={activeTask:"A-coefficient",stage:"empty",surfaceId:"A",block:null,weightsOnBlock:[],dynamometer:null,dragging:null,measurementStep:"idle",appliedForce:0,slidingVelocity:0,measurements:[],hintsEnabled:!0},Z={"w-100-1":{mass:100,equipmentId:"w-100-1"},"w-100-2":{mass:100,equipmentId:"w-100-2"},"w-100-3":{mass:100,equipmentId:"w-100-3"},rod:{mass:10,equipmentId:"rod"},"disc-10":{mass:10,equipmentId:"disc-10"},"disc-20":{mass:20,equipmentId:"disc-20"},"disc-50":{mass:50,equipmentId:"disc-50"}},H={"dyno-1":{range:1,equipmentId:"dyno-1"},"dyno-5":{range:5,equipmentId:"dyno-5"}};class z{#t;#e;#a;#o;#r;#m;#c;#n=null;#s=null;#i=[];#d=new Map;#f=!1;#k=null;#F=0;#q=0;#u=null;#E=0;#B=0;constructor(t){this.#t=t,this.#e=new M({...S}),this.#a=new L(t.dragOverlay),this.#o=new $(t.hintBar,t.liveRegion),this.#r=document.createElement("div"),this.#r.className="block-mount",t.trackContainer.appendChild(this.#r),this.#m=document.createElement("div"),this.#m.className="stacked-mount",this.#r.appendChild(this.#m),this.#c=document.createElement("div"),this.#c.className="pull-string",this.#c.hidden=!0,t.trackContainer.appendChild(this.#c),this.#D(),this.#l(),this.#o.update(this.#e.get())}attachBlock(){const t=this.#d.get("block");if(!t)return!1;const e=t.querySelector("lab-block");return e?this.#R(e):!1}attachDynamometerById(t){const e=this.#d.get(t);if(!e)return!1;const n=e.querySelector("lab-dynamometer-h");return n?this.#I(n,t):!1}attachWeightById(t){const e=this.#d.get(t);if(!e)return!1;const n=e.querySelector("lab-flat-weight");return n?this.#A(n,t):!1}applyForce(t){if(!this.#s)return;const e=this.#e.get(),n=(this.#n?.mass??0)+y(e.weightsOnBlock);if(n<=0)return;const s=w(n),r=v[e.surfaceId],i=D(t,s,r.muStatic,r.muKinetic),o=e.measurementStep==="sliding"||e.measurementStep==="ready-to-record",a=i.isSliding?"sliding":t>0?"pulling-static":"awaiting-pull";this.#e.set({appliedForce:t,slidingVelocity:i.isSliding?Math.max(50,i.excessForce*200):0,measurementStep:a}),this.#s.setAttribute("force",i.actualFrictionN.toFixed(2)),i.isSliding&&!o?this.#L():!i.isSliding&&o&&this.#w(),i.isSliding&&setTimeout(()=>{this.#e.get().measurementStep==="sliding"&&(this.#e.set({measurementStep:"ready-to-record"}),this.#l())},250),this.#l()}#L(){this.#u!==null&&cancelAnimationFrame(this.#u),this.#E=performance.now(),this.#B=this.#e.get().block?.positionMm??0;const t=e=>{const n=this.#e.get();if(n.measurementStep!=="sliding"&&n.measurementStep!=="ready-to-record"){this.#u=null;return}const s=(e-this.#E)/1e3,r=n.slidingVelocity,i=this.#B+r*s,o=350,a=Math.min(o,i);if(a!==n.block?.positionMm&&(this.#e.update(l=>({block:l.block?{...l.block,positionMm:a}:l.block})),this.#g()),a>=o){this.#u=null;return}this.#u=requestAnimationFrame(t)};this.#u=requestAnimationFrame(t)}#w(){this.#u!==null&&(cancelAnimationFrame(this.#u),this.#u=null)}setActiveTask(t){this.#e.set({activeTask:t}),this.#l()}setSurface(t){this.#t.track.surfaceId=t,this.#e.set({surfaceId:t}),this.#l()}recordMeasurement(t){const e=this.#e.get();if(!this.#n)return;const n=this.#n.mass,s=t?.mBlockG??n,r=this.#s?Number(this.#s.getAttribute("force")??0):0,i=t?.frictionN??r,o=s+y(e.weightsOnBlock),a=w(o),l=N(i,a);if(l===null)return;const d={id:`m-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,timestamp:Date.now(),surfaceId:e.surfaceId,totalMassGrams:o,normalForce:b(a,3),frictionForce:b(i,3),mu:b(l,3),distanceMm:null,work:null};this.#e.update(u=>({measurements:[...u.measurements,d],measurementStep:"recorded"})),this.#l(),this.#p(`Записано: μ = ${d.mu.toFixed(2)}, F тр = ${d.frictionForce.toFixed(2)} Н.`)}#P(){const t=this.#e.get();if(t.measurementStep!=="ready-to-record")return;const e=y(t.weightsOnBlock);this.#t.rfMweights.value=String(e);const n=localStorage.getItem("friction-mblock");n&&(this.#t.rfMblock.value=n),this.#t.rfFriction.value="",this.#t.recordForm.hidden=!1,this.#t.rfMblock.focus()}#C(){this.#t.recordForm.hidden=!0}#$(){const t=parseFloat(this.#t.rfMblock.value),e=parseFloat(this.#t.rfFriction.value);if(!Number.isFinite(t)||t<=0){this.#o.flash("Введите массу бруска (положительное число в граммах)."),this.#t.rfMblock.focus();return}if(!Number.isFinite(e)||e<=0){this.#o.flash("Введите показание динамометра (положительное число в Н)."),this.#t.rfFriction.focus();return}localStorage.setItem("friction-mblock",String(t)),this.recordMeasurement({mBlockG:t,frictionN:e}),this.#C()}#N(){if(!this.#n){this.#o.flash("Сначала возьмите брусок из правой панели.");return}const t=this.#n.mass,e=b(x(t),2);this.#o.flash(`Динамометр показал F = ${e.toFixed(2)} Н. Посчитайте массу: m = F · 1000 / 9.8.`)}reset(){if(this.#a.cancel(),this.#w(),this.#c.hidden=!0,this.#n&&this.#b("block",this.#n),this.#s){const t=this.#e.get().dynamometer?.equipmentId;t&&this.#b(t,this.#s)}for(const t of[...this.#i]){const e=t.dataset.equipmentId;e&&this.#b(e,t)}this.#n=null,this.#s=null,this.#i=[],this.#e.set({...S}),this.#a.removeSnapZone("block-top"),this.#a.removeSnapZone("block-hook"),this.#l(),this.#p("Установка сброшена. Все приборы вернулись в комплект.")}#D(){this.#t.cards.forEach(t=>{const e=t.dataset.eq;if(!e)return;this.#d.set(e,t);const n=t.querySelector("lab-block, lab-dynamometer-h, lab-flat-weight");if(!n)return;n.dataset.equipmentId=e;const s=this.#M(e);this.#a.attach(n,{equipmentId:e,kind:s,onDragStart:()=>{this.#e.set({dragging:e}),this.#h()},onDragEnd:()=>{this.#e.set({dragging:null}),this.#h()}})}),this.#a.addSnapZone(this.#Z()),this.#t.resetBtn.addEventListener("click",()=>this.reset()),this.#t.recordBtn.addEventListener("click",()=>this.#P()),this.#t.weighBtn.addEventListener("click",()=>this.#N()),this.#t.rfCancel.addEventListener("click",()=>this.#C()),this.#t.recordForm.addEventListener("submit",t=>{t.preventDefault(),this.#$()}),this.#t.surfaceToggle.addEventListener("click",t=>{const e=t.target.closest("[data-surface]");if(!e)return;const n=e.dataset.surface;n&&(n==="A"||n==="B")&&this.setSurface(n)}),this.#t.steps.addEventListener("click",t=>{const e=t.target.closest("[data-task]");if(!e)return;const n=e.dataset.task;n&&this.setActiveTask(n)}),this.#t.measurementToggle.addEventListener("click",()=>{const t=this.#t.measurementPanel.getAttribute("aria-collapsed")==="true";this.#t.measurementPanel.setAttribute("aria-collapsed",t?"false":"true"),this.#t.measurementToggle.setAttribute("aria-expanded",t?"true":"false")}),window.addEventListener("resize",()=>this.#g()),requestAnimationFrame(()=>requestAnimationFrame(()=>this.#g()))}#M(t){return t==="block"?"block":t==="dyno-1"||t==="dyno-5"?"dynamometer":"weight"}#Z(){return{id:"track",accepts:["block"],getRect:()=>this.#t.dropZoneTrack.getBoundingClientRect(),snapRadius:120,onHover:t=>{this.#t.dropZoneTrack.classList.toggle("drop-zone--active",t)},onDrop:({element:t,equipmentId:e})=>e!=="block"?!1:this.#R(t)}}#H(){return{id:"block-top",accepts:["weight"],getRect:()=>this.#t.dropZoneBlockTop.getBoundingClientRect(),snapRadius:90,onHover:t=>{this.#t.dropZoneBlockTop.classList.toggle("drop-zone--active",t)},onDrop:({element:t,equipmentId:e})=>this.#A(t,e)}}#z(){return{id:"block-hook",accepts:["dynamometer"],getRect:()=>this.#t.dropZoneBlockHook.getBoundingClientRect(),snapRadius:90,onHover:t=>{this.#t.dropZoneBlockHook.classList.toggle("drop-zone--active",t)},onDrop:({element:t,equipmentId:e})=>e!=="dyno-1"&&e!=="dyno-5"?!1:this.#I(t,e)}}#R(t){return this.#n?!1:(this.#_(t),t.setAttribute("on-surface",""),t.setAttribute("attached",""),this.#n=t,this.#e.set({block:{positionMm:0},stage:"block-placed"}),this.#v("block","in-use"),this.#a.addSnapZone(this.#H()),this.#a.addSnapZone(this.#z()),this.#h(),this.#l(),this.#p("Брусок установлен на направляющую."),!0)}#A(t,e){const n=Z[e];if(!n)return!1;if(!this.#n)return this.#o.flash("Сначала поставьте брусок на направляющую."),!1;if(this.#i.includes(t))return!1;this.#X(t,e),t.setAttribute("attached","");const s={equipmentId:e,mass:n.mass,stackIndex:this.#i.length};return this.#i.push(t),this.#e.update(r=>({weightsOnBlock:[...r.weightsOnBlock,s]})),this.#v(e,"in-use"),this.#x(),this.#h(),this.#l(),this.#p(`Положен груз ${n.mass} г на брусок.`),!0}#I(t,e){if(this.#s)return!1;if(!this.#n)return this.#o.flash("Сначала поставьте брусок на направляющую."),!1;const n=H[e];return n?(this.#Y(t,n.range,e),t.setAttribute("attached",""),this.#s=t,this.#e.set({dynamometer:{equipmentId:e,range:n.range},measurementStep:"awaiting-pull"}),this.#v(e,"in-use"),requestAnimationFrame(()=>requestAnimationFrame(()=>{this.#g(),this.#h()})),this.#l(),this.#p(`Динамометр ${n.range} Н прицеплен к крючку бруска. Можно тянуть.`),!0):!1}#S(t,e){t.style.position="",t.style.left="",t.style.top="",t.style.transform="",t.style.zIndex="",t.style.marginTop="",t.setAttribute("attached","");const n=document.createElement("div");n.className="attached-eq",n.dataset.equipmentId=e,n.style.position="absolute",n.appendChild(t);const s=document.createElement("button");return s.className="detach-btn",s.type="button",s.setAttribute("aria-label","Снять с установки"),s.title="Снять с установки",s.textContent="×",s.addEventListener("click",r=>{r.stopPropagation(),this.#G(t)}),n.appendChild(s),n}#_(t){const e=this.#S(t,"block");e.style.left="0",e.style.top="0",this.#r.appendChild(e),requestAnimationFrame(()=>requestAnimationFrame(()=>this.#g()))}#X(t,e){const n=this.#S(t,e);this.#m.appendChild(n)}#Y(t,e,n){t.setAttribute("range",String(e)),t.setAttribute("force","0"),t.setAttribute("interactive","");const s=this.#S(t,n);this.#n&&this.#r.appendChild(s),t.dataset.pullBound||(t.dataset.pullBound="true",t.addEventListener("pointerdown",this.#j))}#j=t=>{if(!(t.button!==void 0&&t.button!==0)&&this.#s){t.preventDefault(),t.stopPropagation(),this.#f=!0,this.#k=t.pointerId,this.#F=t.clientX,this.#q=Number(this.#s.getAttribute("force")??0);try{this.#s.setPointerCapture(t.pointerId)}catch{}window.addEventListener("pointermove",this.#T),window.addEventListener("pointerup",this.#y),window.addEventListener("pointercancel",this.#y)}};#T=t=>{if(!this.#f||t.pointerId!==this.#k||!this.#s||!this.#n)return;const e=100,n=t.clientX-this.#F,s=Number(this.#s.getAttribute("range")??5),r=Math.max(0,Math.min(s,this.#q+n/e));this.applyForce(r)};#y=t=>{if(t.pointerId===this.#k&&(this.#f=!1,this.#k=null,window.removeEventListener("pointermove",this.#T),window.removeEventListener("pointerup",this.#y),window.removeEventListener("pointercancel",this.#y),this.#s))try{this.#s.releasePointerCapture(t.pointerId)}catch{}};#g(){if(!this.#t.track||!this.#t.trackContainer||!this.#n)return;const t=this.#t.track.getBoundingClientRect(),e=this.#t.trackContainer.getBoundingClientRect(),n=this.#t.track.getTopSurfaceY(),s=this.#n.getBoundingClientRect(),r=t.left-e.left,i=this.#e.get().block?.positionMm??0,o=t.width/500,l=r+(60+i)*o-s.width/2,d=t.top-e.top+n,u=this.#n.getVisualBottomY(),c=d-u;this.#r.style.left=`${l}px`,this.#r.style.top=`${c}px`,this.#x(),this.#O()}#O(){if(!this.#s||!this.#n){this.#c.hidden=!0;return}const t=this.#t.trackContainer.getBoundingClientRect(),e=this.#s.getBoundingClientRect(),n=this.#s.getHookPosition(),s=e.left+n.x,r=e.top+n.y,i=this.#n.getHookPosition(),o=this.#n.getBoundingClientRect(),a=o.left+i.x,l=o.top+i.y,d=s-t.left,u=r-t.top,c=a-t.left,p=l-t.top,m=c-d,f=p-u,k=Math.hypot(m,f),g=Math.atan2(f,m)*(180/Math.PI);this.#c.style.left=`${d}px`,this.#c.style.top=`${u}px`,this.#c.style.width=`${k}px`,this.#c.style.transform=`rotate(${g}deg)`,this.#c.hidden=!1}#x(){if(!this.#n)return;const t=this.#n.getBoundingClientRect(),e=this.#r.getBoundingClientRect(),n=t.top-e.top+this.#n.getVisualTopY(),s=t.left-e.left,r=t.width,i=this.#i[0],o=i?i.getBoundingClientRect().width:64,a=i?i.getBoundingClientRect().height:28,l=4,d=o+l,u=Math.max(1,Math.floor((r+l)/d));for(let c=0;c<this.#i.length;c++){const p=this.#i[c],m=p.parentElement?.classList.contains("attached-eq")?p.parentElement:p,f=Math.floor(c/u),k=c%u,g=Math.min(u,this.#i.length-f*u),F=g*o+(g-1)*l,q=(r-F)/2,E=s+q+k*d,B=n-(f+1)*a+2;m.style.left=`${E}px`,m.style.top=`${B}px`}}#h(){const t=this.#e.get(),e=this.#t.track.getBoundingClientRect(),n=this.#t.trackContainer.getBoundingClientRect(),s=t.dragging,r=s?this.#M(s):null,i=this.#t.dropZoneTrack,o=!this.#n&&r==="block";i.hidden=!o,o&&(i.style.left=`${e.left-n.left+60}px`,i.style.top=`${e.top-n.top-20}px`,i.style.width=`${e.width-120}px`,i.style.height=`${e.height+20}px`);const a=this.#t.dropZoneBlockTop,l=!!this.#n&&r==="weight";if(a.hidden=!l,l&&this.#n){const c=this.#n.getBoundingClientRect();let p=c.top-n.top-70;this.#i.length>0&&(p=this.#i[this.#i.length-1].getBoundingClientRect().top-n.top-70),a.style.left=`${c.left-n.left}px`,a.style.top=`${p}px`,a.style.width=`${c.width}px`,a.style.height="60px"}const d=this.#t.dropZoneBlockHook,u=!!this.#n&&!this.#s&&r==="dynamometer";if(d.hidden=!u,u&&this.#n){const c=this.#n.getBoundingClientRect();d.style.left=`${c.right-n.left+10}px`,d.style.top=`${c.top-n.top-10}px`,d.style.width="90px",d.style.height=`${c.height+20}px`}}#b(t,e){const n=this.#d.get(t);if(!n)return;const s=e.parentElement?.classList.contains("attached-eq")?e.parentElement:null;e.style.position="",e.style.left="",e.style.top="",e.style.transform="",e.style.zIndex="",e.removeAttribute("attached"),e.removeAttribute("on-surface"),e.tagName.toLowerCase()==="lab-dynamometer-h"&&e.setAttribute("force","0"),n.appendChild(e),s&&s.parentElement&&s.parentElement.removeChild(s),this.#v(t,"available")}#G(t){if(t===this.#n){this.reset();return}if(t===this.#s){const s=this.#e.get().dynamometer?.equipmentId;s&&this.#b(s,this.#s),this.#s=null,this.#e.set({dynamometer:null,appliedForce:0,slidingVelocity:0,measurementStep:"idle"}),this.#w(),this.#c.hidden=!0,this.#h(),this.#l(),this.#p("Динамометр снят с установки.");return}const e=this.#i.indexOf(t);if(e===-1)return;const n=t.dataset.equipmentId;n&&this.#b(n,t),this.#i=this.#i.filter((s,r)=>r!==e),this.#e.update(s=>({weightsOnBlock:s.weightsOnBlock.filter((r,i)=>i!==e)})),this.#x(),this.#h(),this.#l(),this.#p("Груз снят с бруска.")}#v(t,e){this.#d.get(t)?.setAttribute("status",e)}#l(){const t=this.#e.get();this.#o.update(t),this.#U(),this.#V(),this.#K(),this.#W(),this.#J()}#U(){const t=this.#e.get();this.#t.surfaceToggle.querySelectorAll("[data-surface]").forEach(n=>{const s=n.dataset.surface===t.surfaceId;n.setAttribute("data-state",s?"active":"inactive"),n.setAttribute("aria-pressed",s?"true":"false")})}#V(){const t=this.#e.get();this.#t.steps.querySelectorAll("[data-task]").forEach(n=>{const s=n.dataset.task===t.activeTask;n.setAttribute("data-state",s?"active":"inactive"),n.setAttribute("aria-current",s?"true":"false")})}#W(){const e=this.#e.get().measurementStep==="ready-to-record";this.#t.recordBtn.disabled=!e,this.#t.recordBtn.hidden=!this.#s,this.#t.recordBtn.classList.toggle("ready-pulse",e)}#K(){const t=this.#e.get(),e=t.measurements.length>0;this.#t.measurementPanel.setAttribute("data-state",e?"has-data":"empty"),e?(this.#t.measurementCount.textContent=String(t.measurements.length),this.#t.measurementCount.hidden=!1):(this.#t.measurementCount.textContent="",this.#t.measurementCount.hidden=!0);const n=document.getElementById("formula-display");n&&(n.hidden=!e),e?(this.#t.journalEmpty.hidden=!0,this.#t.journalTable.hidden=!1,this.#t.journalBody.innerHTML=t.measurements.map((i,o)=>`
        <tr>
          <td>${o+1}</td>
          <td>${i.surfaceId}</td>
          <td>${i.totalMassGrams}</td>
          <td>${i.normalForce.toFixed(2)}</td>
          <td>${i.frictionForce.toFixed(2)}</td>
          <td>${i.mu.toFixed(2)}</td>
        </tr>
      `).join("")):(this.#t.journalEmpty.hidden=!1,this.#t.journalTable.hidden=!0,this.#t.journalBody.innerHTML="");const s=t.surfaceId,r=t.measurements.filter(i=>i.surfaceId===s);if(r.length>=1){const i=r.reduce((a,l)=>a+l.mu,0)/r.length,o=v[s].label;this.#t.resultPanel.hidden=!1,this.#t.resultPanel.innerHTML=`
        <h4 class="result-title">Текущий результат — ${o}</h4>
        <div class="result-grid">
          <div class="result-row"><span>Измерений:</span> <strong>${r.length}</strong></div>
          <div class="result-row"><span>μ̄ (среднее):</span> <strong>${i.toFixed(2)}</strong></div>
        </div>
      `}else this.#t.resultPanel.hidden=!0,this.#t.resultPanel.innerHTML=""}#J(){const t=this.#e.get();t.activeTask!=="C-force-vs-N"&&t.activeTask}#p(t){this.#t.liveRegion.textContent=t}}class X{meta={id:"friction",label:"Трение скольжения",kicker:"Опыт 2.2–2.5",icon:"friction",tooltip:"μ, работа силы трения, F_тр(N), F_тр(поверхность) — 4 задачи"};#t=null;#e=null;mount(t){if(this.#t)return;this.#e=t,t.innerHTML=R;const e={stage:t.querySelector("#stage"),trackContainer:t.querySelector("#track-container"),track:t.querySelector("#track"),dragOverlay:t.querySelector("#drag-overlay"),dropZoneTrack:t.querySelector("#drop-zone-track"),dropZoneBlockTop:t.querySelector("#drop-zone-block-top"),dropZoneBlockHook:t.querySelector("#drop-zone-block-hook"),hintBar:t.querySelector("#hint-bar"),journalEmpty:t.querySelector("#journal-empty"),journalTable:t.querySelector("#journal-table"),journalBody:t.querySelector("#journal-body"),liveRegion:t.querySelector("#live-region"),resultPanel:t.querySelector("#result-panel"),graph:t.querySelector("#graph"),recordBtn:t.querySelector("#record-btn"),resetBtn:t.querySelector("#reset-btn"),cards:t.querySelectorAll("lab-equipment-card"),measurementPanel:t.querySelector("#measurement-panel"),measurementToggle:t.querySelector("#measurement-toggle"),measurementCount:t.querySelector("#measurement-count"),steps:t.querySelector("#steps"),surfaceToggle:t.querySelector("#surface-toggle"),weighBtn:t.querySelector("#weigh-btn"),recordForm:t.querySelector("#record-form"),rfMblock:t.querySelector("#rf-mblock"),rfMweights:t.querySelector("#rf-mweights"),rfFriction:t.querySelector("#rf-friction"),rfCancel:t.querySelector("#rf-cancel"),rfSubmit:t.querySelector("#rf-submit")};this.#t=new z(e),window.frictionExperiment=this.#t}unmount(){this.#t&&(this.#t.reset(),delete window.frictionExperiment,this.#t=null,this.#e&&this.#e.replaceChildren(),this.#e=null)}reset(){this.#t?.reset()}}export{X as F};
//# sourceMappingURL=screen-friction-C3AT7TY_.js.map
