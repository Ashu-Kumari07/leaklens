import {validateCSV,mergeRecords,detect,review,csvOutput,STATUSES} from './core.js';
const $=s=>document.querySelector(s);const KEY='leaklens-demo-v1';let state={records:[],findings:[],lookups:[]},pending=null;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&Array.isArray(saved.records)&&Array.isArray(saved.findings)&&Array.isArray(saved.lookups))state=saved;}catch{}
const money=(c,cur)=>new Intl.NumberFormat('en',{style:'currency',currency:cur}).format(c/100);
function el(tag,txt,cls){const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n;}
function message(t){$('#message').textContent=t;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{message('Browser storage is full/unavailable. Export your findings before closing.');}}
function download(name,body,type='text/csv;charset=utf-8'){const u=URL.createObjectURL(new Blob([body],{type}));const a=el('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function table(rows){const wrap=el('div',undefined,'table-wrap'),t=el('table');rows.forEach((r,i)=>{const tr=el('tr');r.forEach(c=>tr.append(el(i?'td':'th',String(c))));t.append(tr);});wrap.append(t);return wrap;}
function render(){
 const metrics=$('#metrics');metrics.replaceChildren();const currencies=[...new Set(state.records.map(r=>r.currency))];
 const add=(title,value)=>{const d=el('div',undefined,'metric');d.append(el('span',title),el('strong',value));metrics.append(d);};
 add('Imported records',state.records.length);add('Open findings',state.findings.filter(f=>!['dismissed','resolved'].includes(f.status)).length);
 for(const cur of currencies){const fs=state.findings.filter(f=>f.currency===cur&&f.type==='possible_duplicate_payment');
  add(cur+' completed spend',money(state.records.filter(r=>r.currency===cur&&r.payment_status==='completed').reduce((a,r)=>a+r.amount_cents,0),cur));
  add(cur+' unverified duplicate exposure',money(fs.filter(f=>['new','under_investigation'].includes(f.status)).reduce((a,f)=>a+f.amount_cents,0),cur));
  add(cur+' confirmed outstanding',money(fs.filter(f=>['confirmed','resolved'].includes(f.status)).reduce((a,f)=>a+f.confirmed_cents-f.recovered_cents,0),cur));
  add(cur+' recovered (reviewer recorded)',money(fs.reduce((a,f)=>a+f.recovered_cents,0),cur));
 }
 const list=$('#finding-list');list.replaceChildren();const shown=state.findings.filter(f=>$('#filter').value==='all'||f.status===$('#filter').value);
 if(!shown.length)list.append(el('p','No findings in this view. Load the demo or import a CSV.'));
 shown.forEach(f=>{
  const box=el('article',undefined,'finding');box.append(el('span',f.status.replaceAll('_',' '),'badge'),el('h3',f.vendor+' — '+(f.type==='possible_duplicate_payment'?'Possible duplicate payment':'Recurring-cost increase')),
   el('p',(f.type==='possible_duplicate_payment'?'Potential duplicate exposure: ':'Increase per billing interval (not savings): ')+money(f.amount_cents,f.currency)),el('p',f.reason));
  const details=el('details');details.append(el('summary','Evidence & review history'));const rs=f.evidence.map(id=>state.records.find(r=>r.transaction_id===id)).filter(Boolean);
  details.append(table([['Source ID','Date','Invoice','Payment ref','Amount','Status'],...rs.map(r=>[r.transaction_id,r.transaction_date,r.invoice_number||'—',r.payment_reference||'—',money(r.amount_cents,r.currency),r.payment_status])]));
  details.append(el('p','Evidence: '+(f.type==='possible_duplicate_payment'?'Strong matching signals; human verification required.':'Moderate; seat, tax and contract context is not checked.')));
  f.history.forEach(h=>details.append(el('p',h.at+' · '+(h.status||h.action||'')+' · '+(h.note||'')+' · '+(h.reference||''))));box.append(details);
  const form=el('form'),grid=el('div',undefined,'form-grid');const inputs={};
  function field(name,label,value,type='text'){const l=el('label',label),n=el(type==='select'?'select':type==='textarea'?'textarea':'input');if(type==='select')STATUSES.forEach(s=>{const o=el('option',s.replaceAll('_',' '));o.value=s;n.append(o);});else if(type!=='textarea')n.type='text';n.value=value;n.name=name;inputs[name]=n;l.append(n);grid.append(l);}
  field('status','Review status',f.status,'select');field('reference','Evidence / refund reference','');field('confirmed','Confirmed total ('+f.currency+')',(f.confirmed_cents/100).toFixed(2));field('recovered','Recovered total ('+f.currency+')',(f.recovered_cents/100).toFixed(2));field('note','Review reason / next checks','','textarea');
  const b=el('button','Save review');form.append(grid,b);form.addEventListener('submit',e=>{e.preventDefault();try{const next=review(f,Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value])));state.findings=state.findings.map(x=>x.id===f.id?next:x);save();render();message('Review saved locally. This is not independently verified recovery evidence.');}catch(e){message(e.message);}});box.append(form);list.append(box);
 });
}
function preview(text,filename){pending=validateCSV(text);pending.filename=filename;$('#preview').replaceChildren(el('p',`${pending.total} rows checked · ${pending.valid.length} valid · ${pending.errors.length} rejected. First 5 valid rows below.`),table([['ID','Vendor','Date','Amount'],...pending.valid.slice(0,5).map(r=>[r.transaction_id,r.vendor_name,r.transaction_date,money(r.amount_cents,r.currency)])]));$('#commit').disabled=!pending.valid.length;$('#errors').disabled=!pending.errors.length;message('Preview ready. Nothing is imported until you select Import.');}
$('#file').addEventListener('change',async e=>{pending=null;$('#commit').disabled=true;$('#errors').disabled=true;$('#preview').replaceChildren();try{const f=e.target.files[0];if(!f)return;if(!/\.csv$/i.test(f.name)||f.size>10*1024*1024)throw Error('Select a CSV file up to 10 MB.');preview(await f.text(),f.name);}catch(e){message(e.message);}});
$('#demo').addEventListener('click',async()=>{try{const res=await fetch('sample_data/demo_payments.csv');if(!res.ok)throw Error('Demo fetch failed. Open through the Node server or GitHub Pages, not a file:// URL.');preview(await res.text(),'demo_payments.csv');$('#upload').scrollIntoView();}catch(e){message(e.message);}});
$('#commit').addEventListener('click',()=>{if(!pending)return;const merged=mergeRecords(state.records,pending.valid.map(r=>({...r,source_file:pending.filename,imported_at:new Date().toISOString()})));state.records=merged.records;state.findings=detect(state.records,state.findings);save();render();message(`Analysis complete. ${merged.skipped} repeated rows skipped; ${merged.conflicts.length} source-ID conflicts rejected.${merged.conflicts.length?' Conflicting IDs: '+merged.conflicts.join(', '):''}`);$('#commit').disabled=true;});
$('#errors').addEventListener('click',()=>{if(pending)download('leaklens-row-errors.csv',csvOutput([['CSV row','Error'],...pending.errors.map(e=>[e.row,e.error])]));});
$('#filter').addEventListener('change',render);
$('#export').addEventListener('click',()=>download('leaklens-findings.csv',csvOutput([['type','vendor','status','currency','flagged_amount','confirmed_total','recovered','outstanding','evidence_ids','reason'],...state.findings.map(f=>[f.type,f.vendor,f.status,f.currency,(f.amount_cents/100).toFixed(2),(f.confirmed_cents/100).toFixed(2),(f.recovered_cents/100).toFixed(2),((f.confirmed_cents-f.recovered_cents)/100).toFixed(2),f.evidence.join(';'),f.reason])])));
$('#reset').addEventListener('click',()=>{if(confirm('Delete all LeakLens demo data from this browser?')){state={records:[],findings:[],lookups:[]};pending=null;localStorage.removeItem(KEY);$('#preview').replaceChildren();$('#lookup-result').textContent='';$('#commit').disabled=true;$('#errors').disabled=true;$('#file').value='';render();message('Local demo data cleared. Downloaded files are not deleted.');}});
$('#lookup-form').addEventListener('submit',async e=>{e.preventDefault();const data=new FormData(e.target);if(!confirm('Start a real TinyFish request? It may consume account credits.'))return;const b=$('#lookup-button');b.disabled=true;$('#lookup-result').textContent='';$('#lookup-status').textContent='Research running. Please wait; do not retry automatically.';
 try{const response=await fetch('api/vendor-lookup',{method:'POST',headers:{'Content-Type':'application/json','X-LeakLens-Token':data.get('token')},body:JSON.stringify({vendor:data.get('vendor'),plan:data.get('plan'),url:data.get('url')})});let body;try{body=await response.json();}catch{throw Error('Live lookup needs the included Node backend. GitHub Pages hosts the demo only.');}if(!response.ok)throw Error(body.error||'Lookup failed.');state.lookups.push(body);save();$('#lookup-result').textContent=JSON.stringify(body,null,2);$('#lookup-status').textContent='Unverified public evidence saved locally. Compare it manually before claiming any opportunity.';
 }catch(e){$('#lookup-status').textContent=e.message+' CSV analysis remains available.';}finally{b.disabled=false;e.target.elements.token.value='';}});
if(state.lookups.length)$('#lookup-result').textContent=JSON.stringify(state.lookups.at(-1),null,2);render();
