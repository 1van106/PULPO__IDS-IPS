#!/bin/bash
# Setup script for LogClassifier victim VM (Kali/Ubuntu/Debian)
# Run as root: sudo bash setup_victim.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}[1/7] Updating system...${NC}"
apt-get update -qq

echo -e "${GREEN}[2/7] Installing system dependencies...${NC}"
apt-get install -y python3 python3-pip python3-venv git curl wget fuse libfuse2

echo -e "${GREEN}[3/7] Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo -e "${GREEN}[4/7] Cloning LogClassifier IDS...${NC}"
cd /opt
[ -d LogClassifier ] && rm -rf LogClassifier
git clone https://github.com/1van106/LogClassifier.git
cd LogClassifier
python3 -m venv venv
source venv/bin/activate
pip install pyyaml 2>/dev/null || true
deactivate
touch /opt/LogClassifier/alertas.log

echo -e "${GREEN}[5/7] Cloning and building LogClassifier Dashboard...${NC}"
cd /opt
[ -d LogClassifier_Dashboard ] && rm -rf LogClassifier_Dashboard
git clone https://github.com/1van106/LogClassifier_Dashboard.git
cd LogClassifier_Dashboard
npm install
npm run package:linux
APPIMAGE=$(ls dist/*.AppImage 2>/dev/null | head -1)
if [ -n "$APPIMAGE" ]; then
    cp "$APPIMAGE" /opt/LogClassifier_Dashboard.AppImage
    chmod +x /opt/LogClassifier_Dashboard.AppImage
    echo -e "${GREEN}  AppImage listo: /opt/LogClassifier_Dashboard.AppImage${NC}"
fi

echo -e "${GREEN}[6/7] Enabling SSH (for attack simulation)...${NC}"
apt-get install -y openssh-server
systemctl enable ssh
systemctl start ssh

echo -e "${GREEN}[7/7] Creating launcher script...${NC}"
cat > /usr/local/bin/logclassifier-start << 'EOF'
#!/bin/bash
LOGFILE="/opt/LogClassifier/alertas.log"
> "$LOGFILE"
echo "[*] Arrancando IDS..."
cd /opt/LogClassifier
source venv/bin/activate
nohup python3 main.py > /var/log/ids.log 2>&1 &
echo "[*] IDS PID: $!"
deactivate
sleep 1
echo "[*] Arrancando Dashboard..."
/opt/LogClassifier_Dashboard.AppImage --no-sandbox &
echo "[*] Dashboard iniciado. Carga el fichero: $LOGFILE"
EOF
chmod +x /usr/local/bin/logclassifier-start

echo ""
echo -e "${GREEN}=== Instalación completada ===${NC}"
echo ""
echo -e "  IP de esta máquina: ${YELLOW}$(hostname -I | awk '{print $1}')${NC}"
echo ""
echo "  Comando para iniciar todo:"
echo -e "  ${GREEN}sudo logclassifier-start${NC}"
echo ""
echo "  Log en tiempo real:"
echo -e "  ${GREEN}tail -f /opt/LogClassifier/alertas.log${NC}"
