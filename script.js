'use strict';
const $=s=>document.querySelector(s),LS=localStorage;
const J=(k,d)=>{try{return JSON.parse(LS.getItem(k))??d}catch{return d}};
const S=(k,v)=>LS.setItem(k,JSON.stringify(v));
let st=J('cb_state',null),set=J('cb_set',{extra:1,mult:1}),hist=J('cb_hist',[]),edit=null,view=st?'game':'setup';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// all scoring is in integer tenths
const sc=(b,w)=>w>=b?b*10+(w-b)*set.extra:-b*10*set.mult;
const num=t=>(t/10).toFixed(1).replace('-','−');
const fmt=t=>(t>0?'+':'')+num(t);
const cls=t=>t>0?'pos':t<0?'neg':'';
const save=()=>{S('cb_state',st);S('cb_set',set);S('cb_hist',hist)};
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2200)};
const ord=n=>n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:n%10]||'th');
function stats(){
 const P=st.players.map((n,i)=>({i,n,t:0,ok:0,bad:0,ex:0}));
 st.rounds.forEach(r=>P.forEach(p=>{const b=r.b[p.i],w=r.w[p.i];p.t+=sc(b,w);if(w>=b){p.ok++;p.ex+=w-b}else p.bad++}));
 P.forEach(p=>p.rk=1+P.filter(x=>x.t>p.t).length);return P}
function nameInputs(el,vals){el.innerHTML=vals.map((v,i)=>`<input maxlength="16" aria-label="Player ${i+1} name" value="${esc(v)}">`).join('')}
const readNames=el=>[...el.querySelectorAll('input')].map((x,i)=>x.value.trim()||'Player '+(i+1));
function show(){
 $('#setup').hidden=view!=='setup';$('#game').hidden=view!=='game';
 if(view==='setup'){nameInputs($('#names'),st?st.players:['Player 1','Player 2','Player 3','Player 4']);$('#bResume').hidden=!st}
 else render()}
function render(){
 const P=stats(),n=st.rounds.length,hasRounds=n>0,maxT=Math.max(...P.map(p=>p.t));
 $('#banner').innerHTML=st.done?'Match Completed!':`Round ${n+1}<small>${st.total?`of ${st.total}`:'unlimited rounds'}</small>`;
 $('#bAdd').hidden=st.done;
 $('#bFin').textContent=st.done?'🏆 View result':'🏁 Finish match';$('#bFin').disabled=!hasRounds;
 $('#bUndo').disabled=!hasRounds;$('#bCsv').disabled=$('#bPng').disabled=$('#bShare').disabled=$('#bReset').disabled=!hasRounds;
 $('#lb').innerHTML=[...P].sort((a,b)=>a.rk-b.rk||a.i-b.i).map(p=>{const lead=hasRounds&&p.t===maxT;
  return `<div class="pc ${lead?'lead':''}"><b>${lead?'👑 ':''}${esc(p.n)}</b>${ord(p.rk)} place<div class="big ${cls(p.t)}">${num(p.t)}</div>✔ ${p.ok} made · ✘ ${p.bad} failed<br>+${p.ex} extra tricks</div>`}).join('');
 let h=`<tr><th>Round</th>${P.map(p=>`<th class="${hasRounds&&p.t===maxT?'top':''}">${hasRounds&&p.t===maxT?'👑 ':''}${esc(p.n)}</th>`).join('')}</tr>`;
 st.rounds.forEach((r,k)=>{h+=`<tr><td>${k+1}<button data-e="${k}" title="Edit round">✎</button><button data-d="${k}" title="Delete round">🗑</button></td>${P.map(p=>{const s=sc(r.b[p.i],r.w[p.i]);return `<td class="${cls(s)}" title="Bid ${r.b[p.i]}, won ${r.w[p.i]}">${fmt(s)}</td>`}).join('')}</tr>`});
 h+=`<tr class="tot"><td>Total</td>${P.map(p=>`<td class="${hasRounds&&p.t===maxT?'top':cls(p.t)}">${num(p.t)}</td>`).join('')}</tr>`;
 $('#tbl').innerHTML=h;save()}
// ---------- round entry
function openRound(i){
 edit=i;const r=i==null?null:st.rounds[i];
 $('#rt').textContent=i==null?`Round ${st.rounds.length+1}`:`Edit round ${i+1}`;
 $('#rbody').innerHTML=st.players.map((n,k)=>`<div class="pr"><b>${esc(n)}</b><label>Bid<input type="number" inputmode="numeric" min="1" max="13" data-b="${k}" value="${r?r.b[k]:''}"></label><label>Won<input type="number" inputmode="numeric" min="0" max="13" data-w="${k}" value="${r?r.w[k]:''}"></label></div>`).join('');
 $('#err').textContent='';sumLine();$('#dRound').showModal()}
