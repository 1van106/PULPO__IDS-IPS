"""
modules/motor_reglas.py
-----------------------
Motor de Clasificación basado en reglas.
Carga ficheros YAML de reglas, compila las expresiones regulares
y evalúa cada línea de log contra todas las reglas activas.
"""

import re
import os
import glob
import logging
from dataclasses import dataclass, field
from typing import Optional

import yaml

logger = logging.getLogger("logclassifier.motor_reglas")


@dataclass
class Regla:
    id: str
    nombre: str
    descripcion: str
    fuente: str
    severidad: str
    patron: re.Pattern
    grupo_ip: str
    umbral: int
    ventana_segundos: int
    accion: str


@dataclass
class Evento:
    """Representa un match de una regla contra una línea de log."""
    regla_id: str
    regla_nombre: str
    severidad: str
    fuente: str
    ip: Optional[str]
    linea_original: str
    accion: str
    umbral: int
    ventana_segundos: int


class MotorReglas:
    """
    Carga todas las reglas desde el directorio indicado
    y aplica cada una a las líneas de log entrantes.
    """

    def __init__(self, rules_dir: str, callback_evento):
        """
        rules_dir: ruta al directorio con ficheros .yaml de reglas
        callback_evento: función(Evento) llamada cuando hay un match
        """
        self.rules_dir = rules_dir
        self.callback_evento = callback_evento
        self.reglas: list[Regla] = []

    def cargar_reglas(self):
        """Lee todos los .yaml del directorio y compila las reglas."""
        patron_yaml = os.path.join(self.rules_dir, "*.yaml")
        ficheros = glob.glob(patron_yaml)

        if not ficheros:
            logger.warning(f"[Motor] No se encontraron ficheros de reglas en: {self.rules_dir}")
            return

        for fichero in ficheros:
            self._cargar_fichero(fichero)

        logger.info(f"[Motor] {len(self.reglas)} regla(s) cargada(s) desde {len(ficheros)} fichero(s).")

    def _cargar_fichero(self, ruta: str):
        try:
            with open(ruta, "r", encoding="utf-8") as f:
                datos = yaml.safe_load(f)

            for r in datos.get("rules", []):
                try:
                    regla = Regla(
                        id=r["id"],
                        nombre=r["nombre"],
                        descripcion=r.get("descripcion", ""),
                        fuente=r["fuente"],
                        severidad=r.get("severidad", "MEDIA"),
                        patron=re.compile(r["patron"]),
                        grupo_ip=r.get("grupo_ip", "ip"),
                        umbral=int(r.get("umbral", 1)),
                        ventana_segundos=int(r.get("ventana_segundos", 60)),
                        accion=r.get("accion", "alertar"),
                    )
                    self.reglas.append(regla)
                    logger.debug(f"[Motor] Regla cargada: {regla.id}")
                except Exception as e:
                    logger.error(f"[Motor] Error al procesar regla en {ruta}: {e}")

        except Exception as e:
            logger.error(f"[Motor] No se pudo leer {ruta}: {e}")

    def procesar_linea(self, fuente: str, linea: str):
        """
        Evalúa la línea contra todas las reglas.
        Para cada match genera un Evento y llama al callback.
        """
        for regla in self.reglas:
            # Filtrar por fuente (si la regla especifica una)
            if regla.fuente and regla.fuente != fuente:
                continue

            match = regla.patron.search(linea)
            if match:
                ip = None
                try:
                    ip = match.group(regla.grupo_ip)
                except IndexError:
                    pass

                evento = Evento(
                    regla_id=regla.id,
                    regla_nombre=regla.nombre,
                    severidad=regla.severidad,
                    fuente=fuente,
                    ip=ip,
                    linea_original=linea,
                    accion=regla.accion,
                    umbral=regla.umbral,
                    ventana_segundos=regla.ventana_segundos,
                )
                logger.debug(f"[Motor] Match [{regla.id}] IP={ip} linea={linea[:80]}")
                self.callback_evento(evento)
