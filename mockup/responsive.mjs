// Single source of truth for the mockup's responsive layer, shared by the
// generator (build.mjs) and the in-place patcher (patch-responsive.mjs) so the
// 40 hand-tuned pages and any newly scaffolded one stay in sync.
//
// Behaviour, in short:
//   > 720px  — the top nav stays on exactly one row. Two compaction steps
//              (1000px / 860px) shrink the link padding and font so the six
//              top-level items keep fitting. The nav is deliberately NOT a
//              scroll container: any overflow value other than `visible` makes
//              it clip the absolutely-positioned hover dropdowns (which are its
//              descendants), so they'd open but stay invisible.
//   <= 720px — the nav collapses into a hamburger drawer, and its dropdowns
//              become tap-to-open accordions (hover is useless on touch).
//   <= 560px / <= 400px — progressive tightening of the content components.
//
// This is mockup-stage responsiveness: enough that every page reads well at
// phone/tablet widths. Per-component polish belongs in the real Astro build.

// Keep in sync with the MOBILE_NAV_BREAKPOINT used in NAV_TOGGLE_JS below.
export const VIEWPORT_META = '<meta name="viewport" content="width=device-width, initial-scale=1">';

export const RESPONSIVE_CSS = `
  /* ===== responsive ===== */
  body{overflow-wrap:break-word}
  img,svg,video{max-width:100%}
  .site-header{position:relative}
  /* One row, always: the shrink steps below keep the six items fitting. Do NOT
     give this an overflow value other than visible — a scroll container clips
     the absolutely-positioned hover dropdowns nested inside it. Never wrap. */
  .primary-nav{flex-wrap:nowrap}
  .pagebanner{flex-wrap:wrap}
  .nav-toggle{display:none;position:absolute;inset-block-start:15px;inset-inline-start:16px;z-index:30;
    width:42px;height:42px;padding:0;border:none;background:transparent;cursor:pointer;
    align-items:center;justify-content:center;border-radius:var(--radius)}
  .nav-toggle:hover{background:color-mix(in oklab,var(--tan) 22%,transparent)}
  .nav-toggle .bars{position:relative}
  .nav-toggle .bars,.nav-toggle .bars::before,.nav-toggle .bars::after{
    display:block;width:22px;height:2px;border-radius:2px;background:var(--brown);
    transition:transform .25s,background-color .2s}
  .nav-toggle .bars::before,.nav-toggle .bars::after{content:"";position:absolute;inset-inline-start:0}
  .nav-toggle .bars::before{top:-7px}
  .nav-toggle .bars::after{top:7px}
  .nav-open .nav-toggle .bars{background:transparent}
  .nav-open .nav-toggle .bars::before{transform:translateY(7px) rotate(45deg)}
  .nav-open .nav-toggle .bars::after{transform:translateY(-7px) rotate(-45deg)}

  @media (max-width:1000px){
    .brand-row,.primary-nav{padding-inline:18px}
    .nav-link{padding:12px 11px;font-size:.9rem}
    .dropdown{min-width:230px}
  }
  @media (max-width:860px){
    .nav-link{padding:12px 8px;font-size:.85rem;gap:4px}
    .nav-link .icon-inline{width:12px;height:12px}
    .dropdown{min-width:210px}
  }

  /* ---- hamburger drawer ---- */
  @media (max-width:720px){
    .nav-toggle{display:flex}
    .brand-row{padding-block:16px 10px;padding-inline-start:62px;padding-inline-end:20px}
    .brand-name{font-size:1.2rem}
    .brand-tagline{font-size:.7rem;letter-spacing:.1em}
    .primary-nav{flex-direction:column;gap:0;padding:0 14px;overflow-x:visible;
      max-height:0;overflow-y:hidden;transition:max-height .3s ease}
    .nav-open .primary-nav{max-height:78vh;overflow-y:auto;padding-bottom:12px}
    .nav-item{width:100%}
    .nav-link{justify-content:space-between;padding:13px 8px;font-size:.98rem;
      border-bottom:1px solid var(--beige);border-radius:var(--radius)}
    .nav-link .icon-inline{width:15px;height:15px;transition:transform .2s}
    .nav-link:hover,.nav-link.active{border-bottom-color:var(--beige)}
    .nav-link.active{color:var(--brown-dark);font-weight:600;
      background:color-mix(in oklab,var(--tan) 20%,transparent)}
    .nav-item.open>.nav-link .icon-inline{transform:rotate(180deg)}
    .dropdown{position:static;display:block;min-width:0;padding:0;border:none;border-radius:0;
      background:transparent;box-shadow:none;max-height:0;overflow:hidden;transition:max-height .28s ease}
    .nav-item.open>.dropdown{max-height:680px;padding:2px 0 10px}
    .dropdown-link{padding:9px 18px;font-size:.9rem}
    .dropdown-link:hover,.dropdown-link.active{background:transparent;color:var(--brown-dark);font-weight:600}
    .dropdown-head{padding:8px 18px 2px}

    main{padding:22px 18px 56px}
    h1{font-size:1.75rem}
    main > p:first-of-type{font-size:1rem}
    section.card{padding:18px;border-radius:14px}
    .pagebanner{padding:8px 14px;border-radius:14px}
    .art-hero{height:200px}
    .art-hero .frame{height:78%;margin-inline-end:18px}
    .art-hero .cap{padding:0 18px 16px;max-width:56%}
    .art-hero .cap b{font-size:1.02rem}
    .art-hero .cap span{font-size:.76rem}
    .ph-image{min-height:160px}
    .hero-image{min-height:200px}
    .grid.cols-3{grid-template-columns:repeat(2,1fr)}
    .gallery{grid-template-columns:repeat(2,1fr)}
    .stat-row{gap:10px}
    .stat{padding:16px 8px}
    .stat .num{font-size:1.8rem}
    .stat .lbl{font-size:.76rem}
    .carousel .track>*,.carousel .track .ecard{width:min(270px,74vw)}
    .form{grid-template-columns:1fr}
    /* wide tables still scroll sideways — show the bar so that's discoverable */
    .table-wrap{padding-bottom:6px;scrollbar-width:thin}
    .table-wrap::-webkit-scrollbar{height:6px}
    .table-wrap::-webkit-scrollbar-track{background:var(--beige);border-radius:3px}
    .table-wrap::-webkit-scrollbar-thumb{background:var(--tan);border-radius:3px}
  }

  @media (max-width:560px){
    main{padding:18px 14px 50px}
    h1{font-size:1.55rem}
    section.card{padding:16px 14px}
    .art-hero{height:170px;border-radius:14px}
    .art-hero .frame{height:74%;margin-inline-end:14px;border-width:2px}
    .art-hero .cap{padding:0 14px 12px;max-width:58%}
    .art-hero .cap b{font-size:.94rem}
    .art-hero .cap span{font-size:.72rem}
    .grid.cols-2,.grid.cols-3{grid-template-columns:1fr}
    .grid .ecard .thumb{height:150px}
    .stat-row{gap:8px}
    .stat{padding:14px 6px}
    .stat .num{font-size:1.5rem}
    .stat .lbl{font-size:.72rem}
    .gallery{gap:8px}
    .gallery .tile .play svg{width:36px;height:36px}
    .person{padding:14px;gap:11px}
    .avatar{width:46px;height:46px;font-size:1.05rem}
    table{font-size:.86rem}
    th,td{padding:8px 10px}
    th{white-space:normal}
    .tab-btn{padding:7px 14px;font-size:.8rem}
    .btn{padding:9px 16px;font-size:.86rem}
    blockquote{padding:11px 13px}
    ul{padding-inline-start:16px}
    .map-legend{font-size:.72rem;padding:7px 10px;inset-block-end:10px;inset-inline-start:10px}
    footer.site-footer{padding:24px 16px 40px}
  }

  @media (max-width:400px){
    .brand-name{font-size:1.06rem}
    main{padding:16px 12px 44px}
    h1{font-size:1.4rem}
    section.card{padding:14px 12px}
    .art-hero{height:150px}
    .art-hero .cap{max-width:60%}
    .stat{padding:12px 4px}
    .stat .num{font-size:1.3rem}
    .stat .lbl{font-size:.68rem}
    .field input,.field select,.field textarea{font-size:16px}
  }
`;

