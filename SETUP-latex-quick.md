# LaTeX Derleme Servisi — Hızlı Komut Referansı

> **Bu dosya sıfırdan kurulum için temiz komut akışıdır.** Açıklamalar için [`SETUP-latex.md`](./SETUP-latex.md)'ye bak.
>
> **Hedef:** Boş bir Raspberry Pi 5 (Pi OS Bookworm 64-bit) → çalışan LaTeX compile VM, ~2-3 saat.
>
> **Önemli:** Komutlar sırayla çalıştırılmalı. Her bölüm bir öncekini tamamlamış varsayar. İnteraktif kısımlar (Ubuntu installer, router config) ayrıca işaretlenmiştir.

---

## Ön kontrol

```bash
cat /proc/device-tree/model      # Raspberry Pi 5 Model B
uname -m                          # aarch64
uname -r                          # 6.12.x+
free -h                           # total ~7.9Gi
df -h /                           # en az 30GB boş
```

---

## 1. Host Pi 5 — paketler ve KVM

```bash
# Sistem güncel
sudo apt update && sudo apt upgrade -y

# KVM doğrula
sudo apt install -y cpu-checker
sudo kvm-ok
# "INFO: /dev/kvm exists" + "KVM acceleration can be used"

# KVM + libvirt paketleri
sudo apt install -y qemu-system-arm qemu-utils libvirt-daemon-system \
                    libvirt-clients virtinst bridge-utils

# Gruplar
sudo usermod -aG libvirt,kvm $USER
newgrp libvirt

# libvirt URI kalıcı
echo 'export LIBVIRT_DEFAULT_URI=qemu:///system' >> ~/.bashrc
source ~/.bashrc

# WiFi kapat (sadece kablo)
sudo nmcli radio wifi off
```

---

## 2. Router DHCP reservation (interaktif)

1. **MAC adresi al:**
   ```bash
   ip link show eth0 | grep ether
   ```

2. **Router admin paneline gir** (Zyxel: `http://192.168.1.1` → Home Networking → DHCP Server → Statik DHCP Konfigürasyonu). MAC + sabit IP gir.

3. **Pi'de DHCP yenile:**
   ```bash
   sudo nmcli connection down "Wired connection 1" && \
   sudo nmcli connection up "Wired connection 1"
   ip addr show eth0 | grep "inet "
   ```

---

## 3. İzole ağ + iptables

```bash
# İzole ağ XML
sudo tee /etc/libvirt/qemu/networks/isolated-net.xml > /dev/null <<'EOF'
<network>
  <name>isolated-net</name>
  <forward mode='nat'/>
  <bridge name='virbr1' stp='on' delay='0'/>
  <ip address='192.168.100.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.100.10' end='192.168.100.20'/>
    </dhcp>
  </ip>
</network>
EOF

sudo virsh net-define /etc/libvirt/qemu/networks/isolated-net.xml
sudo virsh net-autostart isolated-net
sudo virsh net-start isolated-net

# default ağı temizle
sudo virsh net-destroy default 2>/dev/null
sudo virsh net-undefine default 2>/dev/null

# Doğrula
virsh net-list --all   # sadece isolated-net görünmeli

# iptables DROP (ev LAN izolasyonu)
sudo iptables -I FORWARD 1 -s 192.168.100.0/24 -d 192.168.1.0/24 -j DROP
sudo iptables -I FORWARD 2 -s 192.168.1.0/24 -d 192.168.100.0/24 -j DROP

# Kalıcı yap
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

---

## 4. Ubuntu Server ISO

```bash
# ISO doğrudan /var/lib/libvirt/images/ altına (libvirt-qemu /home'a erişemez)
sudo wget -P /var/lib/libvirt/images/ \
  https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04.4-live-server-arm64.iso

# Checksum
cd /var/lib/libvirt/images/
sudo wget https://cdimage.ubuntu.com/releases/24.04/release/SHA256SUMS
sudo sha256sum -c SHA256SUMS --ignore-missing 2>&1 | grep ubuntu-24.04.4-live-server-arm64
# Beklenen: ubuntu-24.04.4-live-server-arm64.iso: OK
```

---

## 5. VM oluştur

> **Disk size=40 GB öner.** texlive image 8.75GB + Ubuntu ~5GB + Docker/log/Node → 20GB sınırda.
> **`--os-variant ubuntu22.04` doğru** (osinfo-db 24.04'ü tanımıyor, fark yok).

```bash
sudo virt-install \
  --name latexvm \
  --memory 4096 \
  --vcpus 2 \
  --disk size=40,path=/var/lib/libvirt/images/latexvm.qcow2,format=qcow2 \
  --cdrom /var/lib/libvirt/images/ubuntu-24.04.4-live-server-arm64.iso \
  --os-variant ubuntu22.04 \
  --network network=isolated-net,model=virtio \
  --graphics none \
  --boot uefi \
  --console pty,target_type=serial \
  --noautoconsole

