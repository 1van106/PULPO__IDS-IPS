#!/bin/bash
# Starts LogClassifier IDS + Dashboard on the victim VM
# Run as root from /opt/LogClassifier

set -e

LOGFILE="/opt/LogClassifier/alertas.log"
IDS_DIR="/opt/LogClassifier"
APPIMAGE="/opt/LogClassifier_Dashboard.AppImage"

echo "[*] Limpiando log anterior..."
> "$LOGFILE"

echo "[*] Arrancando IDS en segundo plano..."
cd "$IDS_DIR"
source venv/bin/activate
nohup python3 main.py > /var/log/ids_stdout.log 2>&1 &
IDS_PID=$!
echo "[*] IDS PID: $IDS_PID"
deactivate

sleep 2

echo "[*] Arrancando Dashboard..."
if [ -f "$APPIMAGE" ]; then
    "$APPIMAGE" --no-sandbox &
    echo "[*] Dashboard abierto. Carga el fichero: $LOGFILE"
else
    echo "[!] AppImage no encontrado en $APPIMAGE"
    echo "    Cópialo y ejecuta: chmod +x $APPIMAGE"
fi

echo ""
echo "Para parar el IDS: kill $IDS_PID"
echo "Log en tiempo real: tail -f $LOGFILE"
