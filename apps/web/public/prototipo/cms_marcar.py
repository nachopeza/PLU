# Marca los textos e imágenes de cada página como editables desde la intranet.
# Cada elemento recibe data-cms="clave" (o data-cmsimg para fotos). La clave sale de un resumen del texto original,
# así no cambia si se mueve el elemento, y los cambios guardados se aplican encima del texto de partida.
import hashlib, re, json
from html.parser import HTMLParser

LEAF = {'h1', 'h2', 'h3', 'h4', 'p', 'small', 'li', 'dt', 'dd', 'figcaption', 'blockquote'}
INLINE = {'em', 'strong', 'b', 'i', 'br', 'a'}
VOID = {'br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'wbr', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse'}
OMITIR_DENTRO = {'script', 'style', 'svg', 'form', 'select', 'textarea', 'option', 'button', 'noscript'}


class Nodo:
    def __init__(self, tag, attrs, ini, fin_ini, padre):
        self.tag, self.attrs, self.ini, self.fin_ini, self.padre = tag, dict(attrs), ini, fin_ini, padre
        self.hijos, self.fin = [], None  # fin = posición del inicio de la etiqueta de cierre


class Arbol(HTMLParser):
    def __init__(self, texto):
        super().__init__(convert_charrefs=False)
        self.texto = texto
        self.lineas = [0]
        for m in re.finditer('\n', texto):
            self.lineas.append(m.end())
        self.raiz = Nodo('#raiz', [], 0, 0, None)
        self.actual = self.raiz

    def off(self):
        l, c = self.getpos()
        return self.lineas[l - 1] + c

    def handle_starttag(self, tag, attrs):
        ini = self.off()
        n = Nodo(tag, attrs, ini, ini + len(self.get_starttag_text()), self.actual)
        self.actual.hijos.append(n)
        if tag not in VOID:
            self.actual = n

    def handle_startendtag(self, tag, attrs):
        ini = self.off()
        n = Nodo(tag, attrs, ini, ini + len(self.get_starttag_text()), self.actual)
        n.fin = n.fin_ini
        self.actual.hijos.append(n)

    def handle_endtag(self, tag):
        n = self.actual
        while n is not self.raiz and n.tag != tag:
            n = n.padre
        if n is not self.raiz:
            n.fin = self.off()
            self.actual = n.padre


def _hash(s):
    return hashlib.sha1(re.sub(r'\s+', ' ', s).strip().encode()).hexdigest()[:8]


def marcar(html, pagina):
    t = Arbol(html)
    t.feed(html)
    inserciones = []  # (posición, texto)
    vistos = {}

    def clave(base, ambito):
        k = f'{ambito}{base}'
        vistos[k] = vistos.get(k, 0) + 1
        return k if vistos[k] == 1 else f'{k}~{vistos[k]}'

    def recorrer(n, ambito, omitir):
        if n.tag in ('header', 'footer'):
            ambito = 'g:'
        if n.tag in OMITIR_DENTRO or 'icoc' in n.attrs.get('class', '').split() or 'data-cms-skip' in n.attrs:
            omitir = True
        if n.tag == 'main':
            ambito = ''
        if not omitir and n.fin is not None and 'id' not in n.attrs:
            if n.tag in LEAF or (n.tag in ('span', 'a', 'b') and any(c in n.attrs.get('class', '').split() for c in ('eyebrow', 'tag', 'btn', 'chip', 'link', 'link-arrow', 'split')) ) or (n.tag == 'b' and n.padre is not None and n.padre.tag == 'span'):
                if all(c.tag in INLINE and (c.tag != 'a' or not c.hijos or all(g.tag in INLINE - {'a'} for g in c.hijos)) for c in n.hijos):
                    interior = html[n.fin_ini:n.fin]
                    if re.sub(r'<[^>]+>|&nbsp;|\s', '', interior):
                        # un enlace que ocupa todo un <li> o un botón: solo el texto
                        k = clave(_hash(interior), ambito or f'{pagina}:')
                        inserciones.append((n.fin_ini - 1 if html[n.fin_ini - 2:n.fin_ini] != '/>' else n.fin_ini - 2, f' data-cms="{k}"'))
                        return  # no marcar hijos
        if n.tag == 'img' and not omitir and ambito == '' and 'src' in n.attrs and not n.attrs['src'].startswith(('brand/', 'data:')):
            k = clave(_hash(n.attrs['src']), 'img:')
            pos = n.fin_ini - 2 if html[n.fin_ini - 2:n.fin_ini] == '/>' else n.fin_ini - 1
            inserciones.append((pos, f' data-cmsimg="{k}"'))
        for c in n.hijos:
            recorrer(c, ambito, omitir)

    recorrer(t.raiz, '', False)
    for pos, txt in sorted(inserciones, reverse=True):
        html = html[:pos] + txt + html[pos:]
    return html


def indice_paginas(paginas, destino):
    destino.write_text(json.dumps([{'archivo': f, 'titulo': t.split(' · ')[0]} for f, t in paginas if f not in ('intranet.html', 'idea.html')], ensure_ascii=False, indent=1))
