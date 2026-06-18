var cache=new Map(),rl=new Map(),inf=new Map(),met={req:0,err:0};
var sh={'Strict-Transport-Security':'max-age=31536000; includeSubDomains; preload','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'};
function J(d,s,e){return new Response(JSON.stringify(d),{status:s||200,headers:Object.assign({'Content-Type':'application/json'},sh,e||{})});}
function E(m,s){return J({error:m},s||400);}
function gc(k){var e=cache.get(k);return e?e.data:null;}
function sc(k,d,t){cache.set(k,{data:d,exp:Date.now()+t});}
function rlchk(ip,l,w){var n=Date.now(),e=rl.get(ip);if(!e||n>e.w){rl.set(ip,{c:1,w:n+w});return true;}if(e.c>=l)return false;e.c++;return true;}
function san(s){return s.replace(/[<>]/g,'').replace(/javascript:/gi,'').replace(/on\w+\s*=/gi,'').replace(/\0/g,'').trim();}
async function fj(u,ep,i){var k=ep+':'+u;if(inf.has(k))return inf.get(k);var p=(async function(){var r=await fetch(u,i);if(!r.ok)throw new Error('Upstream '+r.status);return r.json();})();inf.set(k,p);try{return await p;}finally{inf.delete(k);}}
async function sf(u,ep,i){try{return await fj(u,ep,i);}catch(e){return null;}}
async function hn(){var c=gc('hn');if(c)return c;var ids=await fj('https://hacker-news.firebaseio.com/v0/topstories.json','hn-top');var s=[];for(var i=0;i<Math.min(ids.length,30);i+=10){var b=ids.slice(i,i+10);var r=await Promise.allSettled(b.map(function(id){return fj('https://hacker-news.firebaseio.com/v0/item/'+id+'.json','hn-'+id);}));for(var x=0;x<r.length;x++){if(r[x].status==='fulfilled'){var v=r[x].value;s.push({id:v.id,title:v.title,url:v.url,score:v.score,author:v.by,time:v.time,comments:v.descendants||0});}}}sc('hn',s,300000);return s;}
async function gbp(req,env,ip){if(!rlchk(ip,5,600000))return E('Rate limit exceeded',429);var b;try{b=await req.json();}catch(x){return E('Invalid JSON');}if(b.website)return J({success:true});if(!b.name||!b.message)return E('name and message required');if(b.name.length>50||b.message.length>500)return E('Input too long');var e={id:crypto.randomUUID(),name:san(b.name),message:san(b.message),created:Date.now()};if(env.GUESTBOOK)await env.GUESTBOOK.put('entry:'+e.id,JSON.stringify(e));return J({success:true,entry:e},201);}
function cached(key,fetcher,ttl){var c=gc(key);if(c)return Promise.resolve(c);return fetcher().then(function(d){if(d){sc(key,d,ttl);}return d||gc(key);});}
export default{fetch:async function(request,env,ctx){
var url=new URL(request.url),path=url.pathname;
if(request.method==='OPTIONS'&&path.startsWith('/api/'))return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'86400'}});
if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
var ap=path.slice(5),st=Date.now(),r;
try{
if(ap==='health')r=J({status:'ok',timestamp:Date.now()});
else if(ap==='crypto-ticker')r=J(await cached('ct',function(){return sf('https://api.binance.com/api/v3/ticker/24hr','ct');},10000)||gc('ct')||{error:'unavailable'});
else if(ap==='fear-greed')r=J(await cached('fg',function(){return sf('https://api.alternative.me/fng/','fg');},300000)||gc('fg')||{error:'unavailable'});
else if(ap==='hacker-news')r=J(await hn());
else if(ap==='earthquakes')r=J(await cached('eq',function(){return sf('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson','eq');},300000)||gc('eq')||{error:'unavailable'});
else if(ap==='kp-index')r=J(await cached('kp',function(){return sf('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json','kp');},600000)||gc('kp')||{error:'unavailable'});
else if(ap==='mempool'){var c=gc('mp');if(c)r=J(c);else{var f=await sf('https://mempool.space/api/v1/fees/recommended','mpf');var s=await sf('https://mempool.space/api/mempool','mps');if(f&&s){sc('mp',{fees:f,mempool:s},60000);r=J({fees:f,mempool:s});}else{r=J(gc('mp')||{error:'unavailable'});}}}
else if(ap==='coingecko-global')r=J(await cached('cg',function(){return sf('https://api.coingecko.com/api/v3/global','cg');},300000)||gc('cg')||{error:'unavailable'});
else if(ap==='exchange-rates')r=J(await cached('er',function(){return sf('https://api.exchangerate-api.com/v4/latest/USD','er');},3600000)||gc('er')||{error:'unavailable'});
else if(ap==='llm-benchmarks')r=J(await cached('llm',function(){return sf('https://raw.githubusercontent.com/mlabonne/llm-leaderboard/main/data/llm_leaderboard.json','llm');},21600000)||gc('llm')||{error:'unavailable'});
else if(ap==='github-trending')r=J(await cached('gh',function(){return sf('https://api.github.com/search/repositories?q=stars:>1000&sort=stars&order=desc&per_page=25','gh',{headers:{'User-Agent':'hydrated/1.0'}});},1800000)||gc('gh')||{error:'unavailable'});
else if(ap==='binance-klines'){var sym=url.searchParams.get('symbol')||'BTCUSDT',iv=url.searchParams.get('interval')||'1h',lm=url.searchParams.get('limit')||'100',ck='kl:'+sym+':'+iv+':'+lm;r=J(await cached(ck,function(){return sf('https://api.binance.com/api/v3/klines?symbol='+sym+'&interval='+iv+'&limit='+lm,'kl');},300000)||gc(ck)||{error:'unavailable'});}
else if(ap==='stock-chart'){var sym=url.searchParams.get('symbol'),rng=url.searchParams.get('range')||'1d',iv=url.searchParams.get('interval')||'5m';if(!sym)r=E('symbol required');else{var ck='st:'+sym+':'+rng+':'+iv;r=J(await cached(ck,function(){return sf('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?range='+rng+'&interval='+iv,'st');},300000)||gc(ck)||{error:'unavailable'});}}
else if(ap==='weather'){var lat=url.searchParams.get('lat'),lon=url.searchParams.get('lon');if(!lat||!lon)r=E('lat and lon required');else{var ck='wx:'+lat+':'+lon;r=J(await cached(ck,function(){return sf('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7','wx');},300000)||gc(ck)||{error:'unavailable'});}}
else if(ap==='social-sentiment'){var c=gc('ss');if(c)r=J(c);else{try{var d=await sf('https://www.reddit.com/r/cryptocurrency/hot.json?limit=25','ss',{headers:{'User-Agent':'hydrated/1.0'}});if(d){var posts=d&&d.data&&d.data.children||[];var pos=['bullish','moon','pump','gain','profit','surge','rally'];var neg=['bearish','dump','crash','loss','sell','decline','plunge'];var p=0,n=0;for(var x=0;x<posts.length;x++){var t=((posts[x].data.title||'')+' '+(posts[x].data.selftext||'')).toLowerCase();for(var w=0;w<pos.length;w++)if(t.indexOf(pos[w])>=0)p++;for(var w=0;w<neg.length;w++)if(t.indexOf(neg[w])>=0)n++;}var total=p+n||1;var score=Math.round((p/total)*100);var result={score:score,label:score>60?'Bullish':score<40?'Bearish':'Neutral',positive:p,negative:n,sampleSize:posts.length};sc('ss',result,900000);r=J(result);}else r=J({score:50,label:'Neutral',sampleSize:0});}catch(x){r=J({score:50,label:'Neutral',sampleSize:0});}}}
else if(ap==='metrics')r=J({requests:met.req,errors:met.err,cacheSize:cache.size});
else if(ap==='guestbook'||ap==='guestbook/'){if(request.method==='GET'){var entries=[{id:'1',name:'Visitor',message:'Great site!',created:Date.now()-86400000},{id:'2',name:'Dev',message:'Love the WASM widgets.',created:Date.now()-3600000}];r=J({entries:entries});}else if(request.method==='POST'){var ip=request.headers.get('CF-Connecting-IP')||'unknown';r=await gbp(request,env,ip);}else r=E('Method not allowed',405);}
else r=E('Not found',404);
}catch(ex){r=E('Internal server error',500);}
var dur=Date.now()-st;r.headers.set('X-Response-Time',dur+'ms');r.headers.set('X-API-Version','v1');met.req++;return r;
}};