function sumLine(){const s=[...document.querySelectorAll('[data-w]')].reduce((a,x)=>a+(+x.value||0),0);
 $('#sumLine').textContent=`Tricks won: ${s} / 13`;$('#sumLine').className='sum '+(s===13?'pos':'')}
function saveRound(){
 const b=[],w=[],e=[];
 st.players.forEach((n,k)=>{const bv=$(`[data-b="${k}"]`).value,wv=$(`[data-w="${k}"]`).value,B=Number(bv),W=Number(wv);
  if(bv===''||!Number.isInteger(B)||B<1||B>13)e.push(`${n}: bid must be a whole number from 1 to 13`);
  if(wv===''||!Number.isInteger(W)||W<0||W>13)e.push(`${n}: tricks won must be a whole number from 0 to 13`);
  b.push(B);w.push(W)});
 if(!e.length){const s=w.reduce((a,c)=>a+c,0);if(s!==13)e.push(`Tricks won add up to ${s}. They must total exactly 13.`)}
 if(e.length){$('#err').innerHTML=e.map(esc).join('<br>');return}
 const r={b,w};edit==null?st.rounds.push(r):st.rounds[edit]=r;
 st.done=st.total>0&&st.rounds.length>=st.total;
 $('#dRound').close();render();toast('Round saved');
 if(st.done&&edit==null)showDone()}
// ---------- match flow
function archive(){if(st&&st.rounds.length&&!st.arch){const P=stats();hist.unshift({d:Date.now(),n:st.rounds.length,p:P.map(x=>[x.n,x.t])});hist=hist.slice(0,50);st.arch=1;S('cb_hist',hist)}}
function start(names,total){archive();st={players:names,total,rounds:[],done:false};view='game';save();show()}
function winners(P){const m=Math.max(...P.map(p=>p.t));return P.filter(p=>p.t===m)}
function showDone(){
 const P=stats(),W=winners(P),rest=P.filter(p=>p.t<W[0].t),margin=rest.length?W[0].t-Math.max(...rest.map(p=>p.t)):0;
 $('#win').textContent=(W.length>1?'🤝 Tie: ':'👑 ')+W.map(p=>p.n).join(' & ');
 $('#margin').textContent=W.length>1?'Tied at '+num(W[0].t)+' points':`Won by ${num(margin)} points`;
 $('#final').innerHTML=[...P].sort((a,b)=>a.rk-b.rk).map(p=>`<div class="fr"><span>${ord(p.rk)} ${esc(p.n)}</span><b class="${cls(p.t)}">${num(p.t)}</b></div>`).join('');
 $('#dDone').showModal();confetti()}
function confetti(){const c=['#f5c542','#10b981','#f87171','#60a5fa','#fff'];
 for(let i=0;i<70;i++){const d=document.createElement('div');d.className='cf';
  d.style.cssText=`left:${Math.random()*100}vw;background:${c[i%5]};animation-duration:${2+Math.random()*2.5}s;animation-delay:${Math.random()*.8}s`;
  document.body.appendChild(d);setTimeout(()=>d.remove(),5500)}}
// ---------- export / share
function resultText(){const P=stats(),W=winners(P);
 return `♠ Call Break Results ♠\n`+[...P].sort((a,b)=>a.rk-b.rk).map(p=>`${ord(p.rk)} ${p.n}: ${num(p.t)}`).join('\n')+`\n🏆 ${W.map(p=>p.n).join(' & ')} ${W.length>1?'tie':'wins'} after ${st.rounds.length} rounds`}
