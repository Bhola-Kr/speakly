import webCatalog from './webCatalog.json';
import catalog from './catalog.json';
import type { AppLanguage } from './language';

// Execute only inside Speakly pages. Keep original nodes so switching back does
// not repeatedly translate already translated text or alter links/form values.
export function webLocalizationScript(language: AppLanguage) {
  const enToHi = {
    ...Object.fromEntries(Object.entries(catalog).map(([hi, en]) => [en, hi])),
    ...webCatalog,
  };
  return `(function(){
    if (!/(^|\\.)joinspeakly\\.com$/.test(location.hostname)) return true;
    const dictionary = ${JSON.stringify(enToHi)};
    const english = ${JSON.stringify(catalog)};
    const selected = ${JSON.stringify(language)};
    const clean = value => value.replace(/spoken[- ]language practice/gi,'voice communication').replace(/language[- ]practice/gi,'communication').replace(/practise spoken language/gi,'communicate').replace(/practice partners/gi,'conversation partners').replace(/practise speaking/gi,'communicate').replace(/practising/gi,'speaking').replace(/practise/gi,'speak').replace(/practice/gi,'conversation');
    const state = window.__speaklyLocale || (window.__speaklyLocale = {original: new WeakMap(), observer: null, attributes: new WeakMap()});
    if (state.observer) state.observer.disconnect();
    const apply = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        if (!node.parentElement || node.parentElement.closest('script,style,textarea,input,[contenteditable=true]')) continue;
        if (!state.original.has(node)) state.original.set(node,node.nodeValue);
        const original = state.original.get(node), key = original.trim().replace(/\\s+/g,' ');
        const translated = selected === 'hinglish' ? (dictionary[key] || key) : (english[key] || key);
        const next = original.replace(original.trim(),clean(translated));
        if (node.nodeValue !== next) node.nodeValue = next;
      }
      document.querySelectorAll('[placeholder],[title],[alt],[aria-label]').forEach(element => {
        if (!state.attributes.has(element)) state.attributes.set(element,{});
        const originals = state.attributes.get(element);
        ['placeholder','title','alt','aria-label'].forEach(attribute => {
          if (!element.hasAttribute(attribute)) return;
          if (!(attribute in originals)) originals[attribute] = element.getAttribute(attribute);
          const original = originals[attribute];
          const next = clean(selected === 'hinglish' ? (dictionary[original] || original) : (english[original] || original));
          if (element.getAttribute(attribute) !== next) element.setAttribute(attribute,next);
        });
      });
      document.documentElement.lang = selected === 'en' ? 'en' : 'hi-Latn';
      state.observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','alt','aria-label']});
    };
    state.observer = new MutationObserver(() => {state.observer.disconnect();apply();});
    if (document.body) apply();
    return true;
  })();true;`;
}
