const SOURCE_URL = 'https://www.tokyo-dome.co.jp/dome/event/schedule.html';

function decodeEntities(s='') {
  const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, e) => {
    if (e[0] === '#') {
      const hex = e[1]?.toLowerCase() === 'x';
      const n = parseInt(e.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    }
    return named[e.toLowerCase()] ?? ' ';
  });
}

function htmlToText(html='') {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(?:br|\/p|\/li|\/tr|\/div|\/section|\/article|\/dt|\/dd|\/h[1-6])\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\u3000/g, ' ')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function pad(n){ return String(n).padStart(2,'0'); }

function cleanTitle(block, category) {
  let s = block
    .replace(/TOKYO\s*DOME\s*TOUR/gi, ' ')
    .replace(/東京ドームツアー/gi, ' ')
    .replace(/^(?:\s*(?:野球|コンサート|スポーツ|イベント)\s*)+/,' ')
    .replace(/(?:開場|開始|開演)\s*\d{1,2}:\d{2}[\s\S]*$/,' ')
    .replace(/<お問い合わせ>[\s\S]*$/,' ')
    .replace(/お問い合わせ[\s\S]*$/,' ')
    .replace(/\s+/g,' ')
    .trim();
  if (category) s = s.replace(new RegExp(`^(?:${category}\\s*)+`), '').trim();
  return s;
}

function parseSchedule(html) {
  const text = htmlToText(html);
  const marker = /(20\d{2})年\s*(\d{1,2})月|(\d{1,2})\s*[（(][^）)]{1,12}[）)]/g;
  const marks=[]; let m;
  while ((m = marker.exec(text))) marks.push({index:m.index,end:marker.lastIndex,year:m[1]?+m[1]:null,month:m[2]?+m[2]:null,day:m[3]?+m[3]:null});

  let year=null, month=null;
  const events=[];
  const junk=/^(?:TOKYO DOME TOUR|お問い合わせ|新規入会|ログイン|チケプラ|ローチケ|DISK ?GARAGE|キョードー|TEL[:：]|平日\b|土日祝\b|営業時間|東京ドームイベントのお知らせ)/i;

  for (let i=0;i<marks.length;i++) {
    const mk=marks[i];
    if (mk.year) { year=mk.year; month=mk.month; continue; }
    if (!mk.day || !year || !month) continue;

    const next = marks[i+1]?.index ?? text.length;
    let block = text.slice(mk.end, next).replace(/\n+/g,' ').replace(/\s+/g,' ').trim();
    if (!block) continue;

    const category = (block.match(/\b(野球|コンサート|スポーツ|イベント)\b/)||[])[1] || '';
    const open = (block.match(/開場\s*(\d{1,2}:\d{2})/)||[])[1] || '';
    const startMatch = block.match(/(開始|開演)\s*(\d{1,2}:\d{2})/);
    const start = startMatch?.[2] || '';
    const startLabel = startMatch?.[1] || '';

    block = block.replace(/^\s*[|｜]\s*/, '').trim();
    let title = cleanTitle(block, category);
    title = title.replace(/^(?:野球|コンサート|スポーツ|イベント)\s+/, '').trim();

    if (!title || junk.test(title) || /^[-–—|｜]+$/.test(title)) continue;
    if (title.length > 180) title = title.slice(0,180).trim();

    const date = `${year}-${pad(month)}-${pad(mk.day)}`;
    events.push({
      id:`dome-${date}-${events.length}`,
      title,
      startDate:date,
      endDate:date,
      startTime:start,
      openTime:open,
      place:'東京ドーム',
      area:'文京区後楽',
      category,
      desc:[open && `開場 ${open}`, start && `${startLabel||'開始'} ${start}`].filter(Boolean).join('／') || '東京ドーム公式スケジュール掲載イベント',
      url:SOURCE_URL,
      source:'東京ドーム公式',
      sourceUpdated:new Date().toISOString(),
      attendanceScore:0
    });
  }

  const seen=new Set();
  return events.filter(e=>{const k=`${e.startDate}|${e.title}`; if(seen.has(k)) return false; seen.add(k); return true;});
}

exports.handler = async function(){
  try {
    const r = await fetch(SOURCE_URL, {headers:{
      'User-Agent':'Mozilla/5.0 (compatible; TokyoNOW/0.05.2; +https://netlify.app)',
      'Accept':'text/html,application/xhtml+xml',
      'Accept-Language':'ja,en;q=0.8'
    }});
    if (!r.ok) return {statusCode:502,headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({error:`東京ドーム取得失敗: HTTP ${r.status}`})};
    const html = await r.text();
    const events = parseSchedule(html);
    return {statusCode:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300','access-control-allow-origin':'*'},body:JSON.stringify({source:'東京ドーム公式',sourceUrl:SOURCE_URL,count:events.length,events})};
  } catch(e) {
    return {statusCode:500,headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({error:e.message||'東京ドーム取得失敗'})};
  }
};
