# يبني index.html للموقع من app.html: يضيف تحميل مكتبة Supabase وملف الاتصال وسطر حالة الاتصال
import re, sys
src, out = sys.argv[1], sys.argv[2]
h = open(src, encoding='utf-8').read()
loader = '''<script>
// يحمّل مكتبة Supabase: يجرب نسخ أحدث أولاً، وإذا وحدة ما انحملت ينتقل للي بعدها
(function(){var vs=['2.58.0','2.56.1','2.54.0','2.50.0','2.45.4'],i=0;function next(){if(window.supabase||i>=vs.length)return;var v=vs[i++],s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@'+v+'/dist/umd/supabase.js';s.onload=function(){if(window.supabase){window.__sbver=v;}else next();};s.onerror=next;document.head.appendChild(s);}next();})();
</script>
<script src="realtime.js?v=4"></script>
'''
h = h.replace('<script src="questions.js"></script>', loader + '<script src="questions.js?v=4"></script>', 1)
for a in ['<div class="banner bad" id="lobbyErr" hidden></div>', '<div class="banner bad" id="joinErr" hidden style="width:100%"></div>']:
    assert a in h
    h = h.replace(a, a + '\n    <div class="rtStatus muted small"></div>', 1)
doc = '''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="لعبة أسئلة ومسابقات عراقية للفرق: شاشة وحدة أو كل لاعب على جواله، مع حكم أو بدونه.">
<meta name="theme-color" content="#0b1120">
</head>
<body>
''' + h + '''
</body>
</html>
'''
open(out, 'w', encoding='utf-8').write(doc)
print('built', out)