export const NAV_TOGGLE_HTML =
  '  <button type="button" class="nav-toggle" aria-label="פתיחת תפריט" aria-expanded="false" aria-controls="primary-nav">' +
  '<span class="bars" aria-hidden="true"></span></button>';

// Drawer open/close + tap-to-open dropdown accordions. The first tap on a
// parent item opens its submenu; a second tap follows the link (parents that
// have no page of their own are <span>s, so they only ever toggle).
export const NAV_TOGGLE_JS =
  `<script>(function(){var header=document.querySelector('.site-header');var toggle=header&&header.querySelector('.nav-toggle');var nav=document.getElementById('primary-nav');if(!header||!toggle||!nav)return;var mq=window.matchMedia('(max-width:720px)');function close(){header.classList.remove('nav-open');toggle.setAttribute('aria-expanded','false');}toggle.addEventListener('click',function(){var open=header.classList.toggle('nav-open');toggle.setAttribute('aria-expanded',open?'true':'false');toggle.setAttribute('aria-label',open?'סגירת תפריט':'פתיחת תפריט');});nav.addEventListener('click',function(e){if(!mq.matches)return;var link=e.target.closest('.nav-link');if(!link)return;var item=link.closest('.nav-item');if(!item||!item.querySelector('.dropdown')||item.classList.contains('open'))return;e.preventDefault();nav.querySelectorAll('.nav-item.open').forEach(function(o){o.classList.remove('open');});item.classList.add('open');});document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});mq.addEventListener('change',function(){close();nav.querySelectorAll('.nav-item.open').forEach(function(o){o.classList.remove('open');});});})();</script>`;