# Konsola bağlan
sudo virsh console latexvm
```

---

## 6. Ubuntu installer (interaktif)

Konsoldan ilerlerken seçimler:

| Ekran | Seçim |
|---|---|
| Language | English |
| Installer update | Continue without updating |
| Keyboard | Turkish veya English (US) |
| Type | **Ubuntu Server** |
| Network | otomatik DHCP (192.168.100.X gelecek), Done |
| Proxy | boş, Done |
| Mirror | default, Done |
| Storage | `(X) Use entire disk`, **`[ ] LVM` KAPALI**, Done |
| Profile | name: latex, server: latexvm, user: latex, [güçlü password] |
| Ubuntu Pro | Skip |
| SSH | **`[X] Install OpenSSH server`** mutlaka |
| Snaps | hiçbiri seç |

~10-15 dk bekle. **"Reboot Now" geldiğinde ENTER'A BASMA**, `Ctrl + ]` ile host'a dön.

---

## 7. CDROM söküm + ilk boot

```bash
# Host
sudo virsh dumpxml latexvm | grep -A 6 "cdrom"
# <source/> satırı yoksa ISO zaten ejected, sadece domblklist cache'i yanıltıyor

sudo virsh destroy latexvm
sudo virsh change-media latexvm sda --eject --config 2>/dev/null || true
sudo virsh start latexvm
sudo virsh console latexvm
# Login: latex + password
```

VM içinde sistem güncelle:
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 8. SSH key auth

```bash
# Host (yeni terminal sekmesi)
ls ~/.ssh/id_ed25519.pub 2>/dev/null || \
  ssh-keygen -t ed25519 -C "pi@raspberrypi" -f ~/.ssh/id_ed25519 -N ""

# VM IP'sini bul (genelde 192.168.100.14)
sudo virsh net-dhcp-leases isolated-net

# Key gönder (VM password sorulur)
ssh-copy-id latex@192.168.100.14

# Test (parolasız olmalı)
ssh latex@192.168.100.14
```

---

## 9. Docker (VM içinde)

```bash
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
                    docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
exit
```

```bash
# Host'a döndün, yeniden SSH yap
ssh latex@192.168.100.14

# Test
docker --version
docker run --rm hello-world
docker rmi hello-world
```

---

## 10. TeX Live + test derleme

```bash
# Image (10-30 dk)
docker pull texlive/texlive:latest

# Test
mkdir -p /tmp/latextest && cd /tmp/latextest
cat > main.tex <<'EOF'
\documentclass{article}
\begin{document}
Hello World! $E=mc^2$
\end{document}
EOF

time docker run --rm \
  --network=none \
  --memory=512m \
  --cpus=1 \
  -v /tmp/latextest:/work \
  -w /work \
  texlive/texlive:latest \
  latexmk -pdf -no-shell-escape main.tex

ls -la main.pdf
file main.pdf
# "PDF document, version 1.7" görmeli, ~1.7 sn

# Temizle
cd ~ && rm -rf /tmp/latextest
```

---

## Buraya kadar tamamlandığında

VM, Docker, TeX Live hazır. SSH ile bağlanılabilir, sandbox parametreleri test edildi.

**Bir sonraki adım:** Cloudflare Tunnel (`latex.furkanbasoglu.com` → VM'in 3000 portuna) + Node.js compile API. Bu kısımlar [`SETUP-latex.md`](./SETUP-latex.md) §7 ve §8'de ele alınacak.

---

## Yardımcı komutlar

**Host'tan VM yönetimi:**
```bash
sudo virsh list --all                         # tüm VM'ler
sudo virsh start latexvm                      # başlat
sudo virsh shutdown latexvm                   # düzgün kapat
sudo virsh destroy latexvm                    # zorla kapat
sudo virsh console latexvm                    # konsola bağlan (Ctrl+] çık)
sudo virsh net-dhcp-leases isolated-net       # VM IP'leri
```

**Disk büyütme (20GB → 40GB):**
```bash
# Host
sudo virsh shutdown latexvm
sudo qemu-img resize /var/lib/libvirt/images/latexvm.qcow2 40G
sudo virsh start latexvm
ssh latex@192.168.100.14

# VM
sudo growpart /dev/vda 2
sudo resize2fs /dev/vda2
df -h /
```

**Snapshot:**
```bash
sudo virsh snapshot-create-as --domain latexvm --name "clean-$(date +%Y%m%d)"
sudo virsh snapshot-list latexvm
sudo virsh snapshot-revert latexvm clean-20260518
```

**Sorun giderme:** [`SETUP-latex.md`](./SETUP-latex.md) §11 (Sık Karşılaşılan Hatalar).
