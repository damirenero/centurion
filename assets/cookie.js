/* Cookie-баннер «Центурион». Аналитика (Яндекс Метрика) запускается только после согласия.
   Чтобы подключить Метрику, впишите номер счётчика в METRIKA_ID. */
(function(){
  var METRIKA_ID = '113843617'; // счётчик Яндекс Метрики
  var KEY = 'centurion-cookie-consent';
  function read(){ try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){ return null; } }
  function save(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch(e){} }

  function startAnalytics(){
    if (!METRIKA_ID || window.__metrikaStarted) return;
    window.__metrikaStarted = true;
    var src = 'https://mc.yandex.ru/metrika/tag.js?id=' + METRIKA_ID;
    (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a);
    })(window, document, 'script', src, 'ym');
    window.ym(Number(METRIKA_ID), 'init', { ssr:true, webvisor:true, clickmap:true, ecommerce:'dataLayer',
      referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true });
  }

  var box = null;
  function close(){ if (box) { box.remove(); box = null; } document.body.classList.remove('ck-open'); }
  function decide(analytics){ save({ analytics: !!analytics, date: new Date().toISOString() }); close(); if (analytics) startAnalytics(); }

  function open(showSettings){
    close();
    var cur = read();
    box = document.createElement('div');
    box.className = 'ck'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','Использование cookie');
    box.innerHTML =
      '<p>Мы используем cookie-файлы и сервис веб-аналитики «Яндекс Метрика», чтобы сайт работал корректно и мы видели статистику посещений. Подробнее — в <a href="/privacy/">Политике обработки персональных данных</a>.</p>' +
      '<div class="ck-set" hidden>' +
        '<label class="ck-row"><input type="checkbox" checked disabled><div><b>Необходимые</b><span>Обеспечивают работу сайта и формы заявки. Отключить нельзя.</span></div></label>' +
        '<label class="ck-row"><input type="checkbox" id="ck-analytics"><div><b>Аналитика</b><span>Яндекс Метрика: обезличенная статистика посещений.</span></div></label>' +
      '</div>' +
      '<div class="ck-actions">' +
        '<button type="button" class="ck-yes">Принимаю</button>' +
        '<button type="button" class="ck-alt ck-cfg">Настроить</button>' +
        '<button type="button" class="ck-alt ck-save" hidden>Сохранить выбор</button>' +
      '</div>';
    document.body.appendChild(box);
    document.body.classList.add('ck-open');
    var set = box.querySelector('.ck-set'), cfg = box.querySelector('.ck-cfg'), sv = box.querySelector('.ck-save'), an = box.querySelector('#ck-analytics');
    an.checked = !!(cur && cur.analytics);
    function showSet(){ set.hidden = false; cfg.hidden = true; sv.hidden = false; an.focus(); }
    box.querySelector('.ck-yes').addEventListener('click', function(){ decide(true); });
    cfg.addEventListener('click', showSet);
    sv.addEventListener('click', function(){ decide(an.checked); });
    if (showSettings) showSet();
  }

  function init(){
    var cur = read();
    if (cur && cur.analytics) startAnalytics();
    if (!cur) open(false);
    document.addEventListener('click', function(e){
      var t = e.target.closest && e.target.closest('[data-cookie-settings]');
      if (t) { e.preventDefault(); open(true); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
