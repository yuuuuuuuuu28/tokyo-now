const SOURCE_URL = 'https://www.opendata.metro.tokyo.lg.jp/tokyobigsight/tokyobigsighteventinformation.csv';

exports.handler = async function () {
  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'TokyoNOW/0.04.1',
        'Accept': 'text/csv,text/plain,*/*'
      }
    });
    if (!response.ok) {
      return {
        statusCode: 502,
        headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store'},
        body: JSON.stringify({error:`東京ビッグサイト取得失敗: HTTP ${response.status}`})
      };
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let text = new TextDecoder('utf-8').decode(bytes);
    const bad = (text.match(/�/g) || []).length;
    if (bad > 5) {
      try { text = new TextDecoder('shift_jis').decode(bytes); } catch (_) {}
    }
    return {
      statusCode: 200,
      headers: {
        'content-type':'text/plain; charset=utf-8',
        'cache-control':'no-store, max-age=0',
        'access-control-allow-origin':'*'
      },
      body: text
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store'},
      body: JSON.stringify({error:`東京ビッグサイト取得失敗: ${error.message}`})
    };
  }
};
