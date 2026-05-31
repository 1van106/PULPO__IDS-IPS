"""
main.py
-------
LogClassifier - Plataforma de Clasificación de Logs
Punto de entrada principal. Orquesta todos los módulos.

Autores: Jesús Martínez Montalvo, Iván Batista Herrero, Fernando Manuel Ávila Medina
Profesor: Carlos Basulto
Fecha: Febrero 2026
"""

import os
import sys
import time
import logging
import signal
import argparse
from datetime import datetime

import yaml

# Añadir el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules.ingesta import ModuloIngesta
from modules.motor_reglas import MotorReglas
from modules.correlacion import MotorCorrelacion
from modules.respuesta import ModuloRespuesta
from modules.alertas import ModuloAlertas


# ============================================================
#  Configuración del sistema de logs interno
# ============================================================

def configurar_logging(nivel: str):
    nivel_num = getattr(logging, nivel.upper(), logging.INFO)
    logging.basicConfig(
        level=nivel_num,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


# ============================================================
#  Clase principal
# ============================================================

class LogClassifier:

    def __init__(self, config_path: str):
        self.config_path = config_path
        self.config = self._cargar_config(config_path)
        self._ejecutando = False

        # Configurar logging
        nivel = self.config.get("general", {}).get("log_level", "INFO")
        configurar_logging(nivel)
        self.logger = logging.getLogger("logclassifier.main")

        # Instanciar módulos
        self.alertas = ModuloAlertas(self.config.get("alertas", {}))

        self.correlacion = MotorCorrelacion(
            config=self.config.get("correlacion", {}),
            callback_disparo=self._on_umbral_superado,
        )

        self.respuesta = ModuloRespuesta(
            config=self.config.get("respuesta", {}),
            callback_alerta=self.alertas.emitir,
            callback_resetear_ip=self.correlacion.resetear_ip,
        )

        self.motor = MotorReglas(
            rules_dir=self.config.get("motor_reglas", {}).get("rules_dir", "rules/"),
            callback_evento=self.correlacion.procesar_evento,
        )

        self.ingesta = ModuloIngesta(
            config=self.config.get("ingesta", {}),
            callback=self.motor.procesar_linea,
        )

    # ------------------------------------------------------------------
    # Ciclo de vida
    # ------------------------------------------------------------------

    def iniciar(self):
        self._ejecutando = True
        self.logger.info("=" * 50)
        self.logger.info("  LogClassifier - Iniciando sistema")
        self.logger.info(f"  Modo: {self.config.get('respuesta', {}).get('modo', 'simulacion').upper()}")
        self.logger.info("=" * 50)

        # Cargar reglas
        self.motor.cargar_reglas()

        # Iniciar ingesta
        self.ingesta.iniciar()

        self.logger.info("Sistema en marcha. Esperando eventos de log...")
        self.logger.info("Pulsa Ctrl+C para detener.\n")

        # Bucle principal con resumen periódico
        try:
            intervalo_resumen = 60
            ultimo_resumen = time.time()

            while self._ejecutando:
                time.sleep(1)
                if time.time() - ultimo_resumen >= intervalo_resumen:
                    self.alertas.resumen(self.respuesta.ips_bloqueadas())
                    ultimo_resumen = time.time()

        except KeyboardInterrupt:
            self.detener()

    def detener(self):
        self.logger.info("\nDeteniendo LogClassifier...")
        self._ejecutando = False
        self.ingesta.detener()
        self.alertas.resumen(self.respuesta.ips_bloqueadas())
        self.logger.info("Sistema detenido correctamente.")

    # ------------------------------------------------------------------
    # Callbacks internos
    # ------------------------------------------------------------------

    def _on_umbral_superado(self, evento):
        """Llamado cuando la correlación confirma que se superó el umbral."""
        self.respuesta.ejecutar(evento)

    # ------------------------------------------------------------------
    # Utilidades
    # ------------------------------------------------------------------

    @staticmethod
    def _cargar_config(ruta: str) -> dict:
        if not os.path.exists(ruta):
            print(f"ERROR: No se encontró el fichero de configuración: {ruta}")
            sys.exit(1)
        with open(ruta, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)


# ============================================================
#  Entrada principal
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="LogClassifier - Plataforma de Clasificación de Logs"
    )
    parser.add_argument(
        "--config",
        default="config/config.yaml",
        help="Ruta al fichero de configuración (default: config/config.yaml)"
    )
    args = parser.parse_args()

    clasificador = LogClassifier(config_path=args.config)

    # Manejar señales del sistema para salida limpia
    def manejador_senal(sig, frame):
        clasificador.detener()
        sys.exit(0)

    signal.signal(signal.SIGINT, manejador_senal)
    signal.signal(signal.SIGTERM, manejador_senal)

    clasificador.iniciar()


if __name__ == "__main__":
    main()
