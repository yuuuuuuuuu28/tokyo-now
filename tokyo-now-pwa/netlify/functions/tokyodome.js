const SOURCE_URL='https://www.tokyo-dome.co.jp/dome/event/schedule.html';
exports.handler=async function(){
  try{
    const r=await fetch(SOURCE_URL,{headers:{'User-Agent':'TokyoNOW/0.05','Accept':'text/html,*/*'}});
    if(!r.ok)return{statusCode:502,headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({error:`東京ドーム取得失敗: HTTP ${r.status}`})};
    const html=await r.text();
    return{statusCode:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, max-age=0','access-control-allow-origin':'*'},body:html};
  }catch(e){return{statusCode:500,headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({error:e.message||'東京ドーム取得失敗'})}}
};
