class Component extends DCLogic {
  // Website leads connection. Paste the Apps Script web app URL here (see SETUP.md). Empty = demo mode.
  LEADS = {
    endpoint: 'https://script.google.com/macros/s/AKfycbzap71o6MA26tqXSkjp3akskjkzFF_pllLwDVRqI6JDjKvTPMC-NW57SCQ0yFyLh5k/exec',
    guideBase: 'https://sunproduction12.github.io/new-design/assets/guides/',
    guideFiles: { en: 'Sun-Production-Google-Business-Guide-EN.pdf', ko: 'Sun-Production-Google-Business-Guide-KO.pdf', es: 'Sun-Production-Google-Business-Guide-ES.pdf' }
  };

  // Case study figures stay hidden until Yoomin approves each client (task: stop showing unverified numbers).
  // Change a client to true once its numbers are confirmed.
  VERIFIED = { porter: false, jcar: false, lumiglow: false, britishm: false, tlj: false, kccf: false };

  state = { industry: 0, prob: 0, menuOpen: false, modal: '', sent: false, sending: false, sendErr: '', emailed: true, errs: {}, lang: 'en', cf: 'all', lb: -1, cs: -1 };

  componentDidMount() {
    this.onAnchor = (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), 40);
    };
    document.addEventListener('click', this.onAnchor, true);
    // sticky audit/call bar: appears after the hero, hides while the footer is on screen
    this.onSbar = () => {
      const bar = document.getElementById('sbar'); if (!bar) return;
      const f = document.querySelector('footer');
      const vh = window.innerHeight || 800;
      const show = (window.scrollY || document.documentElement.scrollTop || 0) > vh * 0.7 && !(f && f.getBoundingClientRect().top < vh - 40);
      if (show !== this.sbarOn) { this.sbarOn = show; bar.classList.toggle('on', show); }
    };
    window.addEventListener('scroll', this.onSbar, { passive: true });
    window.addEventListener('resize', this.onSbar);
    // footer sections: collapsible on phones, always open on desktop
    if (window.matchMedia && window.matchMedia('(max-width: 860px)').matches) {
      Array.prototype.forEach.call(document.querySelectorAll('details.fcol'), (d) => d.removeAttribute('open'));
    }
    this.onCrScroll = (e) => {
      if (!e.target || e.target.id !== 'crt') return;
      clearTimeout(this.crT);
      this.crT = setTimeout(() => this.normCreative(), 160);
    };
    document.addEventListener('scroll', this.onCrScroll, true);
    this.setupReveal = () => {
      if (!('IntersectionObserver' in window)) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const sel = [
        'section > div > div > h2', 'section > div > div > h2 + p', '#partners h2', '#partners h2 + p',
        '.svc', '.wcard', '.pwrap', '#creators > div > div', '#partners .mqs', '#contact > div',
        '.dfoot > div > div > div', '.dfoot > div > div > nav', '#creative .crt'
      ].join(',');
      const els = Array.prototype.slice.call(document.querySelectorAll(sel)).filter((el) => !el.dataset.rv);
      if (!els.length) return;
      this.revealIO = this.revealIO || new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { const t = en.target; t.dataset.rv = '1'; this.revealIO.unobserve(t); setTimeout(() => { t.removeAttribute('data-rv'); t.style.removeProperty('--rvd'); }, 1500); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      els.forEach((el) => {
        const sibs = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, (c) => c.matches && c.matches(sel)) : [];
        const idx = Math.max(0, sibs.indexOf(el));
        el.style.setProperty('--rvd', Math.min(idx, 4) * 90 + 'ms');
        el.dataset.rv = '0';
        this.revealIO.observe(el);
      });
    };
    setTimeout(() => this.setupReveal(), 120);
    if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      this.stepTimer = setInterval(() => this.setState({ crStep: (((this.state || {}).crStep || 0) + 1) % 3 }), 1000);
    }
    setTimeout(() => this.centerCreative(), 400);
    setTimeout(() => this.centerCreative(), 1200);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      this.crTimer = setInterval(() => {
        const s = this.state || {};
        if (this.crHover || s.modal || s.lb >= 0 || s.cs >= 0 || performance.now() < (this.crHold || 0)) return;
        const L = this.crInfo();
        if (!L || !L.setW) return;
        const r = L.t.getBoundingClientRect();
        if (r.bottom < 0 || r.top > (window.innerHeight || 900)) return;
        this.scrollCreative(1, 1);
      }, 3200);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onAnchor, true);
    window.removeEventListener('scroll', this.onSbar);
    window.removeEventListener('resize', this.onSbar);
    document.removeEventListener('scroll', this.onCrScroll, true);
    clearInterval(this.crTimer);
    clearInterval(this.stepTimer);
    if (this.revealIO) this.revealIO.disconnect();
    clearTimeout(this.crT);
  }

  openModal(kind) {
    this.lastFocus = document.activeElement;
    this.setState({ modal: kind, sent: false, sending: false, sendErr: '', emailed: true, errs: {}, menuOpen: false, lb: -1, cs: -1 });
    setTimeout(() => {
      const first = document.querySelector('#lf input, #lf select, #lf textarea');
      if (first) first.focus();
    }, 60);
  }

  closeModal() {
    this.setState({ modal: '', sent: false, sending: false, sendErr: '', errs: {} });
    if (this.lastFocus && this.lastFocus.focus) setTimeout(() => this.lastFocus.focus(), 30);
  }

  submit(e, fields) {
    if (e && e.preventDefault) e.preventDefault();
    if (this.state.sending) return;
    const form = document.getElementById('lf');
    if (!form) return;
    const errs = {};
    let first = '';
    const noGbp = !!(form.elements.nogbp && form.elements.nogbp.checked);
    fields.forEach((f) => {
      const el = form.elements[f.id];
      if (!el || f.type === 'check' || f.type === 'lang') return;
      const v = String(el.value || '').trim();
      if (f.id === 'gbp') {
        if (!noGbp && !/^https?:\/\/\S+\.\S+/i.test(v)) errs.gbp = v ? 'Please paste the full link, starting with https://' : 'Please add your Google Business Profile link, or tick the box below if you do not have one yet.';
      } else if (f.req && (!v || v === 'Choose one')) errs[f.id] = 'Please add ' + f.label.toLowerCase() + '.';
      else if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errs[f.id] = 'Please enter a valid email address, like name@business.com.';
      if (errs[f.id] && !first) first = f.id;
    });
    if (first) {
      this.setState({ errs: errs, sendErr: '' });
      setTimeout(() => { const el = form.elements[first]; if (el && el.focus) el.focus(); }, 30);
      return;
    }
    if (this.state.modal !== 'guide') {
      this.setState({ sent: true, errs: {} });
      return;
    }
    const val = (id) => (form.elements[id] ? String(form.elements[id].value || '').trim() : '');
    const q = new URLSearchParams(window.location.search);
    const data = {
      form: 'guide', name: val('name'), business: val('business'), email: val('email'), phone: val('phone'),
      gbp: noGbp ? '' : val('gbp'), noGbp: noGbp, category: val('category') === 'Choose one' ? '' : val('category'),
      instagram: val('instagram'), website: val('website'), interest: val('interest') === 'Choose one' ? '' : val('interest'),
      lang: this.state.lang || 'en', consent: !!(form.elements.consent && form.elements.consent.checked),
      company_site: val('company_site'), page: window.location.href.split('#')[0], referrer: document.referrer || '',
      utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '', utm_campaign: q.get('utm_campaign') || ''
    };
    if (!this.LEADS.endpoint) {
      this.setState({ sent: true, errs: {}, emailed: true });
      return;
    }
    this.setState({ sending: true, sendErr: '', errs: {} });
    fetch(this.LEADS.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) })
      .then((r) => r.json())
      .then((r) => {
        if (r && r.ok) { this.setState({ sending: false, sent: true, emailed: r.emailed !== false }); return; }
        if (r && r.error === 'invalid' && r.fields) {
          const back = {};
          r.fields.forEach((id) => { back[id] = id === 'gbp' ? 'Please check your Google Business Profile link.' : 'Please check this field.'; });
          this.setState({ sending: false, errs: back });
          return;
        }
        const msg = r && r.error === 'too_many' ? 'You have already requested the guide several times. Please check your inbox, or try again in an hour.' : 'Something went wrong. Please try again in a moment, or email marketer@sunproduction.app.';
        this.setState({ sending: false, sendErr: msg });
      })
      .catch(() => this.setState({ sending: false, sendErr: 'We could not send your details. Please check your connection and try again, or email marketer@sunproduction.app.' }));
  }

  crInfo() {
    const t = document.getElementById('crt');
    if (!t) return null;
    const cards = t.querySelectorAll('.crc');
    const n = this.crN || 0;
    if (!this.crLoop || !n || cards.length < n * 3) return { t: t, setW: 0 };
    return { t: t, setW: cards[n].offsetLeft - cards[0].offsetLeft };
  }

  normCreative() {
    const L = this.crInfo();
    if (!L || !L.setW) return;
    if (L.t.scrollLeft < L.setW * 0.5) L.t.scrollLeft += L.setW;
    else if (L.t.scrollLeft > L.setW * 1.5) L.t.scrollLeft -= L.setW;
  }

  centerCreative() {
    const L = this.crInfo();
    if (L) L.t.scrollLeft = L.setW || 0;
  }

  scrollCreative(dir, steps) {
    const L = this.crInfo();
    if (!L) return;
    this.normCreative();
    const card = L.t.querySelector('.crc');
    const w = card ? card.offsetWidth + 20 : 300;
    L.t.scrollBy({ left: dir * w * (steps || 2), behavior: 'smooth' });
  }

  mix(hex, target, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const a = p(hex);
    const b = p(target);
    const c = a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));
    return 'rgb(' + c[0] + ', ' + c[1] + ', ' + c[2] + ')';
  }

  renderVals() {
    const s = this.state || {};
    const raw = this.props.accent ?? '#699DD0';
    const accent = /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : '#699DD0';
    const accentDeep = this.mix(accent, '#0F1B28', 0.6);
    const accentTint = this.mix(accent, '#FFFFFF', 0.2);

    const industries = [
      { label: 'Restaurants', search: 'korean bbq near me', bizName: 'K-Food Seoul', bizCat: 'Korean restaurant', siteUrl: 'kfoodseoulpa.com', siteHeadline: 'Authentic Korean restaurant in Philadelphia', siteCta: 'Call now', msg: 'Your table for Friday at 7pm is confirmed. See you then.', msg2: 'Thanks for coming in. Would you leave us a quick review?' },
      { label: 'Real estate', search: 'homes for sale near me', bizName: '[Your agency]', bizCat: 'Real estate agency', siteUrl: 'youragency.com', siteHeadline: 'Find your next home', siteCta: 'Book a viewing', msg: 'Thanks for your inquiry. Your viewing is confirmed for Saturday at 11am.', msg2: 'Here are three more listings that match your search.' },
      { label: 'Car rental', search: 'car rental near me', bizName: 'Jimmy\'s CarShare', bizCat: 'Car rental', siteUrl: 'jcar.ai', siteHeadline: 'Car sharing made simple', siteCta: 'Check my car\'s earnings', msg: 'Your booking is confirmed. Pickup details are inside.', msg2: 'How was the trip? A quick review helps other renters.' },
      { label: 'Beauty', search: 'nail salon near me', bizName: '[Your salon]', bizCat: 'Nail salon and spa', siteUrl: 'yoursalon.com', siteHeadline: 'Book your appointment', siteCta: 'Book now', msg: 'See you Thursday at 2pm. Reply C to confirm.', msg2: 'It has been four weeks. Ready for your next visit?' }
    ];
    const iIdx = s.industry || 0;
    const ind = industries[iIdx];

    const probShort = ['Google Maps visibility', 'Outdated website', 'Inconsistent social media', 'Missing follow‑ups', 'Weak reputation', 'Disconnected systems', 'Lost leads'];
    const pIdx = s.prob || 0;

    const caseData = [
      { img: 'assets/img/porter-website.jpg', pos: 'center', v: 'porter', name: 'Porter', tag: 'Restaurant · Ambler, PA', ch: 'A restaurant opening under a new name needed its website, Google listing and social channels to work together.', built: 'Website, Google Business Profile, Instagram and Meta, connected into one system.', num: '168K', cap: 'profile views', capLong: '168,000 profile views, 24,883 profile interactions and 15,689 website clicks.' },
      { img: 'assets/img/jimmycar-website.jpg', pos: 'left top', v: 'jcar', name: 'Jimmy’s CarShare', tag: 'Car sharing · Denver, CO', ch: 'A car-sharing business needed to take private rentals and capture car-owner leads on its own site.', built: 'Website, landing page, earnings calculator with lead capture, private-rental booking flow and customer dashboard, plus Google Business Profile optimization.', num: '836', cap: 'Business Profile views', capLong: '836 Business Profile views and 316 interactions, March to August 2026.' },
      { img: 'assets/img/lumiglow-website.jpg', pos: 'center', v: 'lumiglow', name: 'LumiGlow', tag: 'Korean skincare brand', ch: 'Enter the U.S. market without heavy ad spend.', built: 'A 90-day creator campaign, with Instagram connected to the Shopify store.', num: '844K', cap: 'views on the top creator reel', capLong: '844K views on the top creator reel and 351,628 total Instagram views.' },
      { img: 'assets/img/british-m-store.jpg', pos: 'center', v: 'britishm', name: 'British M', tag: 'Men\'s grooming brand', ch: 'Grow in the U.S. market.', built: 'Creator research, negotiation and campaign management, creator content and an Amazon storefront.', num: '286K', cap: 'views on the top creator reel', capLong: '286K views on the top creator reel and 109K on the second.' },
      { img: 'assets/img/tous-les-jours-report.jpg', imgSafe: 'assets/img/tous-les-jours-report-private.jpg', pos: 'left center', v: 'tlj', name: 'Tous les Jours', tag: 'Bakery café', ch: 'Keep the Google Business Profile active and visible.', built: '12 Google posts over three months, plus SEO-focused review replies.', num: '12,892', cap: 'Business Profile interactions', capLong: '12,892 Business Profile interactions, July to November 2025.' },
      { img: 'assets/img/kccf-meta-ads.jpg', imgSafe: 'assets/img/kccf-meta-ads-private.jpg', pos: 'left center', v: 'kccf', name: 'KCCF Happy Chuseok Fest', tag: 'Community festival · Blue Bell, PA', ch: 'Sell tickets and bring visitors to the festival website.', built: 'A Meta ad campaign for ticket sales and website visits.', num: '50,565', cap: 'people reached by the ads', capLong: '50,565 viewers and 1,535 link clicks at an average cost of $0.23 per link click. The festival was covered by CBS Philadelphia.' }
    ];
    const csI = typeof s.cs === 'number' ? s.cs : -1;

    const creativeData = [
      { v: 'lumiglow', client: 'LumiGlow', cat: 'Creator Campaigns', cats: ['Reels', 'Creator Campaigns'], img: 'assets/img/reel-lumiglow-1.jpg', line: 'Creator reel · 844K views', desc: 'Part of LumiGlow\'s 90-day creator campaign to introduce a Korean skincare brand to U.S. customers.', href: 'https://www.instagram.com/reel/Dbn3MnpIfPl/', linkLabel: 'Watch on Instagram' },
      { client: 'Porter', cat: 'Reels', cats: ['Reels'], img: 'assets/img/reel-porter.jpg', line: 'Restaurant reel', desc: 'Short-form video for Porter in Ambler, PA, made for the restaurant\'s Instagram.', href: 'https://www.instagram.com/porterambler', linkLabel: 'See Porter on Instagram' },
      { v: 'britishm', client: 'British M', cat: 'Creator Campaigns', cats: ['Reels', 'Creator Campaigns'], img: 'assets/img/reel-british-m-1.jpg', line: 'Creator reel · 286K views', desc: 'Part of the creator campaign behind British M\'s U.S. market expansion.', href: 'https://www.instagram.com/reel/DbG3jNUomDW/', linkLabel: 'Watch on Instagram' },
      { client: 'Yume Sushi', cat: 'Reels', cats: ['Reels'], img: 'assets/img/reel-yume-sushi.jpg', line: 'New menu reel', desc: 'A reel introducing Yume Sushi\'s new taco sushi in North Wales, PA.', href: 'https://www.instagram.com/yumesushi.northwales', linkLabel: 'See Yume Sushi on Instagram' },
      { v: 'kccf', client: 'KCCF Happy Chuseok Fest', cat: 'Meta Ads', cats: ['Meta Ads'], img: '', line: 'Meta ad campaign', desc: 'A Meta ad campaign for ticket sales and website visits. The festival was covered by CBS Philadelphia.', href: 'https://www.cbsnews.com/philadelphia/news/happy-chuseok-fest-blue-bell-montgomery-county-community-college/', linkLabel: 'Read the CBS Philadelphia story' },
      { v: 'lumiglow', client: 'LumiGlow', cat: 'Creator Campaigns', cats: ['Reels', 'Creator Campaigns'], img: 'assets/img/reel-lumiglow-2.jpg', line: 'Creator reel · 301K views', desc: 'Part of LumiGlow\'s 90-day creator campaign to introduce a Korean skincare brand to U.S. customers.', href: 'https://www.instagram.com/reel/Dc5c4UZsIg3/', linkLabel: 'Watch on Instagram' },
      { client: 'Mama Chang', cat: 'Reels', cats: ['Reels'], img: 'assets/img/reel-mama-chang.jpg', line: 'Restaurant reel', desc: 'A reel for Mama Chang in Montgomeryville, PA.', href: 'https://www.instagram.com/mamachangphiladelphia/', linkLabel: 'See Mama Chang on Instagram' },
      { v: 'britishm', client: 'British M', cat: 'Creator Campaigns', cats: ['Reels', 'Creator Campaigns'], img: 'assets/img/reel-british-m-2.jpg', line: 'Creator reel · 109K views', desc: 'Part of the creator campaign behind British M\'s U.S. market expansion.', href: 'https://www.instagram.com/reel/Da8FeU3tQa_/', linkLabel: 'Watch on Instagram' },
      { v: 'lumiglow', client: 'LumiGlow', cat: 'Creator Campaigns', cats: ['Reels', 'Creator Campaigns'], img: 'assets/img/reel-lumiglow-3.jpg', line: 'Creator reel · 160K views', desc: 'Part of LumiGlow\'s 90-day creator campaign to introduce a Korean skincare brand to U.S. customers.', href: 'https://www.instagram.com/reel/Dd0Vl1cIh3v/', linkLabel: 'Watch on Instagram' }
    ];
    const filters = ['All', 'Reels', 'Photography', 'Social Posts', 'Meta Ads', 'Creator Campaigns'];
    const cf = s.cf || 'all';
    const shown = creativeData.map((c, i) => ({ c: c, i: i })).filter((x) => cf === 'all' || x.c.cats.indexOf(cf) >= 0);
    const toCard = (c, i) => ({
      client: c.client,
      cat: c.cat,
      line: this.VERIFIED[c.v] ? c.line : c.line.replace(/ · [0-9.,]+K? views$/, ''),
      desc: c.desc,
      img: c.img,
      hasImg: !!c.img,
      isStat: !c.img && !!this.VERIFIED[c.v],
      isStatText: !c.img && !this.VERIFIED[c.v],
      href: c.href,
      linkLabel: c.linkLabel,
      aria: 'Open ' + c.client + ', ' + c.line,
      open: () => this.setState({ lb: i, menuOpen: false })
    });

    const crBase = shown.map((x) => toCard(x.c, x.i));
    this.crN = crBase.length;
    this.crLoop = crBase.length >= 4;
    const crList = this.crLoop ? crBase.concat(crBase, crBase) : crBase;
    const lbI = typeof s.lb === 'number' ? s.lb : -1;
    const lbCard = lbI >= 0 ? toCard(creativeData[lbI], lbI) : toCard(creativeData[0], 0);
    const lbStep = (dir) => {
      const list = shown.length ? shown.map((x) => x.i) : creativeData.map((c, i) => i);
      let pos = list.indexOf(lbI);
      if (pos < 0) pos = 0;
      pos = (pos + dir + list.length) % list.length;
      this.setState({ lb: list[pos] });
    };

    const langs = [{ id: 'en', label: 'English', name: 'English' }, { id: 'ko', label: '한국어', name: 'Korean' }, { id: 'es', label: 'Español', name: 'Spanish' }];
    const lang = s.lang || 'en';
    const langName = (langs.filter((l) => l.id === lang)[0] || langs[0]).name;

    const pick1 = 'Choose one';
    const services10 = [pick1, 'Google Business Optimization', 'Website Development', 'Social Media Management', 'Meta Advertising', 'Branding & Graphic Design', 'CRM & Automation', 'Creator & Influencer Marketing', 'Business Growth Strategy', 'Multiple services', 'Not sure yet'];
    const F = {
      name: { id: 'name', label: 'Your name', type: 'text', req: true, ac: 'name' },
      biz: { id: 'business', label: 'Business name', type: 'text', req: true, ac: 'organization' },
      email: { id: 'email', label: 'Business email', type: 'email', req: true, ac: 'email' },
      email2: { id: 'email', label: 'Email', type: 'email', req: true, ac: 'email' },
      phone: { id: 'phone', label: 'Phone number', type: 'tel', ac: 'tel' },
      web: { id: 'website', label: 'Business website', type: 'url', ph: 'https://', ac: 'url' },
      ig: { id: 'instagram', label: 'Instagram account', type: 'text', ph: '@yourbusiness' }
    };
    const consent = { id: 'consent', label: 'Email me occasional marketing tips and updates from Sun Production. This is optional, and you will receive your resource either way.', type: 'check', full: true };
    const kinds = {
      guide: {
        title: 'Get the free Google Optimization Guidebook',
        sub: 'Tell us where to send it. You can open it right away, and we\'ll email you a copy.',
        fields: [F.name, F.biz, F.email, F.phone, { id: 'gbp', label: 'Google Business Profile link', type: 'url', req: true, ph: 'https://maps.app.goo.gl/...', full: true }, { id: 'nogbp', label: 'I don\'t have a Google Business Profile yet', type: 'check', full: true }, { id: 'category', label: 'Business category', type: 'select', opts: [pick1, 'Restaurant or café', 'Beauty and wellness', 'Real estate', 'Automotive', 'Retail', 'Professional services', 'Other'] }, { id: 'interest', label: 'Primary marketing interest', type: 'select', opts: [pick1, 'Showing up on Google', 'A better website', 'Social media', 'Meta ads', 'Branding', 'CRM and automation', 'Creator marketing', 'Not sure yet'] }, F.ig, F.web, { id: 'lang', label: 'Guide language', type: 'lang', full: true }, consent],
        submit: 'Get My Free Guide',
        doneTitle: 'Your guide is ready',
        doneText: s.emailed === false ? 'Your ' + langName + ' guide is ready to open now. We could not email a copy just now, but our team has been told and will send it to you.' : 'We\'ve emailed the ' + langName + ' guide to you. You can also open it now.',
        doneLink: 'Open the guide', doneHref: this.LEADS.guideBase + (this.LEADS.guideFiles[lang] || this.LEADS.guideFiles.en),
        offerQ: 'Want to know how your Business performs on Google?', offerLabel: 'Get a free business audit', offerTo: 'audit'
      },
      kit: {
        title: 'Get the Sun Production Media Kit',
        sub: 'Our services, packages and selected work in one interactive presentation.',
        fields: [F.name, F.biz, F.email, F.phone, F.web, F.ig, { id: 'service', label: 'Interested service', type: 'select', opts: services10 }, { id: 'start', label: 'Expected start', type: 'select', opts: [pick1, 'As soon as possible', 'Within a month', 'In 1 to 3 months', 'In 3 months or more', 'Just exploring'] }, consent],
        submit: 'Get the Media Kit',
        doneTitle: 'The Media Kit is yours',
        doneText: 'We\'ve emailed you the link as well, so you can come back to it anytime.',
        doneLink: 'Open the Media Kit', doneHref: 'https://sunproduction12.github.io/Media-Kit/',
        offerQ: 'Ready to explore what we can build together?', offerLabel: 'Book a consultation', offerTo: 'consult'
      },
      audit: {
        title: 'Get a free business audit',
        sub: 'We review your Google profile, website, social media and follow-up, then show you what to fix first.',
        fields: [F.name, F.biz, F.email, F.phone, F.web, { id: 'profile', label: 'Instagram or Google profile link', type: 'text' }, { id: 'industry', label: 'Industry', type: 'select', opts: [pick1, 'Restaurant or café', 'Beauty and wellness', 'Real estate', 'Automotive', 'Retail', 'Professional services', 'Other'] }, { id: 'help', label: 'What would you like help with?', type: 'area', full: true }],
        submit: 'Request My Free Audit',
        doneTitle: 'Your audit request is in',
        doneText: 'We\'ll review your business and email you to arrange the next step.',
        doneLink: '', doneHref: '',
        offerQ: 'Prefer to talk it through first?', offerLabel: 'Book a consultation', offerTo: 'consult'
      },
      consult: {
        title: 'Book a consultation',
        sub: 'Tell us a little about your Business and we\'ll reply with times to talk.',
        fields: [F.name, F.biz, F.email, F.phone, { id: 'service', label: 'Interested service', type: 'select', opts: services10 }, { id: 'time', label: 'Best time to talk', type: 'select', opts: [pick1, 'Morning', 'Afternoon', 'Evening'] }, { id: 'notes', label: 'Anything we should know before we talk?', type: 'area', full: true }],
        submit: 'Request a Consultation',
        doneTitle: 'Thanks, we\'ll be in touch',
        doneText: 'We\'ll email you with available times for your consultation.',
        doneLink: '', doneHref: '', offerQ: '', offerLabel: '', offerTo: ''
      },
      creator: {
        title: 'Join the Creator Network',
        sub: 'Tell us about you and your content. We\'ll reach out when a campaign fits.',
        note: 'Joining does not guarantee campaign selection, income or views.',
        fields: [F.name, F.email2, F.phone, { id: 'instagram', label: 'Instagram', type: 'text', ph: '@yourname' }, { id: 'tiktok', label: 'TikTok', type: 'text', ph: '@yourname' }, { id: 'youtube', label: 'YouTube', type: 'text', ph: 'Channel link' }, { id: 'category', label: 'Content category', type: 'select', req: true, opts: [pick1, 'Food and restaurants', 'Beauty and skincare', 'Fashion', 'Lifestyle', 'Fitness and wellness', 'Family', 'Travel', 'Tech', 'Other'] }, { id: 'portfolio', label: 'Portfolio or sample content link', type: 'url', ph: 'https://' }],
        submit: 'Join Creator Network',
        doneTitle: 'Welcome to the Creator Network',
        doneText: 'We\'ve saved your profile and will contact you when a campaign matches your content.',
        doneLink: '', doneHref: '', offerQ: '', offerLabel: '', offerTo: ''
      },
      partner: {
        title: 'Let\'s build something together',
        sub: 'Tell us what you do and the collaboration you have in mind.',
        fields: [F.name, { id: 'company', label: 'Company or studio', type: 'text', ac: 'organization' }, F.email2, { id: 'type', label: 'Collaboration type', type: 'select', req: true, opts: [pick1, 'Marketing agency', 'Videographer', 'Photographer', 'Designer', 'Developer', 'Business consultant', 'Community organization', 'Brand', 'Content creator', 'Other'] }, { id: 'portfolio', label: 'Portfolio link', type: 'url', ph: 'https://', full: true }, { id: 'proposal', label: 'Your proposal', type: 'area', req: true, full: true }],
        submit: 'Send Inquiry',
        doneTitle: 'Thanks for reaching out',
        doneText: 'We\'ll review your inquiry and get back to you by email.',
        doneLink: '', doneHref: '', offerQ: '', offerLabel: '', offerTo: ''
      },
      dir: {
        title: 'Get early access to the directories',
        sub: 'The Philadelphia and Colorado Korean Business Directories are being built now. Leave your email and we\'ll tell you when they launch.',
        fields: [F.name, F.email2, { id: 'business', label: 'Business name, if you own one', type: 'text', ac: 'organization' }, { id: 'region', label: 'Directory', type: 'select', req: true, opts: [pick1, 'Philadelphia area', 'Colorado (Aurora, Denver)', 'Both'] }, { id: 'listing', label: 'I own a business and want it listed, or I need a listing corrected.', type: 'check', full: true }],
        submit: 'Notify Me',
        doneTitle: 'You\'re on the list',
        doneText: 'We\'ll email you when the directory opens.',
        doneLink: '', doneHref: '',
        offerQ: 'Own a business? See how it shows up on Google.', offerLabel: 'Get a free business audit', offerTo: 'audit'
      }
    };
    const mk = kinds[s.modal] || kinds.guide;
    const errs = s.errs || {};
    const fields = mk.fields.map((f) => ({
      id: f.id,
      label: f.label,
      reqMark: f.req ? '*' : '',
      ariaReq: f.req ? 'true' : 'false',
      type: f.type === 'select' || f.type === 'area' || f.type === 'check' || f.type === 'lang' ? 'text' : f.type,
      ac: f.ac || 'off',
      ph: f.ph || '',
      opts: f.opts || [],
      span: f.full || f.type === 'area' || f.type === 'check' || f.type === 'lang' ? '1 / -1' : 'auto',
      isInput: ['text', 'email', 'tel', 'url'].indexOf(f.type) >= 0,
      isSelect: f.type === 'select',
      isArea: f.type === 'area',
      isCheck: f.type === 'check',
      isLang: f.type === 'lang',
      hasErr: !!errs[f.id],
      err: errs[f.id] || '',
      errId: f.id + '-err',
      invalid: errs[f.id] ? 'true' : 'false',
      bd: errs[f.id] ? '#B42318' : '#C9D5E1'
    }));
    const go = (kind) => () => this.openModal(kind);


    return {
      accent: accent,
      accentDeep: accentDeep,
      accentTint: accentTint,

      cr: (() => { const k = s.crStep || 0; const o = { y: (k * 106) + 'px' }; [0, 1, 2].forEach((i) => { o['h' + i] = i === k ? accentDeep : '#B3C0CC'; o['o' + i] = i === k ? 1 : 0.55; }); return o; })(),
      menuOpen: !!s.menuOpen,
      menuExp: s.menuOpen ? 'true' : 'false',
      toggleMenu: () => this.setState({ menuOpen: !s.menuOpen }),
      closeMenu: () => this.setState({ menuOpen: false }),

      openAudit: go('audit'),
      openConsult: go('consult'),
      openGuide: go('guide'),
      openKit: go('kit'),
      openCreator: go('creator'),
      openPartner: go('partner'),
      openDir: go('dir'),

      tabs: industries.map((t, i) => ({ label: t.label, pressed: i === iIdx ? 'true' : 'false', bg: i === iIdx ? '#14202B' : 'transparent', fg: i === iIdx ? '#FFFFFF' : '#3B4A58', pick: () => this.setState({ industry: i }) })),
      search: ind.search,
      bizName: ind.bizName,
      bizCat: ind.bizCat,
      sh0: iIdx === 0 ? 1 : 0,
      sh1: iIdx === 1 ? 1 : 0,
      sh2: iIdx === 2 ? 1 : 0,
      sh3: iIdx === 3 ? 1 : 0,
      siteUrl: ind.siteUrl,
      siteHeadline: ind.siteHeadline,
      siteCta: ind.siteCta,
      msg: ind.msg,
      msg2: ind.msg2,

      probs: probShort.map((label, i) => {
        const on = i === pIdx;
        return { n: '0' + (i + 1), label: label, pressed: on ? 'true' : 'false', bar: on ? accentDeep : 'rgba(20, 32, 43, 0.12)', fg: on ? '#14202B' : '#3D4C5A', w: on ? 700 : 500, numC: on ? accentDeep : '#4A5A69', pick: () => this.setState({ prob: i }) };
      }),
      ps: { s0: pIdx === 0, s1: pIdx === 1, s2: pIdx === 2, s3: pIdx === 3, s4: pIdx === 4, s5: pIdx === 5, s6: pIdx === 6 },

      workSub: caseData.some((c) => this.VERIFIED[c.v]) ? 'Websites, Google optimization, creator campaigns and ads for real businesses, with the results they produced.' : 'Websites, Google optimization, creator campaigns and ads for real businesses.',
      cases: caseData.map((c, i) => ({ img: this.VERIFIED[c.v] ? c.img : (c.imgSafe || c.img), pos: c.pos, name: c.name, tag: c.tag, num: c.num, cap: c.cap, hasNum: !!this.VERIFIED[c.v], noNum: !this.VERIFIED[c.v], aria: 'Open the ' + c.name + ' case study', open: () => this.setState({ cs: i, menuOpen: false }) })),
      caseOpen: csI >= 0,
      cz: Object.assign({}, caseData[csI >= 0 ? csI : 0], { hasNum: !!this.VERIFIED[caseData[csI >= 0 ? csI : 0].v], img: this.VERIFIED[caseData[csI >= 0 ? csI : 0].v] ? caseData[csI >= 0 ? csI : 0].img : (caseData[csI >= 0 ? csI : 0].imgSafe || caseData[csI >= 0 ? csI : 0].img) }),
      closeCase: () => this.setState({ cs: -1 }),
      caseGo: { c0: () => this.setState({ cs: 0 }), c1: () => this.setState({ cs: 1 }), c2: () => this.setState({ cs: 2 }), c3: () => this.setState({ cs: 3 }), c4: () => this.setState({ cs: 4 }), c5: () => this.setState({ cs: 5 }) },
      casePrev: () => this.setState({ cs: (csI + caseData.length - 1) % caseData.length }),
      caseNext: () => this.setState({ cs: (csI + 1) % caseData.length }),

      cfTabs: filters.map((f) => {
        const id = f === 'All' ? 'all' : f;
        const on = id === cf;
        return { label: f, pressed: on ? 'true' : 'false', bg: on ? '#14202B' : '#FFFFFF', fg: on ? '#FFFFFF' : '#14202B', bd: on ? '#14202B' : '#C9D5E1', pick: () => { this.setState({ cf: id }); setTimeout(() => this.centerCreative(), 60); } };
      }),
      creative: crList,
      cfEmpty: shown.length === 0,
      cfName: cf === 'all' ? 'creative' : cf.toLowerCase(),
      crPrev: () => { this.crHold = performance.now() + 7000; this.scrollCreative(-1); },
      crNext: () => { this.crHold = performance.now() + 7000; this.scrollCreative(1); },
      crPause: () => { this.crHover = true; },
      crResume: () => { this.crHover = false; },

      lbOpen: lbI >= 0,
      lb: lbCard,
      closeLb: () => this.setState({ lb: -1 }),
      lbPrev: () => lbStep(-1),
      lbNext: () => lbStep(1),

      langs: langs.map((l) => ({ label: l.label, pressed: l.id === lang ? 'true' : 'false', bg: l.id === lang ? '#14202B' : '#FFFFFF', fg: l.id === lang ? '#FFFFFF' : '#14202B', bd: l.id === lang ? '#14202B' : '#C9D5E1', pick: () => this.setState({ lang: l.id }) })),

      modalOpen: !!s.modal,
      formView: !!s.modal && !s.sent,
      doneView: !!s.modal && !!s.sent,
      m: {
        title: mk.title,
        sub: mk.sub,
        note: mk.note || '',
        hasNote: !!mk.note,
        submit: s.sending ? 'Sending...' : mk.submit,
        sending: s.sending ? 'true' : 'false',
        hasSendErr: !!s.sendErr,
        sendErr: s.sendErr || '',
        doneTitle: mk.doneTitle,
        doneText: mk.doneText,
        hasDoneLink: !!mk.doneLink,
        doneLink: mk.doneLink,
        doneHref: mk.doneHref,
        hasOffer: !!mk.offerTo,
        offerQ: mk.offerQ,
        offerLabel: mk.offerLabel,
        offerGo: () => { if (mk.offerTo) this.openModal(mk.offerTo); }
      },
      fields: fields,
      submitForm: (e) => this.submit(e, mk.fields),
      closeModal: () => this.closeModal()
    };
  }
}

var __app = document.getElementById('app');
(__app.firstElementChild ? preact.hydrate : preact.render)(preact.h(Component, {}), __app);