async function share(){const text=resultText();
 try{if(navigator.share){await navigator.share({title:'Call Break Results',text});return}}catch(e){if(e.name==='AbortError')return}
 window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank')}
function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function csv(){const P=stats(),q=s=>`"${String(s).replace(/"/g,'""')}"`;
 let o=['Round',...P.map(p=>q(p.n))].join(',')+'\n';
 st.rounds.forEach((r,k)=>o+=[k+1,...P.map(p=>(sc(r.b[p.i],r.w[p.i])/10).toFixed(1))].join(',')+'\n');
 o+=['Total',...P.map(p=>(p.t/10).toFixed(1))].join(',');
 download('call-break-scorecard.csv',new Blob([o],{type:'text/csv'}))}
function png(){const P=stats(),R=st.rounds.length,cw=150,W=130+cw*4,H=110+(R+2)*46,c=document.createElement('canvas');c.width=W;c.height=H;
 const x=c.getContext('2d'),m=Math.max(...P.map(p=>p.t));
 x.fillStyle='#0a1224';x.fillRect(0,0,W,H);x.fillStyle='#f5c542';x.font='bold 26px Georgia';x.textAlign='center';x.fillText('♠ CALL BREAK SCOREBOARD ♥',W/2,42);
 const row=(y,cells,bold)=>cells.forEach((t,i)=>{x.textAlign=i?'center':'left';x.font=(bold?'bold ':'')+'20px system-ui';x.fillStyle=t.c||'#eaf0ff';x.fillText(t.s,i?130+cw*(i-1)+cw/2:20,y)});
 row(90,[{s:'Round',c:'#8fa0c4'},...P.map(p=>({s:p.n,c:p.t===m?'#f5c542':'#8fa0c4'}))],1);
 st.rounds.forEach((r,k)=>row(136+k*46,[{s:String(k+1)},...P.map(p=>{const s=sc(r.b[p.i],r.w[p.i]);return{s:fmt(s),c:s<0?'#f87171':'#34d399'}})]));
 x.fillStyle='#10b98133';x.fillRect(0,106+R*46,W,46);
 row(136+R*46,[{s:'Total'},...P.map(p=>({s:num(p.t),c:p.t===m?'#f5c542':'#eaf0ff'}))],1);
 c.toBlob(b=>download('call-break-scorecard.png',b))}
// ---------- events
document.addEventListener('click',e=>{const t=e.target;
 if(t.closest('[data-close]'))t.closest('dialog').close();
 if(t.dataset.e!==undefined)openRound(+t.dataset.e);
 if(t.dataset.d!==undefined){const k=+t.dataset.d;if(confirm(`Delete round ${k+1}? Totals will be recalculated.`)){st.rounds.splice(k,1);st.done=st.total>0&&st.rounds.length>=st.total;render()}}});
document.addEventListener('input',e=>{if(e.target.dataset.w!==undefined)sumLine()});
$('#bStart').onclick=()=>{const unl=$('#unl').checked,r=parseInt($('#rounds').value,10);
 if(!unl&&!(r>=1&&r<=99))return toast('Enter rounds from 1 to 99, or choose unlimited');
 if(st&&st.rounds.length&&!st.arch&&!confirm('Start a new match? The unfinished match will be saved to history.'))return;
 start(readNames($('#names')),unl?0:r)};
$('#bResume').onclick=()=>{view='game';show()};
$('#bAdd').onclick=()=>openRound(null);$('#bSave').onclick=saveRound;
$('#bUndo').onclick=()=>{if(st.rounds.length&&confirm('Undo the last saved round?')){st.rounds.pop();st.done=false;render()}};
$('#bNames').onclick=()=>{nameInputs($('#names2'),st.players);$('#dNames').showModal()};
$('#bSaveNames').onclick=()=>{st.players=readNames($('#names2'));$('#dNames').close();render()};
$('#bFin').onclick=()=>{if(st.done)return showDone();if(confirm('Finish the match now and crown the winner?')){st.done=true;render();showDone()}};
$('#bCsv').onclick=csv;$('#bPng').onclick=png;$('#bShare').onclick=$('#bShare2').onclick=share;
$('#bReset').onclick=()=>{if(confirm('Reset match? All rounds will be erased.')){st.rounds=[];st.done=false;st.arch=0;render()}};
const newMatch=()=>{if(st.rounds.length&&!st.arch&&!confirm('Leave this match? It will be saved to history.'))return;$('#dDone').close();archive();save();view='setup';show()};
$('#bNew').onclick=$('#bNew2').onclick=newMatch;
$('#bAgain').onclick=()=>{$('#dDone').close();start([...st.players],st.total)};
$('#bView').onclick=()=>{$('#dDone').close();scrollTo({top:0,behavior:'smooth'})};
$('#bSet').onclick=()=>{$('#sExtra').value=(set.extra/10).toFixed(1);$('#sMult').value=set.mult;$('#dSet').showModal()};
$('#bSaveSet').onclick=()=>{const v=parseFloat($('#sExtra').value);if(!(v>=0&&v<=5))return toast('Bonus must be 0 to 5');
 set={extra:Math.round(v*10),mult:+$('#sMult').value};save();$('#dSet').close();if(st&&view==='game')render();toast('Scoring rules saved')};
$('#bHist').onclick=()=>{$('#hbody').innerHTML=hist.length?hist.map(h=>{const m=Math.max(...h.p.map(x=>x[1]));
  return `<div class="hi"><b>${new Date(h.d).toLocaleString()}</b> · ${h.n} rounds<br>🏆 ${esc(h.p.filter(x=>x[1]===m).map(x=>x[0]).join(' & '))}<br>${h.p.map(x=>esc(x[0])+' '+num(x[1])).join(' · ')}</div>`}).join(''):'<p class="hint">No finished or abandoned matches yet.</p>';
 $('#dHist').showModal()};
$('#bClearH').onclick=()=>{if(confirm('Delete all match history?')){hist=[];S('cb_hist',hist);$('#hbody').innerHTML='<p class="hint">History cleared.</p>'}};
$('#unl').onchange=e=>$('#rounds').disabled=e.target.checked;
// theme
const setTheme=t=>{document.documentElement.dataset.theme=t;LS.setItem('cb_theme',t);document.querySelector('meta[name=theme-color]').content=t==='light'?'#eef3ee':'#0a1224'};
setTheme(LS.getItem('cb_theme')||'dark');
$('#bTheme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
show();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
