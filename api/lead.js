// Приём заявок с сайта «Центурион» → ответ в Яндекс Форму «Заявки с сайта Центурион».
// Форма: https://forms.yandex.ru/u/6af0c5956d2d736555e02628/
// Вопросы формы имеют идентификаторы: topic, name, phone, message.
// Переменные окружения не обязательны; при желании можно переопределить:
//   FORMS_SURVEY_ID, FORMS_TOKEN (OAuth для API Форм), FORMS_ORG_ID,
//   YANDEX_USER + YANDEX_APP_PASSWORD (+ MAIL_TO) — дополнительная копия письмом.

const SURVEY = (process.env.FORMS_SURVEY_ID || '6af0c5956d2d736555e02628').trim();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const clip = (v, n) => String(v || '').replace(/\r/g, '').trim().slice(0, n);

// 1) Официальное API Яндекс Форм
async function viaApi(values) {
  const headers = { 'Content-Type': 'application/json', 'User-Agent': UA };
  if (process.env.FORMS_TOKEN) headers.Authorization = 'OAuth ' + process.env.FORMS_TOKEN.trim();
  if (process.env.FORMS_ORG_ID) headers['X-Org-Id'] = process.env.FORMS_ORG_ID.trim();
  const r = await fetch(`https://api.forms.yandex.net/v1/surveys/${SURVEY}/form`, {
    method: 'POST', headers, body: JSON.stringify(values),
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

// 2) Как обычный посетитель публичной формы
function collectCookies(res) {
  const list = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') || '').split(/,(?=\s*[^;,=\s]+=)/);
  return list.map((c) => c.split(';')[0].trim()).filter(Boolean).join('; ');
}

async function viaPublicForm(values) {
  const formUrl = `https://forms.yandex.ru/u/${SURVEY}/`;
  const page = await fetch(formUrl, { headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'ru' }, redirect: 'follow' });
  const html = await page.text();
  const m = html.match(/"csrfToken":"([^"]+)"/);
  if (!m) throw new Error(`Форма не отдала csrfToken (status ${page.status})`);
  const r = await fetch('https://forms.yandex.ru/u/gateway/root/form/postSurvey', {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'ru',
      'Content-Type': 'application/json',
      'Origin': 'https://forms.yandex.ru',
      'Referer': formUrl,
      'X-CSRF-Token': m[1],
      'x-form-referer': formUrl,
      'Cookie': collectCookies(page),
    },
    body: JSON.stringify({ surveyId: SURVEY, values, parent: '', dryRun: false, timestamp: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`postSurvey ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

async function viaMail(d) {
  const user = process.env.YANDEX_USER, pass = process.env.YANDEX_APP_PASSWORD;
  if (!user || !pass) return false;
  const nodemailer = require('nodemailer');
  const t = nodemailer.createTransport({ host: 'smtp.yandex.ru', port: 465, secure: true, auth: { user, pass } });
  await t.sendMail({
    from: `"Сайт Центурион" <${user}>`, to: process.env.MAIL_TO || user,
    subject: `${d.title}: ${d.name}, ${d.phone}`,
    text: `${d.title} с сайта «Центурион»\n\nИмя: ${d.name}\nТелефон: ${d.phone}\n${d.msg ? '\n' + d.msg : ''}`,
  });
  return true;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (body.website) return res.status(200).json({ ok: true }); // ловушка для ботов

  const isJob = body.topic === 'job';
  const d = {
    title: isJob ? 'Отклик на вакансию' : 'Заявка заказчика',
    name: clip(body.name, 120), phone: clip(body.phone, 40), msg: clip(body.msg, 3000),
  };
  if (!d.name || d.phone.replace(/\D/g, '').length < 10) {
    return res.status(400).json({ ok: false, error: 'Укажите имя и телефон, чтобы мы могли перезвонить.' });
  }
  const values = { topic: isJob ? 'Соискатель' : 'Заказчик', name: d.name, phone: d.phone };
  if (d.msg) values.message = d.msg;

  let saved = false;
  for (const [label, fn] of [['api', viaApi], ['public', viaPublicForm]]) {
    try { await fn(values); saved = true; console.log(`[forms] сохранено через ${label}`); break; }
    catch (e) { console.error(`[forms:${label}]`, e.message); }
  }
  try { if (await viaMail(d)) saved = true; } catch (e) { console.error('[mail]', e.message); }

  if (saved) return res.status(200).json({ ok: true });
  return res.status(502).json({ ok: false, error: 'Не удалось отправить заявку.' });
};
