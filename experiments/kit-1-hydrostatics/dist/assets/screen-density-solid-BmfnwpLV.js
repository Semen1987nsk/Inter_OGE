class V{#e;#t=new Set;constructor(e){this.#e=e}get(){return this.#e}set(e){this.#e={...this.#e,...e},this.#a()}update(e){const t=e(this.#e);this.set(t)}subscribe(e){return this.#t.add(e),()=>this.#t.delete(e)}#a(){for(const e of this.#t)e(this.#e)}}const I=[{id:"1",material:"steel",mass_g:195,mass_tolerance_g:2,volume_cm3:25,volume_tolerance_cm3:.3,label:"Цилиндр № 1",density_g_cm3:7.8,density_kg_m3:7800},{id:"2",material:"aluminum",mass_g:70,mass_tolerance_g:2,volume_cm3:25,volume_tolerance_cm3:.7,label:"Цилиндр № 2",density_g_cm3:2.8,density_kg_m3:2800},{id:"3",material:"plastic",mass_g:66,mass_tolerance_g:2,volume_cm3:56,volume_tolerance_cm3:1.8,label:"Цилиндр № 3",density_g_cm3:1.179,density_kg_m3:1179},{id:"4",material:"aluminum",mass_g:95,mass_tolerance_g:2,volume_cm3:34,volume_tolerance_cm3:.7,label:"Цилиндр № 4",density_g_cm3:2.794,density_kg_m3:2794}],m=new Map(I.map(i=>[i.id,i]));function B(i,e){if(!Number.isFinite(i)||!Number.isFinite(e))throw new RangeError(`V1, V2 должны быть конечными числами; получено V1=${i}, V2=${e}`);if(i<0||e<0)throw new RangeError(`V1, V2 не могут быть отрицательными; получено V1=${i}, V2=${e}`);if(e<=i)throw new RangeError(`V₂ должно быть > V₁; получено V₁=${i}, V₂=${e}`);return e-i}function O(i,e){if(!Number.isFinite(i)||!Number.isFinite(e))throw new RangeError(`m, V должны быть конечными числами; получено m=${i}, V=${e}`);if(i<=0)throw new RangeError(`Масса должна быть > 0; получено m=${i}`);if(e<=0)throw new RangeError(`Объём должен быть > 0; получено V=${e}`);return i/e}function L(i){if(!Number.isFinite(i))throw new RangeError(`ρ должно быть конечным; получено ${i}`);return i*1e3}function R(i,e=10){if(!Number.isFinite(i)||i<=0)return null;if(e<0)throw new RangeError(`tolerancePct должен быть ≥ 0; получено ${e}`);let t=null;for(const a of I){const n=Math.abs(i-a.density_kg_m3)/a.density_kg_m3;n*100<=e&&(!t||n<t.deviation)&&(t={material:a.material,deviation:n})}return t?.material??null}function $(i,e,t,a=10){const n=B(e,t),l=O(i,n),d=L(l),r=R(d,a);return{V_cm3:n,rho_g_cm3:l,rho_kg_m3:d,identified:r}}const T=6;class N{#e;#t;#a=null;#o;constructor(e,t){this.#e=e,this.#o=t,this.#t=document.createElement("div"),this.#t.className="density-drag-overlay",this.#t.setAttribute("aria-hidden","true"),document.body.appendChild(this.#t),this.#e.addEventListener("pointerdown",this.#s),window.addEventListener("pointermove",this.#i,{passive:!1}),window.addEventListener("pointerup",this.#r),window.addEventListener("pointercancel",this.#m)}destroy(){this.#l(),this.#e.removeEventListener("pointerdown",this.#s),window.removeEventListener("pointermove",this.#i),window.removeEventListener("pointerup",this.#r),window.removeEventListener("pointercancel",this.#m),this.#t.remove()}#s=e=>{if(e.button!==0)return;const a=e.target.closest("[data-draggable]");if(!a)return;const n=a.getAttribute("data-draggable");if(!n)return;const l=a.getBoundingClientRect(),d=l.left+l.width/2,r=l.top+l.height/2;this.#a={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,grabOffsetX:e.clientX-d,grabOffsetY:e.clientY-r,source:a,eqId:n,ghost:null,candidateZone:null}};#i=e=>{const t=this.#a;if(!t||e.pointerId!==t.pointerId)return;const a=e.clientX-t.startX,n=e.clientY-t.startY;if(!t.ghost&&Math.hypot(a,n)>=T){const l=e.clientX-t.grabOffsetX,d=e.clientY-t.grabOffsetY;t.ghost=this.#h(t.source,l,d),t.source.dataset.dragging="true",this.#c(t.eqId,!0)}if(t.ghost){e.preventDefault(),document.body.classList.add("has-drag-active");const l=e.clientX-t.grabOffsetX,d=e.clientY-t.grabOffsetY;t.ghost.style.transform=`translate(${l}px, ${d}px) translate(-50%, -50%)`;const r=this.#g(e.clientX,e.clientY,t.eqId);r!==t.candidateZone&&(t.candidateZone&&(t.candidateZone.dataset.dropHover="false"),r&&(r.dataset.dropHover="true"),t.candidateZone=r)}};#r=e=>{const t=this.#a;if(!(!t||e.pointerId!==t.pointerId)){if(t.ghost){const a=t.candidateZone;if(a){const n=a.getAttribute("data-dropzone-id")??"";try{this.#o({eqId:t.eqId,dropzoneId:n})}catch(l){console.error("DragDropController.onDrop threw",l)}}}this.#l()}};#m=()=>{this.#l()};#l(){const e=this.#a;e&&(e.ghost&&e.ghost.remove(),e.candidateZone&&(e.candidateZone.dataset.dropHover="false"),this.#c(e.eqId,!1),delete e.source.dataset.dragging,document.body.classList.remove("has-drag-active"),this.#a=null)}#h(e,t,a){const n=document.createElement("div");n.className="density-drag-ghost";const l="lab-balance, lab-graduated-cylinder, lab-metal-weight, lab-dynamometer, lab-beaker, lab-thread, lab-salt-set",d=e.matches(l)?e:e.querySelector(l);if(d){const r=d.cloneNode(!0);r.removeAttribute("selected"),r.removeAttribute("attached"),r.removeAttribute("active"),r.removeAttribute("hidden"),r.classList.remove("density-overlay-weight","density-overlay-weight--balance","density-overlay-weight--cylinder"),r.removeAttribute("id"),r.removeAttribute("style"),r.tagName==="LAB-METAL-WEIGHT"&&(r.setAttribute("no-legend",""),r.style.setProperty("--w-size","76px")),n.appendChild(r)}else n.textContent=e.getAttribute("data-draggable")??"";return n.style.transform=`translate(${t}px, ${a}px) translate(-50%, -50%)`,this.#t.appendChild(n),n}#c(e,t){const a=document.querySelectorAll("[data-dropzone]");for(const n of a)t&&this.#u(n,e)?n.dataset.dropActive="true":n.dataset.dropActive="false"}#u(e,t){const a=(e.getAttribute("data-dropzone")??"").split(",").map(n=>n.trim());for(const n of a)if(n){if(n.endsWith("*")){const l=n.slice(0,-1);if(t.startsWith(l))return!0}else if(n===t)return!0}return!1}#g(e,t,a){const n=document.elementsFromPoint(e,t);for(const l of n){if(!(l instanceof HTMLElement))continue;const d=l.closest("[data-dropzone]");if(d&&this.#u(d,a))return d}return null}}const S="semi-auto";function x(i){return i==="semi-auto"||i==="fully-manual"||i==="fully-auto"?i:i==="manual"||i==="auto"?"semi-auto":S}function w(){try{if(typeof globalThis>"u")return null;const i=globalThis.location;if(!i?.search)return null;const t=new URLSearchParams(i.search).get("mode");return t===null?null:t==="semi-auto"||t==="fully-manual"||t==="fully-auto"?t:t==="manual"?"semi-auto":t==="auto"?"fully-auto":null}catch{return null}}function k(){return w()!==null}function g(i,e=document){try{e.body&&(e.body.dataset.recordMode=i)}catch{}}const E="inter-oge.record-mode.";function q(){try{if(typeof globalThis>"u")return null;const i=globalThis.localStorage;if(!i)return null;const e="__inter-oge-record-mode-probe__";return i.setItem(e,"1"),i.removeItem(e),i}catch{return null}}function A(i){const e=w();if(e!==null)return e;const t=q();if(!t)return S;const a=t.getItem(E+i);return x(a)}function D(i,e){if(k())return;const t=q();t&&t.setItem(E+i,x(e))}function P(i,e){const t=document.createElement("div");t.className="lab-record-mode-toggle",t.setAttribute("role","radiogroup"),t.setAttribute("aria-label","Режим записи в журнал");const a=k();a?(t.dataset.locked="true",t.setAttribute("aria-disabled","true"),t.title="Режим зафиксирован учителем (URL-параметр ?mode=…). Изменить нельзя."):t.title="Полу-авто (по умолчанию): клик «Записать» → программа пишет показания приборов; ученик вводит расчётные. Ручной: ученик вводит ВСЁ. Авто: программа пишет автоматически.";const n=A(e.kitId);g(n);const l=[{mode:"semi-auto",label:"Полу-авто",hint:"Программа пишет показания, ученик — расчётные"},{mode:"fully-manual",label:"Ручной",hint:"Ученик вводит все значения сам"},{mode:"fully-auto",label:"Авто",hint:"Программа пишет всё автоматически"}],d=[];for(const r of l){const s=document.createElement("button");s.type="button",s.className="lab-record-mode-toggle__segment",s.setAttribute("role","radio"),s.setAttribute("aria-checked",r.mode===n?"true":"false"),r.mode===n&&(s.dataset.active="true"),s.dataset.mode=r.mode,s.textContent=r.label,s.title=r.hint,a&&(s.disabled=!0,s.setAttribute("aria-disabled","true")),s.addEventListener("click",()=>{if(!a&&s.dataset.active!=="true"){for(const c of d)delete c.dataset.active,c.setAttribute("aria-checked","false");s.dataset.active="true",s.setAttribute("aria-checked","true"),D(e.kitId,r.mode),g(r.mode),e.onChange?.(r.mode)}}),s.addEventListener("keydown",c=>{if(c.key==="ArrowLeft"||c.key==="ArrowRight"){c.preventDefault();const o=d.indexOf(s),u=c.key==="ArrowLeft"?(o-1+d.length)%d.length:(o+1)%d.length;d[u]?.focus(),d[u]?.click()}}),d.push(s),t.appendChild(s)}return i.appendChild(t),()=>{t.remove()}}const F=`
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
`;function j(i=document){const e="lab-record-mode-toggle-styles";if(i.getElementById(e))return;const t=i.createElement("style");t.id=e,t.textContent=F,i.head.appendChild(t)}const z=`
.lab-detach-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #ffffff;
  font-size: 18px;
  line-height: 1;
  font-family: system-ui, -apple-system, sans-serif;
  cursor: pointer;
  z-index: 50;
  user-select: none;
  -webkit-user-select: none;
  transition: background-color 140ms ease-out, transform 140ms ease-out;
}
.lab-detach-btn:hover,
.lab-detach-btn:focus-visible {
  background: #dc2626;
  transform: scale(1.08);
  outline: none;
}
.lab-detach-btn:focus-visible {
  box-shadow: 0 0 0 3px rgb(255 190 11 / 0.65);
}
.lab-detach-btn:active {
  transform: scale(0.96);
}
@media (prefers-reduced-motion: reduce) {
  .lab-detach-btn { transition: none; }
}
`;function H(i=document){const e="lab-detach-btn-styles";if(i.getElementById(e))return;const t=i.createElement("style");t.id=e,t.textContent=z,i.head.appendChild(t)}function b(i,e="fixed2"){if(i==null)return"—";if(typeof i=="string")return i;if(!Number.isFinite(i))return"—";let t;switch(e){case"int":t=Math.round(i).toString();break;case"fixed1":t=i.toFixed(1);break;case"fixed2":t=i.toFixed(2);break;case"fixed3":t=i.toFixed(3);break;case"percent":t=i.toFixed(1)+"%";break}return t.replace(".",",")}function M(i){if(i==null)return null;const e=String(i).trim();if(e===""||e==="—")return null;const t=e.replace(",",".").replace(/\s+/g,""),a=Number(t);return Number.isFinite(a)?a:null}function Y(i,e,t,a){let n=null;try{const o=document.activeElement;o instanceof HTMLInputElement&&typeof i.contains=="function"&&i.contains(o)&&o.dataset.row&&(n={row:o.dataset.row,key:o.dataset.key,selStart:o.selectionStart,selEnd:o.selectionEnd})}catch{}i.replaceChildren();const l=document.createElement("table");l.className="lab-journal-table",l.setAttribute("data-experiment",e.experimentId),l.setAttribute("data-mode",a.mode);const d=document.createElement("thead"),r=document.createElement("tr");for(const o of e.columns){const u=document.createElement("th");u.textContent=o.label,u.setAttribute("data-key",o.key),u.setAttribute("data-source",o.source),r.appendChild(u)}if(e.columns.some(o=>o.source==="derived")&&a.mode==="semi-auto"){const o=document.createElement("th");o.textContent="✓",o.setAttribute("aria-label","Проверить"),r.appendChild(o)}d.appendChild(r),l.appendChild(d);const c=document.createElement("tbody");c.className="lab-journal-body";for(const o of t){const u=X(e,o,a);c.appendChild(u)}if(l.appendChild(c),i.appendChild(l),n?.row&&n?.key)try{const o=i.querySelector(`input[data-row="${n.row}"][data-key="${n.key}"]`);o&&typeof o.focus=="function"&&(o.focus(),n.selStart!==null&&n.selEnd!==null&&o.setSelectionRange(n.selStart,n.selEnd))}catch{}}function X(i,e,t){const a=document.createElement("tr");a.dataset.rowIdx=String(e.idx),a.dataset.ts=String(e.timestamp),t.editingRowIdx===e.idx&&(a.dataset.editing="true"),t.onEdit&&a.addEventListener("dblclick",l=>{const d=l.target;d.tagName==="INPUT"||d.tagName==="BUTTON"||t.onEdit?.(e.idx)});for(const l of i.columns){const d=W(l,e,t);a.appendChild(d)}if(i.columns.some(l=>l.source==="derived")&&t.mode==="semi-auto"){const l=document.createElement("td"),d=document.createElement("button");d.type="button",d.className="j-check",d.textContent="✓",d.setAttribute("aria-label",`Проверить значения в строке ${e.idx}`),d.dataset.row=String(e.idx),d.addEventListener("click",()=>t.onVerify(e.idx)),l.appendChild(d),a.appendChild(l)}return a}function W(i,e,t){const a=document.createElement("td");a.dataset.key=i.key,a.dataset.source=i.source;const n=e.verdicts?.[i.key];n&&(a.dataset.verdict=n,t.mode==="semi-auto"&&n!=="empty"&&a.classList.add("j-verdict",`j-verdict--${n}`));const l=e.values[i.key]??null,d=t.editingRowIdx===e.idx;let r=!1;if(i.source==="meta"?r=!1:i.source==="derived"?r=t.mode!=="fully-auto":r=t.mode==="fully-manual"||d,r){const s=document.createElement("input");s.type="text",s.inputMode="decimal",s.className=`j-input j-input--${i.source}`,s.dataset.row=String(e.idx),s.dataset.key=i.key,n&&t.mode==="semi-auto"&&(s.dataset.verdict=n),s.value=l!==null?b(l,i.format):"",s.placeholder=t.mode==="fully-manual"?"":i.unit??"",s.setAttribute("aria-label",i.ariaLabel??`${i.label}${i.unit?" ("+i.unit+")":""}`),s.addEventListener("input",()=>{const c=M(s.value);t.onCellInput(e.idx,i.key,c)}),a.appendChild(s)}else a.textContent=b(l,i.format);return a}const y=9.8,p=1e3,f={experimentId:"1.1",columns:[{key:"idx",label:"№",source:"meta",format:"int"},{key:"cylinder",label:"Цилиндр",source:"meta"},{key:"m_g",label:"m, г",source:"direct",unit:"г",format:"int"},{key:"V1_ml",label:"V₁, мл",source:"direct",unit:"мл",format:"int"},{key:"V2_ml",label:"V₂, мл",source:"direct",unit:"мл",format:"int"},{key:"V_cm3",label:"V, см³",source:"derived",unit:"см³",format:"int",tolerance:.1,expectedFromRow:i=>(i.V2_ml??0)-(i.V1_ml??0)},{key:"rho_kg_m3",label:"ρ, кг/м³",source:"derived",unit:"кг/м³",format:"int",tolerance:.1,expectedFromRow:i=>{const e=(i.V2_ml??0)-(i.V1_ml??0);return e<=0?0:(i.m_g??0)/e*1e3}}]},ne={experimentId:"1.2",columns:[{key:"idx",label:"№",source:"meta",format:"int"},{key:"cylinder",label:"Цилиндр",source:"meta"},{key:"V_cm3",label:"V, см³",source:"meta",unit:"см³",format:"int"},{key:"P_air_N",label:"P возд, Н",source:"direct",unit:"Н",format:"fixed2"},{key:"P_liq_N",label:"P жид, Н",source:"direct",unit:"Н",format:"fixed2"},{key:"F_A_meas_N",label:"F_A изм, Н",source:"derived",unit:"Н",format:"fixed2",tolerance:.05,expectedFromRow:i=>(i.P_air_N??0)-(i.P_liq_N??0)},{key:"F_A_theor_N",label:"F_A теор, Н",source:"derived",unit:"Н",format:"fixed2",tolerance:.05,expectedFromRow:i=>p*y*(i.V_cm3??0)*1e-6},{key:"delta_pct",label:"Δ, %",source:"derived",unit:"%",format:"percent",tolerance:.2,expectedFromRow:i=>{const e=(i.P_air_N??0)-(i.P_liq_N??0),t=p*y*(i.V_cm3??0)*1e-6;return Math.abs(t)<1e-9?0:(e-t)/t*100}}]},U=.05,K=.4;function Z(i,e,t){if(t===null||!Number.isFinite(t))return"empty";if(i.source!=="derived"||typeof i.expectedFromRow!="function")return"wrong";const a={};for(const[r,s]of Object.entries(e.values))typeof s=="number"&&Number.isFinite(s)&&(a[r]=s);let n;try{n=i.expectedFromRow(a)}catch{return"wrong"}if(!Number.isFinite(n))return"wrong";const l=i.tolerance??U;if(Math.abs(n)<1e-9){const r=l*.001;return Math.abs(t)<=r?"ok":"wrong"}const d=Math.abs(t-n)/Math.abs(n);return d<=l*K?"ok":d<=l?"close":"wrong"}function G(i,e){const t={};for(const a of i){if(a.source!=="derived")continue;const n=e.values[a.key],l=typeof n=="number"?n:null;t[a.key]=Z(a,e,l)}return t}function J(i){const e=Object.values(i);return e.length===0?"empty":e.every(t=>t==="ok")?"ok":e.some(t=>t==="wrong")?"wrong":e.some(t=>t==="empty")?"empty":"close"}const v="kit-1",_={balanceOnStage:!1,cylinderOnStage:!1,selectedCylId:null,onBalanceId:null,inCylinderId:null,level_ml:0,submerged_ml:0,measurements:[],panelExpanded:!0,pendingMeasurement:null};function C(i){return!i.balanceOnStage||!i.cylinderOnStage?1:i.level_ml===0?2:i.onBalanceId?i.inCylinderId?5:4:3}const Q={1:"Перетащите весы и мензурку с правой панели на стол.",2:"Перетащите стакан с водой на мензурку — налейте воду (V₁).",3:"Перетащите цилиндр на весы — измерьте массу m.",4:"Перетащите цилиндр в мензурку — определите V₂ по подъёму уровня.",5:"Запись добавлена в журнал. Возьмите другой цилиндр или сбросьте опыт."};class ee{#e;#t;#a=null;#o;constructor(e){this.#e=e,this.#t=new V({..._});for(const t of e.equipmentCards)t.addEventListener("click",this.#y);e.stageBalance.addEventListener("balance-tap",this.#p),e.stageCylinder.addEventListener("cylinder-tap",this.#f),e.resetBtn.addEventListener("click",this.#v),e.measurementToggle.addEventListener("click",this.#_),e.detachBalance.addEventListener("click",this.#h),e.detachCylinder.addEventListener("click",this.#c),e.detachWeight.addEventListener("click",this.#u),e.detachSubmerged.addEventListener("click",this.#g),this.#o=new N(e.rootHost,this.#w),H(),j(),this.#s=P(e.recordModeSlot,{kitId:v,onChange:t=>this.#m(t)}),e.recordPendingBtn.addEventListener("click",this.#l),this.#a=this.#t.subscribe(t=>this.#b(t)),this.#b(this.#t.get())}#s=null;#i=new Map;#r=new Map;#m=e=>{const t=this.#t.get();if(e==="fully-auto"&&t.pendingMeasurement)this.#S();else if(e==="fully-manual"&&t.pendingMeasurement){const a=m.get(t.pendingMeasurement.cylId);a&&this.#I(a),this.#t.set({pendingMeasurement:null})}this.#b(this.#t.get())};#l=()=>{this.#S()};destroy(){this.#a?.(),this.#a=null,this.#o.destroy(),this.#s?.(),this.#s=null;for(const e of this.#e.equipmentCards)e.removeEventListener("click",this.#y);this.#e.stageBalance.removeEventListener("balance-tap",this.#p),this.#e.stageCylinder.removeEventListener("cylinder-tap",this.#f),this.#e.resetBtn.removeEventListener("click",this.#v),this.#e.measurementToggle.removeEventListener("click",this.#_),this.#e.detachBalance.removeEventListener("click",this.#h),this.#e.detachCylinder.removeEventListener("click",this.#c),this.#e.detachWeight.removeEventListener("click",this.#u),this.#e.detachSubmerged.removeEventListener("click",this.#g),this.#e.recordPendingBtn.removeEventListener("click",this.#l)}#h=()=>{this.#t.set({balanceOnStage:!1,onBalanceId:null}),this.#n("Весы убраны со стола.")};#c=()=>{this.#t.set({cylinderOnStage:!1,level_ml:0,submerged_ml:0,inCylinderId:null,pendingMeasurement:null}),this.#n("Мензурка убрана со стола.")};#u=()=>{const e=this.#t.get();if(e.onBalanceId){if(e.inCylinderId===e.onBalanceId){this.#n("Сначала выньте цилиндр из мензурки.");return}this.#t.set({onBalanceId:null}),this.#n("Цилиндр снят с весов.")}};#g=()=>{const e=this.#t.get();if(!e.inCylinderId)return;const t=e.pendingMeasurement&&e.pendingMeasurement.cylId===e.inCylinderId;this.#t.set({inCylinderId:null,submerged_ml:0,...t?{pendingMeasurement:null}:{}}),this.#n("Цилиндр вынут из мензурки.")};saveState(){const e=this.#t.get();return!e.balanceOnStage&&!e.cylinderOnStage&&!e.selectedCylId&&!e.onBalanceId&&!e.inCylinderId&&e.level_ml===0&&e.submerged_ml===0&&e.measurements.length===0?null:e}loadState(e){if(!e||typeof e!="object")return;const t=e,a=t.pendingMeasurement&&typeof t.pendingMeasurement=="object"&&typeof t.pendingMeasurement.cylId=="string"&&typeof t.pendingMeasurement.V1_ml=="number"?t.pendingMeasurement:null;this.#t.set({balanceOnStage:typeof t.balanceOnStage=="boolean"?t.balanceOnStage:!1,cylinderOnStage:typeof t.cylinderOnStage=="boolean"?t.cylinderOnStage:!1,selectedCylId:typeof t.selectedCylId=="string"?t.selectedCylId:null,onBalanceId:typeof t.onBalanceId=="string"?t.onBalanceId:null,inCylinderId:typeof t.inCylinderId=="string"?t.inCylinderId:null,level_ml:typeof t.level_ml=="number"?t.level_ml:0,submerged_ml:typeof t.submerged_ml=="number"?t.submerged_ml:0,measurements:Array.isArray(t.measurements)?t.measurements:[],panelExpanded:typeof t.panelExpanded=="boolean"?t.panelExpanded:!0,pendingMeasurement:a})}reset(){this.#t.set({..._}),this.#i.clear(),this.#r.clear(),this.#n("Опыт сброшен. Возьмите весы и мензурку.")}#y=e=>{const a=e.currentTarget.getAttribute("data-eq")??"",n=this.#t.get();if(a==="balance"){n.balanceOnStage||(this.#t.set({balanceOnStage:!0}),this.#n("Электронные весы поставлены на стол."));return}if(a==="cylinder"){n.cylinderOnStage||(this.#t.set({cylinderOnStage:!0}),this.#n("Мензурка поставлена на стол."));return}const l=/^cyl-(\d+)$/.exec(a);if(l){const s=l[1];if(n.onBalanceId===s||n.inCylinderId===s)return;if(!n.balanceOnStage||!n.cylinderOnStage){this.#n("Сначала поставьте весы и мензурку.");return}const c=n.selectedCylId===s?null:s;if(this.#t.set({selectedCylId:c}),c){const o=m.get(c);this.#n(`Выбран ${o?.label??`цилиндр № ${c}`}.`)}return}const r={"dyno-1":"Динамометр 1 Н — для опыта 1.3 «Архимедова сила»: измерять вес тела в воздухе и в воде.","dyno-5":"Динамометр 5 Н — для опыта 1.3 «Архимедова сила» с тяжёлыми цилиндрами.",beaker:"Стакан с водой — перетащите на мензурку, чтобы налить ≈100 мл (V₁).",thread:"Нить (1 м) — пригодится в опыте 1.3 «Архимедова сила»: подвешивать цилиндр на крючок динамометра, опускать в воду.",salt:"Соль и палочка — для опыта 1.5 «Плавание тел в жидкостях разной плотности»: размешивать соль в воде, чтобы поменять плотность."}[a];r&&this.#n(r)};#p=()=>{const e=this.#t.get();if(e.onBalanceId){e.inCylinderId!==e.onBalanceId&&(this.#t.set({onBalanceId:null}),this.#n("Цилиндр снят с весов."));return}if(!e.selectedCylId){this.#n("Сначала выберите цилиндр в правой панели.");return}this.#t.set({onBalanceId:e.selectedCylId,selectedCylId:null});const t=m.get(e.selectedCylId);t&&this.#n(`${t.label} на весах. Масса ${t.mass_g} г.`)};#f=()=>{const e=this.#t.get();if(e.level_ml===0){this.#n("Перетащите стакан с водой на мензурку, чтобы налить.");return}const t=e.level_ml+e.submerged_ml;this.#n(`Уровень в мензурке ${t.toFixed(0)} мл.`)};#v=()=>{this.reset()};#_=()=>{this.#t.set({panelExpanded:!this.#t.get().panelExpanded})};#w=e=>{const{eqId:t,dropzoneId:a}=e,n=this.#t.get();if(t==="balance"&&a==="balance"){n.balanceOnStage||(this.#t.set({balanceOnStage:!0}),this.#n("Весы поставлены на стол."));return}if(t==="cylinder"&&a==="cylinder"){n.cylinderOnStage||(this.#t.set({cylinderOnStage:!0}),this.#n("Мензурка поставлена на стол."));return}if(a==="card-balance"&&t==="balance"){n.balanceOnStage&&(this.#t.set({balanceOnStage:!1,onBalanceId:null}),this.#n("Весы возвращены в комплект."));return}if(a==="card-cylinder"&&t==="cylinder"){n.cylinderOnStage&&(this.#t.set({cylinderOnStage:!1,inCylinderId:null,level_ml:0,submerged_ml:0}),this.#n("Мензурка возвращена в комплект — вода вылита."));return}const l=/^card-cyl-(\d+)$/.exec(a);if(l){const r=l[1],s=/^cyl-(\d+)$/.exec(t);if(!s||s[1]!==r){this.#n("Положи цилиндр в его собственную ячейку комплекта.");return}const c={};n.onBalanceId===r&&(c.onBalanceId=null),n.inCylinderId===r&&(c.inCylinderId=null,c.submerged_ml=0),n.selectedCylId===r&&(c.selectedCylId=null),Object.keys(c).length>0&&(this.#t.set(c),this.#n(`Цилиндр № ${r} возвращён в комплект.`));return}if(t==="beaker"&&a==="cylinder"){if(!n.cylinderOnStage){this.#n("Сначала поставьте мензурку на стол.");return}const r=100,s=250,c=n.level_ml+n.submerged_ml,o=s-c;if(o<=0){this.#n("Мензурка заполнена — нельзя долить.");return}const u=Math.min(r,o);this.#t.set({level_ml:n.level_ml+u}),this.#n(`В мензурку долито ${u} мл воды. V₁ = ${(n.level_ml+u).toFixed(0)} мл.`);return}const d=/^cyl-(\d+)$/.exec(t);if(d){const r=d[1];if(a==="balance"){if(!n.balanceOnStage){this.#n("Сначала поставьте весы на стол.");return}const s=m.get(r),c=n.inCylinderId===r;if(n.onBalanceId===r){c&&(this.#t.set({inCylinderId:null,submerged_ml:0}),s&&this.#n(`${s.label} вынут из мензурки. На весах.`));return}if(n.onBalanceId){this.#n("Снимите предыдущий цилиндр с весов.");return}this.#t.set({onBalanceId:r,selectedCylId:null,...c?{inCylinderId:null,submerged_ml:0}:{}}),s&&this.#n(c?`${s.label} вынут из мензурки и поставлен на весы. Масса ${s.mass_g} г.`:`${s.label} на весах. Масса ${s.mass_g} г.`);return}if(n.inCylinderId===r)return;if(a==="cylinder"){if(!n.cylinderOnStage){this.#n("Сначала поставьте мензурку на стол.");return}if(n.inCylinderId&&n.inCylinderId!==r){this.#n("Сначала выньте предыдущий цилиндр из мензурки.");return}const s=m.get(r);if(!s)return;if(n.onBalanceId===r){const c=this.#d();c==="fully-manual"?(this.#t.set({inCylinderId:r,submerged_ml:s.volume_cm3}),this.#I(s)):c==="semi-auto"?this.#t.set({inCylinderId:r,submerged_ml:s.volume_cm3,pendingMeasurement:{cylId:s.id,V1_ml:n.level_ml}}):(this.#t.set({inCylinderId:r,submerged_ml:s.volume_cm3}),this.#C(s,n.level_ml)),n.level_ml===0?this.#n(`Цилиндр на дне сухой мензурки. V₁ = 0, V₂ = ${s.volume_cm3} мл. `+this.#x()):this.#n(`Цилиндр погружён. V₂ = ${(n.level_ml+s.volume_cm3).toFixed(0)} мл. `+this.#x());return}this.#t.set({inCylinderId:r,submerged_ml:s.volume_cm3}),this.#n("Цилиндр в мензурке. Чтобы получить запись в журнал, сначала измерь массу на весах: вынь и поставь на весы.");return}}};#C(e,t){const a=this.#t.get(),n=t+e.volume_cm3,l=$(e.mass_g,t,n),d={idx:a.measurements.length+1,cylinderId:e.id,cylinderLabel:e.label,m_g:e.mass_g,V1_ml:t,V2_ml:n,density:l,timestamp:Date.now()};this.#t.set({measurements:[...a.measurements,d],pendingMeasurement:null})}#I(e){const t=this.#t.get();if(t.measurements.some(l=>l.cylinderId===e.id&&l.m_g===0))return;const n={idx:t.measurements.length+1,cylinderId:e.id,cylinderLabel:e.label,m_g:0,V1_ml:0,V2_ml:0,density:{V_cm3:0,rho_g_cm3:0,rho_kg_m3:0,identified:null},timestamp:Date.now()};this.#t.set({measurements:[...t.measurements,n],pendingMeasurement:null})}#S(){const e=this.#t.get();if(!e.pendingMeasurement)return;const t=m.get(e.pendingMeasurement.cylId);if(!t){this.#t.set({pendingMeasurement:null});return}this.#C(t,e.pendingMeasurement.V1_ml),this.#n("Запись добавлена в журнал. Заполни V и ρ в строке и нажми ✓ чтобы проверить сам.")}#d(){return A(v)}#x(){const e=this.#d();return e==="fully-manual"?"Нажми «Записать в журнал» и заполни все поля сам.":e==="fully-auto"?"Запись в журнале — V и ρ посчитаны автоматически.":"Запись в журнале — заполни V и ρ и нажми ✓."}#b(e){this.#E(e),this.#q(e),this.#A(e),this.#M(e),this.#V(e),this.#B(e),this.#k(e),this.#O(e),this.#T(e)}#k(e){const{recordPendingSlot:t,recordPendingBtn:a,recordPendingSummary:n}=this.#e,l=this.#d(),d=e.pendingMeasurement;if(l!=="semi-auto"||!d){t.hidden=!0;return}const r=m.get(d.cylId);if(!r){t.hidden=!0;return}if(e.measurements.some(o=>o.cylinderId===r.id&&Math.abs(o.V1_ml-d.V1_ml)<.001)){t.hidden=!0;return}t.hidden=!1;const c=d.V1_ml+r.volume_cm3;n.textContent=`${r.label}: m = ${r.mass_g.toFixed(0)} г, V₁ = ${d.V1_ml.toFixed(0)} мл, V₂ = ${c.toFixed(0)} мл`,a.setAttribute("aria-label",`Записать в журнал: ${n.textContent}`)}#E(e){if(e.balanceOnStage){this.#e.slotBalance.dataset.filled="true",this.#e.slotBalance.dataset.active="false",this.#e.slotBalanceEmpty.hidden=!0,this.#e.stageBalance.hidden=!1,this.#e.slotBalanceCaption.hidden=!1;const t=!!e.onBalanceId&&!e.inCylinderId;if(this.#e.detachBalance.hidden=t,this.#e.detachWeight.hidden=!t,this.#e.weightOnBalance.hidden=!t,t){const a=m.get(e.onBalanceId);a&&(this.#e.weightOnBalance.setAttribute("material",a.material),this.#e.weightOnBalance.setAttribute("id-num",a.id),this.#e.weightOnBalance.setAttribute("data-draggable",`cyl-${a.id}`))}else this.#e.weightOnBalance.removeAttribute("data-draggable")}else delete this.#e.slotBalance.dataset.filled,this.#e.slotBalance.dataset.active="true",this.#e.slotBalanceEmpty.hidden=!1,this.#e.stageBalance.hidden=!0,this.#e.slotBalanceCaption.hidden=!0,this.#e.detachBalance.hidden=!0,this.#e.detachWeight.hidden=!0,this.#e.weightOnBalance.hidden=!0;if(e.cylinderOnStage){this.#e.slotCylinder.dataset.filled="true",this.#e.slotCylinder.dataset.active="false",this.#e.slotCylinderEmpty.hidden=!0,this.#e.stageCylinder.hidden=!1,this.#e.slotCylinderCaption.hidden=!1;const t=!!e.inCylinderId;if(this.#e.detachCylinder.hidden=t,this.#e.detachSubmerged.hidden=!t,this.#e.weightInCylinder.hidden=!t,t){const a=m.get(e.inCylinderId);a&&(this.#e.weightInCylinder.setAttribute("material",a.material),this.#e.weightInCylinder.setAttribute("id-num",a.id),this.#e.weightInCylinder.setAttribute("data-draggable",`cyl-${a.id}`))}else this.#e.weightInCylinder.removeAttribute("data-draggable")}else delete this.#e.slotCylinder.dataset.filled,this.#e.slotCylinder.dataset.active=e.balanceOnStage?"true":"false",this.#e.slotCylinderEmpty.hidden=!1,this.#e.stageCylinder.hidden=!0,this.#e.slotCylinderCaption.hidden=!0,this.#e.detachCylinder.hidden=!0,this.#e.detachSubmerged.hidden=!0,this.#e.weightInCylinder.hidden=!0}#q(e){const t=(a,n)=>{a.setAttribute("status",n?"placed":"available");const l=a.getAttribute("data-eq")??"";n?a.removeAttribute("data-draggable"):a.setAttribute("data-draggable",l)};for(const a of this.#e.equipmentCards){const n=a.getAttribute("data-eq")??"";if(n==="balance"){t(a,e.balanceOnStage);continue}if(n==="cylinder"){t(a,e.cylinderOnStage);continue}const l=/^cyl-(\d+)$/.exec(n);if(l){const d=l[1],r=e.onBalanceId===d||e.inCylinderId===d,s=e.selectedCylId===d;t(a,r),a.toggleAttribute("selected",s);continue}a.setAttribute("status","available")}for(const a of this.#e.weightsInCards){const n=a.getAttribute("id-num")??"";a.toggleAttribute("selected",e.selectedCylId===n),a.toggleAttribute("attached",e.onBalanceId===n||e.inCylinderId===n)}}#A(e){if(e.onBalanceId&&!e.inCylinderId){const n=m.get(e.onBalanceId);this.#e.stageBalance.setAttribute("mass-g",n?String(n.mass_g):"0")}else this.#e.stageBalance.setAttribute("mass-g","0");this.#e.stageBalance.toggleAttribute("active",e.balanceOnStage&&!!e.selectedCylId&&!e.onBalanceId),this.#e.stageCylinder.setAttribute("level",String(e.level_ml)),this.#e.stageCylinder.setAttribute("submerged",String(e.submerged_ml));const a=e.cylinderOnStage&&(e.level_ml===0&&!e.onBalanceId||!!e.onBalanceId&&e.level_ml>0&&!e.inCylinderId);this.#e.stageCylinder.toggleAttribute("active",a)}#M(e){const t=C(e);this.#e.steps.querySelectorAll(".step").forEach(n=>{const l=parseInt(n.dataset.step??"0",10);l<t?n.dataset.state="done":l===t?n.dataset.state="active":delete n.dataset.state})}#V(e){this.#e.hintBar.textContent=Q[C(e)]}#B(e){const t=this.#e.measurementPanel,a=e.panelExpanded;t.setAttribute("aria-collapsed",a?"false":"true"),this.#e.measurementToggle.setAttribute("aria-expanded",a?"true":"false"),this.#e.measurementBody.hidden=!a,e.measurements.length>0?(t.dataset.state="has-data",this.#e.measurementCount.textContent=String(e.measurements.length),this.#e.measurementCount.hidden=!1):(t.dataset.state="empty",this.#e.measurementCount.hidden=!0)}#O(e){const{journalEmpty:t,journalHost:a,formulaDisplay:n}=this.#e,l=this.#L(e.measurements),d=this.#d(),r=e.balanceOnStage||e.cylinderOnStage||e.level_ml>0;if(d==="fully-manual"&&l.length===0&&r){const o=this.#i.get(-1)??{};l.push({idx:1,timestamp:-1,values:{idx:1,cylinder:o.cylinder??"",m_g:o.m_g??null,V1_ml:o.V1_ml??null,V2_ml:o.V2_ml??null,V_cm3:o.V_cm3??null,rho_kg_m3:o.rho_kg_m3??null},verdicts:{}})}const c=l.length===0;t.hidden=!c,a.hidden=c,n.hidden=c,Y(a,f,l,{mode:d,onCellInput:(o,u,h)=>this.#R(o,u,h),onVerify:o=>this.#$(o)})}#L(e){return e.map(t=>{const a=this.#i.get(t.idx)??{};return{idx:t.idx,timestamp:t.timestamp??t.idx,values:{idx:t.idx,cylinder:t.cylinderLabel,m_g:t.m_g,V1_ml:t.V1_ml,V2_ml:t.V2_ml,V_cm3:this.#d()==="fully-auto"?t.V2_ml-t.V1_ml:a.V_cm3??null,rho_kg_m3:this.#d()==="fully-auto"?t.density.rho_kg_m3:a.rho_kg_m3??null},verdicts:this.#r.get(t.idx)??{}}})}#R(e,t,a){const d=this.#t.get().measurements.some(c=>c.idx===e)?e:-1,r=this.#i.get(d)??{};a===null?delete r[t]:r[t]=a,this.#i.set(d,r);const s=this.#r.get(d);if(s&&t in s){const c={...s};delete c[t],this.#r.set(d,c)}}#$(e){const t=this.#t.get().measurements.find(s=>s.idx===e);if(!t)return;const a={...this.#i.get(e)??{}},n=this.#e.journalHost.querySelector(`tr[data-row-idx="${e}"]`);n&&n.querySelectorAll("input[data-key]").forEach(c=>{const o=c.dataset.key;if(!o)return;const u=M(c.value);u!==null&&(a[o]=u)}),this.#i.set(e,a);const l={idx:t.idx,timestamp:t.timestamp??t.idx,values:{m_g:t.m_g,V1_ml:t.V1_ml,V2_ml:t.V2_ml,V_cm3:a.V_cm3??null,rho_kg_m3:a.rho_kg_m3??null}},d=G(f.columns,l);if(this.#r.set(e,d),n)for(const[s,c]of Object.entries(d)){const o=n.querySelector(`td[data-key="${s}"]`);if(!o)continue;o.classList.remove("j-verdict","j-verdict--ok","j-verdict--close","j-verdict--wrong","j-verdict--empty"),o.dataset.verdict=c,c!=="empty"&&o.classList.add("j-verdict",`j-verdict--${c}`);const u=o.querySelector("input[data-key]");u&&(u.dataset.verdict=c)}const r=J(d);if(r==="ok")this.#e.resultPanel.dataset.hint="ok",this.#e.resultPanel.querySelector(".density-result-hint")?.remove(),this.#n(`${t.cylinderLabel}: V и ρ верны.`);else if(r==="empty")this.#n("Заполни V и ρ перед проверкой.");else{const c=Object.entries(d).filter(([,h])=>h==="wrong"||h==="close").map(([h])=>h==="V_cm3"?"V":"ρ").join(" и ")||"V и ρ";this.#e.resultPanel.dataset.hint="wrong",this.#e.resultPanel.querySelector(".density-result-hint")?.remove();const u=document.createElement("div");u.className="density-result-hint density-result-hint--wrong",u.innerHTML=`Перепроверь <strong>${c}</strong>. Подсказка: <em>V</em> = <em>V</em><sub>2</sub> − <em>V</em><sub>1</sub>; <em>ρ</em> = <em>m</em>/<em>V</em>; <em>ρ</em> в кг/м³ = (<em>ρ</em> в г/см³)·1000.`,this.#e.resultPanel.appendChild(u)}}#T(e){const{resultPanel:t}=this.#e;if(e.measurements.length===0){t.hidden=!0,t.replaceChildren();return}t.hidden=!1,t.innerHTML=`
      <div class="density-result-conclusion">
        Запиши в журнал собственные значения <em>V</em> = <em>V</em><sub>2</sub> − <em>V</em><sub>1</sub>
        и <em>ρ</em> = <em>m</em>/<em>V</em>.
        Затем сравни <em>ρ</em> со справочником плотностей и сделай вывод о материале цилиндра.
        Кнопка <span class="accent">«Проверить»</span> подскажет, верно ли посчитано.
      </div>
    `}#n(e){this.#e.liveRegion&&(this.#e.liveRegion.textContent=e)}}const te=`<main class="app-main-v3">
  <section class="workbench" aria-label="Рабочая зона">
    <header class="workbench-header">
      <ol class="steps" id="steps" aria-label="Этапы измерения">
        <li class="step" data-step="1">
          <span class="step-num">1</span>
          <span class="step-label">Соберите установку</span>
        </li>
        <li class="step" data-step="2">
          <span class="step-num">2</span>
          <span class="step-label">Налейте воду в мензурку</span>
        </li>
        <li class="step" data-step="3">
          <span class="step-num">3</span>
          <span class="step-label">Измерьте <em>m</em> на весах</span>
        </li>
        <li class="step" data-step="4">
          <span class="step-num">4</span>
          <span class="step-label">Опустите в мензурку → <em>V</em><sub>2</sub></span>
        </li>
        <li class="step" data-step="5">
          <span class="step-num">5</span>
          <span class="step-label">В журнал</span>
        </li>
      </ol>
      <div class="workbench-hint" id="hint-bar">
        Перетащите весы и мензурку с правой панели на стол.
      </div>
      <span class="sr-only" id="kit-1-instruction">
        Определите плотность четырёх цилиндров: измерьте массу на весах
        и объём по вытесненной воде в мензурке.
      </span>
      <button id="reset-btn" class="reset-btn" type="button" aria-label="Сбросить опыт" title="Сбросить опыт">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4">
          <path d="M3 12a9 9 0 1 0 9-9 9.74 9.74 0 0 0-7 3l-2 2"/>
          <path d="M3 4v5h5"/>
        </svg>
      </button>
    </header>

    <div class="workbench-stage" id="stage">
      <span class="stage-corner stage-corner--tl" aria-hidden="true"></span>
      <span class="stage-corner stage-corner--tr" aria-hidden="true"></span>
      <span class="stage-corner stage-corner--bl" aria-hidden="true"></span>
      <span class="stage-corner stage-corner--br" aria-hidden="true"></span>

      <div class="density-stage-content">
        <div
          class="density-slot"
          id="slot-balance"
          data-dropzone="balance,cyl-*"
          data-dropzone-id="balance"
          data-drop-active="false"
          data-drop-hover="false"
        >
          <div class="density-slot-empty" id="slot-balance-empty">
            <div class="density-slot-empty-inner">
              <svg viewBox="0 0 64 40" width="64" height="40" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path d="M8 28 L56 28" stroke-dasharray="3 3" />
                <path d="M14 24 L20 28 L14 32" />
                <path d="M50 24 L44 28 L50 32" />
                <text x="32" y="18" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">Весы</text>
              </svg>
            </div>
          </div>
          <lab-balance id="balance" mass-g="0" data-draggable="balance" hidden></lab-balance>
          <lab-metal-weight
            id="weight-on-balance"
            class="density-overlay-weight density-overlay-weight--balance"
            material="steel"
            id-num="1"
            no-legend
            hidden
          ></lab-metal-weight>
          <button
            class="density-detach-btn lab-detach-btn"
            id="detach-balance"
            type="button"
            aria-label="Убрать весы со стола"
            title="Убрать весы со стола"
            hidden
          >×</button>
          <button
            class="density-detach-btn lab-detach-btn density-detach-btn--inner"
            id="detach-weight"
            type="button"
            aria-label="Снять цилиндр с весов"
            title="Снять цилиндр с весов"
            hidden
          >×</button>
          <span class="density-slot-caption" id="slot-balance-caption" hidden>Весы (200 г, 0.1 г)</span>
        </div>

        <div
          class="density-slot"
          id="slot-cylinder"
          data-dropzone="cylinder,cyl-*,beaker"
          data-dropzone-id="cylinder"
          data-drop-active="false"
          data-drop-hover="false"
        >
          <div class="density-slot-empty" id="slot-cylinder-empty">
            <div class="density-slot-empty-inner">
              <svg viewBox="0 0 64 40" width="64" height="40" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path d="M8 28 L56 28" stroke-dasharray="3 3" />
                <path d="M14 24 L20 28 L14 32" />
                <path d="M50 24 L44 28 L50 32" />
                <text x="32" y="18" font-size="9" fill="currentColor" stroke="none" text-anchor="middle">Мензурка</text>
              </svg>
            </div>
          </div>
          <lab-graduated-cylinder id="cylinder" level="0" submerged="0" data-draggable="cylinder" hidden></lab-graduated-cylinder>
          <lab-metal-weight
            id="weight-in-cylinder"
            class="density-overlay-weight density-overlay-weight--cylinder"
            material="steel"
            id-num="1"
            no-legend
            hidden
          ></lab-metal-weight>
          <button
            class="density-detach-btn lab-detach-btn"
            id="detach-cylinder"
            type="button"
            aria-label="Убрать мензурку со стола"
            title="Убрать мензурку со стола"
            hidden
          >×</button>
          <button
            class="density-detach-btn lab-detach-btn density-detach-btn--inner"
            id="detach-submerged"
            type="button"
            aria-label="Вынуть цилиндр из мензурки"
            title="Вынуть цилиндр из мензурки"
            hidden
          >×</button>
          <span class="density-slot-caption" id="slot-cylinder-caption" hidden>Мензурка 250 мл (С = 2 мл)</span>
        </div>
      </div>

      <aside
        id="measurement-panel"
        class="measurement-panel"
        data-state="empty"
        aria-label="Панель измерений"
      >
        <header class="measurement-panel-header">
          <button
            id="measurement-toggle"
            class="measurement-toggle"
            type="button"
            aria-expanded="true"
            aria-controls="measurement-body"
          >
            <svg class="chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span class="measurement-title">Журнал измерений</span>
            <span id="measurement-count" class="measurement-count" hidden>0</span>
          </button>
          <!-- §20.4 REFERENCE.md — toggle режима записи. По умолчанию manual.
               Шаблон оставляет место — toggle инжектируется JS-ом
               (\`renderRecordModeToggle\` из @shared/lib/record-mode). -->
          <div id="record-mode-slot" class="record-mode-slot"></div>
        </header>

        <div id="measurement-body" class="measurement-body">
          <div class="journal-empty" id="journal-empty">
            Перетащите цилиндр на весы → налейте воду → опустите в мензурку.
            Затем нажмите «Записать в журнал», когда показания готовы.
          </div>

          <!-- §20.4 — кнопка «Записать в журнал» появляется когда
               pendingMeasurement готов и режим = manual. В auto-режиме
               пишется автоматически и эта кнопка скрыта. -->
          <div id="record-pending-slot" class="record-pending-slot" hidden>
            <button
              id="record-pending-btn"
              type="button"
              class="record-pending-btn"
              aria-label="Записать текущее измерение в журнал"
            >
              <span class="record-icon" aria-hidden="true">✏</span>
              <span class="record-text">Записать в журнал</span>
              <span id="record-pending-summary" class="record-summary"></span>
            </button>
          </div>

          <div class="formula-display" id="formula-display" hidden>
            <span class="formula-label">Формула:</span>
            <span class="formula-expr">
              <em>V</em> = <em>V</em><sub>2</sub> − <em>V</em><sub>1</sub>,
              <em>ρ</em> = <em>m</em> / <em>V</em>
            </span>
            <span class="formula-units">m — в граммах, V — в см³, ρ — в г/см³ (×1000 → кг/м³)</span>
          </div>

          <!-- §21: shared \`renderJournalTable\` инжектит сюда полную <table>
               (thead + tbody) на основе DENSITY_SPEC. -->
          <div id="journal-host" class="journal-host" hidden></div>
          <div id="result-panel" class="result-panel" hidden></div>
        </div>
      </aside>
    </div>
  </section>

  <aside class="equipment-panel" aria-label="Оборудование комплекта №1 ФИПИ">
    <section class="equipment-group">
      <h3 class="equipment-group-title">Измерительные приборы</h3>
      <div class="equipment-grid equipment-grid-2">
        <lab-equipment-card
          title="Весы 200 г · 0.1 г"
          status="available"
          data-eq="balance"
          data-draggable="balance"
          data-dropzone="balance"
          data-dropzone-id="card-balance"
        >
          <lab-balance mass-g="0"></lab-balance>
        </lab-equipment-card>
        <lab-equipment-card
          title="Мензурка 250 мл"
          status="available"
          data-eq="cylinder"
          data-draggable="cylinder"
          data-dropzone="cylinder"
          data-dropzone-id="card-cylinder"
        >
          <lab-graduated-cylinder level="0" submerged="0"></lab-graduated-cylinder>
        </lab-equipment-card>
        <lab-equipment-card title="Динамометр 1 Н" status="available" data-eq="dyno-1">
          <lab-dynamometer range="1" force="0"></lab-dynamometer>
        </lab-equipment-card>
        <lab-equipment-card title="Динамометр 5 Н" status="available" data-eq="dyno-5">
          <lab-dynamometer range="5" force="0"></lab-dynamometer>
        </lab-equipment-card>
      </div>
    </section>

    <section class="equipment-group">
      <h3 class="equipment-group-title">Цилиндры</h3>
      <p class="equipment-group-hint">
        Четыре цилиндра из разных материалов. Определите плотность каждого и узнайте материал.
      </p>
      <div class="equipment-grid equipment-grid-4">
        <lab-equipment-card title="Цилиндр № 1" status="available" data-eq="cyl-1" data-draggable="cyl-1" data-dropzone="cyl-1" data-dropzone-id="card-cyl-1">
          <lab-metal-weight material="steel" id-num="1"></lab-metal-weight>
        </lab-equipment-card>
        <lab-equipment-card title="Цилиндр № 2" status="available" data-eq="cyl-2" data-draggable="cyl-2" data-dropzone="cyl-2" data-dropzone-id="card-cyl-2">
          <lab-metal-weight material="aluminum" id-num="2"></lab-metal-weight>
        </lab-equipment-card>
        <lab-equipment-card title="Цилиндр № 3" status="available" data-eq="cyl-3" data-draggable="cyl-3" data-dropzone="cyl-3" data-dropzone-id="card-cyl-3">
          <lab-metal-weight material="plastic" id-num="3"></lab-metal-weight>
        </lab-equipment-card>
        <lab-equipment-card title="Цилиндр № 4" status="available" data-eq="cyl-4" data-draggable="cyl-4" data-dropzone="cyl-4" data-dropzone-id="card-cyl-4">
          <lab-metal-weight material="aluminum" id-num="4"></lab-metal-weight>
        </lab-equipment-card>
      </div>
    </section>

    <section class="equipment-group">
      <h3 class="equipment-group-title">Расходные</h3>
      <div class="equipment-grid equipment-grid-3">
        <lab-equipment-card title="Стакан с водой" status="available" data-eq="beaker" data-draggable="beaker">
          <lab-beaker level="100"></lab-beaker>
        </lab-equipment-card>
        <lab-equipment-card
          title="Нить 1 м"
          status="available"
          data-eq="thread"
          data-future-experiment="1.3"
          data-future-hint="Подвешивать цилиндр на динамометр для измерения архимедовой силы (опыт 1.3)."
        >
          <lab-thread></lab-thread>
        </lab-equipment-card>
        <lab-equipment-card
          title="Соль · палочка"
          status="available"
          data-eq="salt"
          data-future-experiment="1.5"
          data-future-hint="Делать солёный раствор и менять плотность воды (опыт 1.5 — плавание тел)."
        >
          <lab-salt-set></lab-salt-set>
        </lab-equipment-card>
      </div>
    </section>
  </aside>
</main>
<div id="live-region" role="status" aria-live="polite" aria-atomic="true" class="sr-only"></div>
`;class ae{meta={id:"density-solid",label:"Плотность тела",kicker:"Опыт 1.1",icon:"density",tooltip:"Измерение плотности твёрдого тела по массе и вытесненному объёму"};#e=null;#t=null;mount(e){if(this.#e===e)return;this.#e=e,e.innerHTML=te;const t=e.querySelector("#slot-balance"),a=e.querySelector("#slot-cylinder"),n={rootHost:e,steps:e.querySelector("#steps"),hintBar:e.querySelector("#hint-bar"),resetBtn:e.querySelector("#reset-btn"),equipmentCards:Array.from(e.querySelectorAll("lab-equipment-card[data-eq]")),cylinderCards:Array.from(e.querySelectorAll('lab-equipment-card[data-eq^="cyl-"]')),weightsInCards:Array.from(e.querySelectorAll('lab-equipment-card[data-eq^="cyl-"] lab-metal-weight')),slotBalance:t,slotBalanceEmpty:e.querySelector("#slot-balance-empty"),slotBalanceCaption:e.querySelector("#slot-balance-caption"),stageBalance:e.querySelector("#balance"),detachBalance:e.querySelector("#detach-balance"),detachWeight:e.querySelector("#detach-weight"),weightOnBalance:e.querySelector("#weight-on-balance"),slotCylinder:a,slotCylinderEmpty:e.querySelector("#slot-cylinder-empty"),slotCylinderCaption:e.querySelector("#slot-cylinder-caption"),stageCylinder:e.querySelector("#cylinder"),detachCylinder:e.querySelector("#detach-cylinder"),detachSubmerged:e.querySelector("#detach-submerged"),weightInCylinder:e.querySelector("#weight-in-cylinder"),measurementPanel:e.querySelector("#measurement-panel"),measurementToggle:e.querySelector("#measurement-toggle"),measurementBody:e.querySelector("#measurement-body"),measurementCount:e.querySelector("#measurement-count"),journalEmpty:e.querySelector("#journal-empty"),journalHost:e.querySelector("#journal-host"),formulaDisplay:e.querySelector("#formula-display"),resultPanel:e.querySelector("#result-panel"),liveRegion:e.querySelector("#live-region"),recordModeSlot:e.querySelector("#record-mode-slot"),recordPendingSlot:e.querySelector("#record-pending-slot"),recordPendingBtn:e.querySelector("#record-pending-btn"),recordPendingSummary:e.querySelector("#record-pending-summary")};this.#t=new ee(n)}unmount(){this.#t?.destroy(),this.#t=null,this.#e&&(this.#e.replaceChildren(),this.#e=null)}saveState(){return this.#t?.saveState()}loadState(e){this.#t?.loadState(e)}reset(){this.#t?.reset()}}export{ne as A,ae as D,V as S,N as a,j as b,P as c,A as g,H as i,M as p,Y as r,G as v};
//# sourceMappingURL=screen-density-solid-BmfnwpLV.js.map
