// Builds questions.js = old questions (data.js + extra.js) + validated new ones from bank/
const fs=require('fs'),path=require('path');const D=f=>path.join(__dirname,f);
const src=fs.readFileSync(D('data.js'),'utf8').split('\n').slice(1).join('\n')+'\n'+fs.readFileSync(D('extra.js'),'utf8');
const {DATA,EXTRA}=new Function(src+';return {DATA,EXTRA}')();
for(const c in EXTRA)for(const l in EXTRA[c])DATA[c][l]=DATA[c][l].concat(EXTRA[c][l]);
const L=['easy','medium','hard','expert'];
const norm=s=>String(s).replace(/[ً-ْـ«»"'؟?.,،:]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();
let added=0,dropped=0;
for(const c in DATA){
  const seen=new Set(); L.forEach(l=>DATA[c][l].forEach(q=>seen.add(norm(q[0]))));
  for(const l of L){
    const f=D(`${c}/${l}.json`); if(!fs.existsSync(f))continue;
    let a; try{a=JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){console.log('bad json',f);continue}
    for(const q of a){
      const ok=Array.isArray(q)&&q.length===5&&q.every(x=>typeof x==='string'&&x.trim())&&new Set(q.slice(1).map(norm)).size===4&&!seen.has(norm(q[0]))&&!(norm(q[1]).length>2&&norm(q[0]).includes(norm(q[1])));
      if(!ok){dropped++;continue}
      seen.add(norm(q[0]));DATA[c][l].push(q);added++;
    }
  }
}
let total=0;const per={};for(const c in DATA){per[c]=L.map(l=>DATA[c][l].length).join('/');L.forEach(l=>total+=DATA[c][l].length)}
fs.writeFileSync(D('../questions.js'),'// بنك الأسئلة — كل سؤال: [السؤال، الجواب الصحيح، خطأ1، خطأ2، خطأ3]\nwindow.QDATA = '+JSON.stringify(DATA)+';\n');
console.log({added,dropped,total});console.log(per);
