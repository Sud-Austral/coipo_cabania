# -*- coding: utf-8 -*-
"""Capturas de docs/Documentacion_Sistema2/_imagenes por CDP, contra la demo de scripts/demo_docs.py.

La demo es la maqueta (frontend del commit 0d44fb3, el último que compila) con los RUT y correos de las
semillas pasados a valores obviamente ficticios, compilada y servida con `vite preview` en 127.0.0.1. No hay
backend. Chrome headless arranca con perfil propio y sin resolver ningún nombre externo (--host-resolver-rules);
las teselas del mapa se interceptan por CDP (Fetch) y se responden con una tesela lisa. El perfil se elige
escribiendo localStorage «coipo_rol_v1», lo mismo que hace el selector. Nombres: scripts/docgen/decisiones.py.

    python scripts/capturar_pantallas.py --url http://127.0.0.1:<puerto> [--puerto-cdp N] [--perfil <dir>] [--solo 03b,10]
"""
import argparse
import base64
import json
import os
import pathlib
import struct
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
import zlib

import websocket

RAIZ = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "scripts"))
from docgen.comun import RAIZ_DOC  # noqa: E402
from docgen.decisiones import CAPTURAS  # noqa: E402

DIR = RAIZ / RAIZ_DOC / "_imagenes"
PUERTO_CDP = 9348


def tesela_lisa():
    fila = b"\x00" + b"\xe8\xec\xe4" * 256
    crudo = zlib.compress(fila * 256)

    def trozo(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + trozo(b"IHDR", struct.pack(">IIBBBBB", 256, 256, 8, 2, 0, 0, 0))
            + trozo(b"IDAT", crudo) + trozo(b"IEND", b""))


TESELA = base64.b64encode(tesela_lisa()).decode()


class Pestana:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=60, suppress_origin=True)
        self.n = 0

    def _atender(self, m):
        if m.get("method") == "Fetch.requestPaused":
            p = m["params"]
            self.ws.send(json.dumps({"id": 10**6 + self.n, "method": "Fetch.fulfillRequest", "params": {
                "requestId": p["requestId"], "responseCode": 200,
                "responseHeaders": [{"name": "Content-Type", "value": "image/png"}], "body": TESELA}}))

    def cmd(self, metodo, **params):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": metodo, "params": params}))
        while True:
            m = json.loads(self.ws.recv())
            self._atender(m)
            if m.get("id") == self.n:
                if "error" in m:
                    raise RuntimeError(f"{metodo}: {m['error']}")
                return m.get("result", {})

    def esperar(self, s):
        fin = time.time() + s
        self.ws.settimeout(0.2)
        while time.time() < fin:
            try:
                self._atender(json.loads(self.ws.recv()))
            except websocket.WebSocketTimeoutException:
                pass
        self.ws.settimeout(60)

    def js(self, codigo):
        r = self.cmd("Runtime.evaluate", expression=codigo, awaitPromise=True, returnByValue=True)
        return r.get("result", {}).get("value")

    def ir(self, url, espera=4):
        self.cmd("Page.navigate", url=url)
        self.esperar(espera)

    def foto(self, nombre):
        datos = self.cmd("Page.captureScreenshot", format="png")["data"]
        (DIR / nombre).write_bytes(base64.b64decode(datos))
        print("  ", DIR / nombre, flush=True)


def clic_texto(p, selector, texto, espera=2):
    ok = p.js("""(() => { const b=[...document.querySelectorAll(%s)].find(e=>e.textContent.trim().startsWith(%s));
      if(!b) return false; b.scrollIntoView({block:'center'}); b.click(); return true })()""" % (json.dumps(selector), json.dumps(texto)))
    if not ok:
        raise RuntimeError("no encontré %s «%s»" % (selector, texto))
    p.esperar(espera)


def a_la_vista(p, codigo_elemento, bloque="start"):
    p.js("(() => { const e = %s; if (e) e.scrollIntoView({block:'%s'}); })()" % (codigo_elemento, bloque))
    p.esperar(1.5)


