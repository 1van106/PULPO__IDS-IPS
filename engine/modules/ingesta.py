"""
modules/ingesta.py
------------------
Módulo de Ingesta de Logs.
Lee ficheros de log en tiempo real mediante tail -f (seguimiento de cola).
Cada línea leída se envía al motor de clasificación.
"""

import os
import time
import threading
import logging

logger = logging.getLogger("logclassifier.ingesta")


class LectorLog:
    """
    Lee un fichero de log siguiendo su cola (como tail -f).
    Cuando detecta nuevas líneas las pasa al callback indicado.
    """

    def __init__(self, nombre: str, ruta: str, callback):
        self.nombre = nombre
        self.ruta = ruta
        self.callback = callback        # función(nombre_fuente, linea)
        self._activo = False
        self._hilo = None

    def iniciar(self):
        """Arranca el hilo de lectura en segundo plano."""
        if not os.path.exists(self.ruta):
            logger.warning(f"[Ingesta] Fichero no encontrado: {self.ruta}. Esperando...")
        self._activo = True
        self._hilo = threading.Thread(target=self._leer_cola, daemon=True)
        self._hilo.start()
        logger.info(f"[Ingesta] Lector iniciado para '{self.nombre}' -> {self.ruta}")

    def detener(self):
        self._activo = False
        logger.info(f"[Ingesta] Lector detenido para '{self.nombre}'")

    def _leer_cola(self):
        """Bucle principal: abre el fichero y lee líneas nuevas."""
        while self._activo:
            # Esperar a que exista el fichero
            if not os.path.exists(self.ruta):
                time.sleep(1)
                continue

            try:
                with open(self.ruta, "r", encoding="utf-8", errors="replace") as f:
                    # Ir al final del fichero para leer solo nuevas líneas
                    f.seek(0, 2)
                    while self._activo:
                        linea = f.readline()
                        if linea:
                            linea = linea.rstrip("\n")
                            if linea:
                                self.callback(self.nombre, linea)
                        else:
                            time.sleep(0.1)
            except Exception as e:
                logger.error(f"[Ingesta] Error leyendo '{self.ruta}': {e}")
                time.sleep(2)


class ModuloIngesta:
    """
    Gestiona todos los lectores de log definidos en la configuración.
    """

    def __init__(self, config: dict, callback):
        """
        config: sección 'ingesta' del config.yaml
        callback: función(nombre_fuente, linea) que recibe cada línea
        """
        self.config = config
        self.callback = callback
        self.lectores: list[LectorLog] = []

    def iniciar(self):
        """Crea e inicia un lector por cada fuente habilitada."""
        fuentes = self.config.get("sources", [])
        for fuente in fuentes:
            if not fuente.get("enabled", True):
                continue
            lector = LectorLog(
                nombre=fuente["name"],
                ruta=fuente["path"],
                callback=self.callback
            )
            lector.iniciar()
            self.lectores.append(lector)
        logger.info(f"[Ingesta] {len(self.lectores)} fuente(s) activa(s).")

    def detener(self):
        for lector in self.lectores:
            lector.detener()
