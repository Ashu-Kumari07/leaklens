export const STATUSES=['new','under_investigation','confirmed','dismissed','resolved'];
const REQUIRED=['transaction_id','transaction_date','vendor_name','amount','currency','payment_status'];
export const normalize=s=>String(s??'').trim().toLowerCase().replace(/[.,]/g,'').replace(/\s+/g,' ');
export function cents(value){
 const s=String(value).trim(); if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error('Amount must be non-negative with at most 2 decimal places.');
 const [a,b='']=s.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));
 if(!Number.isSafeInteger(n)||n>100000000000)throw Error('Amount exceeds prototype limit (1 billion).');return n;
}
export function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw Error('Malformed CSV quote.');quoted=true;}
  else if(c===','||c==='\n'||c==='\r'){row.push(cell);cell='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v.trim()))rows.push(row);row=[];}}
  else{if(closed)throw Error('Unexpected text after a closing quote.');cell+=c;}
 }
 if(quoted)throw Error('Unclosed CSV quote.');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
export function validateCSV(text){
 const rows=parseCSV(text);if(rows.length<2)throw Error('CSV needs a header and at least one row.');if(rows.length>10001)throw Error('Maximum 10,000 data rows.');
 const headers=rows.shift().map(h=>h.trim().toLowerCase());if(new Set(headers).size!==headers.length)throw Error('Duplicate column names.');
 const missing=REQUIRED.filter(h=>!headers.includes(h));if(missing.length)throw Error('Missing columns: '+missing.join(', '));
 const valid=[],errors=[];
 rows.forEach((row,i)=>{try{
  if(row.length!==headers.length)throw Error('Column count differs from header.');
  const r=Object.fromEntries(headers.map((h,j)=>[h,row[j].trim()]));
  for(const h of REQUIRED)if(!r[h])throw Error('Missing '+h);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.transaction_date)||Number.isNaN(Date.parse(r.transaction_date))||new Date(r.transaction_date).toISOString().slice(0,10)!==r.transaction_date)throw Error('Use a real date in YYYY-MM-DD format.');
  r.currency=r.currency.toUpperCase();if(!['INR','USD','EUR','GBP'].includes(r.currency))throw Error('Supported currencies: INR, USD, EUR, GBP.');
  r.payment_status=r.payment_status.toLowerCase();if(!['completed','pending','failed','reversed','refunded'].includes(r.payment_status))throw Error('Unsupported payment status.');
  r.amount_cents=cents(r.amount);r.vendor_key=normalize(r.vendor_name);r.invoice_key=normalize(r.invoice_number);r.row=i+2;valid.push(r);
 }catch(e){errors.push({row:i+2,error:e.message});}});return {valid,errors,total:rows.length};
}
export const identity=r=>JSON.stringify([r.vendor_key,r.transaction_date,r.amount_cents,r.currency,r.invoice_key,r.payment_reference||'',r.payment_status]);
export function mergeRecords(existing,incoming){
 const out=[...existing],ids=new Map(existing.map(r=>[r.transaction_id,identity(r)])),fingerprints=new Set(existing.map(identity));let skipped=0;const conflicts=[];
 for(const r of incoming){const fp=identity(r);if(ids.has(r.transaction_id)){if(ids.get(r.transaction_id)!==fp)conflicts.push(r.transaction_id);else skipped++;continue;}if(fingerprints.has(fp)){skipped++;continue;}out.push(r);ids.set(r.transaction_id,fp);fingerprints.add(fp);}
 return {records:out,skipped,conflicts};
}
export function detect(records,previous=[]){
 const generated=[],groups=new Map(),recurring=new Map();
 for(const r of records){if(r.payment_status!=='completed')continue;
  if(r.invoice_key&&r.payment_reference){const key=JSON.stringify([r.vendor_key,r.invoice_key,r.currency,r.amount_cents]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  if(['monthly','annual'].includes(r.recurrence)&&r.plan_name){const key=JSON.stringify([r.vendor_key,normalize(r.plan_name),r.currency,r.recurrence]);if(!recurring.has(key))recurring.set(key,[]);recurring.get(key).push(r);}
 }
 const make=(type,key,rs,amount,reason)=>({id:type+':'+key,type,status:'new',vendor:rs[0].vendor_name,currency:rs[0].currency,amount_cents:amount,confirmed_cents:0,recovered_cents:0,evidence:rs.map(r=>r.transaction_id),reason,history:[],rule_version:'1.0'});
 for(const [key,rs] of groups){const refs=new Set(rs.map(r=>r.payment_reference));if(refs.size<2)continue;
  const dates=rs.map(r=>Date.parse(r.transaction_date));if(Math.max(...dates)-Math.min(...dates)>30*86400000)continue;
  generated.push(make('possible_duplicate_payment',key,rs,(refs.size-1)*rs[0].amount_cents,'Same vendor, invoice, amount and currency; distinct completed payment references within 30 days. Check installments, reissued invoices and linked reversals/refunds. Reversed rows are excluded, but this prototype cannot reconcile them automatically.'));
 }
 for(const [key,rs] of recurring){rs.sort((a,b)=>a.transaction_date.localeCompare(b.transaction_date));if(rs.length<2)continue;const a=rs.at(-2),b=rs.at(-1),gap=(Date.parse(b.transaction_date)-Date.parse(a.transaction_date))/86400000;
  if(a.amount_cents<=0||gap<(b.recurrence==='annual'?300:20)||gap>(b.recurrence==='annual'?430:45))continue;
  const delta=b.amount_cents-a.amount_cents;if(delta*100<a.amount_cents*10)continue;
  generated.push(make('recurring_cost_increase',key,[a,b],delta,'Latest comparable-interval charge increased by '+(delta/a.amount_cents*100).toFixed(1)+'%. Same vendor, plan, currency and interval; check seat counts, tax and contract changes. This is a price-change lead, not proven waste or savings.'));
 }
 const old=new Map(previous.map(f=>[f.id,f]));return generated.map(f=>{const p=old.get(f.id);if(!p)return f;if(JSON.stringify([...p.evidence].sort())!==JSON.stringify([...f.evidence].sort())||p.amount_cents!==f.amount_cents)return {...f,history:[...(p.history||[]),{at:new Date().toISOString(),action:'Evidence changed; reopened for review.'}]};return {...f,status:p.status,confirmed_cents:p.confirmed_cents,recovered_cents:p.recovered_cents,history:p.history};});
}
export function review(f,{status,note,confirmed,recovered,reference}){
 if(!STATUSES.includes(status))throw Error('Invalid status.');if(!note?.trim())throw Error('Add a review reason or note.');
 const c=cents(confirmed||'0'),r=cents(recovered||'0');
 if(['new','under_investigation','dismissed'].includes(status)&&(c||r))throw Error('Unverified or dismissed findings must have zero confirmed/recovered amounts.');
 if(f.type!=='possible_duplicate_payment'&&(c||r))throw Error('This prototype tracks recovery money only for duplicate candidates.');
 if(c>f.amount_cents||r>c)throw Error('Recovery cannot exceed confirmed amount; confirmed cannot exceed flagged amount.');
 if(c&&!reference?.trim())throw Error('Confirmed amounts need an evidence reference.');
 return {...f,status,confirmed_cents:c,recovered_cents:r,history:[...f.history,{at:new Date().toISOString(),status,note:note.trim(),reference:reference?.trim()||'',confirmed_cents:c,recovered_cents:r}]};
}
export function csvOutput(rows){return rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