def titulo_h2(texto):
    return "[...document.querySelectorAll('h2,h3')].find(h=>h.textContent.includes(%s))" % json.dumps(texto)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--chrome", default=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    ap.add_argument("--puerto-cdp", type=int, default=PUERTO_CDP)
    ap.add_argument("--perfil", default=None)
    ap.add_argument("--solo", default="")
    a = ap.parse_args()
    u = a.url.rstrip("/")
    host = urllib.parse.urlparse(u).hostname
    print("La demo apunta a:", u, "(host %s)" % host, flush=True)
    if host not in ("127.0.0.1", "localhost"):
        sys.exit("La demo no es local: me detengo.")
    solo = {s for s in a.solo.split(",") if s}
    esperados = [c[0] for c in CAPTURAS]
    DIR.mkdir(parents=True, exist_ok=True)
    perfil = a.perfil or tempfile.mkdtemp(prefix="cdp-cabania-")
    chrome = subprocess.Popen([a.chrome, "--headless=new", f"--remote-debugging-port={a.puerto_cdp}",
                               "--user-data-dir=" + perfil, "--window-size=1440,900", "--hide-scrollbars",
                               "--no-first-run", "--no-default-browser-check", "--disable-background-networking",
                               "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1", "about:blank"])
    print("PID chrome", chrome.pid, flush=True)
    hechos = []
    try:
        ws = None
        for _ in range(60):
            try:
                lista = json.load(urllib.request.urlopen(f"http://127.0.0.1:{a.puerto_cdp}/json"))
                ws = next(x["webSocketDebuggerUrl"] for x in lista if x["type"] == "page")
                break
            except Exception:
                time.sleep(0.5)
        p = Pestana(ws)
        p.cmd("Page.enable")
        p.cmd("Fetch.enable", patterns=[{"urlPattern": "*tile.openstreetmap.org*"}])
        p.cmd("Emulation.setDeviceMetricsOverride", width=1440, height=900, deviceScaleFactor=1, mobile=False)

        def como(rol, ruta, espera=3, reiniciar=False):
            p.ir(u + "/catalogo", 2)
            p.js("(() => { %s localStorage.setItem('coipo_rol_v1', %s); })()"
                 % ("localStorage.removeItem('coipo_demo_v1');" if reiniciar else "", json.dumps(rol)))
            p.ir(u + ruta, espera)

        def hacer(nombre, accion):
            if solo and nombre.split("-")[0] not in solo:
                return
            try:
                accion()
                p.foto(nombre)
                hechos.append(nombre)
            except Exception as e:  # noqa: BLE001
                print("  FALLÓ", nombre, e, flush=True)

        def boton(texto, espera=1.5):
            clic_texto(p, "button", texto, espera)

        def dias(n1, n2):
            # Mes siguiente del calendario (react-day-picker) y dos días habilitados.
            p.js("""(() => { const s=[...document.querySelectorAll('button')].find(b=>/siguiente|next/i.test(b.getAttribute('aria-label')||''));
                 if (s) s.click(); })()""")
            p.esperar(1)
            n = p.js("(() => document.querySelectorAll('td button:not([disabled])').length)()")
            if not n or n <= n2:
                raise RuntimeError("calendario: %s días habilitados" % n)
            p.js("(() => { document.querySelectorAll('td button:not([disabled])')[%d].click(); })()" % n1)
            p.esperar(0.8)
            p.js("(() => { document.querySelectorAll('td button:not([disabled])')[%d].click(); })()" % n2)
            p.esperar(1.5)

        # ---------------- Afiliado/a (reinicio: datos semilla)
        hacer("01-afi-catalogo.png", lambda: como("afiliado", "/catalogo", reiniciar=True))
        hacer("02-afi-ficha.png", lambda: (como("afiliado", "/inmuebles/1", 4), a_la_vista(p, titulo_h2("Disponibilidad"))))

        def reservar1():
            como("afiliado", "/inmuebles/1/reservar", 3)
            dias(3, 6)
        hacer("03-afi-reservar-fechas.png", reservar1)

        def reservar2():
            boton("Continuar")
            p.js("(() => { [...document.querySelectorAll('input[type=checkbox]')].slice(0,2).forEach(c=>c.click()); })()")
            p.esperar(1)
        hacer("03b-afi-reservar-ocupantes.png", reservar2)
        hacer("03c-afi-reservar-tarifa.png", lambda: boton("Continuar"))
        hacer("03d-afi-reservar-confirmar.png", lambda: boton("Continuar"))
        hacer("04-afi-comprobante.png", lambda: boton("Enviar solicitud", 3))
        hacer("05-afi-mis-reservas.png", lambda: como("afiliado", "/mis-reservas", 3))
        hacer("05b-afi-desistir.png", lambda: boton("Desistir"))

        def valorar():
            como("afiliado", "/mis-reservas", 3)
            boton("Valorar")
            p.js("(() => { const b=[...document.querySelectorAll('button')].filter(x=>/4/.test(x.getAttribute('aria-label')||'')); if(b.length) b[b.length-1].click(); })()")
            p.esperar(1)
        hacer("05c-afi-valorar.png", valorar)
        hacer("06-afi-reiniciar.png", lambda: (como("afiliado", "/catalogo", 2), boton("Reiniciar demostración")))

        # ---------------- Usuario no afiliado
        hacer("07-noa-catalogo.png", lambda: como("no_afiliado", "/catalogo", reiniciar=True))

        def noa_tarifa():
            como("no_afiliado", "/inmuebles/1/reservar", 3)
            dias(3, 6)
            boton("Continuar")
            boton("Continuar")
        hacer("08-noa-reservar-tarifa.png", noa_tarifa)
        hacer("09-noa-mis-reservas.png", lambda: como("no_afiliado", "/mis-reservas", 3))

        # ---------------- Encargada regional
        hacer("10-reg-solicitudes.png", lambda: como("regional", "/regional", 3, reiniciar=True))
        hacer("10b-reg-confirmar.png", lambda: (como("regional", "/regional", 3), boton("Confirmar")))
        hacer("10c-reg-rechazar.png", lambda: (como("regional", "/regional", 3), boton("Rechazar")))
        hacer("10d-reg-lista-espera.png", lambda: (como("regional", "/regional", 3),
                                                   a_la_vista(p, titulo_h2("Lista de espera"))))
        hacer("10e-reg-check-in.png", lambda: (como("regional", "/regional", 3), boton("Check-in")))
        hacer("10f-reg-check-out.png", lambda: (como("regional", "/regional", 3), boton("Check-out")))
        hacer("11-reg-calendario.png", lambda: como("regional", "/regional/calendario", 3))
        hacer("11b-reg-bloquear.png", lambda: boton("Bloquear fechas"))

        # ---------------- Oficina Central
        hacer("12-cen-reservas-pais.png", lambda: como("central", "/central", 3, reiniciar=True))
        hacer("13-cen-nomina.png", lambda: como("central", "/central/descuentos", 3))
        hacer("14-cen-reportes.png", lambda: como("central", "/central/dashboard", 4))
        hacer("15-cen-sanciones.png", lambda: como("central", "/central/sanciones", 3))
        hacer("15b-cen-registrar-sancion.png", lambda: boton("Registrar sanción"))
        hacer("15c-cen-levantar-sancion.png", lambda: (como("central", "/central/sanciones", 3), boton("Levantar")))

        # ---------------- Administrador
        hacer("16-adm-inmuebles.png", lambda: como("admin", "/admin/inmuebles", 3, reiniciar=True))
        hacer("16b-adm-editar-inmueble.png", lambda: boton("Editar"))
        hacer("17-adm-temporadas.png", lambda: como("admin", "/admin/temporadas", 3))
        hacer("17b-adm-nueva-temporada.png", lambda: boton("Nueva temporada"))
        hacer("18-adm-nomina-afiliados.png", lambda: como("admin", "/admin/nomina", 3))
        hacer("19-adm-auditoria.png", lambda: como("admin", "/admin/auditoria", 3))

        # ---------------- General: enlace directo a una sección de otro perfil
        hacer("20-gen-otro-perfil.png", lambda: como("afiliado", "/central", 3))
    finally:
        chrome.terminate()
        try:
            chrome.wait(10)
        except Exception:  # noqa: BLE001
            subprocess.run(["taskkill", "/PID", str(chrome.pid), "/T", "/F"], capture_output=True)
    faltan = [n for n in esperados if (not solo or n.split("-")[0] in solo) and n not in hechos]
    print("Hechas:", len(hechos), "Faltan:", faltan)
    sys.exit(1 if faltan else 0)


if __name__ == "__main__":
    main()
