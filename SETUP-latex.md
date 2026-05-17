# LaTeX Derleme Servisi — Kurulum Rehberi

> Bu sayfa `latex.furkanbasoglu.com` (veya `furkanbasoglu.com/latex`) altında çalışacak **Overleaf benzeri LaTeX derleme servisinin** kurulum dokümantasyonudur.
>
> **Mimari özet:** Cloudflare Pages (Astro UI + Pages Functions API) → Cloudflare Tunnel → Raspberry Pi 5 host → KVM VM (Ubuntu Server) → Docker container (TeX Live). Üç güvenlik katmanı: host izolasyonu, VM izolasyonu, container izolasyonu.

---

## İçindekiler

1. [Mimari & Karar Mantığı](#1-mimari--karar-mantığı)
2. [Donanım & Yazılım Gereksinimleri](#2-donanım--yazılım-gereksinimleri)
3. [Host Pi 5 Kurulumu](#3-host-pi-5-kurulumu)
4. [İzole Ağ & Güvenlik](#4-izole-ağ--güvenlik)
5. [Compile VM Kurulumu](#5-compile-vm-kurulumu)
6. [Docker + TeX Live](#6-docker--tex-live)
7. [Cloudflare Tunnel](#7-cloudflare-tunnel)
8. [API & Frontend](#8-api--frontend)
9. [Üyelik Tier'ları & Limitler](#9-üyelik-tierları--limitler)
10. [Güvenlik Kontrol Listesi](#10-güvenlik-kontrol-listesi)
11. [Sık Karşılaşılan Hatalar](#11-sık-karşılaşılan-hatalar)
12. [Bakım & Felaket Kurtarma](#12-bakım--felaket-kurtarma)
13. [Mevcut İlerleme](#13-mevcut-ilerleme)

---

## 1. Mimari & Karar Mantığı

```
┌──────────────────────────────────────────────────────────────────┐
│  KULLANICI TARAYICISI                                             │
│  └─ furkanbasoglu.com/latex (Astro wrapper + iframe)              │
│     └─ public/latex/index.html (Monaco editor + PDF.js viewer)    │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  CLOUDFLARE EDGE (ücretsiz katman)                                │
│  ├─ Pages: Astro statik site (GitHub auto-deploy)                 │
│  ├─ Pages Functions: functions/api/compile.ts                     │
│  │   ├─ Auth (Clerk/Supabase veya custom JWT)                    │
│  │   ├─ Tier kontrolü (Free/Pro/Unlimited)                       │
│  │   ├─ KV rate limit (iletişim sayfasıyla aynı pattern)         │
│  │   └─ Tunnel'a proxy (service token auth)                       │
│  ├─ R2: kullanıcı projeleri (.tex, .bib, görseller)              │
│  ├─ D1: kullanıcı veritabanı, derleme geçmişi, kota sayaçları    │
│  └─ Tunnel: latex-tunnel → Pi VM                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ outbound bağlantı (Pi → Cloudflare)
                           │ router'da port forwarding YOK
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  RASPBERRY PI 5 — HOST (Raspberry Pi OS Bookworm, 192.168.1.114)  │
│  ├─ Kişisel veriler (mail, dosyalar) — VM'den ERİŞİLEMEZ         │
│  └─ KVM/QEMU hypervisor + libvirt                                 │
│        │                                                           │
│        └─ ┌────────────────────────────────────────────────┐      │
│           │  COMPILE VM (Ubuntu Server 24.04)              │      │
│           │  Network: isolated-net (192.168.100.0/24)      │      │
│           │  Resources: 4GB RAM, 2 vCPU, 20GB disk         │      │
│           │  ├─ cloudflared (tunnel client)                │      │
│           │  ├─ Node.js compile API (BullMQ kuyruk)        │      │
│           │  └─ Docker → texlive/texlive container         │      │
│           │      ├─ --network=none                         │      │
│           │      ├─ --read-only, --memory=512m             │      │
│           │      ├─ --user nobody, --rm                    │      │
│           │      └─ Timeout: 60-120s                       │      │
│           └────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

### Neden bu mimari?

| Karar | Sebep |
|---|---|
| **Cloudflare Pages (Worker değil)** | Repo'da zaten `functions/api/report.ts` var — aynı pattern. Auto-deploy + Pages Functions yeterli, ayrı Worker projesi gereksiz. |
| **KVM VM (sadece Docker değil)** | Pi host'unda kişisel veriler (mail vs.) var. Docker container kernel paylaşır; VM kendi kernel'ine sahip → host'a hiç temas yok. |
| **Container + VM** | Defense-in-depth: container kaçışı olsa bile VM'de kalır; VM kaçışı olsa bile host izolasyonunun dışına çıkamaz. |
| **Cloudflare Tunnel** | Router'a port forwarding yok, Pi'nin IP'si dışa açılmaz, DDoS koruması ücretsiz gelir. |
| **isolated-net (NAT, 192.168.100.0/24)** | Ev LAN'ından (`192.168.1.0/24`) farklı subnet → iptables ile VM'in ev LAN'ına erişimi engellenebilir. |
| **`latexmk -no-shell-escape`** | `\write18` ve `\input{URL}` gibi attack vektörlerini kapatır. |

---

## 2. Donanım & Yazılım Gereksinimleri

### Donanım
- **Raspberry Pi 5 (8GB RAM önerilir)** — 4GB'da VM darlığa düşer
- **128GB+ SD kart** veya tercihen NVMe SSD (yoğun kullanımda SD yıpranır)
- Sürekli açık internet bağlantısı, ethernet kablosu (WiFi yedek olarak)
- Aktif soğutma (fan veya pasif kasa)

### Yazılım (host)
- Raspberry Pi OS Bookworm (64-bit) — kernel **6.12+**
- `/dev/kvm` mevcut (yeni Pi OS kernelinde otomatik var, kontrol et)

### Hesaplar
- Cloudflare hesabı (ücretsiz)
- `furkanbasoglu.com` Cloudflare DNS'inde proxy aktif
- GitHub hesabı, `furkanbasoglu/dotcom` repo'su

### Hızlı kontrol komutları
```bash
cat /proc/device-tree/model     # Beklenen: Raspberry Pi 5 Model B
uname -m                         # Beklenen: aarch64
uname -r                         # Beklenen: 6.12.x+
free -h                          # Beklenen: total ~7.9Gi
df -h /                          # En az 30GB boş
ls /dev/kvm                      # Var olmalı
sudo kvm-ok                      # "KVM acceleration can be used"
```

---

## 3. Host Pi 5 Kurulumu

### 3.1 — Sistem güncelle
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### 3.2 — KVM destek doğrula
```bash
ls /dev/kvm
sudo apt install -y cpu-checker
sudo kvm-ok
```
**Beklenen:** `INFO: /dev/kvm exists` ve `KVM acceleration can be used`.

`/dev/kvm` yoksa → [Hata #1](#hata-1-devkvm-yok).

### 3.3 — KVM + libvirt paketlerini kur
```bash
sudo apt install -y qemu-system-arm qemu-utils libvirt-daemon-system \
                    libvirt-clients virtinst bridge-utils
```

**Bekledikleri:** ~36MB indirme, ~572MB disk. Bazı kozmetik uyarılar normaldir:
- `libvirt-qemu's uid 64055 is greater than SYS_UID_MAX 999` — yoksay
- `home dir /var/lib/tpm can't be accessed` — TPM kullanmıyoruz, yoksay

### 3.4 — Kullanıcıyı `libvirt` ve `kvm` gruplarına ekle
```bash
sudo usermod -aG libvirt,kvm $USER
newgrp libvirt
groups   # libvirt görünmeli
```

> **Not:** `kvm` grubunun aktif olması için **logout/login veya reboot** gerekir. `virsh` libvirt grubuyla zaten çalıştığı için şimdilik sorun olmaz, ama bir dahaki oturumda otomatik düzelir.

### 3.5 — libvirt URI'yi kalıcı yap
Varsayılanda `virsh` "session" daemon'una bağlanır ve `sudo virsh` ile yapılan tanımları görmez. Düzeltmek için:

```bash
echo 'export LIBVIRT_DEFAULT_URI=qemu:///system' >> ~/.bashrc
source ~/.bashrc
```

### 3.6 — IP sabitleme

#### 3.6.1 — WiFi'yi kapat (kablo öncelikli)
İki interface birden açıkken (eth0 + wlan0) router'dan iki ayrı IP gelir, Tunnel hangi interface'i kullanacağını şaşırabilir. Kabloyu kullanıyorsan:

```bash
sudo nmcli radio wifi off
ip addr show | grep "inet " | grep -v 127.0.0.1
# Sadece eth0 görünmeli
```

#### 3.6.2 — MAC adresi al
```bash
ip link show eth0 | grep ether
# link/ether XX:XX:XX:XX:XX:XX
```

#### 3.6.3 — Router'da DHCP reservation yap
Router admin paneline gir (`http://192.168.1.1` veya kendi router IP'n). Menü adı router'a göre değişir:

| Router markası | Menü yolu |
|---|---|
| **Zyxel** (EX3501-T0 vb.) | Home Networking → DHCP Server → Statik DHCP Konfigürasyonu |
| TP-Link | DHCP → Address Reservation |
| Asus | LAN → DHCP Server → Manually Assigned IP |
| Netgear | Advanced → Setup → LAN Setup → Address Reservation |
| TT Modem | DHCP Sunucusu → Statik IP Atama |

MAC adresini gir, IP olarak Pi'nin mevcut IP'sini sabitle (`192.168.1.114` vs.), kaydet.

#### 3.6.4 — Pi'de DHCP yenile
> **NOT:** Pi OS Bookworm NetworkManager kullanır, `dhclient` çalışmaz ("Address already assigned" hatası verir). Doğru komut:

```bash
sudo nmcli connection down "Wired connection 1" && \
sudo nmcli connection up "Wired connection 1"
ip addr show eth0 | grep "inet "
```

Aynı IP görünmeli ama bu sefer **rezerve edilmiş** olarak.

---

## 4. İzole Ağ & Güvenlik

> Bu adım kritik: VM'in **ev LAN'ına erişmesini engeller**. Atlamak ciddi güvenlik açığı yaratır.

### 4.1 — İzole ağ XML'i oluştur
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
```

> **Seçimlerin gerekçesi:**
> - `virbr1`: default libvirt ağı `virbr0` kullanır, çakışmıyoruz
> - `192.168.100.0/24`: ev LAN'ından (`192.168.1.0/24`) farklı subnet
> - `forward mode='nat'`: VM dışarıya çıkabilir (apt, Docker pull, Cloudflare için) ama dışarıdan VM'e direkt erişim yok
> - DHCP `.10-.20`: 11 IP, bize 1-2 VM yeter

### 4.2 — libvirt'e tanıt + başlat
```bash
sudo virsh net-define /etc/libvirt/qemu/networks/isolated-net.xml
sudo virsh net-autostart isolated-net
sudo virsh net-start isolated-net
```

### 4.3 — Default ağı temizle (varsa)
libvirt bazen otomatik `default` ağı (192.168.122.0/24) tanımlar. Kafa karışıklığı yaratmaması için kaldır:

```bash
virsh net-list --all
# Eğer 'default' inactive olarak görünürse:
sudo virsh net-destroy default 2>/dev/null
sudo virsh net-undefine default
```

### 4.4 — Doğrula
```bash
virsh net-list --all
ip link show virbr1
```

Beklenen çıktı:
```
 Name           State    Autostart   Persistent
-------------------------------------------------
 isolated-net   active   yes         yes
```

ve `virbr1` `UP` olmalı.

### 4.5 — ⚠️ Ev LAN izolasyonu (iptables) — BU ADIM HENÜZ YAPILMADI
> **TODO:** Aşağıdaki kurallar VM'in ev LAN'ına erişimini engellemek için. Bir sonraki sohbet adımında yapılacak.

```bash
# VM (192.168.100.0/24) ev LAN'ına (192.168.1.0/24) erişemesin
sudo iptables -I FORWARD -s 192.168.100.0/24 -d 192.168.1.0/24 -j DROP
sudo iptables -I FORWARD -s 192.168.1.0/24 -d 192.168.100.0/24 -j DROP

# Kalıcı yap
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

---

## 5. Compile VM Kurulumu

> **TODO:** Bu bölüm henüz uygulanmadı, plan olarak yazıldı.

### 5.1 — Ubuntu Server ISO indir
```bash
mkdir -p ~/iso && cd ~/iso
wget https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04.1-live-server-arm64.iso
```

### 5.2 — VM oluştur
```bash
sudo virt-install \
  --name latexvm \
  --memory 4096 \
  --vcpus 2 \
  --disk size=20,path=/var/lib/libvirt/images/latexvm.qcow2,format=qcow2 \
  --cdrom ~/iso/ubuntu-24.04.1-live-server-arm64.iso \
  --os-variant ubuntu24.04 \
  --network network=isolated-net,model=virtio \
  --graphics none \
  --console pty,target_type=serial \
  --boot uefi \
  --extra-args 'console=ttyAMA0'
```

**Ubuntu kurulumunda:**
- Hostname: `latexvm`
- Kullanıcı: `latex` (veya istediğin)
- OpenSSH server: **kur** (unutma)
- Tüm disk: kullan (LVM gerekmez)

### 5.3 — VM'e bağlan
```bash
# IP'yi bul
virsh net-dhcp-leases isolated-net
# 192.168.100.X gibi

ssh latex@192.168.100.X
```

---

## 6. Docker + TeX Live

> **TODO:** Bu bölüm henüz uygulanmadı.

VM içinde:

### 6.1 — Docker kur
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
sudo usermod -aG docker $USER
newgrp docker
```

### 6.2 — TeX Live imajı çek
```bash
docker pull texlive/texlive:latest
# ~5GB, 10-30 dakika sürebilir
```

### 6.3 — Test
```bash
mkdir -p ~/test && cd ~/test
echo '\documentclass{article}\begin{document}Hello!\end{document}' > test.tex
docker run --rm --network=none -v $(pwd):/work -w /work \
  texlive/texlive:latest latexmk -pdf -no-shell-escape test.tex
ls test.pdf   # Var olmalı
```

---

## 7. Cloudflare Tunnel

> **TODO:** Bu bölüm henüz uygulanmadı.

VM içinde:

```bash
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb

cloudflared tunnel login
# Tarayıcıda link açılacak, furkanbasoglu.com'u seç

cloudflared tunnel create latex-compiler
# Tunnel ID'sini not al

mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<EOF
tunnel: <TUNNEL_ID>
credentials-file: /home/$USER/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: latex.furkanbasoglu.com
    service: http://localhost:3000
  - service: http_status:404
EOF

cloudflared tunnel route dns latex-compiler latex.furkanbasoglu.com
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

## 8. API & Frontend

> **TODO:** Bu bölüm henüz uygulanmadı, mevcut repo pattern'i baz alınacak.

### Repo yapısı (planlanan)
```
website/
├── functions/
│   └── api/
│       ├── report.ts            # mevcut (iletişim)
│       └── compile.ts           # YENİ — LaTeX compile API
├── src/
│   └── pages/
│       ├── iletisim.astro       # mevcut
│       ├── veri-atlasi.astro    # mevcut
│       └── latex.astro          # YENİ — minimal wrapper + iframe
├── public/
│   ├── veri_atlasi/             # mevcut SPA
│   └── latex/                   # YENİ — Monaco editor + PDF.js SPA
│       ├── index.html
│       ├── app.js
│       └── styles.css
└── SETUP-latex.md               # bu dosya
```

### Pattern (veri-atlasi'den esinlenildi)

**`src/pages/latex.astro`** — minimal Astro wrapper, Header + iframe.

**`public/latex/index.html`** — asıl uygulama: vanilla React (CDN), Monaco editor, PDF.js. Dosya yükleme + derleme butonu + canlı log paneli.

**`functions/api/compile.ts`** — `report.ts` pattern'i:
- Honeypot + Turnstile + KV rate limit (aynı KV namespace tekrar kullanılabilir, prefix farklı)
- Auth katmanı (Clerk JWT veya Cloudflare Access)
- Tier kontrolü → kuyruk önceliği
- R2'ye dosya yükle → Tunnel üzerinden Pi VM'e POST `/compile`
- WebSocket veya SSE ile canlı log stream (Tunnel WebSocket destekler)
- Sonuç PDF'i R2'ye yaz, signed URL döndür

### Cloudflare ortam değişkenleri (planlanan)
| İsim | Açıklama |
|------|----------|
| `RATE_LIMIT` (KV binding) | iletişim ile aynı namespace |
| `TURNSTILE_SECRET_KEY` | mevcut, aynısı |
| `PUBLIC_TURNSTILE_SITE_KEY` | mevcut, aynısı |
| `COMPILE_TUNNEL_URL` | `https://latex.furkanbasoglu.com` |
| `COMPILE_SERVICE_TOKEN_ID` + `COMPILE_SERVICE_TOKEN_SECRET` | Cloudflare Access service token |
| `R2_BUCKET` (R2 binding) | LaTeX projeleri |
| `DB` (D1 binding) | kullanıcılar, kotalar, derleme geçmişi |
| `AUTH_SECRET` | JWT signing |

---

## 9. Üyelik Tier'ları & Limitler

| Tier | Derleme Yeri | Proje Sayısı | Dosya Boyutu | Timeout | Kuyruk Önceliği |
|------|--------------|--------------|--------------|---------|-----------------|
| **Free** | Pi (düşük öncelik) | 1 aktif | 10 MB | 30s | Düşük |
| **Pro** | Pi (normal) | 1 proje, sınırsız derleme | 100 MB | 120s | Normal |
| **Unlimited** | Pi (öncelikli) | Sınırsız | 500 MB | 300s | Yüksek |

**Pi 5 + concurrency=2 ile kapasite tahmini:**
- Orta proje (10-20 sayfa): 3-8 sn derleme
- Saatlik teorik: ~900 derleme
- Pratik: ~200-500/saat
- Rahat hizmet: ~50 aktif kullanıcı
- Üst sınır: 200+ aktif → VPS'e taşıma zamanı

**Bağlantı kopukluğu UX:** Frontend WebSocket/polling ile API health check. Tunnel down → otomatik retry (3s, 6s, 12s exponential backoff) + kullanıcıya "Derleme sunucusuna bağlanılamıyor, yeniden deneniyor..." mesajı. Cloudflare Tunnel outbound olduğu için Pi IP değişse de kullanıcı etkilenmez; sadece yeniden bağlanma için ~5-30s.

---

## 10. Güvenlik Kontrol Listesi

### Network (host Pi)
- [x] WiFi kapalı, sadece eth0
- [x] DHCP reservation → sabit IP
- [x] İzole ağ (`isolated-net`, 192.168.100.0/24)
- [ ] iptables ile ev LAN'ına erişim engelleme (Adım 4.5)
- [ ] Cloudflare Tunnel kullanılacak — port forwarding yok
- [ ] Cloudflare Access service token Tunnel önünde

### VM
- [ ] Ubuntu Server güncel + `unattended-upgrades` aktif
- [ ] `fail2ban` SSH'ı koruyor
- [ ] SSH yalnızca anahtarla, password disabled
- [ ] Root login disabled

### Docker (derleme container)
- [ ] `--network=none` (internet yok)
- [ ] `--read-only`, sadece `/tmp` yazılabilir
- [ ] `--memory=512m --cpus=1`
- [ ] `--user nobody`, `--rm`
- [ ] Timeout 60-120s

### LaTeX
- [ ] `latexmk -no-shell-escape` (shell-escape KAPALI)
- [ ] Dosya sayısı limiti (max 50/proje)
- [ ] Toplam boyut limiti (tier'a göre)

### API (Pages Functions)
- [ ] Auth zorunlu
- [ ] Rate limit (mevcut `report.ts` pattern'i)
- [ ] CORS strict
- [ ] Tüm derleme logları (user ID, süre, hata) D1'e

---

## 11. Sık Karşılaşılan Hatalar

### Hata #1: `/dev/kvm` yok
**Sebep:** Eski kernel veya 32-bit Pi OS.
**Çözüm:**
```bash
uname -m   # aarch64 olmalı
sudo apt update && sudo apt full-upgrade -y
sudo reboot
```
`/boot/firmware/config.txt` içine `arm_64bit=1` ekle (gerekirse).

### Hata #2: `dhclient: Address already assigned`
**Sebep:** Pi OS Bookworm NetworkManager kullanıyor, `dhclient` ile çakışıyor.
**Çözüm:**
```bash
sudo nmcli connection down "Wired connection 1" && \
sudo nmcli connection up "Wired connection 1"
```

### Hata #3: `virsh net-list --all` boş (sudo'suz)
**Sebep:** `virsh` session daemon'a bağlanıyor, ağ system daemon'da.
**Çözüm:**
```bash
echo 'export LIBVIRT_DEFAULT_URI=qemu:///system' >> ~/.bashrc
source ~/.bashrc
```

### Hata #4: `virsh: Failed to connect socket to libvirt-sock`
**Sebep:** Kullanıcı `libvirt` grubunda değil veya yeni grup oturumda aktif değil.
**Çözüm:**
```bash
sudo usermod -aG libvirt,kvm $USER
newgrp libvirt
# Veya logout/login
```

### Hata #5: İki interface birden IP alıyor (eth0 + wlan0)
**Sebep:** Kablo + WiFi birlikte aktif.
**Çözüm:**
```bash
sudo nmcli radio wifi off
```

### Hata #6: VM IP'si görünmüyor
**Çözüm:**
```bash
virsh console latexvm    # konsola gir (Ctrl+] çıkış)
# İçeride: ip addr show
```

### Hata #7: `cloudflared` tunnel bağlanmıyor
- `~/.cloudflared/config.yml` içindeki `credentials-file` path doğru mu?
- `cloudflared tunnel route dns <tunnel-name> latex.furkanbasoglu.com` yapıldı mı?

### Hata #8: Docker pull yavaş (TeX Live 5GB)
Sabırlı ol veya `texlive/texlive:latest-basic` (300MB, sınırlı paketler) kullan.

### Hata #9: LaTeX derlemesi OOM kill
```bash
docker run --memory=1g --memory-swap=1g ...
```

### Hata #10: Yeni dosyalar yanlış grup sahipliğine sahip (`libvirt` vs `pi`)
**Sebep:** `newgrp libvirt` sonrası shell'de `git pull` yapılırsa yeni dosyalar libvirt grubuyla oluşur.
**Çözüm (zararsız ama temiz):**
```bash
sudo chown -R pi:pi ~/Desktop/website
```

---

## 12. Bakım & Felaket Kurtarma

### Günlük health-check
```bash
# Host
virsh list --all              # latexvm "running"
systemctl status libvirtd

# VM içinde
docker ps                     # redis, container'lar
systemctl status cloudflared
curl http://localhost:3000/health
```

### Snapshot al (haftalık önerilir)
```bash
sudo virsh snapshot-create-as --domain latexvm --name "clean-$(date +%Y%m%d)"
sudo virsh snapshot-list latexvm
# Geri sar
sudo virsh snapshot-revert latexvm clean-20260101
```

### Yedeklenmesi gereken dosyalar
- `~/.cloudflared/*.json` — Tunnel credentials (KAYBETME)
- `/etc/libvirt/qemu/networks/isolated-net.xml` (zaten bu dosyada var)
- VM disk imajı (`/var/lib/libvirt/images/latexvm.qcow2`) — opsiyonel, yeniden kurulabilir
- Cloudflare Pages env değişkenleri (Dashboard'a kaydedildi)

### Yeni Pi 5'e sıfırdan geçiş
1. Yeni Pi'ye Raspberry Pi OS Bookworm kur
2. Bu rehberin **3. → 7. bölümlerini** sırayla uygula
3. Eski Tunnel credentials'ı varsa kopyala (`~/.cloudflared/`), yoksa yeni tunnel oluştur
4. Astro repo `git clone` (push'lar zaten Cloudflare'de yaşıyor)
5. R2 + D1 verileri zaten Cloudflare'de, taşımaya gerek yok

**RTO:** Snapshot varsa ~5dk, sıfırdan ~2-4 saat.

---

## 13. Mevcut İlerleme

### ✅ Tamamlananlar (Son güncelleme: 2026-05-18)

#### Host Pi 5
- [x] Pi 5 (8GB, 128GB SD, Pi OS Bookworm, kernel 6.12)
- [x] `/dev/kvm` doğrulandı, `kvm-ok` başarılı
- [x] KVM/libvirt paketleri kuruldu (`qemu-system-arm`, `libvirt-daemon-system`, `virtinst`, `bridge-utils`)
- [x] Kullanıcı `libvirt` ve `kvm` gruplarına eklendi
- [x] `LIBVIRT_DEFAULT_URI=qemu:///system` `~/.bashrc`'ye eklendi

#### Ağ
- [x] WiFi kapatıldı (`nmcli radio wifi off`), sadece eth0 aktif
- [x] Pi'nin IP'si router'da (Zyxel EX3501-T0) DHCP reservation ile sabit: `192.168.1.114`
- [x] İzole sanal ağ (`isolated-net`, 192.168.100.0/24) tanımlandı + autostart + active
- [x] Default libvirt ağı temizlendi (kafa karışıklığı önlendi)
- [x] `virbr1` bridge interface oluştu

#### Repo
- [x] `furkanbasoglu/dotcom` repo'su `~/Desktop/website`'de klonlu ve güncel
- [x] Mevcut pattern incelendi: `veri-atlasi.astro` (minimal wrapper + iframe), `functions/api/report.ts` (Pages Function), `SETUP-iletisim.md` (rehber stili)

### ⏳ Yapılacaklar

#### Yakın (bu sohbette devam)
- [ ] **iptables kuralları**: VM ↔ ev LAN izolasyonu (4.5)
- [ ] **Ubuntu Server ISO indir** (5.1)
- [ ] **Compile VM oluştur** (5.2)
- [ ] VM'e SSH ile bağlan + sistem güncelle

#### Orta vade
- [ ] Docker kurulumu (VM içinde)
- [ ] TeX Live container pull + test derleme
- [ ] Cloudflare Tunnel kurulumu + DNS bağlama
- [ ] Node.js compile API iskeleti (BullMQ + Express)

#### Uzun vade
- [ ] `functions/api/compile.ts` (Cloudflare Pages Function)
- [ ] `src/pages/latex.astro` (minimal wrapper)
- [ ] `public/latex/` (Monaco + PDF.js SPA)
- [ ] Auth katmanı (Clerk veya custom JWT)
- [ ] D1 veritabanı şeması (kullanıcılar, kotalar, derleme geçmişi)
- [ ] R2 bucket (proje dosyaları)
- [ ] Ödeme entegrasyonu (Stripe veya iyzico/PayTR — Türkiye için)

---

*Bu rehber canlı bir dokümandır. Her yeni hata/çözüm 11. bölüme, her yeni adım 13. bölüme eklenmelidir.*
