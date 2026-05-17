# LaTeX Derleme Servisi — Kurulum Rehberi

> Bu sayfa `latex.furkanbasoglu.com` altında çalışacak **Overleaf benzeri LaTeX derleme servisinin** kurulum dokümantasyonudur.
>
> **Mimari özet:** Cloudflare Pages (Astro UI + Pages Functions API) → Cloudflare Tunnel → Raspberry Pi 5 host → KVM VM (Ubuntu Server) → Docker container (TeX Live). Üç güvenlik katmanı: host izolasyonu, VM izolasyonu, container izolasyonu.
>
> **Hızlı kurulum:** Sıfırdan yapacaksan [`SETUP-latex-quick.md`](./SETUP-latex-quick.md) dosyasındaki komut listesini kullan. Bu dosya açıklama ve mantık içerir.

---

## İçindekiler

1. [Mimari & Karar Mantığı](#1-mimari--karar-mantığı)
2. [Donanım & Yazılım Gereksinimleri](#2-donanım--yazılım-gereksinimleri)
3. [Host Pi 5 Kurulumu](#3-host-pi-5-kurulumu)
4. [İzole Ağ & Güvenlik](#4-izole-ağ--güvenlik)
5. [Compile VM Kurulumu](#5-compile-vm-kurulumu)
6. [Docker + TeX Live](#6-docker--tex-live)
7. [Cloudflare Tunnel](#7-cloudflare-tunnel) *(TODO)*
8. [API & Frontend](#8-api--frontend) *(TODO)*
9. [Üyelik Tier'ları & Limitler](#9-üyelik-tierları--limitler)
10. [Güvenlik Kontrol Listesi](#10-güvenlik-kontrol-listesi)
11. [Sık Karşılaşılan Hatalar](#11-sık-karşılaşılan-hatalar)
12. [Bakım & Felaket Kurtarma](#12-bakım--felaket-kurtarma)
13. [Mevcut İlerleme](#13-mevcut-ilerleme)

---

## 1. Mimari & Karar Mantığı

```
KULLANICI → Cloudflare (Pages + Functions + R2 + D1 + Tunnel)
                                                       │
                                                       ▼
                  Pi 5 host ──(KVM/libvirt)── latexvm VM
                  (kişisel veriler,           (izole, 192.168.100.14)
                   192.168.1.114)              └─ Docker → texlive/texlive
```

### Neden bu mimari?

| Karar | Sebep |
|---|---|
| **Cloudflare Pages (Worker değil)** | Repo'da zaten `functions/api/report.ts` var — aynı pattern. Auto-deploy + Pages Functions yeterli. |
| **KVM VM (sadece Docker değil)** | Host'ta kişisel veriler var. Container kernel paylaşır; VM kendi kernel'ine sahip → host'a hiç temas yok. |
| **Container + VM** | Defense-in-depth: container kaçışı VM'de kalır; VM kaçışı host'a çıkamaz. |
| **Cloudflare Tunnel** | Router'a port forwarding yok, Pi IP'si dışa açılmaz, DDoS koruması ücretsiz. |
| **isolated-net (192.168.100.0/24)** | Ev LAN'ından (`192.168.1.0/24`) farklı subnet → iptables ile VM'in ev LAN'ına erişimi engellenebilir. |
| **`latexmk -no-shell-escape`** | `\write18` ve `\input{URL}` gibi attack vektörlerini kapatır. |

---

## 2. Donanım & Yazılım Gereksinimleri

### Donanım
- **Raspberry Pi 5 (8GB RAM)** — 4GB'da VM darlığa düşer
- **128GB+ depolama**, NVMe SSD önerilir (SD kart yoğun yazmada yıpranır)
- Sürekli internet + ethernet kablosu
- Aktif soğutma

### Yazılım (host)
- Raspberry Pi OS Bookworm (64-bit), kernel **6.12+**
- `/dev/kvm` mevcut

### Hızlı kontrol
```bash
cat /proc/device-tree/model     # Raspberry Pi 5 Model B
uname -m                         # aarch64
free -h                          # total ~7.9Gi
df -h /                          # en az 30GB boş
ls /dev/kvm                      # var olmalı
sudo kvm-ok                      # "KVM acceleration can be used"
```

---

## 3. Host Pi 5 Kurulumu

### 3.1 — Sistem güncelle + KVM doğrula
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y cpu-checker
sudo kvm-ok
```

### 3.2 — KVM + libvirt paketleri
```bash
sudo apt install -y qemu-system-arm qemu-utils libvirt-daemon-system \
                    libvirt-clients virtinst bridge-utils
```

Kozmetik uyarılar (yoksay): `libvirt-qemu's uid 64055 is greater than SYS_UID_MAX 999`, `home dir /var/lib/tpm can't be accessed`.

### 3.3 — Grup üyeliği + libvirt URI
```bash
sudo usermod -aG libvirt,kvm $USER
newgrp libvirt

echo 'export LIBVIRT_DEFAULT_URI=qemu:///system' >> ~/.bashrc
source ~/.bashrc
```

> `kvm` grubu için logout/login gerekir, ama `virsh` libvirt grubu üzerinden çalıştığı için şimdilik sorun değil.

### 3.4 — IP sabitleme

**WiFi kapat:**
```bash
sudo nmcli radio wifi off
```

**MAC al + Router'da DHCP reservation yap** (Zyxel EX3501-T0: Home Networking → DHCP Server → Statik DHCP Konfigürasyonu):
```bash
ip link show eth0 | grep ether
```

**Pi'de lease yenile** (NetworkManager, `dhclient` çalışmaz):
```bash
sudo nmcli connection down "Wired connection 1" && \
sudo nmcli connection up "Wired connection 1"
ip addr show eth0 | grep "inet "
```

---

## 4. İzole Ağ & Güvenlik

### 4.1 — İzole sanal ağ
```bash
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

# default ağ varsa temizle
sudo virsh net-destroy default 2>/dev/null
sudo virsh net-undefine default 2>/dev/null
```

### 4.2 — Ev LAN izolasyonu (iptables)
```bash
sudo iptables -I FORWARD 1 -s 192.168.100.0/24 -d 192.168.1.0/24 -j DROP
sudo iptables -I FORWARD 2 -s 192.168.1.0/24 -d 192.168.100.0/24 -j DROP

sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

---

## 5. Compile VM Kurulumu

### 5.1 — Ubuntu Server ISO
**ÖNEMLİ:** ISO'yu `/var/lib/libvirt/images/` altına indir. `~/iso` olmaz — `libvirt-qemu` `/home/pi`'a erişemez.

```bash
sudo wget -P /var/lib/libvirt/images/ \
  https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04.4-live-server-arm64.iso

cd /var/lib/libvirt/images/
sudo wget https://cdimage.ubuntu.com/releases/24.04/release/SHA256SUMS
sudo sha256sum -c SHA256SUMS --ignore-missing 2>&1 | grep ubuntu-24.04.4-live-server-arm64
```

### 5.2 — VM oluştur
**ÖNEMLİ:** `--os-variant ubuntu22.04` (Bookworm `osinfo-db` 24.04'ü tanımıyor, fark yok). **Disk size=40 öner** (texlive image 8.75GB, 20GB sınırda kalır).

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
```

### 5.3 — Konsola bağlan + Ubuntu installer
```bash
sudo virsh console latexvm
```

Subiquity adımları:

| Ekran | Seçim |
|---|---|
| Language | English |
| Installer update | Continue without updating |
| Keyboard | Turkish veya English (US) |
| Type | Ubuntu Server |
| Network | otomatik DHCP, Done |
| Proxy | boş, Done |
| Mirror | default, Done |
| Storage | `(X) Use entire disk`, **LVM KAPALI**, Done |
| Profile | latex / latexvm / latex / [güçlü password] |
| Ubuntu Pro | Skip |
| SSH | **`[X] Install OpenSSH server`** mutlaka |
| Snaps | hiçbiri |

Installation ~10-15 dk. **"Reboot Now" gelince Enter'a basma**, CDROM söküm gerek.

### 5.4 — CDROM söküm + reboot

Konsoldan `Ctrl + ]` ile host'a dön:

```bash
sudo virsh dumpxml latexvm | grep -A 6 "cdrom"
```

`<source file='...'/>` satırı YOKSA → ISO zaten ejected (subiquity söktü), `domblklist` cache yanıltır.

**İki durumda da bu sırayla devam et:**
```bash
sudo virsh destroy latexvm                              # zorla kapat (kurulum bitmiş, OK)
sudo virsh change-media latexvm sda --eject --config 2>/dev/null || true
sudo virsh start latexvm
sudo virsh console latexvm
```

Login: `latex` + password.

### 5.5 — SSH key
```bash
# Host (yeni terminal)
ls ~/.ssh/id_ed25519.pub 2>/dev/null || \
  ssh-keygen -t ed25519 -C "pi@raspberrypi" -f ~/.ssh/id_ed25519 -N ""

ssh-copy-id latex@192.168.100.14
ssh latex@192.168.100.14   # parolasız olmalı
```

> İki terminal sekmesi aç: bir host (`pi@raspberrypi`), bir VM (`latex@latexvm`). Prompt'tan ayırt et.

---

## 6. Docker + TeX Live

VM içinde:

### 6.1 — Docker (resmi repo)
```bash
sudo apt update && sudo apt upgrade -y
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
exit   # logout, sonra ssh ile tekrar gir
```

### 6.2 — TeX Live image
```bash
docker pull texlive/texlive:latest
# ~2.65GB indirme, ~8.75GB extracted
```

### 6.3 — Test derleme
```bash
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

cd ~ && rm -rf /tmp/latextest
```

**Beklenen:** ~1.7 sn (basit doküman). Container startup ~1 sn, saf derleme ~0.7 sn.

### 6.4 — Üretim container parametreleri (referans)
```bash
docker run \
  --rm \
  --network=none \
  --read-only \
  --tmpfs /tmp:size=512M \
  --memory=512m \
  --memory-swap=512m \
  --cpus=1 \
  --user 1000:1000 \
  --pids-limit=128 \
  -v "$PROJECT_DIR:/work" \
  -w /work \
  texlive/texlive:latest \
  timeout 60 latexmk -pdf -no-shell-escape main.tex
```

---

## 7. Cloudflare Tunnel *(TODO)*

Yarınki adım. VM içinde `cloudflared` kur, `latex.furkanbasoglu.com` için tunnel oluştur, sistem servisi olarak çalıştır.

---

## 8. API & Frontend *(TODO)*

### Repo yapısı
```
website/
├── functions/api/
│   ├── report.ts            # mevcut
│   └── compile.ts           # YENİ
├── src/pages/
│   ├── iletisim.astro
│   ├── veri-atlasi.astro
│   └── latex.astro          # YENİ (minimal wrapper + iframe)
├── public/
│   ├── veri_atlasi/
│   └── latex/               # YENİ (Monaco + PDF.js SPA)
├── SETUP-iletisim.md
├── SETUP-latex.md
└── SETUP-latex-quick.md
```

### Cloudflare ortam değişkenleri (planlanan)
| İsim | Açıklama |
|---|---|
| `RATE_LIMIT` (KV) | iletişim ile aynı namespace |
| `TURNSTILE_SECRET_KEY` / `PUBLIC_TURNSTILE_SITE_KEY` | mevcut |
| `COMPILE_TUNNEL_URL` | `https://latex.furkanbasoglu.com` |
| `COMPILE_SERVICE_TOKEN_ID` + `..._SECRET` | Cloudflare Access |
| `R2_BUCKET` (R2 binding) | LaTeX projeleri |
| `DB` (D1 binding) | kullanıcılar, kotalar |
| `AUTH_SECRET` | JWT signing |

---

## 9. Üyelik Tier'ları & Limitler

| Tier | Proje | Boyut | Timeout | Öncelik |
|------|-------|-------|---------|---------|
| **Free** | 1 aktif | 10 MB | 30s | Düşük |
| **Pro** | 1, sınırsız | 100 MB | 120s | Normal |
| **Unlimited** | Sınırsız | 500 MB | 300s | Yüksek |

**Pi 5 kapasitesi (gerçek ölçüm):**
- Basit doküman: ~1.7s
- Orta (kaynakça+figür): ~5-15s
- Pratik: 800-1200/saat, **rahat 100+ aktif kullanıcı**
- Üst sınır: 300+ → VPS

---

## 10. Güvenlik Kontrol Listesi

### Network ✅
- [x] WiFi kapalı, sadece eth0
- [x] DHCP reservation → 192.168.1.114
- [x] isolated-net (192.168.100.0/24)
- [x] iptables DROP + persistent
- [ ] Cloudflare Tunnel + Access service token

### VM ✅
- [x] Ubuntu 24.04, izole ağda (192.168.100.14)
- [x] LVM yok, sade
- [x] OpenSSH + SSH key auth
- [ ] Password auth kapat
- [ ] fail2ban + unattended-upgrades

### Docker ✅
- [x] `--network=none`, `--memory=512m --cpus=1` test edildi
- [x] `latexmk -no-shell-escape` test edildi
- [ ] Production'da `--user`, `--read-only`, `--tmpfs`, `--pids-limit`

---

## 11. Sık Karşılaşılan Hatalar

### Hata #1: `/dev/kvm` yok
`uname -m` aarch64 olmalı. `sudo apt full-upgrade -y && sudo reboot`.

### Hata #2: `dhclient: Address already assigned`
Pi OS Bookworm NetworkManager kullanıyor:
```bash
sudo nmcli connection down "Wired connection 1" && \
sudo nmcli connection up "Wired connection 1"
```

### Hata #3: `virsh net-list --all` boş (sudo'suz)
```bash
echo 'export LIBVIRT_DEFAULT_URI=qemu:///system' >> ~/.bashrc
source ~/.bashrc
```

### Hata #4: `Unknown OS name 'ubuntu24.04'`
`--os-variant ubuntu22.04` kullan (osinfo-db güncel değil, fark yok).

### Hata #5: `Could not open '/home/pi/iso/...': Permission denied`
ISO'yu `/var/lib/libvirt/images/` altına koy. `libvirt-qemu` `/home/pi`'a erişemez.

### Hata #6: `virsh change-media: The disk device 'sda' doesn't have media`
Subiquity kurulum sonrası ISO'yu kendisi ejects, `domblklist` cache yanıltır. `dumpxml | grep -A 6 cdrom` ile gerçek durumu gör. `<source/>` satırı yoksa zaten ejected; sadece `destroy` + `start` yeterli.

### Hata #7: İki interface birden IP alıyor
`sudo nmcli radio wifi off`

### Hata #8: SSH yapınca "internet koptu" gibi görünme
Görsel illüzyon — terminal VM shell'ine geçti. İki ayrı sekme aç. Prompt'tan ayırt et.

### Hata #9: VM disk dolu (~%86)
texlive 8.75GB. Disk büyüt (§12.3) veya yeni kurulumda `size=40`.

### Hata #10: `getcwd() failed`
Shell silinmiş dizinde duruyor. `cd ~` yap.

### Hata #11: Dosyalar `libvirt` grubu sahipliğinde
`newgrp libvirt` aktif shell'de `wget`/`git pull` yapıldı. `sudo chown -R pi:pi <dir>` (kozmetik).

### Hata #12: Docker pull yavaş
Sabret veya `texlive/texlive:latest-basic` (300MB, sınırlı).

---

## 12. Bakım & Felaket Kurtarma

### 12.1 — Günlük health-check
```bash
# Host
virsh list --all                # latexvm running
systemctl status libvirtd

# VM
docker ps
systemctl status cloudflared    # ileride
```

### 12.2 — Snapshot
```bash
sudo virsh snapshot-create-as --domain latexvm --name "clean-$(date +%Y%m%d)"
sudo virsh snapshot-list latexvm
sudo virsh snapshot-revert latexvm clean-20260518
```

### 12.3 — VM diskini büyüt (20GB → 40GB)
```bash
# Host
sudo virsh shutdown latexvm
sudo qemu-img resize /var/lib/libvirt/images/latexvm.qcow2 40G
sudo virsh start latexvm

# VM içinde (SSH)
sudo growpart /dev/vda 2
sudo resize2fs /dev/vda2
df -h /
```

### 12.4 — Yedeklenmesi gerekenler
- `~/.cloudflared/*.json` (Tunnel credentials, KAYBETME)
- `/etc/libvirt/qemu/networks/isolated-net.xml`
- VM disk imajı (opsiyonel, yeniden kurulabilir)
- Cloudflare Pages env değişkenleri (Dashboard'da)

### 12.5 — Yeni Pi'ye geçiş
1. Yeni Pi'ye Pi OS Bookworm kur
2. `SETUP-latex-quick.md`'deki komutları sırayla uygula
3. Tunnel credentials varsa kopyala
4. Astro repo `git clone`
5. R2 + D1 zaten Cloudflare'de

**RTO:** Snapshot ~5dk, sıfırdan ~2-4 saat.

---

## 13. Mevcut İlerleme

### ✅ Tamamlananlar (2026-05-18)

**Host Pi 5:**
- [x] Pi 5 (8GB, 128GB SD, Pi OS Bookworm, kernel 6.12)
- [x] `/dev/kvm` doğrulandı
- [x] KVM/libvirt paketleri kuruldu
- [x] Kullanıcı `libvirt` ve `kvm` gruplarında
- [x] `LIBVIRT_DEFAULT_URI=qemu:///system` kalıcı

**Ağ:**
- [x] WiFi kapalı, sadece eth0
- [x] DHCP reservation (Zyxel EX3501-T0) → `192.168.1.114`
- [x] İzole ağ `isolated-net` (192.168.100.0/24)
- [x] iptables DROP + iptables-persistent

**Compile VM:**
- [x] Ubuntu Server 24.04.4 ISO indirildi + doğrulandı
- [x] VM (`latexvm`, 4GB RAM, 2 vCPU, 20GB disk, virtio, UEFI)
- [x] Ubuntu kuruldu (latex/latexvm, LVM yok, OpenSSH)
- [x] VM IP: `192.168.100.14`
- [x] SSH key auth (parolasız)
- [x] Sistem güncel

**Docker + TeX Live:**
- [x] Docker 29.5.0 (overlayfs, cgroup v2, systemd)
- [x] `texlive/texlive:latest` (TeX Live 2026, 8.75GB)
- [x] **Test derleme başarılı: 1.7 saniye** (sandbox parametreleri ile)

### ⏳ Yapılacaklar

**Yarın (öncelikli):**
- [ ] VM diskini 40GB'a büyüt (şu an %86 dolu)
- [ ] Cloudflare Tunnel kur
- [ ] Tunnel'a basic health endpoint

**Yakın:**
- [ ] Node.js + BullMQ kuyruk
- [ ] `POST /compile` endpoint
- [ ] WebSocket/SSE canlı log
- [ ] `functions/api/compile.ts`
- [ ] `src/pages/latex.astro`
- [ ] `public/latex/` SPA

**Orta vade:**
- [ ] Auth (Clerk veya custom JWT)
- [ ] D1 şema
- [ ] R2 bucket
- [ ] fail2ban + unattended-upgrades
- [ ] SSH password auth kapat
- [ ] Snapshot cron

**Uzun vade:**
- [ ] Ödeme (Stripe/iyzico/PayTR)
- [ ] Monitoring

---

*Her yeni hata/çözüm §11'e, her yeni adım §13'e eklenmelidir.*
