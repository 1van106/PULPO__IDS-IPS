"""
modules/enriquecimiento.py
--------------------------
Enriquecimiento de IPs con threat intelligence (cubre la promesa de la web):
  - AbuseIPDB  -> puntuación de abuso (0-100) + país
  - VirusTotal -> nº de motores que marcan la IP como maliciosa
  - GeoIP      -> país (vía ip-api.com, sin clave) como respaldo

Best-effort: cualquier fallo de red se traga sin romper el pipeline. Las IPs
privadas/reservadas se omiten por defecto (no tienen reputación pública). Se
cachean los resultados con TTL para respetar los rate limits (AbuseIPDB free
= 1000/día) y no consultar la misma IP repetidamente durante un ataque.
"""

import ipaddress
import logging
import os
import threading
import time

import requests

logger = logging.getLogger("logclassifier.enriquecimiento")


class Enriquecedor:

    def __init__(self, config: dict):
        """
        config: sección 'enriquecimiento' del config.yaml

        Las claves se toman del config.yaml o, si están vacías, de las variables
        de entorno ABUSEIPDB_KEY / VIRUSTOTAL_KEY (para no commitear secretos).
        """
        self.abuseipdb_key = config.get("abuseipdb_key", "") or os.environ.get("ABUSEIPDB_KEY", "")
        self.virustotal_key = config.get("virustotal_key", "") or os.environ.get("VIRUSTOTAL_KEY", "")
        self.geoip_enabled = config.get("geoip", True)
        self.incluir_privadas = config.get("incluir_privadas", False)
        self.timeout = config.get("timeout", 3)
        self.cache_ttl = config.get("cache_ttl_segundos", 3600)

        # cache: { ip: (timestamp, resultado_dict) }
        self._cache: dict = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------------

    def _es_publica(self, ip: str) -> bool:
        try:
            addr = ipaddress.ip_address(ip)
        except ValueError:
            return False
        return not (addr.is_private or addr.is_loopback
                    or addr.is_reserved or addr.is_link_local)

    def enriquecer(self, ip: str) -> dict:
        """
        Devuelve {pais, abuse_score, vt_malicious} (claves presentes solo si se
        obtuvieron). Dict vacío si no hay nada que añadir.
        """
        if not ip:
            return {}
        if not self.incluir_privadas and not self._es_publica(ip):
            return {}

        ahora = time.time()
        with self._lock:
            cacheado = self._cache.get(ip)
            if cacheado and ahora - cacheado[0] < self.cache_ttl:
                return dict(cacheado[1])

        resultado: dict = {}
        if self.abuseipdb_key:
            resultado.update(self._consultar_abuseipdb(ip))
        if self.virustotal_key:
            resultado.update(self._consultar_virustotal(ip))
        if self.geoip_enabled and "pais" not in resultado:
            resultado.update(self._consultar_geoip(ip))

        with self._lock:
            self._cache[ip] = (ahora, dict(resultado))
        return resultado

    # ------------------------------------------------------------------
    # Proveedores (cada uno best-effort)
    # ------------------------------------------------------------------

    def _consultar_abuseipdb(self, ip: str) -> dict:
        try:
            resp = requests.get(
                "https://api.abuseipdb.com/api/v2/check",
                params={"ipAddress": ip, "maxAgeInDays": 90},
                headers={"Key": self.abuseipdb_key, "Accept": "application/json"},
                timeout=self.timeout,
            )
            if resp.status_code != 200:
                logger.warning(f"[Enriquecimiento] AbuseIPDB {resp.status_code} para {ip}")
                return {}
            data = resp.json().get("data", {})
            out = {}
            if "abuseConfidenceScore" in data:
                out["abuse_score"] = int(data["abuseConfidenceScore"])
            if data.get("countryCode"):
                out["pais"] = data["countryCode"]
            return out
        except (requests.RequestException, ValueError) as e:
            logger.warning(f"[Enriquecimiento] AbuseIPDB error para {ip}: {e}")
            return {}

    def _consultar_virustotal(self, ip: str) -> dict:
        try:
            resp = requests.get(
                f"https://www.virustotal.com/api/v3/ip_addresses/{ip}",
                headers={"x-apikey": self.virustotal_key},
                timeout=self.timeout,
            )
            if resp.status_code != 200:
                logger.warning(f"[Enriquecimiento] VirusTotal {resp.status_code} para {ip}")
                return {}
            attrs = resp.json().get("data", {}).get("attributes", {})
            stats = attrs.get("last_analysis_stats", {})
            out = {}
            if "malicious" in stats:
                out["vt_malicious"] = int(stats["malicious"])
            if attrs.get("country"):
                out.setdefault("pais", attrs["country"])
            return out
        except (requests.RequestException, ValueError) as e:
            logger.warning(f"[Enriquecimiento] VirusTotal error para {ip}: {e}")
            return {}

    def _consultar_geoip(self, ip: str) -> dict:
        try:
            resp = requests.get(
                f"http://ip-api.com/json/{ip}",
                params={"fields": "status,countryCode"},
                timeout=self.timeout,
            )
            if resp.status_code != 200:
                return {}
            data = resp.json()
            if data.get("status") == "success" and data.get("countryCode"):
                return {"pais": data["countryCode"]}
            return {}
        except (requests.RequestException, ValueError) as e:
            logger.warning(f"[Enriquecimiento] GeoIP error para {ip}: {e}")
            return {}
