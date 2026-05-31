"""
tests/simular_ataque.py
-----------------------
Script de simulación de ataques para el laboratorio.
Genera líneas de log reales imitando un ataque de fuerza bruta SSH.

Uso:
    python tests/simular_ataque.py --tipo ssh_bruteforce --ip 192.168.1.100
    python tests/simular_ataque.py --tipo web_scan --ip 10.0.0.50
    python tests/simular_ataque.py --demo
"""

import argparse
import time
import os
import sys
import random
from datetime import datetime

# Directorio raíz del proyecto
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_AUTH = os.path.join(ROOT, "logs", "auth.log")
LOG_SYS  = os.path.join(ROOT, "logs", "syslog.log")

os.makedirs(os.path.join(ROOT, "logs"), exist_ok=True)


def timestamp():
    return datetime.now().strftime("%b %d %H:%M:%S")


def escribir_log(ruta: str, linea: str):
    with open(ruta, "a", encoding="utf-8") as f:
        f.write(linea + "\n")
    print(f"  >> {linea}")


# ------------------------------------------------------------------
# Generadores de líneas de log
# ------------------------------------------------------------------

def ssh_bruteforce(ip: str, cantidad: int = 8, intervalo: float = 0.5):
    """Simula un ataque de fuerza bruta SSH desde una IP."""
    usuarios = ["admin", "root", "ubuntu", "pi", "test", "user1"]
    puertos  = [random.randint(40000, 65000) for _ in range(cantidad)]

    print(f"\n[SIMULACIÓN] Fuerza bruta SSH desde {ip} ({cantidad} intentos)")
    print("-" * 60)

    for i in range(cantidad):
        usuario = random.choice(usuarios)
        puerto  = puertos[i]
        ts      = timestamp()
        linea   = f"{ts} servidor sshd[1234]: Failed password for {usuario} from {ip} port {puerto} ssh2"
        escribir_log(LOG_AUTH, linea)
        time.sleep(intervalo)


def ssh_usuario_invalido(ip: str, cantidad: int = 5, intervalo: float = 0.5):
    """Simula intentos con usuario inválido."""
    usuarios = ["oracle", "ftpuser", "deploy", "backup", "git"]
    print(f"\n[SIMULACIÓN] Usuarios inválidos SSH desde {ip}")
    print("-" * 60)

    for i in range(cantidad):
        usuario = usuarios[i % len(usuarios)]
        ts      = timestamp()
        linea   = f"{ts} servidor sshd[1234]: Invalid user {usuario} from {ip}"
        escribir_log(LOG_AUTH, linea)
        time.sleep(intervalo)


def ssh_root_login(ip: str, cantidad: int = 3, intervalo: float = 0.5):
    """Simula intentos de login como root."""
    print(f"\n[SIMULACIÓN] Intentos root SSH desde {ip}")
    print("-" * 60)

    for i in range(cantidad):
        puerto = random.randint(40000, 65000)
        ts     = timestamp()
        linea  = f"{ts} servidor sshd[1234]: Failed password for root from {ip} port {puerto} ssh2"
        escribir_log(LOG_AUTH, linea)
        time.sleep(intervalo)


def web_scan(ip: str, cantidad: int = 15, intervalo: float = 0.2):
    """Simula un escaneo web con múltiples 404."""
    rutas = ["/admin", "/wp-login.php", "/.env", "/config.php",
             "/backup.zip", "/phpinfo.php", "/.git/config", "/api/v1/users"]
    print(f"\n[SIMULACIÓN] Escaneo web desde {ip}")
    print("-" * 60)

    for i in range(cantidad):
        ruta   = random.choice(rutas)
        ts     = timestamp()
        linea  = f"{ts} servidor nginx: {ip} - - [{ts}] \"GET {ruta} HTTP/1.1\" 404 0"
        escribir_log(LOG_SYS, linea)
        time.sleep(intervalo)


def demo_completo():
    """Ejecuta una demo con múltiples tipos de ataque."""
    ips = {
        "atacante_1": "192.168.1.100",
        "atacante_2": "10.0.0.55",
        "atacante_3": "172.16.0.200",
    }

    print("\n" + "=" * 60)
    print("  DEMO COMPLETA - LogClassifier")
    print("  Asegúrate de que main.py está ejecutándose en otra terminal")
    print("=" * 60)
    print("\nEsperando 3 segundos antes de empezar...")
    time.sleep(3)

    # Escenario 1: Fuerza bruta SSH
    ssh_bruteforce(ips["atacante_1"], cantidad=8)
    time.sleep(2)

    # Escenario 2: Usuarios inválidos
    ssh_usuario_invalido(ips["atacante_2"], cantidad=5)
    time.sleep(2)

    # Escenario 3: Login root
    ssh_root_login(ips["atacante_3"], cantidad=3)
    time.sleep(2)

    # Escenario 4: Escaneo web
    web_scan(ips["atacante_1"], cantidad=15)

    print("\n" + "=" * 60)
    print("  Demo finalizada. Revisa la consola de main.py y logs/alertas.log")
    print("=" * 60)


# ------------------------------------------------------------------
# CLI
# ------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Simulador de ataques para LogClassifier")
    parser.add_argument("--tipo", choices=["ssh_bruteforce", "ssh_root", "ssh_invalid", "web_scan"],
                        help="Tipo de ataque a simular")
    parser.add_argument("--ip", default="192.168.99.99", help="IP atacante a simular")
    parser.add_argument("--cantidad", type=int, default=8, help="Número de eventos a generar")
    parser.add_argument("--demo", action="store_true", help="Ejecutar demo completa")
    args = parser.parse_args()

    if args.demo:
        demo_completo()
    elif args.tipo == "ssh_bruteforce":
        ssh_bruteforce(args.ip, args.cantidad)
    elif args.tipo == "ssh_root":
        ssh_root_login(args.ip, args.cantidad)
    elif args.tipo == "ssh_invalid":
        ssh_usuario_invalido(args.ip, args.cantidad)
    elif args.tipo == "web_scan":
        web_scan(args.ip, args.cantidad)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
