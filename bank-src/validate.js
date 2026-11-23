// usage: node validate.js <category>   -> checks bank/<category>/{easy,medium,hard,expert}.json
const fs=require('fs'),path=require('path');
const cat=process.argv[2], dir=path.join(__dirname,cat);
const existing=JSON.parse(fs.readFileSync(path.join(__dirname,'existing',cat+'.json'),'utf8'));
const norm=s=>String(s).replace(/[ً-ْـ«»"'؟?.,،:]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim();
const seen=new Set(); for(const l in existing) existing[l].forEach(q=>seen.add(norm(q)));
let ok=true;
for(const l of ['easy','medium','hard','expert']){
  const f=path.join(dir,l+'.json');
  if(!fs.existsSync(f)){console.log(l+': MISSING');ok=false;continue;}
  let a; try{a=JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){console.log(l+': BAD JSON '+e.message);ok=false;continue;}
  let bad=0;
  a.forEach((q,i)=>{
    const p=`${l}#${i+1}`;
    if(!Array.isArray(q)||q.length!==5||q.some(x=>typeof x!=='string'||!x.trim())){console.log(p+' wrong shape');bad++;return;}
    if(new Set(q.slice(1).map(norm)).size!==4){console.log(p+' options not distinct: '+q[0]);bad++;}
    const k=norm(q[0]); if(seen.has(k)){console.log(p+' duplicate question: '+q[0]);bad++;} seen.add(k);
    if(norm(q[1]).length>2 && norm(q[0]).includes(norm(q[1]))){console.log(p+' answer appears in question: '+q[0]);bad++;}
  });
  console.log(`${l}: ${a.length} questions, ${bad} problems`+(a.length<88?'  (NEED 88)':''));
  if(bad||a.length<88) ok=false;
}
console.log(ok?'ALL GOOD':'FIX NEEDED'); process.exit(ok?0:1);
