/* AFIK — site behaviour. Native scrolling only: every effect below reads the
   scroll position the browser already has and moves opacity/transform, nothing
   hijacks the wheel or the finger. */
(function(){
  'use strict';
  var d = document, de = d.documentElement, w = window;
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WA = '972544500539';
  var clamp = function(v, a, b){ return v < a ? a : (v > b ? b : v); };
  var store = {
    get: function(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } },
    set: function(k, v){ try{ sessionStorage.setItem(k, v); }catch(e){} }
  };

  /* ------------------------------------------------------------------
     page veil: a curtain closes on the way out and opens on the way in
     ------------------------------------------------------------------ */
  function openVeil(){
    if(!de.classList.contains('veil-in')) return;
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      de.classList.add('veil-out'); de.classList.remove('veil-in');
      setTimeout(function(){ de.classList.remove('veil-out'); }, 900);
    }); });
  }
  d.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href]');
    if(!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if(a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if(!href || href.charAt(0) === '#' || /^(mailto|tel|https?|whatsapp):/i.test(href)) return;
    var url = new URL(a.href, location.href);
    if(url.origin !== location.origin) return;
    if(url.pathname === location.pathname && url.hash){ return; }
    e.preventDefault();
    de.classList.remove('menu-open');
    if(reduce){ location.href = a.href; return; }
    store.set('afik-go', '1');
    de.classList.add('veil-go');
    setTimeout(function(){ location.href = a.href; }, 560);
  });
  w.addEventListener('pageshow', function(e){ if(e.persisted){ de.classList.remove('veil-go', 'veil-in', 'menu-open'); } });

  /* ------------------------------------------------------------------
     ready: preloader on the first home visit of the session, else straight in
     ------------------------------------------------------------------ */
  function ready(){ de.classList.add('ready'); openVeil(); }
  var pre = d.getElementById('pre');
  if(pre && de.classList.contains('pre')){
    var preN = pre.querySelector('.pre-n'), preBar = pre.querySelector('.pre-bar i');
    var need = [].slice.call(d.querySelectorAll('.frames img')).slice(0, 3);
    var got = 0, shown = 0, t0 = performance.now(), done = false;
    need.forEach(function(im){
      if(im.complete && im.naturalWidth){ got++; return; }
      im.addEventListener('load', function(){ got++; }, {once:true});
      im.addEventListener('error', function(){ got++; }, {once:true});
    });
    var tick = function(now){
      var target = need.length ? got / need.length : 1;
      var timeCap = Math.min(1, (now - t0) / 1500);
      var want = Math.min(target, timeCap);
      if(now - t0 > 6000) want = 1;
      shown += (want - shown) * 0.12;
      if(want === 1 && shown > 0.995) shown = 1;
      if(preN){ var pn = Math.round(shown * 100); preN.textContent = pn < 10 ? '0' + pn : String(pn); }
      if(preBar) preBar.style.transform = 'scaleX(' + shown + ')';
      if(shown < 1){ requestAnimationFrame(tick); return; }
      if(done) return; done = true;
      store.set('afik-pre', '1');
      setTimeout(function(){
        de.classList.add('pre-done');
        setTimeout(ready, 380);
        setTimeout(function(){ de.classList.remove('pre'); }, 1200);
      }, 180);
    };
    requestAnimationFrame(tick);
  } else {
    if(d.fonts && d.fonts.ready){ d.fonts.ready.then(ready); setTimeout(ready, 900); } else { ready(); }
  }

  /* ------------------------------------------------------------------
     nav colour follows what is under it; burger menu
     ------------------------------------------------------------------ */
  var nav = d.getElementById('nav');
  var darks = [].slice.call(d.querySelectorAll('[data-nav="dark"]'));
  function navTheme(){
    if(!nav) return;
    var y = (nav.offsetHeight || 70) / 2, x = w.innerWidth - 40, dark = false;
    for(var i = 0; i < darks.length; i++){
      var r = darks[i].getBoundingClientRect();
      if(r.top <= y && r.bottom >= y && r.left <= x && r.right >= x){ dark = true; break; }
    }
    nav.setAttribute('data-on', dark ? 'dark' : 'light');
  }
  var burger = d.querySelector('.burger');
  if(burger){
    burger.addEventListener('click', function(){
      var open = de.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    d.addEventListener('keydown', function(e){ if(e.key === 'Escape' && de.classList.contains('menu-open')){ de.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); burger.focus(); } });
  }

  /* ------------------------------------------------------------------
     reveals and counters
     ------------------------------------------------------------------ */
  function countUp(el){
    var to = parseFloat(el.getAttribute('data-count')), dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    if(reduce){ el.textContent = to.toFixed(dec); return; }
    var st = null, dur = 1800;
    function step(ts){
      if(!st) st = ts;
      var k = Math.min(1, (ts - st) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = (to * e).toFixed(dec);
      if(k < 1) requestAnimationFrame(step);
    }
    el.textContent = (0).toFixed(dec);
    requestAnimationFrame(step);
  }
  if('IntersectionObserver' in w){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        e.target.classList.add('in');
        if(e.target.__wipes) e.target.__wipes.forEach(function(x){ x.classList.add('in'); });
        if(e.target.hasAttribute('data-count')) countUp(e.target);
        io.unobserve(e.target);
      });
    }, {threshold:.18, rootMargin:'0px 0px -6% 0px'});
    d.querySelectorAll('[data-rv],.split,.gantt,[data-count]').forEach(function(el){ io.observe(el); });
    /* a clipped element never reports itself as visible, so its parent is watched instead */
    d.querySelectorAll('.wipe').forEach(function(el){
      var host = el.parentNode; (host.__wipes = host.__wipes || []).push(el); io.observe(host);
    });
  } else {
    d.querySelectorAll('[data-rv],.split,.wipe,.gantt').forEach(function(el){ el.classList.add('in'); });
  }

  /* words light up as the sentence passes through the screen */
  var says = [].slice.call(d.querySelectorAll('.say')).map(function(el){
    var parts = el.textContent.trim().split(/\s+/); el.textContent = '';
    var ws = parts.map(function(p, i){
      var s = d.createElement('span'); s.className = 'w'; s.textContent = p; el.appendChild(s);
      if(i < parts.length - 1) el.appendChild(d.createTextNode(' '));
      return s;
    });
    return {el:el, ws:ws, lit:-1};
  });
  function sayTick(){
    var vh = w.innerHeight;
    says.forEach(function(s){
      var r = s.el.getBoundingClientRect();
      var p = reduce ? 1 : clamp((vh * 0.88 - r.top) / (r.height + vh * 0.38), 0, 1);
      var n = Math.round(p * s.ws.length);
      if(n === s.lit) return;
      s.lit = n;
      for(var i = 0; i < s.ws.length; i++) s.ws[i].classList.toggle('on', i < n);
    });
  }

  /* slow drift on full-bleed photographs */
  var pars = [].slice.call(d.querySelectorAll('[data-parallax]'));
  function parTick(){
    if(reduce) return;
    var vh = w.innerHeight;
    pars.forEach(function(img){
      var r = img.parentNode.getBoundingClientRect();
      if(r.bottom < 0 || r.top > vh) return;
      var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      img.style.transform = 'translate3d(0,' + ((p - 0.5) * -12).toFixed(2) + '%,0)';
    });
  }

  /* ------------------------------------------------------------------
     HOME: the yard builds itself as you scroll
     ------------------------------------------------------------------ */
  var build = d.getElementById('build'), B = null;
  if(build){
    B = {
      frames: build.querySelector('.frames'),
      imgs: [].slice.call(build.querySelectorAll('.frames img')),
      hero: build.querySelector('.b-hero'),
      weeks: build.querySelector('.weeks'),
      cols: [].slice.call(build.querySelectorAll('.weeks .digit b')),
      chs: [].slice.call(build.querySelectorAll('.ch')),
      rail: build.querySelector('.b-rail i'),
      fab: d.querySelector('.wa-fab'),
      week: -1, ch: -1
    };
    /* scroll budget: a pause on every stage, a crossfade between stages */
    var HOLD = [1.15, .5, .55, .6, .55, .6, .55, 1.45];
    var MOVE = [1.0, .85, 1.0, .95, .9, 1.0, .9];
    var WEEK = [0, 1, 1, 3, 4, 7, 9, 10];
    var KEYS = [], acc = 0, tot = 0, i;
    for(i = 0; i < 8; i++){ tot += HOLD[i]; if(i < 7) tot += MOVE[i]; }
    for(i = 0; i < 8; i++){
      KEYS.push({at: acc / tot, f: i}); acc += HOLD[i];
      KEYS.push({at: acc / tot, f: i});
      if(i < 7) acc += MOVE[i];
    }
    var ease = function(t){ return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
    B.frameAt = function(p){
      for(var k = 1; k < KEYS.length; k++){
        if(p <= KEYS[k].at){
          var a = KEYS[k - 1], b = KEYS[k];
          if(a.f === b.f) return a.f;
          return a.f + (b.f - a.f) * ease((p - a.at) / (b.at - a.at));
        }
      }
      return 7;
    };
    B.setWeek = function(n){
      if(n === B.week) return; B.week = n;
      var s = ('0' + n).slice(-2);
      B.cols.forEach(function(col, j){ col.style.transform = 'translateY(' + (-10 * parseInt(s.charAt(j), 10)) + '%)'; });
    };
  }
  function buildTick(){
    if(!B) return;
    var r = build.getBoundingClientRect();
    var span = build.offsetHeight - w.innerHeight;
    var p = clamp(-r.top / Math.max(1, span), 0, 1);
    var f = B.frameAt(p), base = Math.floor(f), frac = f - base;
    if(base >= 7){ base = 7; frac = 0; }
    for(var k = 0; k < B.imgs.length; k++){
      var o = k === base ? 1 : (k === base + 1 ? frac : 0);
      var st = B.imgs[k].style;
      var v = o.toFixed(3);
      if(st.opacity !== v) st.opacity = v;
    }
    if(!reduce) B.frames.style.transform = 'scale(' + (1.06 - 0.06 * p).toFixed(4) + ')';
    /* name card leaves as the first line is drawn */
    var h = clamp(f / 0.42, 0, 1);
    B.hero.style.opacity = (1 - h).toFixed(3);
    B.hero.style.transform = 'translate3d(0,' + (-h * 70).toFixed(1) + 'px,0)';
    B.hero.style.visibility = h >= 1 ? 'hidden' : 'visible';
    /* the week counter rolls with the build */
    B.weeks.classList.toggle('on', f > 0.4);
    var wk = base >= 7 ? WEEK[7] : Math.round(WEEK[base] + (WEEK[base + 1] - WEEK[base]) * frac);
    B.setWeek(wk);
    /* chapters swap a little before each stage settles */
    var c = Math.floor(f + 0.38);
    if(c < 1 || f < 0.62) c = 0;
    if(c !== B.ch){
      B.ch = c;
      build.classList.toggle('end', c === 7);
      B.chs.forEach(function(el){ el.classList.toggle('on', parseInt(el.getAttribute('data-stage'), 10) === c); });
    }
    B.rail.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if(B.fab) B.fab.classList.toggle('off', p < 0.985);
  }

  /* ------------------------------------------------------------------
     before / after
     ------------------------------------------------------------------ */
  d.querySelectorAll('.ba-box').forEach(function(box){
    var knob = box.querySelector('.knob'), x = 50, drag = false, intro = false;
    function set(v){ x = clamp(v, 0, 100); box.style.setProperty('--x', x + '%'); knob.setAttribute('aria-valuenow', Math.round(100 - x)); }
    function fromEvent(e){ var r = box.getBoundingClientRect(); return (r.right - e.clientX) / r.width * 100; }
    box.addEventListener('pointerdown', function(e){ drag = true; intro = true; box.setPointerCapture(e.pointerId); set(fromEvent(e)); });
    box.addEventListener('pointermove', function(e){ if(drag) set(fromEvent(e)); });
    box.addEventListener('pointerup', function(){ drag = false; });
    box.addEventListener('pointercancel', function(){ drag = false; });
    knob.addEventListener('keydown', function(e){
      if(e.key === 'ArrowLeft'){ set(x + 5); e.preventDefault(); }
      if(e.key === 'ArrowRight'){ set(x - 5); e.preventDefault(); }
      if(e.key === 'Home'){ set(0); e.preventDefault(); }
      if(e.key === 'End'){ set(100); e.preventDefault(); }
    });
    set(50);
    if(reduce || !('IntersectionObserver' in w)) return;
    var o = new IntersectionObserver(function(es){
      if(!es[0].isIntersecting || intro) return;
      intro = true; o.disconnect();
      var path = [[50, 0], [86, 900], [22, 2100], [50, 2900]], t0 = null;
      function run(ts){
        if(drag) return;
        if(!t0) t0 = ts;
        var t = ts - t0, j = 1;
        while(j < path.length - 1 && t > path[j][1]) j++;
        var a = path[j - 1], b = path[j], k = clamp((t - a[1]) / (b[1] - a[1]), 0, 1);
        k = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        set(a[0] + (b[0] - a[0]) * k);
        if(t < path[path.length - 1][1]) requestAnimationFrame(run);
      }
      setTimeout(function(){ requestAnimationFrame(run); }, 400);
    }, {threshold:.5});
    o.observe(box);
  });

  /* ------------------------------------------------------------------
     PROCESS: the picture beside the steps follows the step you read
     ------------------------------------------------------------------ */
  var phs = [].slice.call(d.querySelectorAll('.ph'));
  var phImgs = [].slice.call(d.querySelectorAll('.ph-frame img'));
  var phCap = d.querySelector('.ph-cap');
  function setPhase(n){
    phs.forEach(function(el, j){ el.classList.toggle('on', j === n); });
    phImgs.forEach(function(im, j){ im.classList.toggle('on', j === n); });
    if(phCap && phs[n]){ phCap.innerHTML = '<b>' + phs[n].getAttribute('data-name') + '</b><span>' + phs[n].getAttribute('data-weeks') + '</span>'; }
  }
  if(phs.length){
    setPhase(0);
    if('IntersectionObserver' in w){
      var po = new IntersectionObserver(function(es){
        es.forEach(function(e){ if(e.isIntersecting) setPhase(phs.indexOf(e.target)); });
      }, {rootMargin:'-46% 0px -46% 0px'});
      phs.forEach(function(el){ po.observe(el); });
    }
  }

  /* ------------------------------------------------------------------
     PROCESS: price estimate
     ------------------------------------------------------------------ */
  var calc = d.getElementById('calc');
  if(calc){
    var SIZE = {
      s:  {lbl:'3×7 מ׳',  lo:285, hi:330, wk:[8, 9],  a:.55, ov:[35, 50]},
      m:  {lbl:'4×8 מ׳',  lo:320, hi:370, wk:[9, 10], a:.8,  ov:[40, 58]},
      l:  {lbl:'4×10 מ׳', lo:360, hi:415, wk:[10, 11], a:1,  ov:[45, 65]},
      xl: {lbl:'5×12 מ׳', lo:430, hi:495, wk:[11, 12], a:1.5, ov:[55, 80]}
    };
    var SOIL = {sand:{lbl:'קרקע חולית', lo:0, hi:0, wk:0}, rock:{lbl:'קרקע סלעית', lo:40, hi:70, wk:1}, unk:{lbl:'קרקע לא ידועה', lo:0, hi:60, wk:1}};
    var FIN = {cer:{lbl:'גמר קרמיקה', lo:0, hi:0, wk:0, k:0}, mos:{lbl:'פסיפס זכוכית', lo:15, hi:28, wk:0, k:1}, stone:{lbl:'אבן טבעית', lo:30, hi:55, wk:1, k:1}};
    var ADD = {
      heat: {lbl:'משאבת חום', lo:12, hi:22},
      cover:{lbl:'כיסוי הידראולי', lo:45, hi:90, k:1},
      swim: {lbl:'שחייה נגד זרם', lo:22, hi:45},
      salt: {lbl:'מערכת מלח', lo:7, hi:10},
      spa:  {lbl:'ספא משולב', lo:55, hi:85, wk:1},
      light:{lbl:'תאורה ובקרה מהנייד', lo:9, hi:16}
    };
    var out = {lo2:calc.querySelector('[data-o="lo2"]'), hi2:calc.querySelector('[data-o="hi2"]'), lo:calc.querySelector('[data-o="lo"]'), hi:calc.querySelector('[data-o="hi"]'), wk:calc.querySelector('[data-o="wk"]'), sz:calc.querySelector('[data-o="sz"]'), go:calc.querySelector('[data-o="go"]')};
    var cur = {lo:0, hi:0}, anim = null;
    var val = function(n){ var el = calc.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : null; };
    var fmt = function(n){ return Math.round(n).toLocaleString('he-IL'); };
    function compute(){
      var s = SIZE[val('size')], t = val('type'), so = SOIL[val('soil')], fi = FIN[val('finish')];
      var lo = s.lo + so.lo + (fi.k ? fi.lo * s.a : 0), hi = s.hi + so.hi + (fi.k ? fi.hi * s.a : 0);
      var wk0 = s.wk[0] + so.wk + fi.wk, wk1 = s.wk[1] + so.wk + fi.wk, parts = [s.lbl, t === 'ov' ? 'בריכת עודפים' : 'בריכת סקימר', so.lbl, fi.lbl];
      if(t === 'ov'){ lo += s.ov[0]; hi += s.ov[1]; wk0 += 1; wk1 += 1; }
      var adds = [];
      calc.querySelectorAll('input[name="add"]:checked').forEach(function(c){
        var a = ADD[c.value]; if(!a) return;
        lo += a.k ? a.lo * s.a : a.lo; hi += a.k ? a.hi * s.a : a.hi;
        if(a.wk){ wk0 += a.wk; wk1 += a.wk; }
        adds.push(a.lbl);
      });
      lo = Math.round(lo / 5) * 5 * 1000; hi = Math.round(hi / 5) * 5 * 1000;
      var summary = parts.join(' · ') + (adds.length ? ' · תוספות: ' + adds.join(', ') : '') + ' · הערכה: ' + fmt(lo) + '–' + fmt(hi) + ' ₪ + מע״מ';
      out.wk.textContent = wk0 + '–' + wk1;
      out.sz.textContent = s.lbl;
      out.go.href = 'contact.html?type=' + encodeURIComponent('בריכה חדשה') + '&calc=' + encodeURIComponent(summary);
      tween(lo, hi);
    }
    function tween(lo, hi){
      if(anim) cancelAnimationFrame(anim);
      var a = {lo:cur.lo, hi:cur.hi}, st = null, dur = reduce ? 1 : 650;
      function step(ts){
        if(!st) st = ts;
        var k = Math.min(1, (ts - st) / dur), e = 1 - Math.pow(1 - k, 3);
        cur.lo = a.lo + (lo - a.lo) * e; cur.hi = a.hi + (hi - a.hi) * e;
        out.lo.textContent = fmt(cur.lo / 1000); out.hi.textContent = fmt(cur.hi / 1000);
        if(out.lo2){ out.lo2.textContent = out.lo.textContent; out.hi2.textContent = out.hi.textContent; }
        if(k < 1) anim = requestAnimationFrame(step);
      }
      anim = requestAnimationFrame(step);
    }
    calc.addEventListener('change', compute);
    compute();
  }

  /* ------------------------------------------------------------------
     CONTACT: the form becomes a WhatsApp message
     ------------------------------------------------------------------ */
  var lead = d.getElementById('lead');
  if(lead){
    var qs = new URLSearchParams(location.search);
    var tp = lead.querySelector('#f-type'), cfg = d.querySelector('.cfg'), cfgText = cfg ? cfg.querySelector('p') : null, calcLine = qs.get('calc') || '';
    if(qs.get('type') && tp){
      [].slice.call(tp.options).forEach(function(o){ if(o.value === qs.get('type')) tp.value = o.value; });
    }
    if(calcLine && cfg){ cfgText.textContent = calcLine; cfg.classList.add('on'); }
    if(cfg){ cfg.querySelector('button').addEventListener('click', function(){ calcLine = ''; cfg.classList.remove('on'); }); }
    function bad(id, msg){ var f = lead.querySelector('#' + id).closest('.field'); f.classList.toggle('bad', !!msg); f.querySelector('.err').textContent = msg || ''; return !!msg; }
    lead.addEventListener('submit', function(e){
      e.preventDefault();
      var name = lead.querySelector('#f-name').value.trim(), phone = lead.querySelector('#f-phone').value.trim();
      var digits = phone.replace(/\D/g, '');
      var e1 = bad('f-name', name.length < 2 ? 'נשמח לדעת איך לפנות אליכם' : '');
      var e2 = bad('f-phone', digits.length < 9 || digits.length > 13 ? 'נראה שחסרות ספרות במספר' : '');
      if(e1 || e2){ (e1 ? lead.querySelector('#f-name') : lead.querySelector('#f-phone')).focus(); return; }
      var city = lead.querySelector('#f-city').value.trim(), when = lead.querySelector('#f-when').value, msg = lead.querySelector('#f-msg').value.trim();
      var lines = ['שלום אפיק, אשמח לפגישת תכנון.', 'שם: ' + name, 'טלפון: ' + phone];
      if(city) lines.push('יישוב: ' + city);
      lines.push('סוג הפרויקט: ' + tp.value);
      if(when) lines.push('מתי: ' + when);
      if(calcLine) lines.push('מהמחשבון: ' + calcLine);
      if(msg) lines.push('הערות: ' + msg);
      var url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(lines.join('\n'));
      var win = w.open(url, '_blank', 'noopener');
      if(!win) location.href = url;
    });
  }

  /* ------------------------------------------------------------------
     filming: A starts and stops a steady auto-scroll, R jumps to the top,
     the arrows make the run shorter or longer
     ------------------------------------------------------------------ */
  var auto = false, aRaf = null, aT0 = 0, aFrom = 0, aSpan = 0, SECS = build ? 34 : 24;
  function aLoop(ts){
    if(!auto) return;
    if(!aT0) aT0 = ts;
    var k = Math.min(1, (ts - aT0) / (SECS * 1000));
    w.scrollTo(0, aFrom + aSpan * k);
    if(k >= 1){ auto = false; aT0 = 0; return; }
    aRaf = requestAnimationFrame(aLoop);
  }
  function startAuto(){ if(auto) return; auto = true; aT0 = 0; aFrom = w.scrollY; aSpan = (d.documentElement.scrollHeight - w.innerHeight) - aFrom; aRaf = requestAnimationFrame(aLoop); }
  function stopAuto(){ auto = false; aT0 = 0; if(aRaf) cancelAnimationFrame(aRaf); }
  d.addEventListener('keydown', function(e){
    var t = e.target, tag = t && t.tagName;
    if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    var k = (e.key || '').toLowerCase();
    if(k === 'a' || k === 'ש'){ auto ? stopAuto() : startAuto(); }
    else if(k === 'r' || k === 'ר'){ stopAuto(); w.scrollTo(0, 0); }
    else if(auto && k === 'arrowup'){ SECS = Math.max(10, SECS - 2); e.preventDefault(); }
    else if(auto && k === 'arrowdown'){ SECS = Math.min(90, SECS + 2); e.preventDefault(); }
  });
  if(/[?&]auto\b/.test(location.search)){ w.scrollTo(0, 0); setTimeout(startAuto, 1600); }
  w.__afik = {startAuto:startAuto, stopAuto:stopAuto};

  /* ------------------------------------------------------------------
     one scroll loop for everything that follows the scroll
     ------------------------------------------------------------------ */
  var pending = false;
  function frame(){ pending = false; buildTick(); navTheme(); sayTick(); parTick(); }
  function onScroll(){ if(!pending){ pending = true; requestAnimationFrame(frame); } }
  w.addEventListener('scroll', onScroll, {passive:true});
  w.addEventListener('resize', onScroll);
  frame();

  var yr = d.getElementById('yr'); if(yr) yr.textContent = new Date().getFullYear();
})();
