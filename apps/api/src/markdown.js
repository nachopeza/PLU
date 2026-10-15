// Formato sencillo para los textos legales (mismo que md_html en paginas_comunidad.py):
//   ## Título · ### Subtítulo · - lista · **negrita** · [texto](https://… | /ruta | mailto:…)
// Todo lo demás se escapa, así que nadie puede colar HTML ni scripts.
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const inline = (t) => esc(t)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|mailto:)[^)\s]*)\)/g, '<a class="link" href="$2">$1</a>');

export function mdHtml(md) {
  const out = []; let lista = [], par = [];
  const cierra = () => {
    if (par.length) { out.push(`<p>${inline(par.join(' '))}</p>`); par = []; }
    if (lista.length) { out.push(`<ul>${lista.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`); lista = []; }
  };
  for (const linea of String(md).replace(/\r/g, '').split('\n')) {
    const l = linea.replace(/\s+$/, '');
    if (!l.trim()) { cierra(); continue; }
    let m = /^(#{2,3})\s+(.*)$/.exec(l);
    if (m) { cierra(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    m = /^[-*]\s+(.*)$/.exec(l);
    if (m) { if (par.length) cierra(); lista.push(m[1]); continue; }
    if (lista.length) cierra();
    par.push(l.trim());
  }
  cierra();
  return out.join('\n');
}
// Huecos por rellenar: [texto entre corchetes] que no sea un enlace [texto](url)
export const pendientes = (md) => (String(md).match(/\[[^\]\n]{2,}\](?!\()/g) ?? []);
