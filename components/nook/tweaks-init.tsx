const SCRIPT = `
(function(){
  try {
    var BRANDS = {
      olive:  {'--brand-500':'#6B7A3A','--brand-600':'#556230','--brand-700':'#3F4A24','--brand-50':'#F2F4EA','--brand-100':'#E1E6CD','--brand-200':'#C9D2A6'},
      burnt:  {'--brand-500':'#C85A2A','--brand-600':'#A8461E','--brand-700':'#7E3414','--brand-50':'#FBEDE3','--brand-100':'#F3D2BC','--brand-200':'#E5A883'},
      red:    {'--brand-500':'#E63946','--brand-600':'#C92434','--brand-700':'#A31C29','--brand-50':'#FFEEEF','--brand-100':'#FFD7DA','--brand-200':'#FFB8BD'}
    };
    var brand = localStorage.getItem('nook.brand') || 'burnt';
    var density = localStorage.getItem('nook.density') || 'default';
    var lang = localStorage.getItem('nook.lang') || 'en';
    var root = document.documentElement;
    var c = BRANDS[brand] || BRANDS.burnt;
    Object.keys(c).forEach(function(k){ root.style.setProperty(k, c[k]); });
    root.dataset.density = density;
    root.dataset.lang = lang;
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    root.setAttribute('lang', lang === 'ms' ? 'ms' : lang === 'ar' ? 'ar' : 'en');
  } catch(e){}
})();
`;

export function TweaksInit() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
