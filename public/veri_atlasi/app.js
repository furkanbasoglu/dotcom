const {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback
} = React;

// Not: Chart.js UMD bundle'ı her şeyi otomatik kaydeder.

const FONT_SERIF = "'Fraunces Variable', Georgia, serif";
const FONT_SANS = "'Manrope Variable', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono Variable', 'Courier New', monospace";
const HIRES_SCALE = 3;

// ─── Themes ─────────────────────────────────────────────────────
// CSS variables'ı html[data-theme="X"] selektörü ile ayarlıyoruz
// (styles.css içinde). Chart.js canvas üzerinde CSS değişken okuyamaz,
// bu yüzden aynı renkleri burada JS objesi olarak da tutuyoruz.
const THEMES = {
  light: {
    key: 'light',
    bg: '#FAF7F2',
    bgPanel: '#FBF8F1',
    bgInput: '#FFFFFF',
    bgChart: '#FFFFFF',
    ink: '#18222C',
    inkSoft: '#6E6258',
    inkMuted: '#A0917A',
    inkSubtle: '#8B7E6A',
    accent: '#C75D3A',
    accentSoft: '#FCEFE6',
    border: '#E5DDC8',
    borderSoft: '#EDE6D6',
    borderHard: '#D8CCB0',
    danger: '#A03B3B',
    tooltipBg: 'rgba(24, 34, 44, 0.96)',
    tooltipText: '#FAF7F2',
    legendText: '#2A2A2A',
    grid: '#EDE6D6',
    placeholder: '#B8A88E'
  },
  gray: {
    key: 'gray',
    bg: '#2A2C2E',
    bgPanel: '#34373A',
    bgInput: '#3F4245',
    bgChart: '#34373A',
    ink: '#E8E6E2',
    inkSoft: '#B8B5B0',
    inkMuted: '#7C7A77',
    inkSubtle: '#9E9C98',
    accent: '#E07A50',
    accentSoft: '#3D332E',
    border: '#3F4245',
    borderSoft: '#34383B',
    borderHard: '#52555A',
    danger: '#DD6464',
    tooltipBg: 'rgba(232, 230, 226, 0.96)',
    tooltipText: '#18222C',
    legendText: '#E8E6E2',
    grid: '#424649',
    placeholder: '#6B6864'
  },
  dark: {
    key: 'dark',
    bg: '#0F1419',
    bgPanel: '#161B22',
    bgInput: '#1E242C',
    bgChart: '#161B22',
    ink: '#E8E2D8',
    inkSoft: '#9C9389',
    inkMuted: '#6E665C',
    inkSubtle: '#807769',
    accent: '#E67555',
    accentSoft: '#2B1F1A',
    border: '#22272E',
    borderSoft: '#1C2025',
    borderHard: '#30363D',
    danger: '#DD5757',
    tooltipBg: 'rgba(232, 226, 216, 0.95)',
    tooltipText: '#0F1419',
    legendText: '#E8E2D8',
    grid: '#22272E',
    placeholder: '#5A5248'
  }
};
const THEME_KEYS = ['light', 'gray', 'dark'];
const LANG_KEYS = ['tr', 'en'];

// ─── Strings ────────────────────────────────────────────────────
const STRINGS = {
  tr: {
    loading: 'veri atlası yükleniyor…',
    page_title: 'Veri Atlası',
    subtitle: 'CSV · görselleştirme · araç takımı',
    title_a: 'Veri',
    title_b: 'Atlası',
    intro: 'Birden çok CSV yükle, sayısal sütunları seç, karşılaştır. Tüm etiketler düzenlenebilir — PNG, JPEG (3×) veya vektör SVG olarak indir.',
    status_label: 'durum',
    status_files: 'dosya',
    status_variables: 'değişken',
    status_charts: 'grafik',
    theme_label: 'tema',
    lang_label: 'dil',
    theme_light: 'açık',
    theme_gray: 'gri',
    theme_dark: 'koyu',
    // Nav
    nav_csv: 'CSV',
    nav_sparams: 'S-Parametre',
    nav_iq: 'I/Q',
    nav_waveform: 'Dalga Formu',
    nav_bilgi: 'Bilgi',
    // IQ
    iq_upload: '01 · I/Q kaydı yükle',
    iq_upload_hint: 'spektrum analizör / SDR çıktıları — CSV veya text',
    iq_drop_text: 'I/Q kayıtlarını buraya sürükle',
    iq_formats: 'desteklenen: 2 kolon (I, Q), 3 kolon (t, I, Q), boşluk/virgül/tab ayrılmış',
    iq_formats_full: '.CSV · .TXT · .CFILE · .FC32 · .SC16 · .CI16 · .CS8 · .SIGMF-META + .SIGMF-DATA · BİRDEN FAZLA SEÇİLEBİLİR',
    iq_sample: 'örnek 16-QAM',
    iq_files: 'I/Q dosyaları',
    iq_samples: 'örnek',
    iq_sample_rate: 'örnekleme hızı (Hz)',
    iq_center_freq: 'merkez frekansı (Hz)',
    iq_views: 'görünümler',
    iq_window: 'pencere',
    iq_fft_size: 'FFT boyutu',
    iq_view_iq_time: 'I & Q · zaman',
    iq_view_magnitude: '|I + jQ| · zaman (genlik zarfı)',
    iq_view_constellation: 'konstelasyon (I-Q düzlemi)',
    iq_view_spectrum: 'spektrum (FFT, dB)',
    iq_axis_time: 'zaman',
    iq_axis_amp: 'genlik',
    iq_axis_freq: 'frekans',
    iq_axis_psd: 'güç yoğunluğu (dB)',
    // Waveform
    wf_upload: '01 · dalga formu yükle',
    wf_upload_hint: 'osiloskop / işaret kayıtları — tek veya çok kanal',
    wf_drop_text: 'dalga formu dosyalarını buraya sürükle',
    wf_formats: 'desteklenen: CSV/text, tek kolon (örnek/satır), çok kolon (her kolon ayrı kanal), ilk kolon zaman ise otomatik algılanır',
    wf_formats_full: '.CSV · .TXT · .TSV · .DAT · .WAV · BİRDEN FAZLA SEÇİLEBİLİR',
    wf_sample: 'örnek 2-ton + AM',
    wf_files: 'dalga formu dosyaları',
    wf_channels: 'kanal',
    wf_samples: 'örnek',
    wf_sample_rate: 'örnekleme hızı (Hz)',
    wf_time_detected: 'zaman ekseni algılandı',
    wf_views: 'görünümler',
    wf_window: 'pencere',
    wf_fft_channel: 'FFT kanalı',
    wf_view_time: 'zaman alanı',
    wf_view_spectrum: 'spektrum (FFT, dB)',
    wf_axis_time: 'zaman',
    wf_axis_amp: 'genlik',
    wf_axis_freq: 'frekans',
    wf_axis_psd: 'güç yoğunluğu (dB)',
    select_file: 'dosya seç',
    nav_open_new_tab: 'yeni sekmede aç',
    coming_soon: 'yakında',
    // S-Parameters sayfası
    sparams_subtitle: 'Touchstone · S-parametre · ağ analizörü',
    sparams_title_a: 'S-',
    sparams_title_b: 'Parametre',
    sparams_intro: '.s1p–.s4p Touchstone dosyalarını yükle. Genlik (dB), faz (°), Smith chart ve VSWR olarak görüntüle. Çoklu dosya üst üste karşılaştırılır.',
    iq_subtitle: 'I/Q kaydı · spektrum analizör · SDR',
    iq_title_a: 'I',
    iq_title_b: '& Q',
    iq_intro: 'Spektrum analizör veya SDR çıktısı bir I/Q kaydını yükle. Zaman alanında I&Q ve genlik zarfı, konstelasyon diyagramı, ve seçilebilir pencere fonksiyonuyla FFT spektrumu.',
    wf_subtitle: 'Dalga formu · zaman alanı · spektrum',
    wf_title_a: 'Dalga',
    wf_title_b: 'formu',
    wf_intro: 'Osiloskop veya işaret kaydı bir dalga formunu yükle. Çok kanallı zaman alanı ve seçili kanal için FFT spektrumu. İlk kolon zaman ekseniyse otomatik algılanır.',
    bilgi_subtitle: '04 · terim sözlüğü · başvuru',
    bilgi_title_a: 'Bilgi',
    bilgi_title_b: 'sekmesi',
    bilgi_intro: 'Sitede kullanılan tüm terimlerin (S-parametreleri, I/Q, FFT, Smith chart, pencere fonksiyonları…) detaylı açıklamaları, şekiller ve formüller.',
    sparams_drop: 'Touchstone dosyalarını buraya sürükle',
    sparams_ext_hint: '.s1p · .s2p · .s3p · .s4p · birden fazla seçilebilir',
    sparams_no_files: 'henüz S-parametre dosyası yüklenmedi',
    sparams_load_files: 'dosya seçince Touchstone formatı tanınır ve burada görünür',
    sparams_view_magnitude: 'Genlik (dB)',
    sparams_view_phase: 'Faz (°)',
    sparams_view_smith: 'Smith',
    sparams_view_vswr: 'VSWR',
    sparams_view_group_delay: 'Grup gecikme',
    sparams_phase_b_pending: 'Faz B · yakında',
    sparams_phase_b2_pending: 'Faz B-2 · yakında (Smith chart)',
    smith_no_reflection: 'Smith chart için en az bir S_ii (refleksiyon) parametresi seçin',
    smith_hint: 'örn. S11, S22, S33 …',
    smith_click_marker: 'tıklayarak marker koy',
    smith_zoom_hint: 'tekerlek: yakınlaştır · sürükle: kaydır',
    sparams_first_freq_preview: 'ilk frekansta değerler (tanılama)',
    sparams_warn_open: 'açık devre / kayıt eksik?',
    sparams_warn_zero: 'sıfır — port yok?',
    sparams_parameters: 'parametreler',
    sparams_file_z0: 'Z₀',
    sparams_file_ports: 'port',
    sparams_file_points: 'nokta',
    sparams_format: 'format',
    sparams_invalid: 'Touchstone formatında okunamadı — dosyayı atladım',
    sparams_freq_unit: 'frekans birimi',
    sparams_unwrap_phase: 'fazı aç (unwrap)',
    sparams_sample: 'örnek 2-port',
    sparams_sample_hint: 'Sentetik 2-portlu bant-geçiren filtre, 0.5–3 GHz',
    reset_zoom: 'yakınlaşmayı sıfırla',
    edit_title: 'başlığı düzenle',
    chart_x_label: 'X ekseni etiketi',
    chart_y_label: 'Y ekseni etiketi',
    chart_normalize: 'normalize',
    chart_show_points: 'noktaları göster',
    chart_settings: 'grafik ayarları',
    samples_title: 'örnek dosyalar',
    samples_hint: 'farklı format/senaryo — indir ve gerçek dosyayı incele',
    samples_load: 'yükle',
    samples_download: 'indir',
    samples_load_title: 'uygulamaya yükle',
    samples_download_title: 'diske kaydet (formatı incele)',
    samples_binary_only: 'binary dosya — sadece formatı incelemek için',
    samples_inspect_only: 'sadece indir',
    maximize: 'büyüt',
    restore: 'küçült',
    next_chart: 'sonraki',
    prev_chart: 'önceki',
    close: 'kapat',
    axis_freq: 'Frekans',
    axis_freq_hz: 'Frekans (Hz)',
    axis_freq_khz: 'Frekans (kHz)',
    axis_freq_mhz: 'Frekans (MHz)',
    axis_freq_ghz: 'Frekans (GHz)',
    axis_mag_db: 'Genlik (dB)',
    axis_phase_deg: 'Faz (°)',
    axis_vswr: 'VSWR',
    axis_group_delay: 'Grup gecikme',
    swap_xy_title: 'x ile y verisini takasla (cihaz yanlış kaydetmişse onarmak için)',
    on: 'açık',
    off: 'kapalı',
    marker: 'imleç',
    marker_set: 'imleci buraya koy',
    marker_clear: 'imleci kaldır',
    marker_no_value: 'imleç yok',
    marker_freq: 'imleç frekansı',
    marker_hint: 'bir grafiğe tıklayarak imleç koy · tüm görünümlerde ortak',
    marker_z: 'empedans (Z)',
    marker_y: 'admitans (Y)',
    marker_rl: 'geri dönüş kaybı (RL)',
    marker_gd: 'grup gecikme',
    smith_chart: 'Smith abağı',
    smith_no_reflection: 'Smith çiziminde yalnız yansıma parametreleri (S₁₁, S₂₂, …) gösterilir',
    smith_hint: 'tıkla → o noktanın frekansı tüm grafiklerde imleç olur',
    two_port_order: 'iki-port veri sırası',
    two_port_order_hint: 'S₁₁ sabit/yatay çıkıyorsa sırayı değiştir',
    two_port_order_12_21: '12_21 (S11, S21, S12, S22 — Touchstone v1 varsayılan)',
    two_port_order_21_12: '21_12 (S11, S12, S21, S22 — bazı eski cihazlar)',
    freq_axis_unit: 'frekans birimi',
    phase_unwrap: 'fazı aç (unwrap)',
    phase_unwrap_hint: 'sıçramaları (±180°) yumuşatır, türev/grup gecikme için gerekli',
    section_upload: '01 · veri yükle',
    drop_csv: 'CSV dosyalarını buraya sürükle',
    pick_file: 'dosya seç',
    or_sample: 'ya da örnek:',
    sample_climate: 'aylık iklim',
    sample_climate_hint: 'İstanbul + Ankara 2024 aylık iklim verisi',
    sample_s21: 'kablo S21 · 0–6 GHz',
    sample_s21_hint: '2 kablo için 0–6 GHz S21 ölçümü (6001 nokta/kablo)',
    csv_hint: '.csv · birden fazla seçilebilir',
    section_files: '02 · yüklü dosyalar',
    files_hint: 'D etiketine tıklayarak dosyaya kısa ad ver · sütun isimlerini grafik panelinden düzenleyebilirsin',
    file_stats: '{rows} satır · {cols} sütun · {nums} sayısal',
    remove: 'kaldır',
    section_charts: '03 · grafikler',
    add_chart: 'yeni grafik ekle',
    new_chart: 'yeni grafik',
    default_chart_title: 'Birleşik Grafik',
    chart_title_n: 'Grafik {n}',
    edit_title_hint: '✎ düzenle',
    delete: 'sil',
    no_series: 'henüz seri seçilmedi',
    pick_variable: 'sağdaki kutucuklardan değişken seç',
    variables: 'değişkenler',
    select_all: 'tümü',
    clear_all: 'boşalt',
    no_numeric: 'sayısal sütun bulunamadı',
    click_to_edit: 'Düzenlemek için tıkla',
    rename_column: 'Sütun adını yeniden adlandır',
    edit_file_label: 'Dosya etiketini düzenle',
    axis_labels: 'eksen etiketleri',
    default_x: 'satır indeksi',
    default_y: 'değer',
    default_y_norm: 'normalleştirilmiş değer',
    normalize_toggle: 'normalleştir (ortak maks)',
    normalize_hint: "seçili tüm serilerin ortak maks|v|'sine böler — oranlar korunur, küçük seriler küçük kalır",
    export_section: 'dışa aktar',
    export_png_title: '3× çözünürlüklü PNG',
    export_jpeg_title: '3× çözünürlüklü JPEG',
    export_svg_title: 'Vektör SVG',
    export_caption: 'PNG/JPEG 3× çözünürlüklü · SVG vektör (sınırsız ölçeklenir)',
    footer: 'Sayısal olmayan sütunlar otomatik filtrelenir · imleci grafiğe getirince tüm seçili serilerin değerleri canlı görünür · tüm etiketler düzenlenebilir',
    svg_fail: 'SVG dışa aktarımı başarısız: '
  },
  en: {
    loading: 'loading data atlas…',
    page_title: 'Data Atlas',
    subtitle: 'CSV · visualization · toolkit',
    title_a: 'Data',
    title_b: 'Atlas',
    intro: 'Load multiple CSVs, pick numeric columns, compare. All labels are editable — export as PNG, JPEG (3×) or vector SVG.',
    status_label: 'status',
    status_files: 'files',
    status_variables: 'variables',
    status_charts: 'charts',
    theme_label: 'theme',
    lang_label: 'lang',
    theme_light: 'light',
    theme_gray: 'gray',
    theme_dark: 'dark',
    // Nav
    nav_csv: 'CSV',
    nav_sparams: 'S-Parameters',
    nav_iq: 'I/Q',
    nav_waveform: 'Waveform',
    nav_bilgi: 'Info',
    // IQ
    iq_upload: '01 · upload I/Q record',
    iq_upload_hint: 'spectrum analyzer / SDR captures — CSV or text',
    iq_drop_text: 'drop I/Q records here',
    iq_formats: 'supported: 2 columns (I, Q), 3 columns (t, I, Q), space/comma/tab separated',
    iq_formats_full: '.CSV · .TXT · .CFILE · .FC32 · .SC16 · .CI16 · .CS8 · .SIGMF-META + .SIGMF-DATA · MULTIPLE ALLOWED',
    iq_sample: 'sample 16-QAM',
    iq_files: 'I/Q files',
    iq_samples: 'samples',
    iq_sample_rate: 'sample rate (Hz)',
    iq_center_freq: 'center frequency (Hz)',
    iq_views: 'views',
    iq_window: 'window',
    iq_fft_size: 'FFT size',
    iq_view_iq_time: 'I & Q · time',
    iq_view_magnitude: '|I + jQ| · time (envelope)',
    iq_view_constellation: 'constellation (I-Q plane)',
    iq_view_spectrum: 'spectrum (FFT, dB)',
    iq_axis_time: 'time',
    iq_axis_amp: 'amplitude',
    iq_axis_freq: 'frequency',
    iq_axis_psd: 'power density (dB)',
    // Waveform
    wf_upload: '01 · upload waveform',
    wf_upload_hint: 'oscilloscope / signal captures — single or multi-channel',
    wf_drop_text: 'drop waveform files here',
    wf_formats: 'supported: CSV/text, single column (sample/row), multi-column (each column a channel), first column auto-detected as time',
    wf_formats_full: '.CSV · .TXT · .TSV · .DAT · .WAV · MULTIPLE ALLOWED',
    wf_sample: 'sample 2-tone + AM',
    wf_files: 'waveform files',
    wf_channels: 'channel',
    wf_samples: 'samples',
    wf_sample_rate: 'sample rate (Hz)',
    wf_time_detected: 'time axis detected',
    wf_views: 'views',
    wf_window: 'window',
    wf_fft_channel: 'FFT channel',
    wf_view_time: 'time domain',
    wf_view_spectrum: 'spectrum (FFT, dB)',
    wf_axis_time: 'time',
    wf_axis_amp: 'amplitude',
    wf_axis_freq: 'frequency',
    wf_axis_psd: 'power density (dB)',
    select_file: 'select file',
    nav_open_new_tab: 'open in new tab',
    coming_soon: 'soon',
    // S-Parameters page
    sparams_subtitle: 'Touchstone · S-parameters · network analyzer',
    sparams_title_a: 'S-',
    sparams_title_b: 'Parameters',
    sparams_intro: 'Load .s1p–.s4p Touchstone files. View magnitude (dB), phase (°), Smith chart and VSWR. Multiple files overlay for comparison.',
    iq_subtitle: 'I/Q record · spectrum analyzer · SDR',
    iq_title_a: 'I',
    iq_title_b: '& Q',
    iq_intro: 'Load an I/Q record from a spectrum analyzer or SDR. Time-domain I&Q and amplitude envelope, constellation diagram, and FFT spectrum with selectable window function.',
    wf_subtitle: 'Waveform · time domain · spectrum',
    wf_title_a: 'Wave',
    wf_title_b: 'form',
    wf_intro: 'Load a waveform from an oscilloscope or signal capture. Multi-channel time domain and FFT spectrum for the chosen channel. First column auto-detected as time axis if monotonic.',
    bilgi_subtitle: '04 · glossary · reference',
    bilgi_title_a: 'Info',
    bilgi_title_b: 'tab',
    bilgi_intro: 'Detailed explanations of every term used in the app (S-parameters, I/Q, FFT, Smith chart, window functions…) with figures and formulas.',
    sparams_drop: 'drop Touchstone files here',
    sparams_ext_hint: '.s1p · .s2p · .s3p · .s4p · multiple allowed',
    sparams_no_files: 'no S-parameter files loaded yet',
    sparams_load_files: 'load files — Touchstone format is auto-detected and shown here',
    sparams_view_magnitude: 'Magnitude (dB)',
    sparams_view_phase: 'Phase (°)',
    sparams_view_smith: 'Smith',
    sparams_view_vswr: 'VSWR',
    sparams_view_group_delay: 'Group delay',
    sparams_phase_b_pending: 'Phase B · soon',
    sparams_phase_b2_pending: 'Phase B-2 · soon (Smith chart)',
    smith_no_reflection: 'Select at least one S_ii (reflection) parameter for Smith chart',
    smith_hint: 'e.g. S11, S22, S33 …',
    smith_click_marker: 'click to place marker',
    smith_zoom_hint: 'wheel: zoom · drag: pan',
    sparams_first_freq_preview: 'first-frequency values (diagnostic)',
    sparams_warn_open: 'open circuit / missing record?',
    sparams_warn_zero: 'zero — no port?',
    sparams_parameters: 'parameters',
    sparams_file_z0: 'Z₀',
    sparams_file_ports: 'port',
    sparams_file_points: 'points',
    sparams_format: 'format',
    sparams_invalid: 'Not a valid Touchstone file — skipped',
    sparams_freq_unit: 'frequency unit',
    sparams_unwrap_phase: 'unwrap phase',
    sparams_sample: 'sample 2-port',
    sparams_sample_hint: 'Synthetic 2-port bandpass filter, 0.5–3 GHz',
    reset_zoom: 'reset zoom',
    edit_title: 'edit title',
    chart_x_label: 'X axis label',
    chart_y_label: 'Y axis label',
    chart_normalize: 'normalize',
    chart_show_points: 'show points',
    chart_settings: 'chart settings',
    samples_title: 'sample files',
    samples_hint: 'different formats/scenarios — download and inspect the real file',
    samples_load: 'load',
    samples_download: 'download',
    samples_load_title: 'load into app',
    samples_download_title: 'save to disk (inspect format)',
    samples_binary_only: 'binary file — for format inspection only',
    samples_inspect_only: 'download only',
    maximize: 'maximize',
    restore: 'restore',
    next_chart: 'next',
    prev_chart: 'previous',
    close: 'close',
    axis_freq: 'Frequency',
    axis_freq_hz: 'Frequency (Hz)',
    axis_freq_khz: 'Frequency (kHz)',
    axis_freq_mhz: 'Frequency (MHz)',
    axis_freq_ghz: 'Frequency (GHz)',
    axis_mag_db: 'Magnitude (dB)',
    axis_phase_deg: 'Phase (°)',
    axis_vswr: 'VSWR',
    axis_group_delay: 'Group delay',
    swap_xy_title: 'swap x and y data (fix files saved with reversed columns)',
    on: 'on',
    off: 'off',
    marker: 'marker',
    marker_set: 'set marker here',
    marker_clear: 'clear marker',
    marker_no_value: 'no marker',
    marker_freq: 'marker frequency',
    marker_hint: 'click any chart to place marker · shared across all views',
    marker_z: 'impedance (Z)',
    marker_y: 'admittance (Y)',
    marker_rl: 'return loss (RL)',
    marker_gd: 'group delay',
    smith_chart: 'Smith chart',
    smith_no_reflection: 'Smith chart only shows reflection parameters (S₁₁, S₂₂, …)',
    smith_hint: 'click → set that frequency as marker in all charts',
    two_port_order: 'two-port data order',
    two_port_order_hint: 'flip the order if S₁₁ shows up flat/constant',
    two_port_order_12_21: '12_21 (S11, S21, S12, S22 — Touchstone v1 default)',
    two_port_order_21_12: '21_12 (S11, S12, S21, S22 — some legacy tools)',
    freq_axis_unit: 'freq unit',
    phase_unwrap: 'unwrap phase',
    phase_unwrap_hint: 'smooths ±180° jumps, needed for group delay',
    section_upload: '01 · load data',
    drop_csv: 'drop CSV files here',
    pick_file: 'pick file',
    or_sample: 'or sample:',
    sample_climate: 'monthly climate',
    sample_climate_hint: 'İstanbul + Ankara monthly climate data, 2024',
    sample_s21: 'cable S21 · 0–6 GHz',
    sample_s21_hint: 'S21 measurement for 2 cables across 0–6 GHz (6001 points each)',
    csv_hint: '.csv · multiple allowed',
    section_files: '02 · loaded files',
    files_hint: 'click the D label to give a file a short name · edit column names from the chart panel',
    file_stats: '{rows} rows · {cols} cols · {nums} numeric',
    remove: 'remove',
    section_charts: '03 · charts',
    add_chart: 'add new chart',
    new_chart: 'new chart',
    default_chart_title: 'Combined Chart',
    chart_title_n: 'Chart {n}',
    edit_title_hint: '✎ edit',
    delete: 'delete',
    no_series: 'no series selected yet',
    pick_variable: 'pick a variable from the panel on the right',
    variables: 'variables',
    select_all: 'all',
    clear_all: 'clear',
    no_numeric: 'no numeric columns found',
    click_to_edit: 'Click to edit',
    rename_column: 'Rename column',
    edit_file_label: 'Edit file label',
    axis_labels: 'axis labels',
    default_x: 'row index',
    default_y: 'value',
    default_y_norm: 'normalized value',
    normalize_toggle: 'normalize (shared max)',
    normalize_hint: 'divides by max|v| across all selected series — preserves ratios, small series stay small',
    export_section: 'export',
    export_png_title: '3× resolution PNG',
    export_jpeg_title: '3× resolution JPEG',
    export_svg_title: 'Vector SVG',
    export_caption: 'PNG/JPEG 3× resolution · SVG vector (scales infinitely)',
    footer: 'Non-numeric columns are auto-filtered · hover over the chart to see all selected series values live · all labels are editable',
    svg_fail: 'SVG export failed: '
  }
};
function makeT(lang) {
  return (key, vars) => {
    let s = STRINGS[lang] && STRINGS[lang][key] || STRINGS.tr[key] || key;
    if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  };
}

// ─── Palette ────────────────────────────────────────────────────
const PALETTE = ['#C75D3A', '#3F5E4F', '#2E5C8A', '#B4894B', '#7A4267', '#5E7C3E', '#A03B3B', '#3D7186', '#8B6F47', '#4A5573', '#B86E7B', '#5F7466'];
// Koyu temalar için daha parlak palet
const PALETTE_DARK = ['#E07A50', '#7DB098', '#6BA0D0', '#D4B070', '#B47AA0', '#9ABE7A', '#E07878', '#75A8C0', '#C09870', '#7088B0', '#D89098', '#90B098'];
const paletteFor = themeKey => themeKey === 'light' ? PALETTE : PALETTE_DARK;

// ─── Örnek veriler ─────────────────────────────────────────────
const SAMPLE_ISTANBUL = `ay,ortalama_sicaklik,yagis_mm,nem_yuzde,gunes_saati
1,6.2,99,82,3.1
2,6.5,72,79,4.0
3,8.4,68,76,5.0
4,12.7,46,72,6.2
5,17.3,33,69,7.8
6,22.0,29,64,10.1
7,24.5,28,62,11.2
8,24.6,28,63,10.5
9,21.0,46,67,8.4
10,16.3,76,74,5.9
11,12.0,98,79,4.0
12,8.5,116,82,3.0`;
const SAMPLE_ANKARA = `ay,ortalama_sicaklik,yagis_mm,nem_yuzde,gunes_saati
1,0.2,40,77,2.7
2,1.7,35,73,3.8
3,5.7,39,65,5.1
4,11.0,42,59,6.5
5,15.8,51,58,8.0
6,20.0,35,53,10.2
7,23.5,14,48,11.4
8,23.3,11,48,10.9
9,18.5,18,52,9.0
10,12.7,28,62,6.3
11,6.4,32,72,4.0
12,2.0,45,79,2.5`;
function makeS21CSV({
  lengthM,
  alphaCoef,
  ripplePeriodMHz,
  rippleAmp,
  noiseAmp,
  seed
}) {
  let r = seed >>> 0;
  const rand = () => {
    r = Math.imul(r, 1664525) + 1013904223 >>> 0;
    return r / 4294967296 - 0.5;
  };
  const rows = ['s21_db'];
  for (let f = 0; f <= 6000; f++) {
    const sqrtF = Math.sqrt(Math.max(f, 0.5));
    const alpha = alphaCoef * sqrtF * lengthM;
    const ripple = rippleAmp * Math.sin(2 * Math.PI * f / ripplePeriodMHz);
    const noise = noiseAmp * rand() * 2;
    const s21 = -(alpha + ripple + noise);
    rows.push(s21.toFixed(3));
  }
  return rows.join('\n');
}

// ─── Örnek Touchstone (.s2p) — sentetik bantgeçirencn filtre ────
// 4. dereceden Butterworth, f0=1.5 GHz, BW=500 MHz, lineer faz tepkisi.
// S11/S22: bant içinde iyi match, S21=S12: bant içinde ~0 dB, bant dışı düşer.
function makeSampleS2P() {
  const lines = ['! Synthetic 2-port bandpass filter (Butterworth, order 4)', '! Center: 1.5 GHz, BW: 500 MHz, Group delay: 2 ns', '# GHz S DB R 50'];
  const f0 = 1.5e9,
    bw = 500e6,
    order = 4,
    gd = 2e-9;
  const N = 401,
    fMin = 0.5e9,
    fMax = 3.0e9;
  for (let i = 0; i < N; i++) {
    const f = fMin + (fMax - fMin) * i / (N - 1);
    const x = (f - f0) / (bw / 2);
    const magS21Sq = 1 / (1 + Math.pow(x, 2 * order));
    const magS21 = Math.sqrt(magS21Sq);
    const magS21_dB = 20 * Math.log10(Math.max(magS21, 1e-12));
    // Linear phase
    const phaseS21_deg = -2 * Math.PI * f * gd * 180 / Math.PI % 360;
    const phaseS21_norm = phaseS21_deg > 180 ? phaseS21_deg - 360 : phaseS21_deg < -180 ? phaseS21_deg + 360 : phaseS21_deg;
    // S11 ≈ √(1 - |S21|²), bant içinde küçük, bant dışında büyük
    const magS11 = Math.sqrt(Math.max(0, 1 - magS21Sq) + 0.002);
    const magS11_dB = 20 * Math.log10(magS11);
    const phaseS11_deg = -90 + Math.sin(2 * Math.PI * (f - f0) / 1e9) * 40;
    // S22 ≈ S11, küçük asimetri
    const magS22_dB = magS11_dB - 0.3;
    const phaseS22_deg = phaseS11_deg + 8;
    // S12 = S21 (resiprokal)
    const fGHz = (f / 1e9).toFixed(6);
    lines.push(`${fGHz}  ${magS11_dB.toFixed(3)} ${phaseS11_deg.toFixed(2)}  ${magS21_dB.toFixed(3)} ${phaseS21_norm.toFixed(2)}  ${magS21_dB.toFixed(3)} ${phaseS21_norm.toFixed(2)}  ${magS22_dB.toFixed(3)} ${phaseS22_deg.toFixed(2)}`);
  }
  return lines.join('\n');
}

// ─── Touchstone ek örnekler — farklı format/port sayısı ─────────
// .s2p in DB format: 3rd-order Butterworth low-pass filter, fc=2 GHz
function makeS2P_LPF_DB() {
  const lines = ['! 3rd-order Butterworth low-pass filter (LPF)', '! Cutoff: 2.0 GHz · Z0 = 50 ohm', '! Format: dB / degree', '# GHz S DB R 50'];
  const fc = 2.0;
  const order = 3;
  for (let i = 0; i <= 80; i++) {
    const f = 0.05 + i * 0.0625; // 0.05 → ~5 GHz
    const omegaN = f / fc;
    const H_abs = 1 / Math.sqrt(1 + Math.pow(omegaN, 2 * order));
    const H_dB = 20 * Math.log10(H_abs);
    const H_phase_rad = -order * Math.atan(omegaN);
    const H_phase = H_phase_rad * 180 / Math.PI;
    const S11_lin = Math.sqrt(Math.max(0, 1 - H_abs * H_abs));
    const S11_dB = 20 * Math.log10(S11_lin + 1e-30);
    const S11_phase = 180;
    lines.push(`${f.toFixed(4)}  ${S11_dB.toFixed(3)} ${S11_phase.toFixed(2)}` + `  ${H_dB.toFixed(3)} ${H_phase.toFixed(2)}` + `  ${H_dB.toFixed(3)} ${H_phase.toFixed(2)}` + `  ${S11_dB.toFixed(3)} ${S11_phase.toFixed(2)}`);
  }
  return lines.join('\n');
}

// .s1p in MA format: Antenna match — only S11
function makeS1P_antenna_MA() {
  const lines = ['! Patch antenna S11 (single-port reflection)', '! Resonant frequency: 2.45 GHz · Bandwidth: ~100 MHz', '! Format: linear magnitude / degree', '# GHz S MA R 50'];
  const f0 = 2.45;
  const Q = 25; // moderate Q-factor
  for (let i = 0; i <= 100; i++) {
    const f = 2.0 + i * 0.01; // 2.0 → 3.0 GHz
    // Resonant impedance: Z = R + j·X(f). Around f0, real part dips, imag swings.
    const x = 2 * Q * (f - f0) / f0;
    // |S11|: dip at resonance
    const mag = 0.1 + 0.85 * Math.abs(x) / Math.sqrt(1 + x * x); // 0.1 at f0, ~0.95 far
    const magClamped = Math.min(0.99, mag);
    const phase = Math.atan2(x, 1) * 180 / Math.PI - 90;
    lines.push(`${f.toFixed(4)}  ${magClamped.toFixed(5)} ${phase.toFixed(2)}`);
  }
  return lines.join('\n');
}

// .s2p in RI (Real/Imag) format: Coaxial cable, lossy, electrical length 0.5m
function makeS2P_cable_RI() {
  const lines = ['! Coaxial cable model: RG-58 1 meter @ Z0=50', '! Attenuation: ~0.5 dB/m @ 1 GHz, scales as sqrt(f)', '! Format: real / imag (RI)', '# GHz S RI R 50'];
  const length_m = 1.0;
  const vp = 0.66 * 3e8; // velocity factor 0.66
  for (let i = 0; i <= 60; i++) {
    const fGHz = 0.1 + i * 0.05; // 0.1 → 3.1 GHz
    const f = fGHz * 1e9;
    // Attenuation per meter (alpha) scales as sqrt(f)
    const alpha_dB_per_m = 0.5 * Math.sqrt(fGHz);
    const alpha_Np_per_m = alpha_dB_per_m / 8.686;
    const totalAtten_Np = alpha_Np_per_m * length_m;
    // Phase: beta * length, beta = 2*pi*f / vp
    const phase_rad = -2 * Math.PI * f * length_m / vp;
    // S21 = exp(-alpha*L) * exp(-j*beta*L)
    const mag_S21 = Math.exp(-totalAtten_Np);
    const S21_re = mag_S21 * Math.cos(phase_rad);
    const S21_im = mag_S21 * Math.sin(phase_rad);
    // S11 small (matched cable, tiny reflection from imperfections)
    const ripple = 0.02 * Math.sin(2 * Math.PI * f / 200e6);
    const S11_re = ripple;
    const S11_im = ripple * 0.5;
    lines.push(`${fGHz.toFixed(4)}  ${S11_re.toFixed(6)} ${S11_im.toFixed(6)}` + `  ${S21_re.toFixed(6)} ${S21_im.toFixed(6)}` + `  ${S21_re.toFixed(6)} ${S21_im.toFixed(6)}` + `  ${S11_re.toFixed(6)} ${S11_im.toFixed(6)}`);
  }
  return lines.join('\n');
}

// ─── Helpers ───────────────────────────────────────────────────

// Dosya uzantısından format tipi
function detectFileFormat(name) {
  const lower = name.toLowerCase();
  if (/\.s\d+p$/.test(lower)) return 'touchstone';
  if (lower.endsWith('.csv') || lower.endsWith('.trf') || lower.endsWith('.dat')) return 'csv';
  if (lower.endsWith('.iq.tar')) return 'iqtar';
  if (lower.endsWith('.bin') || lower.endsWith('.wfm.bin') || lower.endsWith('.wfm')) return 'waveform';
  return 'unknown';
}

// ─── Touchstone parser ─────────────────────────────────────────
// Hem v1 (default GHz S MA R 50) hem v2 ([Version] 2.0) destekler.
// .s1p–.s4p+: port sayısı dosya uzantısı veya [Number of Ports]'dan gelir.
// Format normalize: tüm S-parametreler complex {re, im} olarak saklanır.
// Frekans normalize: tüm değerler Hz'e çevrilir.
function parseTouchstone(text, filename) {
  // Port sayısını uzantıdan tahmin et (fallback)
  const portMatch = /\.s(\d+)p$/i.exec(filename || '');
  let numPorts = portMatch ? Number(portMatch[1]) : 0;
  const FREQ_MULT = {
    hz: 1,
    khz: 1e3,
    mhz: 1e6,
    ghz: 1e9
  };
  let freqUnit = 'ghz',
    paramType = 's',
    dataFormat = 'ma',
    z0List = [50];
  let version = '1.0',
    twoPortDataOrder = '12_21';
  let numFreqs = null,
    matrixFormat = 'full';
  const rawLines = text.split(/\r?\n/);
  const lines = [];
  for (const ln of rawLines) {
    const stripped = ln.split('!')[0].trim(); // comment kaldır
    if (stripped) lines.push(stripped);
  }
  if (lines.length === 0) return null;

  // v2 direktiflerini ara
  const versionLine = lines.find(l => /^\[Version\]/i.test(l));
  if (versionLine) {
    const m = /\[Version\]\s+(\S+)/i.exec(versionLine);
    if (m) version = m[1];
  }
  const npLine = lines.find(l => /^\[Number of Ports\]/i.test(l));
  if (npLine) {
    const m = /\[Number of Ports\]\s+(\d+)/i.exec(npLine);
    if (m) numPorts = Number(m[1]);
  }
  const nfLine = lines.find(l => /^\[Number of Frequencies\]/i.test(l));
  if (nfLine) {
    const m = /\[Number of Frequencies\]\s+(\d+)/i.exec(nfLine);
    if (m) numFreqs = Number(m[1]);
  }
  const tpdoLine = lines.find(l => /^\[Two-Port Data Order\]/i.test(l));
  if (tpdoLine) {
    if (/21_12/i.test(tpdoLine)) twoPortDataOrder = '21_12';
  }
  const mfLine = lines.find(l => /^\[Matrix Format\]/i.test(l));
  if (mfLine) {
    if (/Lower/i.test(mfLine)) matrixFormat = 'lower';else if (/Upper/i.test(mfLine)) matrixFormat = 'upper';
  }

  // Option line: # <freq> <type> <format> R <z0>
  const optLine = lines.find(l => l.startsWith('#'));
  if (optLine) {
    const tokens = optLine.slice(1).trim().split(/\s+/);
    let i = 0;
    while (i < tokens.length) {
      const tk = tokens[i].toLowerCase();
      if (FREQ_MULT[tk] != null) {
        freqUnit = tk;
        i++;
      } else if (tk === 's' || tk === 'y' || tk === 'z' || tk === 'h' || tk === 'g') {
        paramType = tk;
        i++;
      } else if (tk === 'ma' || tk === 'db' || tk === 'ri') {
        dataFormat = tk;
        i++;
      } else if (tk === 'r') {
        // R kullan sonraki sayıları topla (per-port veya tek değer)
        z0List = [];
        i++;
        while (i < tokens.length && /^-?\d/.test(tokens[i])) {
          z0List.push(Number(tokens[i]));
          i++;
        }
        if (z0List.length === 0) z0List = [50];
      } else {
        i++;
      }
    }
  }

  // [Reference] satırı varsa override
  const refLine = lines.find(l => /^\[Reference\]/i.test(l));
  if (refLine) {
    const after = refLine.replace(/^\[Reference\]/i, '').trim();
    const refToks = after.split(/\s+/).map(Number).filter(n => !isNaN(n));
    if (refToks.length > 0) z0List = refToks;
  }

  // Veri satırlarını çıkar (! ile başlayan ve [bracket] direktifleri ve # option çıkar)
  const dataLines = lines.filter(l => !l.startsWith('#') && !l.startsWith('[') && !/^\[/i.test(l));
  // Tüm sayısal token'ları tek diziye topla
  const tokens = [];
  for (const ln of dataLines) {
    for (const t of ln.split(/[\s,]+/)) {
      if (t === '') continue;
      const n = Number(t);
      if (!isNaN(n)) tokens.push(n);
    }
  }
  if (tokens.length < 3) return null;
  if (numPorts === 0) {
    // Belirsizse: token sayısından tahmin (her freq için 1 + 2·n² value)
    // 9 token'lı satır .s2p tipik. tahmin gerek yok normalde — uzantıdan geliyor
    numPorts = 1;
  }
  const valuesPerFreq = 1 + 2 * numPorts * numPorts;
  const freqs = [];
  const sMatrix = {}; // sMatrix['S11'] = [{re,im}, ...]
  for (let p1 = 1; p1 <= numPorts; p1++) {
    for (let p2 = 1; p2 <= numPorts; p2++) {
      sMatrix[`S${p1}${p2}`] = [];
    }
  }

  // Noise parametreleri data'dan ayır: noise satırları freq + 4 değer (5 token).
  // v1'de noise data S-data'dan sonra başlar; frekans yeniden artmaya başlar
  // ve noise için sadece 5 token/freq vardır. Basit yaklaşım: full S-data
  // toplandıktan sonra geri kalanı noise kabul et.
  const sTokenCount = (() => {
    // Beklenen S-data uzunluğu = N · valuesPerFreq (N = freq sayısı)
    // numFreqs varsa kullan; yoksa "freq monoton artıyor" sınırına kadar al
    if (numFreqs != null) return numFreqs * valuesPerFreq;
    let lastFreq = -Infinity;
    let i = 0;
    while (i + valuesPerFreq <= tokens.length) {
      const f = tokens[i];
      if (f < lastFreq) break;
      lastFreq = f;
      i += valuesPerFreq;
    }
    return i;
  })();
  const sTokens = tokens.slice(0, sTokenCount);
  const noiseTokens = tokens.slice(sTokenCount);

  // S-parametreleri parse et
  // Format dönüşümü: MA/DB/RI → {re, im}
  const toComplex = (a, b) => {
    if (dataFormat === 'ri') return {
      re: a,
      im: b
    };
    if (dataFormat === 'ma') {
      const rad = b * Math.PI / 180;
      return {
        re: a * Math.cos(rad),
        im: a * Math.sin(rad)
      };
    }
    if (dataFormat === 'db') {
      const mag = Math.pow(10, a / 20);
      const rad = b * Math.PI / 180;
      return {
        re: mag * Math.cos(rad),
        im: mag * Math.sin(rad)
      };
    }
    return {
      re: a,
      im: b
    };
  };
  for (let i = 0; i + valuesPerFreq <= sTokens.length; i += valuesPerFreq) {
    const f = sTokens[i] * FREQ_MULT[freqUnit];
    freqs.push(f);
    let idx = i + 1;
    if (numPorts === 2 && twoPortDataOrder === '12_21') {
      // .s2p özel sıra (Touchstone v1 default): S11, S21, S12, S22
      sMatrix['S11'].push(toComplex(sTokens[idx], sTokens[idx + 1]));
      idx += 2;
      sMatrix['S21'].push(toComplex(sTokens[idx], sTokens[idx + 1]));
      idx += 2;
      sMatrix['S12'].push(toComplex(sTokens[idx], sTokens[idx + 1]));
      idx += 2;
      sMatrix['S22'].push(toComplex(sTokens[idx], sTokens[idx + 1]));
      idx += 2;
    } else {
      // Genel: satır-bazlı, S11, S12, ..., S1N, S21, S22, ..., SNN
      for (let p1 = 1; p1 <= numPorts; p1++) {
        for (let p2 = 1; p2 <= numPorts; p2++) {
          sMatrix[`S${p1}${p2}`].push(toComplex(sTokens[idx], sTokens[idx + 1]));
          idx += 2;
        }
      }
    }
  }

  // Noise parametreleri (varsa) — v1 yapısı: freq, NFmin(dB), |Γopt|, ∠Γopt(°), Rn/Z0
  let noise = null;
  if (noiseTokens.length >= 5) {
    noise = {
      frequencies: [],
      NFmin_dB: [],
      GammaOpt: [],
      Rn_norm: []
    };
    for (let i = 0; i + 5 <= noiseTokens.length; i += 5) {
      noise.frequencies.push(noiseTokens[i] * FREQ_MULT[freqUnit]);
      noise.NFmin_dB.push(noiseTokens[i + 1]);
      const mag = noiseTokens[i + 2],
        ang = noiseTokens[i + 3] * Math.PI / 180;
      noise.GammaOpt.push({
        re: mag * Math.cos(ang),
        im: mag * Math.sin(ang)
      });
      noise.Rn_norm.push(noiseTokens[i + 4]);
    }
  }

  // z0List per-port'a genişlet
  if (z0List.length === 1) z0List = Array(numPorts).fill(z0List[0]);
  return {
    type: 'touchstone',
    name: filename,
    version,
    numPorts,
    paramType,
    dataFormat,
    freqUnit,
    z0: z0List,
    frequencies: freqs,
    data: sMatrix,
    noise
  };
}

// ─── FFT ve sinyal yardımcıları (IQ ve Waveform için) ─────────
// Iteratif Cooley-Tukey radix-2 FFT. x: complex array [{re, im}, ...].
// Veri uzunluğu 2'nin kuvveti değilse 0 ile doldurulur.
function fft(xIn) {
  let N = xIn.length;
  let N2 = 1;
  while (N2 < N) N2 <<= 1;
  const out = new Array(N2);
  for (let i = 0; i < N; i++) out[i] = {
    re: xIn[i].re,
    im: xIn[i].im
  };
  for (let i = N; i < N2; i++) out[i] = {
    re: 0,
    im: 0
  };
  N = N2;
  // Bit reversal
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    while (j >= bit) {
      j -= bit;
      bit >>= 1;
    }
    j += bit;
    if (i < j) {
      const t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
  }
  // Butterfly
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1;
    const ang = -2 * Math.PI / len;
    const wReal = Math.cos(ang),
      wImag = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let curR = 1,
        curI = 0;
      for (let k = 0; k < half; k++) {
        const a = out[i + k];
        const b = out[i + k + half];
        const tR = curR * b.re - curI * b.im;
        const tI = curR * b.im + curI * b.re;
        out[i + k + half] = {
          re: a.re - tR,
          im: a.im - tI
        };
        out[i + k] = {
          re: a.re + tR,
          im: a.im + tI
        };
        const newR = curR * wReal - curI * wImag;
        curI = curR * wImag + curI * wReal;
        curR = newR;
      }
    }
  }
  return out;
}
function applyWindow(realArr, type) {
  // Tek-taraflı (real) sinyale pencere uygula; complex array döner.
  const N = realArr.length;
  const out = new Array(N);
  for (let n = 0; n < N; n++) {
    let w = 1;
    if (type === 'hann') w = 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1 || 1)));else if (type === 'hamming') w = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1 || 1));else if (type === 'blackman') w = 0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1 || 1)) + 0.08 * Math.cos(4 * Math.PI * n / (N - 1 || 1));
    out[n] = {
      re: realArr[n] * w,
      im: 0
    };
  }
  return out;
}
function applyWindowComplex(iqArr, type) {
  // Complex IQ sinyaline pencere uygula. iqArr: [{i, q}, ...]
  const N = iqArr.length;
  const out = new Array(N);
  for (let n = 0; n < N; n++) {
    let w = 1;
    if (type === 'hann') w = 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1 || 1)));else if (type === 'hamming') w = 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1 || 1));else if (type === 'blackman') w = 0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1 || 1)) + 0.08 * Math.cos(4 * Math.PI * n / (N - 1 || 1));
    out[n] = {
      re: iqArr[n].i * w,
      im: iqArr[n].q * w
    };
  }
  return out;
}
// FFT shift (negative freqs sola)
function fftshift(arr) {
  const N = arr.length;
  const half = Math.floor(N / 2);
  return arr.slice(half).concat(arr.slice(0, half));
}

// ─── Binary IQ parser'ları ─────────────────────────────────────
// Spektrum analizör / SDR çıktısı binary IQ formatları:
//   .cfile / .fc32 / .raw32 : complex float32 little-endian (GNU Radio)
//   .iq / .sc16 / .raw16    : complex int16   little-endian (USRP, SDR# v1)
//   .cs8                    : complex int8    (HackRF, RTL-SDR)
//   .sigmf-data + meta JSON : SigMF v1.0.0 standardı
//
// Bu fonksiyonlar ArrayBuffer alır, {samples, sampleRate, centerFreq} döner.

function parseIQ_complexFloat32(buf, filename) {
  const view = new DataView(buf);
  const N = Math.floor(buf.byteLength / 8);
  if (N === 0) throw new Error('boş binary dosya');
  const samples = new Array(N);
  for (let i = 0; i < N; i++) {
    samples[i] = {
      i: view.getFloat32(i * 8, true),
      q: view.getFloat32(i * 8 + 4, true)
    };
  }
  return {
    type: 'iq',
    name: filename,
    samples,
    sampleRate: 1,
    centerFreq: 0
  };
}
function parseIQ_complexInt16(buf, filename, scale = 32767) {
  const view = new DataView(buf);
  const N = Math.floor(buf.byteLength / 4);
  if (N === 0) throw new Error('boş binary dosya');
  const samples = new Array(N);
  for (let i = 0; i < N; i++) {
    samples[i] = {
      i: view.getInt16(i * 4, true) / scale,
      q: view.getInt16(i * 4 + 2, true) / scale
    };
  }
  return {
    type: 'iq',
    name: filename,
    samples,
    sampleRate: 1,
    centerFreq: 0
  };
}
function parseIQ_complexInt8(buf, filename) {
  const view = new DataView(buf);
  const N = Math.floor(buf.byteLength / 2);
  if (N === 0) throw new Error('boş binary dosya');
  const samples = new Array(N);
  for (let i = 0; i < N; i++) {
    samples[i] = {
      i: view.getInt8(i * 2) / 127,
      q: view.getInt8(i * 2 + 1) / 127
    };
  }
  return {
    type: 'iq',
    name: filename,
    samples,
    sampleRate: 1,
    centerFreq: 0
  };
}
// SigMF parse: meta (.sigmf-meta JSON) + data (.sigmf-data binary) eşleştirilir.
// Kullanıcı çiftini yükledikten sonra meta'daki datatype'a göre data parse edilir.
function parseSigMFMeta(text, filename) {
  try {
    const meta = JSON.parse(text);
    return {
      type: 'sigmf-meta',
      name: filename,
      meta
    };
  } catch (e) {
    throw new Error('SigMF meta JSON parse hatası: ' + e.message);
  }
}
function parseSigMFData(buf, meta, filename) {
  const g = meta.global || {};
  const dt = (g['core:datatype'] || 'cf32_le').toLowerCase();
  const fs = g['core:sample_rate'] || 1;
  const captures = meta.captures || [{}];
  const fc = captures[0]['core:frequency'] || 0;
  let result;
  if (dt === 'cf32_le' || dt === 'cf32') result = parseIQ_complexFloat32(buf, filename);else if (dt === 'ci16_le' || dt === 'ci16') result = parseIQ_complexInt16(buf, filename);else if (dt === 'ci8') result = parseIQ_complexInt8(buf, filename);else throw new Error('desteklenmeyen SigMF datatype: ' + dt);
  return {
    ...result,
    sampleRate: fs,
    centerFreq: fc
  };
}

// ─── WAV parser ────────────────────────────────────────────────
// RIFF/WAVE format: 16-bit PCM, 8-bit unsigned PCM, 24-bit PCM, 32-bit float.
// Mono → tek kanal, stereo → 2 kanal.
function parseWAV(buf, filename) {
  const view = new DataView(buf);
  // RIFF header
  if (buf.byteLength < 44) throw new Error('WAV dosyası çok küçük');
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff !== 'RIFF') throw new Error('WAV header bulunamadı (RIFF beklenir, ' + riff + ' geldi)');
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  if (wave !== 'WAVE') throw new Error('WAVE kimliği bulunamadı');
  // fmt chunk taraması
  let pos = 12;
  let fmt = null;
  let dataOffset = -1,
    dataSize = 0;
  while (pos + 8 <= buf.byteLength) {
    const id = String.fromCharCode(view.getUint8(pos), view.getUint8(pos + 1), view.getUint8(pos + 2), view.getUint8(pos + 3));
    const sz = view.getUint32(pos + 4, true);
    if (id === 'fmt ') {
      fmt = {
        format: view.getUint16(pos + 8, true),
        // 1 = PCM, 3 = IEEE float
        channels: view.getUint16(pos + 10, true),
        sampleRate: view.getUint32(pos + 12, true),
        byteRate: view.getUint32(pos + 16, true),
        blockAlign: view.getUint16(pos + 20, true),
        bitsPerSample: view.getUint16(pos + 22, true)
      };
    } else if (id === 'data') {
      dataOffset = pos + 8;
      dataSize = sz;
      break;
    }
    pos += 8 + sz + sz % 2; // 2-byte hizalama
  }
  if (!fmt) throw new Error('WAV fmt chunk bulunamadı');
  if (dataOffset < 0) throw new Error('WAV data chunk bulunamadı');
  const {
    format,
    channels,
    sampleRate,
    bitsPerSample,
    blockAlign
  } = fmt;
  const numFrames = Math.floor(dataSize / blockAlign);
  const channelsData = Array.from({
    length: channels
  }, () => new Array(numFrames));
  const bytesPerSample = bitsPerSample / 8;
  for (let f = 0; f < numFrames; f++) {
    for (let c = 0; c < channels; c++) {
      const offset = dataOffset + f * blockAlign + c * bytesPerSample;
      let v;
      if (format === 1) {
        // PCM int
        if (bitsPerSample === 8) v = (view.getUint8(offset) - 128) / 128;else if (bitsPerSample === 16) v = view.getInt16(offset, true) / 32768;else if (bitsPerSample === 24) {
          const b0 = view.getUint8(offset),
            b1 = view.getUint8(offset + 1),
            b2 = view.getInt8(offset + 2);
          v = (b2 << 16 | b1 << 8 | b0) / 8388608;
        } else if (bitsPerSample === 32) v = view.getInt32(offset, true) / 2147483648;else throw new Error('PCM ' + bitsPerSample + ' bit desteklenmiyor');
      } else if (format === 3) {
        // IEEE float
        if (bitsPerSample === 32) v = view.getFloat32(offset, true);else if (bitsPerSample === 64) v = view.getFloat64(offset, true);else throw new Error('IEEE float ' + bitsPerSample + ' bit desteklenmiyor');
      } else if (format === 65534) {
        // WAVE_FORMAT_EXTENSIBLE — basit PCM gibi davran
        if (bitsPerSample === 16) v = view.getInt16(offset, true) / 32768;else if (bitsPerSample === 32) v = view.getInt32(offset, true) / 2147483648;else throw new Error('EXTENSIBLE ' + bitsPerSample + ' bit desteklenmiyor');
      } else {
        throw new Error('WAV format kodu desteklenmiyor: ' + format);
      }
      channelsData[c][f] = v;
    }
  }
  const chNames = channels === 1 ? ['mono'] : channels === 2 ? ['L', 'R'] : Array.from({
    length: channels
  }, (_, i) => 'CH' + (i + 1));
  return {
    type: 'waveform',
    name: filename,
    channels: channelsData.map((s, i) => ({
      name: chNames[i],
      samples: s
    })),
    sampleRate,
    timeAxisProvided: false
  };
}

// Binary IQ formatlarını dosya uzantısı + heuristic ile algıla.
function parseIQBinary(buf, filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (ext === 'cfile' || ext === 'fc32' || ext === 'raw32' || ext === 'c32') return parseIQ_complexFloat32(buf, filename);
  if (ext === 'iq' || ext === 'sc16' || ext === 'raw16' || ext === 'c16' || ext === 'ci16') return parseIQ_complexInt16(buf, filename);
  if (ext === 'sc8' || ext === 'cs8' || ext === 'c8' || ext === 'ci8') return parseIQ_complexInt8(buf, filename);
  if (ext === 'sigmf-data') return parseIQ_complexFloat32(buf, filename); // varsayılan cf32_le
  // Belirsiz: en yaygın olduğu için cf32 dene
  return parseIQ_complexFloat32(buf, filename);
}

// ─── Sinyal metadata çıkarıcı ──────────────────────────────────
// Yorum satırlarından (# veya % ile başlayan) "fs = 44100 Hz",
// "sample_rate: 1e6", "fc = 433 MHz" gibi metadata'yı yakalar.
// Birim normalize edilir (Hz, kHz, MHz, GHz, S/s, kS/s, MS/s, GS/s).
function extractSignalMetadata(text) {
  const headerLines = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const l = lines[i].trim();
    if (l.startsWith('#') || l.startsWith('%') || l.startsWith('!')) headerLines.push(l);else if (l === '') continue;else break; // ilk veri satırından sonra dur
  }
  const header = headerLines.join(' ');
  function toHz(value, unit) {
    const u = (unit || '').toLowerCase();
    if (u.startsWith('khz') || u.startsWith('ks/s') || u === 'k') return value * 1e3;
    if (u.startsWith('mhz') || u.startsWith('ms/s') || u === 'm') return value * 1e6;
    if (u.startsWith('ghz') || u.startsWith('gs/s') || u === 'g') return value * 1e9;
    return value; // Hz, S/s, samples/s, sps
  }
  // fs / sample_rate / sampleRate / sps
  const fsMatch = header.match(/(?:^|\s)(?:fs|sample[_\s]?rate|sps)\s*[=:]\s*([0-9]+(?:\.[0-9]+)?(?:e[+\-]?[0-9]+)?)\s*([kMG]?(?:Hz|S\/s|sps)?)/i);
  // fc / center / carrier frequency
  const fcMatch = header.match(/(?:^|\s)(?:fc|center[_\s]?freq|carrier)\s*[=:]\s*([0-9]+(?:\.[0-9]+)?(?:e[+\-]?[0-9]+)?)\s*([kMG]?Hz)?/i);
  return {
    sampleRate: fsMatch ? toHz(parseFloat(fsMatch[1]), fsMatch[2]) : null,
    centerFreq: fcMatch ? toHz(parseFloat(fcMatch[1]), fcMatch[2]) : null
  };
}
if (typeof window !== 'undefined') window.extractSignalMetadata = extractSignalMetadata;
function parseIQData(text, filename) {
  // Önce yorum satırlarından metadata çek (fs, fc) — generator'ların yazdığı
  // "# fs = 1.0 MS/s" veya "# fs = 500 kS/s" gibi notları otomatik oku.
  const meta = extractSignalMetadata(text);
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('%'));
  if (lines.length === 0) throw new Error('boş dosya');
  // Başlık satırını atla (sadece text varsa)
  let startLine = 0;
  const firstFields = lines[0].split(/[,\s;\t]+/).filter(Boolean);
  if (firstFields.every(f => isNaN(parseFloat(f)))) startLine = 1;
  // Format dedektörü
  const probe = lines[startLine].split(/[,\s;\t]+/).filter(Boolean);
  const samples = [];
  if (probe.length === 1 && /[+\-].*[jJiI]$/.test(probe[0])) {
    // Complex literal "a+bj"
    for (let li = startLine; li < lines.length; li++) {
      const s = lines[li].trim();
      const m = /^([+\-]?\d*\.?\d+(?:[eE][+\-]?\d+)?)\s*([+\-]\s*\d*\.?\d+(?:[eE][+\-]?\d+)?)\s*[jJiI]$/.exec(s);
      if (m) samples.push({
        i: parseFloat(m[1]),
        q: parseFloat(m[2].replace(/\s+/g, ''))
      });
    }
  } else if (probe.length === 2) {
    for (let li = startLine; li < lines.length; li++) {
      const fs = lines[li].split(/[,\s;\t]+/).filter(Boolean);
      if (fs.length >= 2) {
        const i = parseFloat(fs[0]);
        const q = parseFloat(fs[1]);
        if (!isNaN(i) && !isNaN(q)) samples.push({
          i,
          q
        });
      }
    }
  } else if (probe.length >= 3) {
    // t, I, Q
    for (let li = startLine; li < lines.length; li++) {
      const fs = lines[li].split(/[,\s;\t]+/).filter(Boolean);
      if (fs.length >= 3) {
        const i = parseFloat(fs[1]);
        const q = parseFloat(fs[2]);
        if (!isNaN(i) && !isNaN(q)) samples.push({
          i,
          q
        });
      }
    }
  } else {
    throw new Error('IQ formatı tanınmadı (2 kolon "I Q" veya 3 kolon "t I Q" bekleniyor)');
  }
  if (samples.length === 0) throw new Error('hiç IQ noktası bulunamadı');
  return {
    type: 'iq',
    name: filename,
    samples,
    sampleRate: meta.sampleRate || 1,
    centerFreq: meta.centerFreq || 0,
    detectedFromMeta: !!(meta.sampleRate || meta.centerFreq)
  };
}

// ─── Waveform veri çözümleyicisi ───────────────────────────────
// CSV/text → {channels: [{name, samples: number[]}], sampleRate}
// Desteklenen:
//   • Tek kolon: değer/satır
//   • Çok kolon CSV: her kolon ayrı kanal; başlık varsa kanal ismi olur
//   • İlk kolon zaman ise atlanır (kontrol: değerler monotonik artıyor)
function parseWaveformData(text, filename) {
  // Yorum satırlarından metadata (fs, fc) çek
  const meta = extractSignalMetadata(text);
  const allLines = text.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('%'));
  if (allLines.length === 0) throw new Error('boş dosya');
  // Başlık satırı?
  let startLine = 0;
  let headerCols = null;
  const firstFields = allLines[0].split(/[,\s;\t]+/).filter(Boolean);
  if (firstFields.every(f => isNaN(parseFloat(f)))) {
    headerCols = firstFields;
    startLine = 1;
  }
  const numCols = (allLines[startLine] || '').split(/[,\s;\t]+/).filter(Boolean).length;
  const rawCols = Array.from({
    length: numCols
  }, () => []);
  for (let li = startLine; li < allLines.length; li++) {
    const fs = allLines[li].split(/[,\s;\t]+/).filter(Boolean);
    for (let c = 0; c < numCols; c++) {
      const v = parseFloat(fs[c]);
      rawCols[c].push(isNaN(v) ? null : v);
    }
  }
  // İlk kolonu zaman olarak algıla: monotonik artan ise ve uniform Δt
  let firstIsTime = false;
  if (rawCols.length >= 2 && rawCols[0].length >= 3) {
    const c0 = rawCols[0];
    let mono = true;
    for (let i = 1; i < c0.length; i++) {
      if (c0[i] == null || c0[i - 1] == null || c0[i] <= c0[i - 1]) {
        mono = false;
        break;
      }
    }
    firstIsTime = mono;
  }
  let derivedSampleRate = 1;
  let dataCols = rawCols;
  let dataHeaders = headerCols ? headerCols.slice() : null;
  if (firstIsTime) {
    const c0 = rawCols[0];
    const dt = (c0[c0.length - 1] - c0[0]) / (c0.length - 1);
    if (dt > 0) derivedSampleRate = 1 / dt;
    dataCols = rawCols.slice(1);
    if (dataHeaders) dataHeaders = dataHeaders.slice(1);
  }
  if (dataCols.length === 0) throw new Error('veri kolonu bulunamadı');
  const channels = dataCols.map((col, idx) => ({
    name: dataHeaders && dataHeaders[idx] || `CH${idx + 1}`,
    samples: col.filter(v => v != null)
  }));
  return {
    type: 'waveform',
    name: filename,
    channels,
    // Öncelik: meta yorum (en güvenilir) > zaman ekseni türetilmiş > 1 (default)
    sampleRate: meta.sampleRate || (firstIsTime ? derivedSampleRate : 1),
    timeAxisProvided: firstIsTime,
    detectedFromMeta: !!meta.sampleRate
  };
}

// ─── Sample data: IQ & Waveform ────────────────────────────────
function makeSampleIQ() {
  // 16-QAM 1000 sample, modüle edilmiş, biraz noise.
  const N = 1024;
  const samples = [];
  const sps = 8; // sample per symbol
  for (let n = 0; n < N; n++) {
    const sym = Math.floor(n / sps);
    const I = [-3, -1, 1, 3][sym + 0 & 3];
    const Q = [-3, -1, 1, 3][sym >> 2 & 3];
    // Pulse shape (basit)
    const t = n % sps / sps;
    const pulse = 0.5 * (1 - Math.cos(2 * Math.PI * t));
    samples.push({
      i: I * pulse + (Math.random() - 0.5) * 0.3,
      q: Q * pulse + (Math.random() - 0.5) * 0.3
    });
  }
  return {
    type: 'iq',
    name: 'sample_16qam_8sps.txt',
    samples,
    sampleRate: 1e6,
    centerFreq: 0
  };
}
function makeSampleWaveform() {
  // 2 ton sinüs + AM modülasyon, fs=10 kHz, 2000 sample (0.2 s)
  const fs = 10000;
  const N = 2000;
  const ch1 = [];
  const ch2 = [];
  for (let n = 0; n < N; n++) {
    const t = n / fs;
    ch1.push(Math.sin(2 * Math.PI * 250 * t) + 0.3 * Math.sin(2 * Math.PI * 800 * t));
    ch2.push((1 + 0.5 * Math.sin(2 * Math.PI * 5 * t)) * Math.cos(2 * Math.PI * 1500 * t));
  }
  return {
    type: 'waveform',
    name: 'sample_2tone_AM_10kHz.txt',
    channels: [{
      name: 'Tone+Harmonic',
      samples: ch1
    }, {
      name: 'AM 1.5kHz',
      samples: ch2
    }],
    sampleRate: fs,
    timeAxisProvided: false
  };
}

// ─── IQ text/CSV serializer'lar — örnek dosya üreticileri ──────
// 16-QAM .csv (header + 2 column)
function makeIQ_csv_16qam() {
  const lines = ['# 16-QAM baseband, fs = 1.0 MS/s, fc = 0 Hz', 'I,Q'];
  const N = 1024,
    sps = 8;
  for (let n = 0; n < N; n++) {
    const sym = Math.floor(n / sps);
    const I = [-3, -1, 1, 3][sym + 0 & 3];
    const Q = [-3, -1, 1, 3][sym >> 2 & 3];
    const t = n % sps / sps;
    const pulse = 0.5 * (1 - Math.cos(2 * Math.PI * t));
    const i = (I * pulse + (Math.random() - 0.5) * 0.3).toFixed(5);
    const q = (Q * pulse + (Math.random() - 0.5) * 0.3).toFixed(5);
    lines.push(`${i},${q}`);
  }
  return lines.join('\n');
}

// BPSK in whitespace-delimited .txt format (no header)
function makeIQ_txt_bpsk() {
  const lines = ['# BPSK at 100 kBaud, fs = 800 kS/s (8 samples/symbol)', '# Two columns: I Q  (whitespace separated)'];
  const N = 2048,
    sps = 8;
  for (let n = 0; n < N; n++) {
    const sym = Math.floor(n / sps);
    const bit = sym * 2654435761 & 1; // pseudo-random bit
    const I_sym = bit ? 1 : -1;
    const Q_sym = 0;
    // Raised cosine pulse approximation
    const t = n % sps / sps;
    const pulse = 0.5 * (1 - Math.cos(2 * Math.PI * t));
    const noise_i = (Math.random() - 0.5) * 0.15;
    const noise_q = (Math.random() - 0.5) * 0.15;
    const i = (I_sym * pulse + noise_i).toFixed(5);
    const q = (Q_sym * pulse + noise_q).toFixed(5);
    lines.push(`${i} ${q}`);
  }
  return lines.join('\n');
}

// Complex literal notation: "a+bj" (NumPy savetxt format)
function makeIQ_txt_complex_literal() {
  const lines = ['# Chirp signal in complex literal notation (a+bj)', '# fs = 500 kS/s, sweep 10-100 kHz over 4 ms'];
  const N = 2000,
    fs = 500e3;
  const f0 = 10e3,
    f1 = 100e3;
  const T = N / fs;
  for (let n = 0; n < N; n++) {
    const t = n / fs;
    // Linear chirp phase: 2*pi*(f0*t + 0.5*(f1-f0)/T * t^2)
    const phase = 2 * Math.PI * (f0 * t + 0.5 * (f1 - f0) / T * t * t);
    const I = Math.cos(phase);
    const Q = Math.sin(phase);
    const sign = Q >= 0 ? '+' : '-';
    lines.push(`${I.toFixed(6)}${sign}${Math.abs(Q).toFixed(6)}j`);
  }
  return lines.join('\n');
}

// ─── Waveform serializer'lar — örnek dosya üreticileri ─────────
// Tek kanal, tek kolon, çıplak değerler (PCM-style)
function makeWF_txt_audio_mono() {
  const lines = ['# Mono audio sample (synthesized), fs = 44100 Hz', '# One value per line — amplitude in [-1, 1]'];
  const fs = 44100;
  const N = 4410; // 0.1 s
  for (let n = 0; n < N; n++) {
    const t = n / fs;
    // 440 Hz with vibrato + harmonic
    const vib = 1 + 0.005 * Math.sin(2 * Math.PI * 6 * t);
    const s = 0.6 * Math.sin(2 * Math.PI * 440 * vib * t) + 0.2 * Math.sin(2 * Math.PI * 880 * vib * t) + 0.05 * (Math.random() - 0.5); // noise
    lines.push(s.toFixed(5));
  }
  return lines.join('\n');
}

// Çok kolon CSV with explicit time axis (oscilloscope-style)
function makeWF_csv_scope() {
  const lines = ['# Oscilloscope capture: square wave with overshoot, plus reference sine', '# Columns: t(s), CH1(V), CH2(V)', 't,CH1,CH2'];
  const fs = 100e3;
  const N = 2000; // 20 ms
  const f_sq = 1e3;
  for (let n = 0; n < N; n++) {
    const t = n / fs;
    // Square wave with finite rise time + small overshoot
    const phase = t * f_sq % 1;
    const sq = phase < 0.5 ? 1 : -1;
    // Add ringing on edges
    const near_edge = Math.min(Math.abs(phase - 0.5), Math.abs(phase));
    const ringing = near_edge < 0.02 ? 0.25 * Math.exp(-near_edge * 200) * Math.sin(2 * Math.PI * 20e3 * t) : 0;
    const ch1 = sq + ringing + (Math.random() - 0.5) * 0.02;
    // Reference 500 Hz sine
    const ch2 = 0.8 * Math.sin(2 * Math.PI * 500 * t);
    lines.push(`${t.toExponential(4)},${ch1.toFixed(4)},${ch2.toFixed(4)}`);
  }
  return lines.join('\n');
}

// 2-tone + AM (mevcut makeSampleWaveform'un CSV serialization'ı)
function makeWF_csv_2tone() {
  const lines = ['# 2-tone + AM modulation (multi-channel)', '# fs = 10 kHz, no time column (sample/row)', 'Tone+Harmonic,AM_1500Hz'];
  const fs = 10000,
    N = 2000;
  for (let n = 0; n < N; n++) {
    const t = n / fs;
    const a = Math.sin(2 * Math.PI * 250 * t) + 0.3 * Math.sin(2 * Math.PI * 800 * t);
    const b = (1 + 0.5 * Math.sin(2 * Math.PI * 5 * t)) * Math.cos(2 * Math.PI * 1500 * t);
    lines.push(`${a.toFixed(5)},${b.toFixed(5)}`);
  }
  return lines.join('\n');
}

// ─── Ek CSV örnekleri (3. CSV: sensor logger) ──────────────────
function makeCSV_sensor_log() {
  const lines = ['# Multi-sensor log, 1 sample/s for 5 minutes', 't_s,temp_C,humidity_pct,pressure_hPa,light_lux'];
  const N = 300;
  for (let n = 0; n < N; n++) {
    const t = n;
    const temp = 22 + 1.5 * Math.sin(2 * Math.PI * n / 90) + (Math.random() - 0.5) * 0.2;
    const hum = 55 + 8 * Math.sin(2 * Math.PI * n / 120 + 1) + (Math.random() - 0.5) * 1;
    const pres = 1013 + 2 * Math.sin(2 * Math.PI * n / 200) + (Math.random() - 0.5) * 0.3;
    const lux = 400 + 350 * Math.sin(2 * Math.PI * n / 180) + (Math.random() - 0.5) * 15;
    lines.push(`${t},${temp.toFixed(2)},${hum.toFixed(2)},${pres.toFixed(2)},${Math.max(0, lux).toFixed(1)}`);
  }
  return lines.join('\n');
}

// ─── Binary format generator'ları ──────────────────────────────
// Bu fonksiyonlar Uint8Array (raw bytes) döndürür; SampleGallery bunu
// Blob olarak indirir. Kullanıcı bilgisayarında format inceleyebilir.

// WAV PCM16 mono — RIFF/WAVE format, 44 byte header + sample data
// Referans: http://soundfile.sapp.org/doc/WaveFormat/
function makeWAV_mono_440Hz() {
  const fs = 22050; // örnekleme hızı
  const N = fs; // 1 saniye
  const samples = new Int16Array(N);
  for (let n = 0; n < N; n++) {
    const t = n / fs;
    // 440 Hz fundamental + 880 Hz harmonic (decay)
    const env = Math.exp(-t * 0.5);
    const s = env * (0.6 * Math.sin(2 * Math.PI * 440 * t) + 0.2 * Math.sin(2 * Math.PI * 880 * t));
    samples[n] = Math.round(s * 30000); // int16 range
  }
  return wavEncode(samples, fs, 1);
}
function makeWAV_stereo_chirp() {
  const fs = 44100;
  const N = 2 * fs; // 2 saniye
  // Stereo: L = chirp, R = ton
  const interleaved = new Int16Array(N * 2);
  for (let n = 0; n < N; n++) {
    const t = n / fs;
    // Linear chirp 200 Hz → 3000 Hz
    const f0 = 200,
      f1 = 3000,
      T = N / fs;
    const phase = 2 * Math.PI * (f0 * t + 0.5 * (f1 - f0) / T * t * t);
    const L = 0.7 * Math.sin(phase);
    const R = 0.5 * Math.sin(2 * Math.PI * 1000 * t); // 1 kHz referans
    interleaved[n * 2 + 0] = Math.round(L * 28000);
    interleaved[n * 2 + 1] = Math.round(R * 28000);
  }
  return wavEncode(interleaved, fs, 2);
}
function wavEncode(samples, sampleRate, numChannels) {
  const numSamples = numChannels === 1 ? samples.length : samples.length / numChannels;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buf = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(buf);
  let p = 0;
  function w8(s) {
    for (let i = 0; i < s.length; i++) dv.setUint8(p++, s.charCodeAt(i));
  }
  function w32(n) {
    dv.setUint32(p, n, true);
    p += 4;
  }
  function w16(n) {
    dv.setUint16(p, n, true);
    p += 2;
  }
  // RIFF chunk
  w8('RIFF');
  w32(36 + dataSize);
  w8('WAVE');
  // fmt chunk
  w8('fmt ');
  w32(16); // chunk size
  w16(1); // PCM = 1
  w16(numChannels);
  w32(sampleRate);
  w32(byteRate);
  w16(blockAlign);
  w16(bytesPerSample * 8); // bits per sample
  // data chunk
  w8('data');
  w32(dataSize);
  // Sample data
  for (let i = 0; i < samples.length; i++) {
    dv.setInt16(p, samples[i], true);
    p += 2;
  }
  return new Uint8Array(buf);
}

// GNU Radio .cfile — interleaved float32 little-endian (cf32)
// Referans: https://wiki.gnuradio.org/index.php/File_Source
function makeCfile_QPSK() {
  const N = 2048;
  const sps = 8;
  const buf = new ArrayBuffer(N * 8); // float32 I + float32 Q
  const dv = new DataView(buf);
  let p = 0;
  for (let n = 0; n < N; n++) {
    const sym = Math.floor(n / sps);
    // QPSK constellation: ±1 in I, ±1 in Q
    const I_sym = sym * 2654435761 & 1 ? 1 : -1;
    const Q_sym = sym * 2246822519 & 1 ? 1 : -1;
    const t = n % sps / sps;
    const pulse = 0.5 * (1 - Math.cos(2 * Math.PI * t));
    const I = I_sym * pulse + (Math.random() - 0.5) * 0.1;
    const Q = Q_sym * pulse + (Math.random() - 0.5) * 0.1;
    dv.setFloat32(p, I, true);
    p += 4;
    dv.setFloat32(p, Q, true);
    p += 4;
  }
  return new Uint8Array(buf);
}

// USRP .sc16 — interleaved int16 little-endian (ci16)
// Referans: https://files.ettus.com/manual/page_configuration.html#config_stream_args_otw_format
function makeSC16_FM_tone() {
  const N = 4096;
  const fs = 2e6; // 2 MS/s
  const f_dev = 50e3; // ±50 kHz deviation
  const f_mod = 5e3; // 5 kHz modulating tone
  const buf = new ArrayBuffer(N * 4); // int16 I + int16 Q
  const dv = new DataView(buf);
  let p = 0;
  let phase = 0;
  for (let n = 0; n < N; n++) {
    const t = n / fs;
    // FM: instantaneous freq = f_dev * cos(2*pi*f_mod*t), phase = integral
    phase += 2 * Math.PI * f_dev * Math.cos(2 * Math.PI * f_mod * t) / fs;
    const I = Math.round(Math.cos(phase) * 30000);
    const Q = Math.round(Math.sin(phase) * 30000);
    dv.setInt16(p, I, true);
    p += 2;
    dv.setInt16(p, Q, true);
    p += 2;
  }
  return new Uint8Array(buf);
}

// SigMF v1.0.0 — kompleks IQ verisi + JSON metadata
// Referans: https://github.com/sigmf/SigMF/blob/main/sigmf-spec.md
function makeSigMF_data_QPSK() {
  // 4096 samples, cf32 little-endian (en yaygın SigMF tipi)
  const N = 4096;
  const sps = 16;
  const buf = new ArrayBuffer(N * 8);
  const dv = new DataView(buf);
  let p = 0;
  for (let n = 0; n < N; n++) {
    const sym = Math.floor(n / sps);
    const I_sym = sym * 2654435761 & 1 ? 1 : -1;
    const Q_sym = sym * 2246822519 & 1 ? 1 : -1;
    const t = n % sps / sps;
    const pulse = 0.5 * (1 - Math.cos(2 * Math.PI * t));
    const I = I_sym * pulse + (Math.random() - 0.5) * 0.08;
    const Q = Q_sym * pulse + (Math.random() - 0.5) * 0.08;
    dv.setFloat32(p, I, true);
    p += 4;
    dv.setFloat32(p, Q, true);
    p += 4;
  }
  return new Uint8Array(buf);
}
function makeSigMF_meta_QPSK() {
  // SigMF v1.0.0 metadata JSON
  const obj = {
    "global": {
      "core:datatype": "cf32_le",
      "core:sample_rate": 2000000,
      "core:hw": "Synthetic generator (Veri Atlası)",
      "core:author": "Veri Atlası örnek dosya",
      "core:version": "1.0.0",
      "core:description": "Synthetic QPSK signal, 8 samples/symbol, raised-cosine-ish pulse shape, 4096 samples total."
    },
    "captures": [{
      "core:sample_start": 0,
      "core:frequency": 433920000,
      "core:datetime": "2025-01-15T12:00:00Z"
    }],
    "annotations": [{
      "core:sample_start": 0,
      "core:sample_count": 4096,
      "core:label": "QPSK transmission"
    }]
  };
  return JSON.stringify(obj, null, 2);
}
function detectNumericColumns(rows) {
  if (!rows.length) return [];
  const cols = Object.keys(rows[0]);
  return cols.filter(col => {
    const numericCount = rows.reduce((acc, row) => {
      const v = row[col];
      return acc + (typeof v === 'number' && !isNaN(v) ? 1 : 0);
    }, 0);
    return numericCount >= Math.max(2, Math.floor(rows.length * 0.5));
  });
}
function parseCSV(text, name) {
  return new Promise(resolve => {
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: results => {
        resolve({
          name,
          data: results.data,
          columns: results.meta.fields || [],
          numericColumns: detectNumericColumns(results.data),
          columnLabels: {}
        });
      }
    });
  });
}
const getFileLabel = (file, index) => file.label || `D${index + 1}`;
const getColLabel = (file, col) => file.columnLabels && file.columnLabels[col] || col;

// Top-level helpers — explicit `function` declarations + window bindings.
// Some hosts (Cloudflare auto-minify, Astro pipeline) can mangle top-level
// `const` arrow functions or wrap modules in a way that hides them from
// other parts of the bundle. Function declarations + window.X is bulletproof.
function safeFilename(s) {
  return String(s || 'chart').replace(/[^\w\-.]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'chart';
}

// Blob'u (text veya binary) tarayıcıdan indirme. Top-level — SampleGallery,
// ChartCard ve diğer komponentlerin hepsi kullanır.
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Explicit window bindings — module-mode / minifier ne yaparsa yapsın erişilir.
if (typeof window !== 'undefined') {
  window.safeFilename = safeFilename;
  window.downloadBlob = downloadBlob;
}

// ─── Themed background plugin ──────────────────────────────────
function makeBgPlugin(color) {
  return {
    id: 'themedBg',
    beforeDraw: chart => {
      const {
        ctx,
        width,
        height
      } = chart;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  };
}

// ─── Editable label ────────────────────────────────────────────
function EditableLabel({
  value,
  onChange,
  className,
  style,
  placeholder,
  title
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || '');
  useEffect(() => {
    setTemp(value || '');
  }, [value]);
  const save = () => {
    onChange(temp.trim());
    setEditing(false);
  };
  const cancel = () => {
    setTemp(value || '');
    setEditing(false);
  };
  if (editing) {
    return /*#__PURE__*/React.createElement("input", {
      value: temp,
      onChange: e => setTemp(e.target.value),
      onBlur: save,
      onKeyDown: e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          save();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        }
      },
      onClick: e => e.stopPropagation(),
      autoFocus: true,
      placeholder: placeholder,
      className: `${className || ''} bg-[var(--bg-input)] border-b border-[var(--accent)] focus:outline-none w-20`,
      style: style
    });
  }
  return /*#__PURE__*/React.createElement("span", {
    onClick: e => {
      e.stopPropagation();
      setEditing(true);
    },
    className: `${className || ''} cursor-text hover:opacity-70 transition-opacity`,
    style: style,
    title: title
  }, value || placeholder || '');
}

// ─── Chart card ────────────────────────────────────────────────
function ChartCard({
  chart,
  files,
  fileIndexById,
  seriesColorMap,
  theme,
  t,
  onUpdate,
  onDelete,
  onUpdateFile,
  canDelete
}) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(chart.title);
  const [editingCol, setEditingCol] = useState(null);
  const [tempColName, setTempColName] = useState('');
  const buildConfig = useCallback((opts = {}) => {
    const {
      forExport = false
    } = opts;
    const datasets = [];
    let globalMaxAbs = 0;
    if (chart.normalize) {
      Array.from(chart.selectedSeries).forEach(key => {
        const [fileIdStr, col] = key.split('::');
        const fileId = Number(fileIdStr);
        const file = files.find(f => f.id === fileId);
        if (!file) return;
        for (const row of file.data) {
          const v = row[col];
          if (typeof v === 'number' && !isNaN(v)) {
            const a = Math.abs(v);
            if (a > globalMaxAbs) globalMaxAbs = a;
          }
        }
      });
    }
    Array.from(chart.selectedSeries).forEach(key => {
      const [fileIdStr, col] = key.split('::');
      const fileId = Number(fileIdStr);
      const file = files.find(f => f.id === fileId);
      if (!file) return;
      let values = file.data.map((row, i) => ({
        x: i + 1,
        y: row[col]
      })).filter(p => typeof p.y === 'number' && !isNaN(p.y));
      if (chart.normalize && globalMaxAbs > 0) {
        values = values.map(v => ({
          x: v.x,
          y: v.y / globalMaxAbs
        }));
      }
      // X⇄Y swap: değerleri takasla. Kullanım amacı: cihaz x ve y'yi yanlış sırayla
      // kaydettiyse arayüzden tek tıkla düzeltme.
      if (chart.swapXY) {
        values = values.map(p => ({
          x: p.y,
          y: p.x
        }));
      }
      const color = seriesColorMap[key];
      const fileIdx = fileIndexById.get(file.id);
      const fileLabel = getFileLabel(file, fileIdx);
      const colLabel = getColLabel(file, col);
      const showPoints = values.length <= 200;
      datasets.push({
        label: `${fileLabel} · ${colLabel}`,
        data: values,
        borderColor: color,
        backgroundColor: color + '22',
        tension: 0.28,
        borderWidth: 2.2,
        pointRadius: showPoints ? 2.5 : 0,
        pointHoverRadius: showPoints ? 6 : 4,
        pointBackgroundColor: color,
        pointBorderColor: theme.bgChart,
        pointBorderWidth: 1.5
      });
    });

    // Swap'ta axis title'ları da takasla — x ekseninde y label, y ekseninde x label
    const xTextRaw = chart.xLabel || t('default_x');
    const yTextRaw = chart.yLabel || (chart.normalize ? t('default_y_norm') : t('default_y'));
    const xText = chart.swapXY ? yTextRaw : xTextRaw;
    const yText = chart.swapXY ? xTextRaw : yTextRaw;
    return {
      type: 'line',
      data: {
        datasets
      },
      plugins: [makeBgPlugin(theme.bgChart)],
      options: {
        responsive: !forExport,
        maintainAspectRatio: false,
        animation: forExport ? false : {
          duration: 500,
          easing: 'easeOutQuart'
        },
        interaction: {
          mode: 'index',
          intersect: false,
          axis: 'x'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: FONT_MONO,
                size: 11
              },
              color: theme.legendText,
              boxWidth: 14,
              boxHeight: 14,
              padding: 14,
              usePointStyle: true,
              pointStyle: 'rectRounded'
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleFont: {
              family: FONT_SERIF,
              size: 13,
              weight: '600'
            },
            bodyFont: {
              family: FONT_MONO,
              size: 11
            },
            padding: 12,
            cornerRadius: 4,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.accent,
            borderWidth: 1,
            displayColors: true,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: {
              title: items => `${xText} = ${items[0].parsed.x}`,
              label: ctx => `  ${ctx.dataset.label}  =  ${Number(ctx.parsed.y).toFixed(3)}`
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            ticks: {
              font: {
                family: FONT_MONO,
                size: 10
              },
              color: theme.inkSoft,
              precision: 0,
              stepSize: 1
            },
            grid: {
              color: theme.grid,
              drawBorder: false
            },
            title: {
              display: true,
              text: xText,
              font: {
                family: FONT_SERIF,
                size: 12,
                style: 'italic'
              },
              color: theme.inkSoft,
              padding: 8
            }
          },
          y: {
            ticks: {
              font: {
                family: FONT_MONO,
                size: 10
              },
              color: theme.inkSoft
            },
            grid: {
              color: theme.grid,
              drawBorder: false
            },
            title: {
              display: true,
              text: yText,
              font: {
                family: FONT_SERIF,
                size: 12,
                style: 'italic'
              },
              color: theme.inkSoft,
              padding: 8
            }
          }
        }
      }
    };
  }, [chart.selectedSeries, chart.normalize, chart.xLabel, chart.yLabel, chart.swapXY, files, seriesColorMap, fileIndexById, theme, t]);
  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
    const cfg = buildConfig();
    if (cfg.data.datasets.length === 0) return;
    chartInstanceRef.current = new Chart(canvasRef.current, cfg);
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [buildConfig]);
  const exportRaster = format => {
    if (!chartInstanceRef.current) return;
    const c = chartInstanceRef.current;
    const origDpr = c.options.devicePixelRatio;
    const origAnimation = c.options.animation;
    try {
      c.options.devicePixelRatio = HIRES_SCALE;
      c.options.animation = false;
      c.resize();
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = c.toBase64Image(mime, 0.98);
      const a = document.createElement('a');
      a.download = `${safeFilename(chart.title)}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      c.options.devicePixelRatio = origDpr;
      c.options.animation = origAnimation;
      c.resize();
    }
  };
  const escapeXml = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const exportSVG = () => {
    if (!chartInstanceRef.current) return;
    try {
      const svgString = buildChartSVG(chartInstanceRef.current, theme);
      const blob = new Blob([svgString], {
        type: 'image/svg+xml;charset=utf-8'
      });
      downloadBlob(blob, `${safeFilename(chart.title)}.svg`);
    } catch (e) {
      console.error('SVG export error:', e);
      alert(t('svg_fail') + e.message);
    }
  };
  const toggleSeries = key => {
    const next = new Set(chart.selectedSeries);
    if (next.has(key)) next.delete(key);else next.add(key);
    onUpdate({
      ...chart,
      selectedSeries: next
    });
  };
  const selectAll = () => {
    const all = new Set();
    files.forEach(f => f.numericColumns.forEach(c => all.add(`${f.id}::${c}`)));
    onUpdate({
      ...chart,
      selectedSeries: all
    });
  };
  const clearAll = () => onUpdate({
    ...chart,
    selectedSeries: new Set()
  });
  const saveTitle = () => {
    onUpdate({
      ...chart,
      title: tempTitle.trim() || t('default_chart_title')
    });
    setEditingTitle(false);
  };
  const startEditCol = (fileId, col, current) => {
    setEditingCol({
      fileId,
      col
    });
    setTempColName(current);
  };
  const saveColEdit = () => {
    if (!editingCol) return;
    const {
      fileId,
      col
    } = editingCol;
    const file = files.find(f => f.id === fileId);
    if (!file) {
      setEditingCol(null);
      return;
    }
    const trimmed = tempColName.trim();
    const newLabels = {
      ...(file.columnLabels || {})
    };
    if (trimmed && trimmed !== col) newLabels[col] = trimmed;else delete newLabels[col];
    onUpdateFile(fileId, {
      columnLabels: newLabels
    });
    setEditingCol(null);
  };
  const cancelColEdit = () => setEditingCol(null);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-[var(--bg-panel)] border border-[var(--border)] rounded-sm overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-6 py-4 border-b border-[var(--border-soft)] bg-[var(--bg-panel)]"
  }, editingTitle ? /*#__PURE__*/React.createElement("input", {
    value: tempTitle,
    onChange: e => setTempTitle(e.target.value),
    onBlur: saveTitle,
    onKeyDown: e => {
      if (e.key === 'Enter') saveTitle();
      if (e.key === 'Escape') {
        setTempTitle(chart.title);
        setEditingTitle(false);
      }
    },
    autoFocus: true,
    className: "text-xl bg-transparent border-b border-[var(--accent)] focus:outline-none flex-1 mr-3 italic text-[var(--ink)]",
    style: {
      fontFamily: FONT_SERIF
    }
  }) : /*#__PURE__*/React.createElement("h3", {
    onClick: () => {
      setTempTitle(chart.title);
      setEditingTitle(true);
    },
    className: "text-xl italic cursor-text hover:text-[var(--accent)] transition-colors flex items-center gap-3 text-[var(--ink)]",
    style: {
      fontFamily: FONT_SERIF
    }
  }, chart.title, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] not-italic",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('edit_title_hint'))), canDelete && /*#__PURE__*/React.createElement("button", {
    onClick: onDelete,
    className: "text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] hover:text-[var(--danger)] transition-colors",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('delete'))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-[1fr_320px] bg-[var(--bg)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6 lg:p-8",
    style: {
      minHeight: 440,
      position: 'relative'
    }
  }, chart.selectedSeries.size === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center h-full text-center",
    style: {
      minHeight: 380
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-2xl italic text-[var(--placeholder)] mb-2",
    style: {
      fontFamily: FONT_SERIF
    }
  }, t('no_series')), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('pick_variable')))) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 400
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef
  }))), /*#__PURE__*/React.createElement("div", {
    className: "border-t lg:border-t-0 lg:border-l border-[var(--border-soft)] bg-[var(--bg-panel)] p-5 flex flex-col gap-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('variables')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: selectAll,
    className: "text-[10px] uppercase tracking-wider text-[var(--accent)] hover:underline",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('select_all')), /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--border-hard)]"
  }, "\xB7"), /*#__PURE__*/React.createElement("button", {
    onClick: clearAll,
    className: "text-[10px] uppercase tracking-wider text-[var(--ink-muted)] hover:underline",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('clear_all')))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 max-h-[300px] overflow-y-auto pr-1 scroll-soft"
  }, files.map(file => {
    const idx = fileIndexById.get(file.id);
    const lbl = getFileLabel(file, idx);
    return /*#__PURE__*/React.createElement("div", {
      key: file.id
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] uppercase tracking-[0.15em] mb-1.5 flex items-baseline gap-2",
      style: {
        fontFamily: FONT_MONO,
        color: theme.inkSubtle
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[var(--accent)] font-bold"
    }, lbl), /*#__PURE__*/React.createElement("span", {
      className: "truncate text-[var(--ink-subtle)]",
      title: file.name
    }, file.name)), /*#__PURE__*/React.createElement("div", {
      className: "space-y-1 pl-1"
    }, file.numericColumns.length === 0 ? /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] italic text-[var(--ink-muted)]",
      style: {
        fontFamily: FONT_SERIF
      }
    }, t('no_numeric')) : file.numericColumns.map(col => {
      const key = `${file.id}::${col}`;
      const active = chart.selectedSeries.has(key);
      const color = seriesColorMap[key];
      const displayName = getColLabel(file, col);
      const isEditingThis = editingCol && editingCol.fileId === file.id && editingCol.col === col;
      if (isEditingThis) {
        return /*#__PURE__*/React.createElement("div", {
          key: key,
          className: "flex items-center gap-2 py-0.5"
        }, /*#__PURE__*/React.createElement("span", {
          className: "w-4 h-4 rounded-sm border-2 flex-shrink-0",
          style: {
            borderColor: color,
            backgroundColor: active ? color : 'transparent'
          }
        }), /*#__PURE__*/React.createElement("input", {
          value: tempColName,
          onChange: e => setTempColName(e.target.value),
          onBlur: saveColEdit,
          onKeyDown: e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveColEdit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              cancelColEdit();
            }
          },
          autoFocus: true,
          placeholder: col,
          className: "text-xs flex-1 bg-[var(--bg-input)] border-b border-[var(--accent)] focus:outline-none px-1 text-[var(--ink)]",
          style: {
            fontFamily: FONT_MONO
          }
        }));
      }
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "flex items-center gap-2 group select-none py-0.5"
      }, /*#__PURE__*/React.createElement("label", {
        className: "flex items-center gap-2 cursor-pointer flex-1 min-w-0"
      }, /*#__PURE__*/React.createElement("span", {
        className: "w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-all flex-shrink-0",
        style: {
          borderColor: active ? color : theme.borderHard,
          backgroundColor: active ? color : 'transparent'
        }
      }, active && /*#__PURE__*/React.createElement("svg", {
        width: "10",
        height: "10",
        viewBox: "0 0 12 12",
        fill: "none"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M2 6L5 9L10 3",
        stroke: "white",
        strokeWidth: "2.2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }))), /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: active,
        onChange: () => toggleSeries(key),
        className: "sr-only"
      }), /*#__PURE__*/React.createElement("span", {
        className: "text-xs flex-1 transition-colors truncate",
        style: {
          fontFamily: FONT_MONO,
          color: active ? theme.ink : theme.inkSoft
        },
        title: displayName !== col ? `${displayName} (${col})` : col
      }, displayName)), /*#__PURE__*/React.createElement("button", {
        onClick: e => {
          e.preventDefault();
          e.stopPropagation();
          startEditCol(file.id, col, displayName);
        },
        className: "opacity-0 group-hover:opacity-100 text-[10px] text-[var(--ink-muted)] hover:text-[var(--accent)] transition-all flex-shrink-0 px-1",
        title: t('rename_column'),
        style: {
          fontFamily: FONT_MONO
        }
      }, "\u270E"));
    })));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-[var(--border-soft)] pt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)] mb-2",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('axis_labels')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-[var(--ink-muted)] w-6 flex-shrink-0",
    style: {
      fontFamily: FONT_MONO
    }
  }, "x"), /*#__PURE__*/React.createElement("input", {
    value: chart.xLabel || '',
    onChange: e => onUpdate({
      ...chart,
      xLabel: e.target.value
    }),
    placeholder: t('default_x'),
    className: "flex-1 text-xs bg-[var(--bg-input)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none px-2 py-1 rounded-sm text-[var(--ink)]",
    style: {
      fontFamily: FONT_MONO
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-[var(--ink-muted)] w-6 flex-shrink-0",
    style: {
      fontFamily: FONT_MONO
    }
  }, "y"), /*#__PURE__*/React.createElement("input", {
    value: chart.yLabel || '',
    onChange: e => onUpdate({
      ...chart,
      yLabel: e.target.value
    }),
    placeholder: chart.normalize ? t('default_y_norm') : t('default_y'),
    className: "flex-1 text-xs bg-[var(--bg-input)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none px-2 py-1 rounded-sm text-[var(--ink)]",
    style: {
      fontFamily: FONT_MONO
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => onUpdate({
      ...chart,
      swapXY: !chart.swapXY
    }),
    className: `w-full text-[10px] uppercase tracking-[0.15em] px-2 py-1.5 transition-colors border ${chart.swapXY ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]' : 'text-[var(--ink-muted)] border-[var(--border)] hover:text-[var(--ink)] hover:border-[var(--ink-muted)]'}`,
    style: {
      fontFamily: FONT_MONO
    },
    title: t('swap_xy_title')
  }, "x \u21C4 y  \xB7  ", chart.swapXY ? t('on') : t('off')))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-[var(--border-soft)] pt-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-3 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-5 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0",
    style: {
      backgroundColor: chart.normalize ? theme.accent : theme.borderHard
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
    style: {
      transform: chart.normalize ? 'translateX(16px)' : 'translateX(0)'
    }
  })), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: chart.normalize,
    onChange: e => onUpdate({
      ...chart,
      normalize: e.target.checked
    }),
    className: "sr-only"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-[0.15em] text-[var(--ink-soft)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('normalize_toggle'))), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[var(--ink-muted)] italic mt-1.5 pl-12 leading-snug",
    style: {
      fontFamily: FONT_SERIF
    }
  }, t('normalize_hint'))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-[var(--border-soft)] pt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)] mb-2",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('export_section')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => exportRaster('png'),
    disabled: chart.selectedSeries.size === 0,
    className: "py-2 text-[11px] uppercase tracking-[0.15em] bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
    style: {
      fontFamily: FONT_MONO
    },
    title: t('export_png_title')
  }, "png"), /*#__PURE__*/React.createElement("button", {
    onClick: () => exportRaster('jpeg'),
    disabled: chart.selectedSeries.size === 0,
    className: "py-2 text-[11px] uppercase tracking-[0.15em] border border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
    style: {
      fontFamily: FONT_MONO
    },
    title: t('export_jpeg_title')
  }, "jpeg"), /*#__PURE__*/React.createElement("button", {
    onClick: exportSVG,
    disabled: chart.selectedSeries.size === 0,
    className: "py-2 text-[11px] uppercase tracking-[0.15em] border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
    style: {
      fontFamily: FONT_MONO
    },
    title: t('export_svg_title')
  }, "svg")), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[var(--ink-muted)] italic mt-2 leading-snug",
    style: {
      fontFamily: FONT_SERIF
    }
  }, t('export_caption'))))));
}

// ─── Smith Chart yardımcıları ──────────────────────────────────
// Reflection coefficient → impedance/admittance dönüşümleri.
function gammaToImpedance(gammaRe, gammaIm, z0) {
  // Z = z0 * (1+Γ) / (1-Γ)
  const numRe = 1 + gammaRe,
    numIm = gammaIm;
  const denRe = 1 - gammaRe,
    denIm = -gammaIm;
  const denAbs2 = denRe * denRe + denIm * denIm;
  if (denAbs2 < 1e-20) return {
    re: Infinity,
    im: Infinity
  };
  return {
    re: z0 * (numRe * denRe + numIm * denIm) / denAbs2,
    im: z0 * (numIm * denRe - numRe * denIm) / denAbs2
  };
}
function impedanceToAdmittance(zRe, zIm) {
  // Y = 1/Z
  const abs2 = zRe * zRe + zIm * zIm;
  if (abs2 < 1e-20) return {
    re: Infinity,
    im: Infinity
  };
  return {
    re: zRe / abs2,
    im: -zIm / abs2
  };
}
function formatGroupDelayValue(seconds) {
  if (!isFinite(seconds)) return '—';
  const a = Math.abs(seconds);
  if (a < 1e-9) return `${(seconds * 1e12).toFixed(2)} ps`;
  if (a < 1e-6) return `${(seconds * 1e9).toFixed(2)} ns`;
  if (a < 1e-3) return `${(seconds * 1e6).toFixed(2)} μs`;
  return `${seconds.toExponential(2)} s`;
}
function unwrapPhaseRadians(phaseArr) {
  const out = phaseArr.slice();
  for (let i = 1; i < out.length; i++) {
    let diff = out[i] - out[i - 1];
    while (diff > Math.PI) {
      out[i] -= 2 * Math.PI;
      diff = out[i] - out[i - 1];
    }
    while (diff < -Math.PI) {
      out[i] += 2 * Math.PI;
      diff = out[i] - out[i - 1];
    }
  }
  return out;
}
function computeGroupDelaySeconds(complexArr, freqs) {
  const phase = unwrapPhaseRadians(complexArr.map(c => Math.atan2(c.im, c.re)));
  const gd = new Array(phase.length);
  for (let i = 0; i < phase.length; i++) {
    const iPrev = Math.max(0, i - 1);
    const iNext = Math.min(phase.length - 1, i + 1);
    const dPhi = phase[iNext] - phase[iPrev];
    const dOmega = 2 * Math.PI * (freqs[iNext] - freqs[iPrev]);
    gd[i] = dOmega === 0 ? 0 : -dPhi / dOmega;
  }
  return gd;
}
function findNearestFreqIndex(freqs, target) {
  if (!freqs || freqs.length === 0) return -1;
  let best = 0;
  let bestDiff = Math.abs(freqs[0] - target);
  for (let i = 1; i < freqs.length; i++) {
    const d = Math.abs(freqs[i] - target);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  return best;
}

// ─── Smith Chart görünümü ─────────────────────────────────────
// Saf SVG. Birim çember (|Γ|=1), sabit r-çemberleri (r=0.2,0.5,1,2,5),
// sabit x-yayları (x=±0.2,±0.5,±1,±2,±5), refleksiyon (S_ii) eğrileri,
// hover marker (piksel mesafesinde), mouse'u takip eden popup,
// wheel zoom (imleç merkezli) + drag pan, reset butonu.
function SmithChartView({
  files,
  selectedSeries,
  seriesColorMap,
  fileIndexById,
  markerFreq,
  onSetMarker,
  isMaximized,
  theme,
  t
}) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null); // { si, di }
  const [mousePx, setMousePx] = useState(null); // SVG container'a göre {x, y}
  const [view, setView] = useState({
    cx: 0,
    cy: 0,
    scale: 1
  });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const didDrag = useRef(false); // pan sonrası click'i yutmak için

  // Sadece S_ii (refleksiyon) parametreleri Smith chart için anlamlı
  const reflectionSeries = useMemo(() => {
    const result = [];
    Array.from(selectedSeries).forEach(key => {
      const [fileIdStr, param] = key.split('::');
      const m = /^S(\d+)(\d+)$/i.exec(param);
      if (!m || m[1] !== m[2]) return;
      const file = files.find(f => f.id === Number(fileIdStr));
      if (!file || !file.data[param]) return;
      result.push({
        key,
        param,
        color: seriesColorMap[key],
        fileLabel: getFileLabel(file, fileIndexById.get(file.id)),
        data: file.data[param],
        frequencies: file.frequencies,
        z0: file.z0 && file.z0[0] || 50
      });
    });
    return result;
  }, [selectedSeries, files, seriesColorMap, fileIndexById]);
  const size = isMaximized ? 540 : 320;
  const baseHalf = 1.18;
  const halfRange = baseHalf / view.scale;
  const vbX = -halfRange + view.cx;
  const vbY = -halfRange + view.cy;
  const vbSize = 2 * halfRange;

  // mouse client → Γ koordinatı + SVG-içi pixel
  function clientToLocal(clientX, clientY) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const gx = px / rect.width * vbSize + vbX;
    const gy = -(py / rect.height * vbSize + vbY);
    return {
      gx,
      gy,
      px,
      py,
      rect
    };
  }
  // Γ → SVG-içi pixel
  function gammaToPixel(gRe, gIm, rect) {
    if (!rect) return {
      x: 0,
      y: 0
    };
    const x = (gRe - vbX) / vbSize * rect.width;
    const y = (-gIm - vbY) / vbSize * rect.height;
    return {
      x,
      y
    };
  }
  function handleMouseMove(e) {
    const loc = clientToLocal(e.clientX, e.clientY);
    if (!loc) return;
    setMousePx({
      x: loc.px,
      y: loc.py
    });

    // Drag (pan)
    if (dragging && dragStart.current) {
      const dxPx = e.clientX - dragStart.current.clientX;
      const dyPx = e.clientY - dragStart.current.clientY;
      if (Math.abs(dxPx) > 2 || Math.abs(dyPx) > 2) didDrag.current = true;
      const rect = loc.rect;
      const dxG = -(dxPx / rect.width) * vbSize;
      const dyG = -(dyPx / rect.height) * vbSize;
      setView(v => ({
        ...v,
        cx: dragStart.current.cx + dxG,
        cy: dragStart.current.cy + dyG
      }));
      return;
    }
    if (reflectionSeries.length === 0) return;

    // Hover: en yakın data point — pixel mesafesinde
    let best = null;
    reflectionSeries.forEach((s, si) => {
      s.data.forEach((c, di) => {
        const dp = gammaToPixel(c.re, c.im, loc.rect);
        const dx = dp.x - loc.px;
        const dy = dp.y - loc.py;
        const d2 = dx * dx + dy * dy;
        if (!best || d2 < best.d2) best = {
          d2,
          si,
          di,
          dataPx: dp
        };
      });
    });
    // 40 px tolerance — boyut bağımsız, kolay yakalama. Popup data point'e
    // anchor olur (mouse hareketinden bağımsız → "kaçma" hissi yok).
    setHover(best && best.d2 < 40 * 40 ? best : null);
  }
  function handleMouseLeave() {
    setHover(null);
    setMousePx(null);
    setDragging(false);
    dragStart.current = null;
  }
  function handleMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragging(true);
    didDrag.current = false;
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      cx: view.cx,
      cy: view.cy
    };
  }
  function handleMouseUp() {
    setDragging(false);
    dragStart.current = null;
  }
  function handleClick() {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    if (hover && onSetMarker) {
      const s = reflectionSeries[hover.si];
      onSetMarker(s.frequencies[hover.di]);
    }
  }
  // React onWheel passive listener attach ettiği için preventDefault çalışmaz
  // (sayfa Smith üzerinde tekerlek çevirirken kayar). Çözüm: native addEventListener
  // ile { passive: false } şartında attach. Hem SVG'ye hem dış container'a — SVG
  // null/early-return durumunda da container yakalasın diye.
  const containerRef = useRef(null);
  useEffect(() => {
    const els = [svgRef.current, containerRef.current].filter(Boolean);
    if (els.length === 0) return;
    function nativeWheelHandler(e) {
      // Smith chart üzerinde herhangi bir yerde wheel → sayfa scroll'u engelle
      e.preventDefault();
      e.stopPropagation();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // Mouse SVG dışındaysa (örn. container'ın boş alanı), zoom uygulama
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setView(v => {
        const oldHalf = baseHalf / v.scale;
        const oldVbSize = 2 * oldHalf;
        const oldVbX = -oldHalf + v.cx;
        const oldVbY = -oldHalf + v.cy;
        // İmlecin Γ uzayındaki konumu sabit kalsın
        const gx = px / rect.width * oldVbSize + oldVbX;
        const gy = py / rect.height * oldVbSize + oldVbY;
        const newScale = Math.max(1.0, Math.min(40, v.scale * factor));
        const newHalf = baseHalf / newScale;
        const newVbSize = 2 * newHalf;
        const newVbX = gx - px / rect.width * newVbSize;
        const newVbY = gy - py / rect.height * newVbSize;
        return {
          cx: newVbX + newHalf,
          cy: newVbY + newHalf,
          scale: newScale
        };
      });
    }
    els.forEach(el => el.addEventListener('wheel', nativeWheelHandler, {
      passive: false
    }));
    return () => els.forEach(el => el.removeEventListener('wheel', nativeWheelHandler));
  }, [reflectionSeries.length]); // SVG mount/unmount olunca re-attach

  function resetView() {
    setView({
      cx: 0,
      cy: 0,
      scale: 1
    });
  }

  // Empty state
  if (reflectionSeries.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col items-center justify-center",
      style: {
        minHeight: isMaximized ? 540 : 300
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm italic text-[var(--placeholder)]",
      style: {
        fontFamily: FONT_SERIF
      }
    }, t('smith_no_reflection')), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] uppercase tracking-[0.2em] text-[var(--placeholder)] mt-2",
      style: {
        fontFamily: FONT_MONO
      }
    }, t('smith_hint')));
  }

  // Hover bilgi metinleri
  const infoBlock = (() => {
    if (!hover) return null;
    const s = reflectionSeries[hover.si];
    const c = s.data[hover.di];
    const f = s.frequencies[hover.di];
    const magG = Math.sqrt(c.re * c.re + c.im * c.im);
    const phiG = Math.atan2(c.im, c.re) * 180 / Math.PI;
    const Z = gammaToImpedance(c.re, c.im, s.z0);
    const vswr = magG >= 0.999 ? '∞' : ((1 + magG) / (1 - magG)).toFixed(3);
    const rl = -20 * Math.log10(magG || 1e-30);
    return {
      s,
      c,
      f,
      magG,
      phiG,
      Z,
      vswr,
      rl
    };
  })();
  const styleColors = {
    bg: theme.bgChart,
    grid: theme.grid,
    border: theme.borderHard,
    text: theme.inkSoft
  };
  const rValues = [0.2, 0.5, 1, 2, 5];
  const xValues = [0.2, 0.5, 1, 2, 5];

  // Scale-aware stroke/font: zoom yapılınca çizgi/yazı ekranda aynı kalsın
  const sw = base => Math.max(base * 0.4, base / view.scale);
  const fs = base => Math.max(base * 0.4, base / view.scale);
  const pointR = Math.max(0.005, 0.011 / view.scale);
  const markerR1 = Math.max(0.014, 0.035 / view.scale);
  const markerR2 = Math.max(0.007, 0.018 / view.scale);
  const hoverR = Math.max(0.012, 0.030 / view.scale);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: containerRef,
    style: {
      position: 'relative',
      width: size,
      height: size,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    ref: svgRef,
    viewBox: `${vbX} ${vbY} ${vbSize} ${vbSize}`,
    width: size,
    height: size,
    preserveAspectRatio: "xMidYMid meet",
    style: {
      background: styleColors.bg,
      display: 'block',
      cursor: dragging ? 'grabbing' : hover ? 'crosshair' : 'grab',
      touchAction: 'none',
      userSelect: 'none'
    },
    onMouseMove: handleMouseMove,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("clipPath", {
    id: "smith-clip"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "0",
    cy: "0",
    r: "1"
  }))), /*#__PURE__*/React.createElement("g", {
    clipPath: "url(#smith-clip)"
  }, rValues.map(r => {
    const cx = r / (r + 1);
    const rad = 1 / (r + 1);
    return /*#__PURE__*/React.createElement("circle", {
      key: `r${r}`,
      cx: cx,
      cy: 0,
      r: rad,
      fill: "none",
      stroke: r === 1 ? styleColors.border : styleColors.grid,
      strokeWidth: r === 1 ? sw(0.008) : sw(0.004)
    });
  }), xValues.flatMap(x => [x, -x]).map(x => /*#__PURE__*/React.createElement("circle", {
    key: `x${x}`,
    cx: 1,
    cy: -1 / x,
    r: 1 / Math.abs(x),
    fill: "none",
    stroke: Math.abs(x) === 1 ? styleColors.border : styleColors.grid,
    strokeWidth: Math.abs(x) === 1 ? sw(0.008) : sw(0.004)
  })), /*#__PURE__*/React.createElement("line", {
    x1: -1,
    y1: 0,
    x2: 1,
    y2: 0,
    stroke: styleColors.border,
    strokeWidth: sw(0.005)
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "0",
    cy: "0",
    r: "1",
    fill: "none",
    stroke: styleColors.border,
    strokeWidth: sw(0.012)
  }), /*#__PURE__*/React.createElement("g", {
    fontFamily: FONT_MONO,
    fontSize: fs(0.055),
    fill: styleColors.text
  }, /*#__PURE__*/React.createElement("text", {
    x: -1,
    y: fs(0.04),
    textAnchor: "middle",
    dominantBaseline: "hanging"
  }, "0"), rValues.map(r => {
    const x = (r - 1) / (r + 1);
    return /*#__PURE__*/React.createElement("text", {
      key: `rl${r}`,
      x: x,
      y: fs(0.04),
      textAnchor: "middle",
      dominantBaseline: "hanging"
    }, r);
  }), /*#__PURE__*/React.createElement("text", {
    x: 1,
    y: fs(0.04),
    textAnchor: "middle",
    dominantBaseline: "hanging"
  }, "\u221E")), /*#__PURE__*/React.createElement("g", {
    fontFamily: FONT_MONO,
    fontSize: fs(0.05),
    fill: styleColors.text
  }, xValues.flatMap(x => [x, -x]).map(x => {
    const zRe = 0,
      zIm = x;
    const denRe = zRe + 1,
      denIm = zIm;
    const denAbs2 = denRe * denRe + denIm * denIm;
    const gRe = ((zRe - 1) * denRe + zIm * denIm) / denAbs2;
    const gIm = (zIm * denRe - (zRe - 1) * denIm) / denAbs2;
    const lx = gRe * 1.06;
    const ly = -gIm * 1.06;
    return /*#__PURE__*/React.createElement("text", {
      key: `xl${x}`,
      x: lx,
      y: ly,
      textAnchor: Math.abs(gRe) < 0.05 ? 'middle' : gRe > 0 ? 'start' : 'end',
      dominantBaseline: "middle"
    }, x > 0 ? `+j${x}` : `−j${Math.abs(x)}`);
  })), /*#__PURE__*/React.createElement("g", {
    clipPath: "url(#smith-clip)"
  }, reflectionSeries.map(s => {
    let d = '';
    for (let i = 0; i < s.data.length; i++) {
      const p = s.data[i];
      d += (i === 0 ? 'M ' : ' L ') + p.re + ' ' + -p.im;
    }
    return /*#__PURE__*/React.createElement("g", {
      key: s.key
    }, /*#__PURE__*/React.createElement("path", {
      d: d,
      fill: "none",
      stroke: s.color,
      strokeWidth: sw(0.011),
      strokeLinejoin: "round",
      strokeLinecap: "round"
    }), s.data.length <= 200 && s.data.map((p, i) => /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: p.re,
      cy: -p.im,
      r: pointR,
      fill: s.color
    })));
  })), markerFreq != null && reflectionSeries.map((s, si) => {
    const idx = findNearestFreqIndex(s.frequencies, markerFreq);
    if (idx < 0) return null;
    const p = s.data[idx];
    return /*#__PURE__*/React.createElement("g", {
      key: `mark${si}`
    }, /*#__PURE__*/React.createElement("circle", {
      cx: p.re,
      cy: -p.im,
      r: markerR1,
      fill: "none",
      stroke: s.color,
      strokeWidth: sw(0.008)
    }), /*#__PURE__*/React.createElement("circle", {
      cx: p.re,
      cy: -p.im,
      r: markerR2,
      fill: s.color
    }));
  }), hover && /*#__PURE__*/React.createElement("circle", {
    cx: reflectionSeries[hover.si].data[hover.di].re,
    cy: -reflectionSeries[hover.si].data[hover.di].im,
    r: hoverR,
    fill: "none",
    stroke: theme.accent,
    strokeWidth: sw(0.012)
  }), /*#__PURE__*/React.createElement("g", {
    transform: `translate(${vbX + 0.05 / view.scale}, ${vbY + 0.1 / view.scale}) scale(${1 / view.scale})`
  }, reflectionSeries.map((s, si) => /*#__PURE__*/React.createElement("g", {
    key: `leg${s.key}`,
    transform: `translate(0, ${si * 0.085})`
  }, /*#__PURE__*/React.createElement("line", {
    x1: 0,
    y1: 0,
    x2: 0.12,
    y2: 0,
    stroke: s.color,
    strokeWidth: "0.014"
  }), /*#__PURE__*/React.createElement("text", {
    x: 0.15,
    y: 0.025,
    fontFamily: FONT_MONO,
    fontSize: "0.05",
    fill: theme.ink
  }, s.fileLabel, " \xB7 ", s.param))))), (view.scale !== 1 || view.cx !== 0 || view.cy !== 0) && /*#__PURE__*/React.createElement("button", {
    onClick: resetView,
    className: "absolute top-1 left-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors border border-[var(--border)] bg-[var(--bg-panel)]/70 backdrop-blur-sm z-20",
    style: {
      fontFamily: FONT_MONO
    },
    title: t('reset_zoom')
  }, "\u27F2 ", view.scale.toFixed(1), "\xD7"), infoBlock && hover && hover.dataPx && !dragging && (() => {
    const popupW = 200;
    const popupH = 130;
    const anchorX = hover.dataPx.x;
    const anchorY = hover.dataPx.y;
    // Tercih: data point'in 14 px üstünde, ortalanmış
    let left = anchorX - popupW / 2;
    let top = anchorY - popupH - 14;
    if (left < 4) left = 4;
    if (left + popupW > size - 4) left = size - popupW - 4;
    // Üstte yer yoksa altta göster
    if (top < 4) top = anchorY + 14;
    return /*#__PURE__*/React.createElement("div", {
      className: "absolute pointer-events-none bg-[var(--bg-panel)]/95 backdrop-blur-sm border border-[var(--border)] rounded-sm px-2.5 py-1.5 shadow-lg text-[10px] leading-relaxed z-10",
      style: {
        left,
        top,
        width: popupW,
        fontFamily: FONT_MONO,
        color: 'var(--ink)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[var(--ink-soft)] mb-0.5"
    }, infoBlock.s.fileLabel, " \xB7 ", infoBlock.s.param), /*#__PURE__*/React.createElement("div", null, "f = ", /*#__PURE__*/React.createElement("span", {
      className: "text-[var(--accent)]"
    }, (infoBlock.f / 1e9).toPrecision(5), " GHz")), /*#__PURE__*/React.createElement("div", null, "|\u0393| = ", infoBlock.magG.toFixed(4)), /*#__PURE__*/React.createElement("div", null, "\u2220\u0393 = ", infoBlock.phiG.toFixed(2), "\xB0"), /*#__PURE__*/React.createElement("div", null, "Z = ", infoBlock.Z.re.toFixed(2), " ", infoBlock.Z.im >= 0 ? '+' : '−', " j", Math.abs(infoBlock.Z.im).toFixed(2), " \u03A9"), /*#__PURE__*/React.createElement("div", null, "VSWR = ", infoBlock.vswr), /*#__PURE__*/React.createElement("div", null, "RL = ", infoBlock.rl.toFixed(2), " dB"));
  })()));
}

// ─── S-Parameter chart card ────────────────────────────────────
// Tek bir görünüm: 'mag' (dB) veya 'phase' (°). Touchstone verisini
// frekans-bazlı bir line chart olarak çizer. Multi-file overlay,
// zoom (wheel + drag), 3× export, custom SVG.
function SParamChartCard({
  viewMode,
  // 'mag' | 'phase' | 'vswr' | 'groupdelay' | 'smith'
  title,
  files,
  fileIndexById,
  selectedSeries,
  // Set of "fileId::Sij"
  seriesColorMap,
  // { 'fileId::Sij': color }
  freqUnit,
  // 'auto' | 'Hz' | 'kHz' | 'MHz' | 'GHz'
  unwrapPhase,
  // bool
  xLabel,
  yLabel,
  swapXY,
  onUpdateLabels,
  onViewModeChange,
  // optional: tile header'da view seçici dropdown göster
  onMaximize,
  // optional: maximize button gösterir
  isMaximized,
  // true ise canvas yüksekliği artar, "restore" göstergesi
  markerFreq,
  // optional: shared marker frequency (Hz)
  onSetMarker,
  // optional: chart tıklanınca marker'ı oraya koy
  theme,
  t
}) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Frekans birimini otomatik seç (en büyük freq'e göre)
  const resolvedFreqUnit = useMemo(() => {
    if (freqUnit && freqUnit !== 'auto') return freqUnit;
    let maxFreq = 0;
    files.forEach(f => {
      if (f.frequencies && f.frequencies.length) {
        const fmax = f.frequencies[f.frequencies.length - 1];
        if (fmax > maxFreq) maxFreq = fmax;
      }
    });
    if (maxFreq >= 1e9) return 'GHz';
    if (maxFreq >= 1e6) return 'MHz';
    if (maxFreq >= 1e3) return 'kHz';
    return 'Hz';
  }, [files, freqUnit]);
  const freqDiv = resolvedFreqUnit === 'GHz' ? 1e9 : resolvedFreqUnit === 'MHz' ? 1e6 : resolvedFreqUnit === 'kHz' ? 1e3 : 1;

  // Faz açma (unwrap): art arda noktalar arasında ±π üzeri sıçramaları sürekli kaldır
  const unwrap = phaseDeg => {
    const out = phaseDeg.slice();
    for (let i = 1; i < out.length; i++) {
      let diff = out[i] - out[i - 1];
      while (diff > 180) {
        out[i] -= 360;
        diff = out[i] - out[i - 1];
      }
      while (diff < -180) {
        out[i] += 360;
        diff = out[i] - out[i - 1];
      }
    }
    return out;
  };
  const buildConfig = useCallback(() => {
    const datasets = [];
    Array.from(selectedSeries).forEach(key => {
      const [fileIdStr, param] = key.split('::');
      const fileId = Number(fileIdStr);
      const file = files.find(f => f.id === fileId);
      if (!file || !file.data[param]) return;
      // VSWR ve return loss sadece refleksiyon parametreleri (S_ii) için anlamlı
      if (viewMode === 'vswr') {
        const m = /^S(\d+)(\d+)$/i.exec(param);
        if (!m || m[1] !== m[2]) return; // S11, S22, ... ✓; S21, S12 ✗
      }
      const complex = file.data[param];
      const freqs = file.frequencies;
      let yVals;
      if (viewMode === 'mag') {
        yVals = complex.map(c => 20 * Math.log10(Math.sqrt(c.re * c.re + c.im * c.im) || 1e-30));
      } else if (viewMode === 'phase') {
        let phaseDeg = complex.map(c => Math.atan2(c.im, c.re) * 180 / Math.PI);
        if (unwrapPhase) phaseDeg = unwrap(phaseDeg);
        yVals = phaseDeg;
      } else if (viewMode === 'vswr') {
        // VSWR = (1+|Γ|)/(1-|Γ|), |Γ|≥1 ise sonsuz — 100'e clamp et
        yVals = complex.map(c => {
          const mag = Math.sqrt(c.re * c.re + c.im * c.im);
          if (mag >= 0.999) return 100;
          return (1 + mag) / (1 - mag);
        });
      } else if (viewMode === 'groupdelay') {
        // Group delay = -dφ/dω, finite difference
        let phaseRad = complex.map(c => Math.atan2(c.im, c.re));
        // Unwrap (radians)
        for (let i = 1; i < phaseRad.length; i++) {
          let diff = phaseRad[i] - phaseRad[i - 1];
          while (diff > Math.PI) {
            phaseRad[i] -= 2 * Math.PI;
            diff = phaseRad[i] - phaseRad[i - 1];
          }
          while (diff < -Math.PI) {
            phaseRad[i] += 2 * Math.PI;
            diff = phaseRad[i] - phaseRad[i - 1];
          }
        }
        yVals = new Array(phaseRad.length);
        for (let i = 0; i < phaseRad.length; i++) {
          const iPrev = Math.max(0, i - 1);
          const iNext = Math.min(phaseRad.length - 1, i + 1);
          const dPhi = phaseRad[iNext] - phaseRad[iPrev];
          const dOmega = 2 * Math.PI * (freqs[iNext] - freqs[iPrev]);
          yVals[i] = dOmega === 0 ? 0 : -dPhi / dOmega;
        }
      } else {
        yVals = new Array(complex.length).fill(0);
      }
      let data = freqs.map((f, i) => ({
        x: f / freqDiv,
        y: yVals[i]
      }));
      // X⇄Y swap: gerekirse takasla (cihaz kayıt hatası onarma)
      if (swapXY) {
        data = data.map(p => ({
          x: p.y,
          y: p.x
        }));
      }
      const color = seriesColorMap[key];
      const fileIdx = fileIndexById.get(file.id);
      const fileLabel = getFileLabel(file, fileIdx);
      const showPoints = data.length <= 200;
      datasets.push({
        label: `${fileLabel} · ${param}`,
        data,
        borderColor: color,
        backgroundColor: color + '22',
        tension: 0.18,
        borderWidth: 1.8,
        pointRadius: showPoints ? 2 : 0,
        pointHoverRadius: showPoints ? 5 : 4,
        pointBackgroundColor: color,
        pointBorderColor: theme.bgChart,
        pointBorderWidth: 1.2
      });
    });

    // ─── Group delay birim auto-scale (ns/ps) ───
    let gdScale = 1,
      gdUnit = 's';
    if (viewMode === 'groupdelay' && datasets.length > 0) {
      let maxAbs = 0;
      datasets.forEach(ds => ds.data.forEach(p => {
        if (Math.abs(p.y) > maxAbs) maxAbs = Math.abs(p.y);
      }));
      if (maxAbs < 1e-9) {
        gdScale = 1e12;
        gdUnit = 'ps';
      } else if (maxAbs < 1e-6) {
        gdScale = 1e9;
        gdUnit = 'ns';
      } else if (maxAbs < 1e-3) {
        gdScale = 1e6;
        gdUnit = 'μs';
      } else {
        gdScale = 1;
        gdUnit = 's';
      }
      datasets.forEach(ds => {
        ds.data = ds.data.map(p => ({
          x: p.x,
          y: p.y * gdScale
        }));
      });
    }
    const xTextRaw = xLabel || `${t('axis_freq')} (${resolvedFreqUnit})`;
    const yTextRaw = yLabel || (viewMode === 'mag' ? t('axis_mag_db') : viewMode === 'phase' ? t('axis_phase_deg') : viewMode === 'vswr' ? t('axis_vswr') : viewMode === 'groupdelay' ? `${t('axis_group_delay')} (${gdUnit})` : '');
    // Swap aktifse axis title'ları da takasla
    const xText = swapXY ? yTextRaw : xTextRaw;
    const yText = swapXY ? xTextRaw : yTextRaw;

    // Marker dikey çizgi plugin'i. Chart.js'in afterDraw kancasına bağlanır,
    // markerFreq Hz cinsindendir, chart x ekseninde freqDiv ile bölünmüş gösterilir.
    // Swap aktifse marker dikey değil yatay olur (y'de freq var çünkü).
    const markerPlugin = {
      id: 'spMarker',
      afterDatasetsDraw: chart => {
        if (markerFreq == null) return;
        const mVal = markerFreq / freqDiv;
        const {
          ctx,
          chartArea,
          scales
        } = chart;
        const axis = swapXY ? scales.y : scales.x;
        if (!axis) return;
        const px = axis.getPixelForValue(mVal);
        if (swapXY) {
          if (px < chartArea.top || px > chartArea.bottom) return;
          ctx.save();
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(chartArea.left, px);
          ctx.lineTo(chartArea.right, px);
          ctx.stroke();
          ctx.restore();
        } else {
          if (px < chartArea.left || px > chartArea.right) return;
          ctx.save();
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(px, chartArea.top);
          ctx.lineTo(px, chartArea.bottom);
          ctx.stroke();
          // Üst kenara küçük etiket (frekans değeri)
          ctx.fillStyle = theme.accent;
          ctx.font = `10px ${FONT_MONO}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          const txt = `${mVal.toPrecision(5)} ${resolvedFreqUnit}`;
          ctx.fillText(txt, px, chartArea.top - 2);
          ctx.restore();
        }
      }
    };
    return {
      type: 'line',
      data: {
        datasets
      },
      plugins: [makeBgPlugin(theme.bgChart), markerPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        // S-param verisi tipik 1k+ nokta, anim performansı düşürür
        interaction: {
          mode: 'index',
          intersect: false,
          axis: 'x'
        },
        onClick: (event, _elements, chart) => {
          if (!onSetMarker) return;
          const axis = swapXY ? chart.scales.y : chart.scales.x;
          if (!axis) return;
          const pixel = swapXY ? event.y : event.x;
          const val = axis.getValueForPixel(pixel);
          if (val == null || isNaN(val)) return;
          // freqDiv ile çarp ki Hz cinsinden state'e yaz
          onSetMarker(val * freqDiv);
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: FONT_MONO,
                size: 10
              },
              color: theme.legendText,
              boxWidth: 12,
              boxHeight: 12,
              padding: 10,
              usePointStyle: true,
              pointStyle: 'rectRounded'
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleFont: {
              family: FONT_SERIF,
              size: 12,
              weight: '600'
            },
            bodyFont: {
              family: FONT_MONO,
              size: 10
            },
            padding: 10,
            cornerRadius: 4,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.accent,
            borderWidth: 1,
            displayColors: true,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: {
              title: items => `${xText} = ${Number(items[0].parsed.x).toPrecision(6)}`,
              label: ctx => `  ${ctx.dataset.label}  =  ${Number(ctx.parsed.y).toFixed(3)}`
            }
          },
          zoom: {
            limits: {
              x: {
                minRange: 1e-9
              }
            },
            pan: {
              enabled: true,
              mode: 'xy',
              modifierKey: 'shift'
            },
            zoom: {
              wheel: {
                enabled: true
              },
              drag: {
                enabled: true,
                backgroundColor: theme.accent + '22',
                borderColor: theme.accent,
                borderWidth: 1
              },
              pinch: {
                enabled: false
              },
              // hammer.js opsiyonel
              mode: 'xy'
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            ticks: {
              font: {
                family: FONT_MONO,
                size: 10
              },
              color: theme.inkSoft
            },
            grid: {
              color: theme.grid,
              drawBorder: false
            },
            title: {
              display: true,
              text: xText,
              font: {
                family: FONT_SERIF,
                size: 12,
                style: 'italic'
              },
              color: theme.inkSoft,
              padding: 6
            }
          },
          y: {
            ticks: {
              font: {
                family: FONT_MONO,
                size: 10
              },
              color: theme.inkSoft
            },
            grid: {
              color: theme.grid,
              drawBorder: false
            },
            title: {
              display: true,
              text: yText,
              font: {
                family: FONT_SERIF,
                size: 12,
                style: 'italic'
              },
              color: theme.inkSoft,
              padding: 6
            }
          }
        }
      }
    };
  }, [selectedSeries, files, viewMode, unwrapPhase, freqDiv, resolvedFreqUnit, seriesColorMap, fileIndexById, theme, t, xLabel, yLabel, swapXY, markerFreq, onSetMarker]);
  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
    const cfg = buildConfig();
    if (cfg.data.datasets.length === 0) return;
    chartInstanceRef.current = new Chart(canvasRef.current, cfg);
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [buildConfig]);
  const resetZoom = () => {
    if (chartInstanceRef.current && chartInstanceRef.current.resetZoom) {
      chartInstanceRef.current.resetZoom();
    }
  };
  const exportRaster = format => {
    if (!chartInstanceRef.current) return;
    const c = chartInstanceRef.current;
    const origDpr = c.options.devicePixelRatio;
    const origAnim = c.options.animation;
    try {
      c.options.devicePixelRatio = HIRES_SCALE;
      c.options.animation = false;
      c.resize();
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = c.toBase64Image(mime, 0.98);
      const a = document.createElement('a');
      a.download = `${safeFilename(title)}_${viewMode}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      c.options.devicePixelRatio = origDpr;
      c.options.animation = origAnim;
      c.resize();
    }
  };
  const escapeXml = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const exportSVG = () => {
    if (!chartInstanceRef.current || viewMode === 'smith') return;
    try {
      const svgString = buildChartSVG(chartInstanceRef.current, theme);
      const blob = new Blob([svgString], {
        type: 'image/svg+xml;charset=utf-8'
      });
      downloadBlob(blob, `${safeFilename(title)}_${viewMode}.svg`);
    } catch (e) {
      console.error('SVG export error:', e);
      alert(t('svg_fail') + e.message);
    }
  };

  // Smith chart için ayrı SVG export — DOM'daki Smith SVG'yi serialize et
  const exportSmithSVG = () => {
    if (viewMode !== 'smith') return;
    try {
      // Smith SVG'yi DOM'dan bul (svgRef MiniChart canvasRef gibi yok, ama Smith
      // kendi içinde svgRef tutar — bunu prop olarak çıkarmak yerine, container
      // içindeki ilk <svg>'yi alıyoruz)
      const container = document.activeElement?.closest('[data-sparam-card]');
      const svgEl = container?.querySelector('svg[viewBox*="1.18"]') || document.querySelector('[data-sparam-card] svg[viewBox*="1.18"]');
      if (!svgEl) return;
      const serial = new XMLSerializer().serializeToString(svgEl);
      // Background rect ekle (PNG export'un yaptığı gibi)
      const blob = new Blob([serial], {
        type: 'image/svg+xml;charset=utf-8'
      });
      downloadBlob(blob, `${safeFilename(title)}_smith.svg`);
    } catch (e) {
      console.error('Smith SVG export error:', e);
      alert(t('svg_fail') + e.message);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-[var(--bg-panel)] border border-[var(--border)] rounded-sm overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-4 py-2 border-b border-[var(--border-soft)] gap-2"
  }, onViewModeChange ? /*#__PURE__*/React.createElement("select", {
    value: viewMode,
    onChange: e => onViewModeChange(e.target.value),
    className: "text-sm italic bg-transparent text-[var(--ink)] border-none focus:outline-none cursor-pointer hover:text-[var(--accent)] transition-colors",
    style: {
      fontFamily: FONT_SERIF
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "mag"
  }, t('sparams_view_magnitude')), /*#__PURE__*/React.createElement("option", {
    value: "phase"
  }, t('sparams_view_phase')), /*#__PURE__*/React.createElement("option", {
    value: "vswr"
  }, t('sparams_view_vswr')), /*#__PURE__*/React.createElement("option", {
    value: "groupdelay"
  }, t('sparams_view_group_delay')), /*#__PURE__*/React.createElement("option", {
    value: "smith"
  }, t('sparams_view_smith'))) : /*#__PURE__*/React.createElement("h4", {
    className: "text-sm italic text-[var(--ink)]",
    style: {
      fontFamily: FONT_SERIF
    }
  }, viewMode === 'mag' ? t('sparams_view_magnitude') : viewMode === 'phase' ? t('sparams_view_phase') : viewMode === 'vswr' ? t('sparams_view_vswr') : viewMode === 'groupdelay' ? t('sparams_view_group_delay') : viewMode === 'smith' ? t('sparams_view_smith') : viewMode), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: resetZoom,
    className: "text-[10px] uppercase tracking-wider text-[var(--ink-muted)] hover:text-[var(--accent)] px-1.5 py-0.5 transition-colors",
    title: t('reset_zoom')
  }, "\u27F2"), onMaximize && /*#__PURE__*/React.createElement("button", {
    onClick: onMaximize,
    className: "text-[12px] text-[var(--ink-muted)] hover:text-[var(--accent)] px-1 py-0.5 transition-colors leading-none",
    title: isMaximized ? t('restore') : t('maximize')
  }, isMaximized ? '⤧' : '⤢'), /*#__PURE__*/React.createElement("button", {
    onClick: () => exportRaster('png'),
    disabled: selectedSeries.size === 0,
    className: "text-[10px] uppercase tracking-wider text-[var(--ink-soft)] hover:text-[var(--accent)] px-1.5 py-0.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
    title: t('export_png_title')
  }, "png"), /*#__PURE__*/React.createElement("button", {
    onClick: () => exportRaster('jpeg'),
    disabled: selectedSeries.size === 0,
    className: "text-[10px] uppercase tracking-wider text-[var(--ink-soft)] hover:text-[var(--accent)] px-1.5 py-0.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
    title: t('export_jpeg_title')
  }, "jpg"), /*#__PURE__*/React.createElement("button", {
    onClick: exportSVG,
    disabled: selectedSeries.size === 0,
    className: "text-[10px] uppercase tracking-wider text-[var(--accent)] hover:text-[var(--ink)] px-1.5 py-0.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
    title: t('export_svg_title')
  }, "svg"))), /*#__PURE__*/React.createElement("div", {
    className: "p-3",
    style: {
      minHeight: isMaximized ? 560 : 320,
      position: 'relative'
    }
  }, viewMode === 'smith' ? /*#__PURE__*/React.createElement(SmithChartView, {
    files: files,
    selectedSeries: selectedSeries,
    seriesColorMap: seriesColorMap,
    fileIndexById: fileIndexById,
    isMaximized: isMaximized,
    markerFreq: markerFreq,
    onSetMarker: onSetMarker,
    theme: theme,
    t: t
  }) : selectedSeries.size === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center",
    style: {
      minHeight: isMaximized ? 540 : 300
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm italic text-[var(--placeholder)]",
    style: {
      fontFamily: FONT_SERIF
    }
  }, t('no_series'))) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: isMaximized ? 560 : 320
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef
  }))), selectedSeries.size > 0 && viewMode !== 'smith' && /*#__PURE__*/React.createElement("div", {
    className: "px-3 pb-2 border-t border-[var(--border-soft)] pt-2 space-y-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] text-[var(--ink-muted)] w-4 flex-shrink-0",
    style: {
      fontFamily: FONT_MONO
    }
  }, "x"), /*#__PURE__*/React.createElement("input", {
    value: xLabel || '',
    onChange: e => onUpdateLabels && onUpdateLabels({
      xLabel: e.target.value
    }),
    placeholder: `${t('axis_freq')} (${resolvedFreqUnit})`,
    className: "flex-1 text-[10px] bg-[var(--bg-input)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none px-1.5 py-0.5 rounded-sm text-[var(--ink)]",
    style: {
      fontFamily: FONT_MONO
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] text-[var(--ink-muted)] w-4 flex-shrink-0",
    style: {
      fontFamily: FONT_MONO
    }
  }, "y"), /*#__PURE__*/React.createElement("input", {
    value: yLabel || '',
    onChange: e => onUpdateLabels && onUpdateLabels({
      yLabel: e.target.value
    }),
    placeholder: viewMode === 'mag' ? t('axis_mag_db') : viewMode === 'phase' ? t('axis_phase_deg') : viewMode === 'vswr' ? t('axis_vswr') : viewMode === 'groupdelay' ? t('axis_group_delay') : '',
    className: "flex-1 text-[10px] bg-[var(--bg-input)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none px-1.5 py-0.5 rounded-sm text-[var(--ink)]",
    style: {
      fontFamily: FONT_MONO
    }
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => onUpdateLabels && onUpdateLabels({
      swapXY: !swapXY
    }),
    className: `w-full text-[9px] uppercase tracking-[0.15em] px-2 py-1 transition-colors border ${swapXY ? 'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)]' : 'text-[var(--ink-muted)] border-[var(--border)] hover:text-[var(--ink)] hover:border-[var(--ink-muted)]'}`,
    style: {
      fontFamily: FONT_MONO
    },
    title: t('swap_xy_title')
  }, "x \u21C4 y  \xB7  ", swapXY ? t('on') : t('off'))));
}

// ─── Hash routing ──────────────────────────────────────────────
// file:// üzerinde de çalışır. Hash'te '#/csv' veya '#/sparams' tutulur.
const ROUTES = ['csv', 'sparams', 'iq', 'waveform', 'bilgi'];
const ENABLED_ROUTES = new Set(['csv', 'sparams', 'iq', 'waveform', 'bilgi']); // tüm rotalar
function readHashRoute() {
  const h = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#\/?/, '');
  if (ROUTES.includes(h)) return h;
  return 'csv';
}
function useHashRoute() {
  const [route, setRoute] = useState(readHashRoute);
  useEffect(() => {
    const onChange = () => setRoute(readHashRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const nav = useCallback(r => {
    if (ROUTES.includes(r)) window.location.hash = '#/' + r;
  }, []);
  return [route, nav];
}
function escapeXml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function buildChartSVG(c, theme) {
  const w = Math.round(c.width);
  const h = Math.round(c.height);
  const xs = c.scales.x;
  const ys = c.scales.y;
  const ca = c.chartArea;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${escapeXml(FONT_SANS)}">`);
  parts.push(`<rect width="${w}" height="${h}" fill="${theme.bgChart}"/>`);
  ys.ticks.forEach(tk => {
    const y = ys.getPixelForValue(tk.value);
    parts.push(`<line x1="${ca.left}" y1="${y.toFixed(2)}" x2="${ca.right}" y2="${y.toFixed(2)}" stroke="${theme.grid}" stroke-width="1"/>`);
  });
  xs.ticks.forEach(tk => {
    const x = xs.getPixelForValue(tk.value);
    parts.push(`<line x1="${x.toFixed(2)}" y1="${ca.top}" x2="${x.toFixed(2)}" y2="${ca.bottom}" stroke="${theme.grid}" stroke-width="1"/>`);
  });
  parts.push(`<defs><clipPath id="ca-clip"><rect x="${ca.left}" y="${ca.top}" width="${(ca.right - ca.left).toFixed(2)}" height="${(ca.bottom - ca.top).toFixed(2)}"/></clipPath></defs>`);
  parts.push(`<g clip-path="url(#ca-clip)">`);
  c.data.datasets.forEach((ds, di) => {
    const meta = c.getDatasetMeta(di);
    if (meta.hidden) return;
    const pts = meta.data;
    if (!pts || pts.length === 0) return;
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!isFinite(p.x) || !isFinite(p.y)) continue;
      if (d === '') {
        d += `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      } else {
        const prev = pts[i - 1];
        if (isFinite(prev.cp2x) && isFinite(p.cp1x)) {
          d += ` C ${prev.cp2x.toFixed(2)} ${prev.cp2y.toFixed(2)}, ${p.cp1x.toFixed(2)} ${p.cp1y.toFixed(2)}, ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
        } else {
          d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
        }
      }
    }
    const stroke = ds.borderColor || '#000';
    const sw = ds.borderWidth || 2;
    parts.push(`<path d="${d}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`);
    const pr = ds.pointRadius;
    if (pr && pr > 0 && pts.length <= 200) {
      const fill = ds.pointBackgroundColor || ds.borderColor;
      const border = ds.pointBorderColor || theme.bgChart;
      const bw = ds.pointBorderWidth != null ? ds.pointBorderWidth : 1.5;
      for (const p of pts) {
        if (!isFinite(p.x) || !isFinite(p.y)) continue;
        parts.push(`<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${pr}" fill="${escapeXml(fill)}" stroke="${escapeXml(border)}" stroke-width="${bw}"/>`);
      }
    }
  });
  parts.push(`</g>`);

  // ─── Tick label'ları: Chart.js'in iç _labelItems verisinden direkt ──
  // Bu array her label için final render bilgisini içerir (rotation, anchor,
  // baseline, font, translation). Ekrandaki yatış SVG'ye birebir geçer.
  const renderTickLabels = scale => {
    const items = scale._labelItems;
    if (!items || !Array.isArray(items) || items.length === 0) return null;
    const out = [];
    items.forEach(item => {
      if (!item) return;
      const opts = item.options || {};
      const trans = opts.translation || [0, 0];
      const tx = trans[0],
        ty = trans[1];
      const anchor = opts.textAlign === 'center' ? 'middle' : opts.textAlign === 'right' ? 'end' : 'start';
      const baseline = opts.textBaseline === 'middle' ? 'central' : opts.textBaseline === 'top' ? 'hanging' : opts.textBaseline === 'bottom' ? 'text-after-edge' : 'alphabetic';
      const rotDeg = (opts.rotation || 0) * 180 / Math.PI;
      const font = item.font || {};
      const fontFamily = font.family || FONT_MONO;
      const fontSize = font.size || 10;
      const fontStyle = font.style || '';
      const fontWeight = font.weight || '';
      const color = opts.color || theme.inkSoft;
      const textOffset = item.textOffset || 0;
      const lbl = item.label;
      const labels = Array.isArray(lbl) ? lbl : [lbl];
      labels.forEach((line, li) => {
        const lineH = fontSize * 1.2;
        const cx = tx + textOffset;
        const cy = ty + li * lineH;
        const transform = rotDeg !== 0 ? ` transform="rotate(${rotDeg.toFixed(3)} ${tx.toFixed(2)} ${ty.toFixed(2)})"` : '';
        const styleAttr = fontStyle === 'italic' ? ` font-style="italic"` : '';
        const weightAttr = fontWeight && fontWeight !== 'normal' ? ` font-weight="${fontWeight}"` : '';
        out.push(`<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" text-anchor="${anchor}" dominant-baseline="${baseline}" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}"${styleAttr}${weightAttr} fill="${escapeXml(color)}"${transform}>${escapeXml(line)}</text>`);
      });
    });
    return out.join('\n');
  };
  const xLabels = renderTickLabels(xs);
  if (xLabels) {
    parts.push(xLabels);
  } else {
    // Fallback: _labelItems yoksa düz yatay
    xs.ticks.forEach(tk => {
      const x = xs.getPixelForValue(tk.value);
      const lbl = tk.label != null ? tk.label : tk.value;
      const labels = Array.isArray(lbl) ? lbl : [lbl];
      labels.forEach((line, li) => {
        parts.push(`<text x="${x.toFixed(2)}" y="${(ca.bottom + 14 + li * 12).toFixed(2)}" text-anchor="middle" font-family="${escapeXml(FONT_MONO)}" font-size="10" fill="${theme.inkSoft}">${escapeXml(line)}</text>`);
      });
    });
  }
  const yLabels = renderTickLabels(ys);
  if (yLabels) {
    parts.push(yLabels);
  } else {
    ys.ticks.forEach(tk => {
      const y = ys.getPixelForValue(tk.value);
      const lbl = tk.label != null ? tk.label : tk.value;
      parts.push(`<text x="${(ca.left - 8).toFixed(2)}" y="${(y + 3.5).toFixed(2)}" text-anchor="end" font-family="${escapeXml(FONT_MONO)}" font-size="10" fill="${theme.inkSoft}">${escapeXml(lbl)}</text>`);
    });
  }
  // ─── Eksen başlıkları: scale geometrisinden hesapla ──────────
  // Chart.js: x bottom title cy = scale.bottom - padding.bottom - size/2 (canvas
  // textBaseline=middle). y left title cx = scale.left + padding.left + size/2.
  const readPad = (pad, key, fallback) => {
    if (pad && typeof pad === 'object') {
      if (pad[key] != null) return pad[key];
      const axisKey = key === 'left' || key === 'right' ? 'x' : 'y';
      if (pad[axisKey] != null) return pad[axisKey];
      return 0;
    }
    return typeof pad === 'number' ? pad : fallback;
  };
  const xTitleOpt = xs.options && xs.options.title;
  if (xTitleOpt && xTitleOpt.display && xTitleOpt.text) {
    const tf = xTitleOpt.font || {};
    const tSize = tf.size || 12;
    const tStyle = tf.style || '';
    const tColor = xTitleOpt.color || theme.inkSoft;
    const padBot = readPad(xTitleOpt.padding, 'bottom', 4);
    const cx = (ca.left + ca.right) / 2;
    const cy = xs.bottom - padBot - tSize / 2;
    const styleAttr = tStyle === 'italic' ? ' font-style="italic"' : '';
    parts.push(`<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-family="${escapeXml(FONT_SERIF)}"${styleAttr} font-size="${tSize}" fill="${escapeXml(tColor)}">${escapeXml(xTitleOpt.text)}</text>`);
  }
  const yTitleOpt = ys.options && ys.options.title;
  if (yTitleOpt && yTitleOpt.display && yTitleOpt.text) {
    const tf = yTitleOpt.font || {};
    const tSize = tf.size || 12;
    const tStyle = tf.style || '';
    const tColor = yTitleOpt.color || theme.inkSoft;
    const padLeft = readPad(yTitleOpt.padding, 'left', 4);
    const cx = ys.left + padLeft + tSize / 2;
    const cy = (ca.top + ca.bottom) / 2;
    const styleAttr = tStyle === 'italic' ? ' font-style="italic"' : '';
    parts.push(`<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-family="${escapeXml(FONT_SERIF)}"${styleAttr} font-size="${tSize}" fill="${escapeXml(tColor)}" transform="rotate(-90 ${cx.toFixed(2)} ${cy.toFixed(2)})">${escapeXml(yTitleOpt.text)}</text>`);
  }
  const lg = c.legend;
  if (lg && lg.legendItems && lg.legendHitBoxes) {
    const lblOpts = c.options.plugins && c.options.plugins.legend && c.options.plugins.legend.labels || {};
    const bw = lblOpts.boxWidth || 14;
    const bh = lblOpts.boxHeight || 14;
    const fSize = lblOpts.font && lblOpts.font.size || 11;
    const fFam = lblOpts.font && lblOpts.font.family || FONT_MONO;
    for (let i = 0; i < lg.legendItems.length; i++) {
      const it = lg.legendItems[i];
      const hb = lg.legendHitBoxes[i];
      if (!hb || it.hidden) continue;
      const swX = hb.left;
      const swY = hb.top + (hb.height - bh) / 2;
      const color = it.fillStyle || it.strokeStyle || '#000';
      parts.push(`<rect x="${swX.toFixed(2)}" y="${swY.toFixed(2)}" width="${bw}" height="${bh}" rx="3" ry="3" fill="${escapeXml(color)}"/>`);
      const txX = hb.left + bw + 4;
      const txY = hb.top + hb.height / 2;
      parts.push(`<text x="${txX.toFixed(2)}" y="${txY.toFixed(2)}" dominant-baseline="central" font-family="${escapeXml(fFam)}" font-size="${fSize}" fill="${theme.legendText}">${escapeXml(it.text)}</text>`);
    }
  }
  parts.push(`</svg>`);
  return parts.join('\n');
}

// ─── MiniChart: tekrar kullanılabilir line/scatter chart ─────
// ─── MiniChart: gelişmiş tekrar kullanılabilir chart ─────────
// IQ ve Waveform sayfalarının grafik blokları için. CSV ChartCard ile
// aynı seviye: editable title/eksen başlıkları, normalize, show-points,
// PNG/JPEG/SVG export, wheel/drag zoom, reset.
function MiniChart({
  initialTitle,
  datasets,
  initialXLabel,
  initialYLabel,
  theme,
  t,
  height = 280,
  yLog = false,
  isScatter = false,
  baseFileName // export filename için
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [title, setTitle] = useState(initialTitle || '');
  const [xLabel, setXLabel] = useState(initialXLabel || '');
  const [yLabel, setYLabel] = useState(initialYLabel || '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [normalize, setNormalize] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [showCfg, setShowCfg] = useState(false); // axis edit / settings dropdown

  // initial değişirse state'i de güncelle (örnek dosyalar yüklenince)
  useEffect(() => {
    if (initialTitle) setTitle(initialTitle);
  }, [initialTitle]);
  useEffect(() => {
    if (initialXLabel) setXLabel(initialXLabel);
  }, [initialXLabel]);
  useEffect(() => {
    if (initialYLabel) setYLabel(initialYLabel);
  }, [initialYLabel]);

  // Normalize uygulanmış datasets — global max abs ile bölünür
  const effDatasets = useMemo(() => {
    if (!normalize) return datasets.map(ds => ({
      ...ds,
      pointRadius: showPoints ? 1.5 : ds.pointRadius ?? 0
    }));
    let globalMax = 0;
    datasets.forEach(ds => {
      (ds.data || []).forEach(p => {
        const v = Math.abs(typeof p === 'number' ? p : p && p.y || 0);
        if (v > globalMax) globalMax = v;
      });
    });
    if (globalMax === 0) return datasets.map(ds => ({
      ...ds,
      pointRadius: showPoints ? 1.5 : ds.pointRadius ?? 0
    }));
    return datasets.map(ds => ({
      ...ds,
      data: (ds.data || []).map(p => {
        if (typeof p === 'number') return p / globalMax;
        return {
          ...p,
          y: p.y / globalMax
        };
      }),
      pointRadius: showPoints ? 1.5 : ds.pointRadius ?? 0
    }));
  }, [datasets, normalize, showPoints]);
  useEffect(() => {
    if (!canvasRef.current) return;
    const Chart = typeof window !== 'undefined' && window.Chart || null;
    if (!Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
      type: isScatter ? 'scatter' : 'line',
      data: {
        datasets: effDatasets
      },
      plugins: [makeBgPlugin(theme.bgChart)],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: false,
        plugins: {
          legend: {
            display: effDatasets.length > 1,
            position: 'top',
            labels: {
              font: {
                family: FONT_MONO,
                size: 10
              },
              color: theme.legendText,
              padding: 10,
              boxWidth: 14,
              boxHeight: 14,
              usePointStyle: true,
              pointStyle: 'rectRounded'
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleFont: {
              family: FONT_SERIF,
              size: 12,
              weight: '600'
            },
            bodyFont: {
              family: FONT_MONO,
              size: 10
            },
            padding: 8,
            cornerRadius: 3,
            titleColor: theme.tooltipText,
            bodyColor: theme.tooltipText,
            borderColor: theme.accent,
            borderWidth: 1,
            displayColors: true,
            boxPadding: 3,
            usePointStyle: true,
            callbacks: {
              title: items => `${xLabel || 'x'} = ${Number(items[0].parsed.x).toPrecision(6)}`,
              label: ctx => `  ${ctx.dataset.label || 'y'}  =  ${Number(ctx.parsed.y).toPrecision(5)}`
            }
          },
          zoom: {
            limits: {
              x: {
                minRange: 1e-12
              }
            },
            pan: {
              enabled: true,
              mode: 'xy',
              modifierKey: 'shift'
            },
            zoom: {
              wheel: {
                enabled: true
              },
              drag: {
                enabled: true,
                backgroundColor: theme.accent + '22',
                borderColor: theme.accent,
                borderWidth: 1
              },
              pinch: {
                enabled: false
              },
              mode: 'xy'
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            ticks: {
              font: {
                family: FONT_MONO,
                size: 10
              },
              color: theme.inkSoft
            },
            grid: {
              color: theme.grid,
              drawBorder: false
            },
            title: {
              display: !!xLabel,
              text: xLabel || '',
              font: {
                family: FONT_SERIF,
                size: 12,
                style: 'italic'
              },
              color: theme.inkSoft,
              padding: 6
            }
          },
          y: {
            type: yLog ? 'logarithmic' : 'linear',
            ticks: {
              font: {
                family: FONT_MONO,
                size: 10
              },
              color: theme.inkSoft
            },
            grid: {
              color: theme.grid,
              drawBorder: false
            },
            title: {
              display: !!yLabel,
              text: yLabel || '',
              font: {
                family: FONT_SERIF,
                size: 12,
                style: 'italic'
              },
              color: theme.inkSoft,
              padding: 6
            }
          }
        }
      }
    });
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [effDatasets, xLabel, yLabel, theme, yLog, isScatter]);
  function resetZoom() {
    if (chartRef.current) chartRef.current.resetZoom();
  }
  function safeName() {
    return (baseFileName || title || 'chart').replace(/[^\w\-\.]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  }
  function exportRaster(format) {
    if (!chartRef.current) return;
    const canvas = chartRef.current.canvas;
    // 3× scale for high-DPI
    const w = canvas.width,
      h = canvas.height;
    const scale = 3;
    const off = document.createElement('canvas');
    off.width = w * scale / window.devicePixelRatio;
    off.height = h * scale / window.devicePixelRatio;
    const ctx = off.getContext('2d');
    ctx.fillStyle = theme.bgChart;
    ctx.fillRect(0, 0, off.width, off.height);
    ctx.drawImage(canvas, 0, 0, off.width, off.height);
    off.toBlob(blob => downloadBlob(blob, `${safeName()}.${format === 'jpeg' ? 'jpg' : format}`), `image/${format}`, 0.95);
  }
  function exportSVG() {
    if (!chartRef.current) return;
    try {
      const svgString = buildChartSVG(chartRef.current, theme);
      const blob = new Blob([svgString], {
        type: 'image/svg+xml;charset=utf-8'
      });
      downloadBlob(blob, `${safeName()}.svg`);
    } catch (e) {
      console.error('SVG export error:', e);
      alert(t('svg_fail') + e.message);
    }
  }
  function saveTitle() {
    setTitle(tempTitle.trim() || initialTitle || t('default_chart_title'));
    setEditingTitle(false);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-[var(--bg-panel)] border border-[var(--border)] rounded-sm overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-soft)] gap-2"
  }, editingTitle ? /*#__PURE__*/React.createElement("input", {
    value: tempTitle,
    onChange: e => setTempTitle(e.target.value),
    onBlur: saveTitle,
    onKeyDown: e => {
      if (e.key === 'Enter') saveTitle();else if (e.key === 'Escape') {
        setTempTitle(title);
        setEditingTitle(false);
      }
    },
    autoFocus: true,
    className: "text-[11px] uppercase tracking-[0.2em] bg-[var(--bg-input)] border border-[var(--accent)] text-[var(--ink)] px-2 py-0.5 focus:outline-none flex-1 min-w-0",
    style: {
      fontFamily: FONT_MONO
    }
  }) : /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setTempTitle(title);
      setEditingTitle(true);
    },
    className: "text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)] hover:text-[var(--accent)] truncate min-w-0 flex-1 text-left transition-colors",
    style: {
      fontFamily: FONT_MONO
    },
    title: t('edit_title')
  }, title, " ", /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--ink-muted)] not-italic opacity-50"
  }, "\u270E")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 flex-shrink-0",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowCfg(v => !v),
    className: `text-[10px] uppercase tracking-wider px-1.5 py-0.5 transition-colors ${showCfg ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)] hover:text-[var(--accent)]'}`,
    title: t('chart_settings')
  }, "\u2699"), /*#__PURE__*/React.createElement("button", {
    onClick: resetZoom,
    className: "text-[10px] uppercase text-[var(--ink-muted)] hover:text-[var(--accent)] px-1 py-0.5 transition-colors",
    title: t('reset_zoom')
  }, "\u27F2"), /*#__PURE__*/React.createElement("button", {
    onClick: () => exportRaster('png'),
    className: "text-[9px] uppercase tracking-wider text-[var(--ink-muted)] hover:text-[var(--accent)] px-1 py-0.5 transition-colors"
  }, "png"), /*#__PURE__*/React.createElement("button", {
    onClick: () => exportRaster('jpeg'),
    className: "text-[9px] uppercase tracking-wider text-[var(--ink-muted)] hover:text-[var(--accent)] px-1 py-0.5 transition-colors"
  }, "jpg"), /*#__PURE__*/React.createElement("button", {
    onClick: exportSVG,
    className: "text-[9px] uppercase tracking-wider text-[var(--ink-muted)] hover:text-[var(--accent)] px-1 py-0.5 transition-colors"
  }, "svg"))), showCfg && /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 border-b border-[var(--border-soft)] bg-[var(--bg)] space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] uppercase tracking-wider text-[var(--ink-muted)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('chart_x_label')), /*#__PURE__*/React.createElement("input", {
    value: xLabel,
    onChange: e => setXLabel(e.target.value),
    className: "w-full text-xs bg-[var(--bg-input)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none px-2 py-1 rounded-sm text-[var(--ink)] mt-1",
    style: {
      fontFamily: FONT_MONO
    }
  })), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] uppercase tracking-wider text-[var(--ink-muted)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('chart_y_label')), /*#__PURE__*/React.createElement("input", {
    value: yLabel,
    onChange: e => setYLabel(e.target.value),
    className: "w-full text-xs bg-[var(--bg-input)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none px-2 py-1 rounded-sm text-[var(--ink)] mt-1",
    style: {
      fontFamily: FONT_MONO
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 text-[10px]",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-1.5 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: normalize,
    onChange: e => setNormalize(e.target.checked),
    className: "accent-[var(--accent)]"
  }), /*#__PURE__*/React.createElement("span", {
    className: "uppercase tracking-wider text-[var(--ink-soft)]"
  }, t('chart_normalize'))), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-1.5 cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: showPoints,
    onChange: e => setShowPoints(e.target.checked),
    className: "accent-[var(--accent)]"
  }), /*#__PURE__*/React.createElement("span", {
    className: "uppercase tracking-wider text-[var(--ink-soft)]"
  }, t('chart_show_points'))))), /*#__PURE__*/React.createElement("div", {
    style: {
      height,
      padding: 8
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef
  })));
}

// ─── Örnek dosya galerisi ──────────────────────────────────────
// Her sayfada gösterilen 2-3 örnek dosyalı panel.
// Her örnek için: indir (Blob), yükle (parser'a gönder, state'e ekle).
function SampleGallery({
  samples,
  t
}) {
  if (!samples || samples.length === 0) return null;
  function downloadOne(filename, content, mimeType) {
    const blob = new Blob([content], {
      type: mimeType || 'application/octet-stream'
    });
    downloadBlob(blob, filename);
  }
  function handleDownload(s) {
    // Ana dosya
    downloadOne(s.filename, s.generator(), s.mimeType);
    // Eşli dosyalar (SigMF: data + meta) — küçük gecikme ile sırayla
    if (s.paired) {
      s.paired.forEach((p, idx) => {
        setTimeout(() => downloadOne(p.filename, p.generator(), p.mimeType), 200 * (idx + 1));
      });
    }
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "border border-[var(--border-soft)] bg-[var(--bg)] p-4 rounded-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-between mb-3 pb-2 border-b border-[var(--border-soft)]"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-[10px] uppercase tracking-[0.3em] text-[var(--ink-soft)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('samples_title')), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] italic text-[var(--ink-muted)]",
    style: {
      fontFamily: FONT_SERIF
    }
  }, t('samples_hint'))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
  }, samples.map(s => {
    const isBinary = !!s.binary;
    const isPaired = !!s.paired;
    return /*#__PURE__*/React.createElement("div", {
      key: s.key,
      className: "border border-[var(--border)] bg-[var(--bg-panel)] p-3 flex flex-col gap-2 hover:border-[var(--accent)] transition-colors"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "min-w-0 flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-semibold text-[var(--ink)] truncate",
      style: {
        fontFamily: FONT_MONO
      }
    }, s.label, isBinary && /*#__PURE__*/React.createElement("span", {
      className: "ml-1.5 text-[8px] uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-soft)] px-1 py-0.5 rounded-sm"
    }, "BIN")), /*#__PURE__*/React.createElement("div", {
      className: "text-[9px] uppercase tracking-[0.18em] text-[var(--accent)] mt-0.5",
      style: {
        fontFamily: FONT_MONO
      }
    }, s.format))), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] italic leading-snug text-[var(--ink-soft)]",
      style: {
        fontFamily: FONT_SERIF
      }
    }, s.description), /*#__PURE__*/React.createElement("div", {
      className: "text-[9px] text-[var(--ink-muted)] truncate",
      style: {
        fontFamily: FONT_MONO
      },
      title: s.filename
    }, s.filename, isPaired && s.paired.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.filename,
      className: "truncate",
      title: p.filename
    }, "+ ", p.filename))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mt-auto pt-1"
    }, s.onLoad ? /*#__PURE__*/React.createElement("button", {
      onClick: s.onLoad,
      className: "flex-1 text-[10px] uppercase tracking-[0.15em] px-2 py-1.5 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-colors",
      style: {
        fontFamily: FONT_MONO
      },
      title: t('samples_load_title')
    }, t('samples_load')) : /*#__PURE__*/React.createElement("span", {
      className: "flex-1 text-[10px] uppercase tracking-[0.15em] px-2 py-1.5 border border-[var(--border-soft)] text-[var(--ink-muted)] text-center italic",
      style: {
        fontFamily: FONT_MONO
      },
      title: t('samples_binary_only')
    }, t('samples_inspect_only')), /*#__PURE__*/React.createElement("button", {
      onClick: () => handleDownload(s),
      className: "flex-1 text-[10px] uppercase tracking-[0.15em] px-2 py-1.5 border border-[var(--border-hard)] text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors",
      style: {
        fontFamily: FONT_MONO
      },
      title: t('samples_download_title')
    }, "\u2193 ", t('samples_download'), isPaired ? ` (${1 + s.paired.length})` : '')));
  })));
}

// ─── IQ Page ────────────────────────────────────────────────────
// Tek bir IQ dosyası seçili olarak: I&Q time, |I+jQ| zaman, Constellation,
// FFT spektrum. Pencereleme: rect/hann/hamming/blackman.
function IQPage({
  iqFiles,
  onIQFilesChange,
  theme,
  t
}) {
  const [activeId, setActiveId] = useState(null);
  const [windowType, setWindowType] = useState('hann');
  const [maxSamples, setMaxSamples] = useState(4096); // FFT için
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const active = iqFiles.find(f => f.id === activeId) || iqFiles[0];
  function handleFiles(fileList) {
    const arr = Array.from(fileList);
    // SigMF: .sigmf-meta + .sigmf-data çiftleri eşleştir
    const sigMetas = arr.filter(f => /\.sigmf-meta$/i.test(f.name));
    const sigData = arr.filter(f => /\.sigmf-data$/i.test(f.name));
    const sigMatched = new Set();
    const sigPairs = [];
    sigMetas.forEach(mFile => {
      const base = mFile.name.replace(/\.sigmf-meta$/i, '');
      const dFile = sigData.find(d => d.name.replace(/\.sigmf-data$/i, '') === base);
      if (dFile) {
        sigMatched.add(mFile);
        sigMatched.add(dFile);
        sigPairs.push({
          mFile,
          dFile,
          base
        });
      }
    });
    const tasks = [];
    // SigMF çiftleri
    sigPairs.forEach(({
      mFile,
      dFile,
      base
    }) => {
      tasks.push(Promise.all([mFile.text(), dFile.arrayBuffer()]).then(([metaText, dataBuf]) => {
        try {
          const meta = JSON.parse(metaText);
          const data = parseSigMFData(dataBuf, meta, base);
          return {
            ...data,
            id: Date.now() + Math.random()
          };
        } catch (err) {
          alert(`${base}: ${err.message}`);
          return null;
        }
      }));
    });
    // Eşleşmeyen diğer dosyalar
    arr.filter(f => !sigMatched.has(f)).forEach(f => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const isBinary = ['cfile', 'fc32', 'c32', 'raw32', 'iq', 'sc16', 'c16', 'ci16', 'raw16', 'sc8', 'cs8', 'c8', 'ci8', 'sigmf-data', 'bin'].includes(ext);
      if (isBinary) {
        tasks.push(f.arrayBuffer().then(buf => {
          try {
            const data = parseIQBinary(buf, f.name);
            return {
              ...data,
              id: Date.now() + Math.random()
            };
          } catch (err) {
            alert(`${f.name}: ${err.message}`);
            return null;
          }
        }));
      } else {
        tasks.push(f.text().then(text => {
          try {
            const data = parseIQData(text, f.name);
            return {
              ...data,
              id: Date.now() + Math.random()
            };
          } catch (err) {
            console.error('IQ parse error:', f.name, err);
            alert(`${f.name}: ${err.message}`);
            return null;
          }
        }));
      }
    });
    Promise.all(tasks).then(parsed => {
      const valid = parsed.filter(Boolean);
      onIQFilesChange([...iqFiles, ...valid]);
      if (valid.length && !activeId) setActiveId(valid[0].id);
    });
  }
  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }
  // Bir text içeriği uygulamaya yükle (parser yoluyla)
  function loadFromText(text, filename) {
    try {
      const data = parseIQData(text, filename);
      const item = {
        ...data,
        id: Date.now() + Math.random()
      };
      onIQFilesChange([...iqFiles, item]);
      setActiveId(item.id);
    } catch (err) {
      console.error('IQ load error:', filename, err);
      alert(`${filename}: ${err.message}`);
    }
  }
  // Binary üretici sonucundan (Uint8Array) doğrudan yükleme — sample
  // galerisinde .cfile/.sc16 vb. butonları için kullanılır.
  function loadFromBinary(uint8, filename) {
    try {
      const data = parseIQBinary(uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength), filename);
      const item = {
        ...data,
        id: Date.now() + Math.random()
      };
      onIQFilesChange([...iqFiles, item]);
      setActiveId(item.id);
    } catch (err) {
      console.error('IQ binary load error:', filename, err);
      alert(`${filename}: ${err.message}`);
    }
  }
  // SigMF: data (binary) + meta (JSON text) birlikte
  function loadFromSigMF(dataUint8, metaText, baseName) {
    try {
      const meta = JSON.parse(metaText);
      const buf = dataUint8.buffer.slice(dataUint8.byteOffset, dataUint8.byteOffset + dataUint8.byteLength);
      const data = parseSigMFData(buf, meta, baseName);
      const item = {
        ...data,
        id: Date.now() + Math.random()
      };
      onIQFilesChange([...iqFiles, item]);
      setActiveId(item.id);
    } catch (err) {
      console.error('SigMF load error:', baseName, err);
      alert(`${baseName}: ${err.message}`);
    }
  }
  function loadSample() {
    loadFromText(makeIQ_csv_16qam(), 'sample_16qam_8sps.csv');
  }
  // Örnek galerisi
  const samples = [{
    key: 'iq_16qam_csv',
    label: '16-QAM baseband',
    format: '.csv · I,Q kolonları',
    description: '1024 örnek, 8 sps pulse-shaped 16-QAM modülasyon, fs=1 MHz. Konstelasyon diyagramında 16 nokta görülür.',
    filename: 'iq_16qam_baseband.csv',
    mimeType: 'text/csv;charset=utf-8',
    generator: makeIQ_csv_16qam,
    onLoad: () => loadFromText(makeIQ_csv_16qam(), 'iq_16qam_baseband.csv')
  }, {
    key: 'iq_bpsk_txt',
    label: 'BPSK signal',
    format: '.txt · whitespace',
    description: '2048 örnek BPSK, 8 sps, raised-cosine darbe. Konstelasyon I-eksenine paralel iki kümeden oluşur.',
    filename: 'iq_bpsk_8sps.txt',
    mimeType: 'text/plain;charset=utf-8',
    generator: makeIQ_txt_bpsk,
    onLoad: () => loadFromText(makeIQ_txt_bpsk(), 'iq_bpsk_8sps.txt')
  }, {
    key: 'iq_chirp_complex',
    label: 'Linear chirp (complex)',
    format: '.txt · "a+bj" literal',
    description: '2000 örnek doğrusal chirp, 10→100 kHz, fs=500 kS/s. NumPy savetxt complex formatı. Spektrum genişlemiş tepe görünür.',
    filename: 'iq_chirp_complex.txt',
    mimeType: 'text/plain;charset=utf-8',
    generator: makeIQ_txt_complex_literal,
    onLoad: () => loadFromText(makeIQ_txt_complex_literal(), 'iq_chirp_complex.txt')
  }, {
    key: 'iq_cfile_qpsk',
    label: 'QPSK · GNU Radio',
    format: '.cfile · cf32 LE binary',
    description: 'QPSK 8 sps, 2048 örnek. GNU Radio File Source/Sink yaygın formatı: interleaved float32 little-endian. Wireshark/GNU Radio Companion ile incelenebilir.',
    filename: 'iq_qpsk_2048.cfile',
    mimeType: 'application/octet-stream',
    binary: true,
    generator: makeCfile_QPSK,
    onLoad: () => loadFromBinary(makeCfile_QPSK(), 'iq_qpsk_2048.cfile')
  }, {
    key: 'iq_sc16_fm',
    label: 'FM ton · USRP',
    format: '.sc16 · ci16 LE binary',
    description: 'FM modülasyonu, 5 kHz mod tonu, ±50 kHz deviasyon, fs=2 MS/s, 4096 örnek. USRP/Ettus ci16 over-the-wire formatı: interleaved int16 LE.',
    filename: 'iq_fm_tone_4096.sc16',
    mimeType: 'application/octet-stream',
    binary: true,
    generator: makeSC16_FM_tone,
    onLoad: () => loadFromBinary(makeSC16_FM_tone(), 'iq_fm_tone_4096.sc16')
  }, {
    key: 'iq_sigmf_qpsk',
    label: 'QPSK · SigMF',
    format: 'SigMF v1.0.0 · data + meta',
    description: '433.92 MHz ISM bandında QPSK, fs=2 MHz, 4096 örnek. SigMF v1.0.0: binary .sigmf-data (cf32_le) + JSON .sigmf-meta. İki dosya birlikte indirilir.',
    filename: 'iq_qpsk_433MHz.sigmf-data',
    mimeType: 'application/octet-stream',
    binary: true,
    generator: makeSigMF_data_QPSK,
    paired: [{
      filename: 'iq_qpsk_433MHz.sigmf-meta',
      mimeType: 'application/json',
      generator: makeSigMF_meta_QPSK
    }],
    onLoad: () => loadFromSigMF(makeSigMF_data_QPSK(), makeSigMF_meta_QPSK(), 'iq_qpsk_433MHz')
  }];
  function removeFile(id) {
    onIQFilesChange(iqFiles.filter(f => f.id !== id));
    if (activeId === id) setActiveId(null);
  }
  function updateFile(id, partial) {
    onIQFilesChange(iqFiles.map(f => f.id === id ? {
      ...f,
      ...partial
    } : f));
  }
  // Hesaplamalar
  const charts = useMemo(() => {
    if (!active) return null;
    const N = active.samples.length;
    const fs = active.sampleRate || 1;
    const fc = active.centerFreq || 0;
    // Zaman ekseni
    const iData = active.samples.map((s, n) => ({
      x: n / fs,
      y: s.i
    }));
    const qData = active.samples.map((s, n) => ({
      x: n / fs,
      y: s.q
    }));
    const magData = active.samples.map((s, n) => ({
      x: n / fs,
      y: Math.sqrt(s.i * s.i + s.q * s.q)
    }));
    const phaseData = active.samples.map((s, n) => ({
      x: n / fs,
      y: Math.atan2(s.q, s.i) * 180 / Math.PI
    }));
    // Constellation (decimate for perf)
    const cstride = Math.max(1, Math.floor(N / 4000));
    const constData = [];
    for (let n = 0; n < N; n += cstride) constData.push({
      x: active.samples[n].i,
      y: active.samples[n].q
    });
    // FFT: kullanıcı seçimi NFFT (zero-pad gerekirse). Daha büyük NFFT →
    // daha ince frekans çözünürlüğü, daha küçük → daha az hesap.
    const NFFT = maxSamples;
    const usableLen = Math.min(N, NFFT);
    const slice = active.samples.slice(0, usableLen);
    const windowed = applyWindowComplex(slice, windowType);
    // Zero-pad to NFFT (fft otomatik 2^k'ya yuvarlar ama biz NFFT'i kesin tutalım)
    while (windowed.length < NFFT) windowed.push({
      re: 0,
      im: 0
    });
    const X = fftshift(fft(windowed));
    const N2 = X.length;
    const fftData = X.map((c, k) => {
      const freq = (k - N2 / 2) * fs / N2 + fc;
      const mag = Math.sqrt(c.re * c.re + c.im * c.im) / Math.max(usableLen, 1);
      return {
        x: freq,
        y: 20 * Math.log10(mag + 1e-30)
      };
    });
    return {
      iData,
      qData,
      magData,
      phaseData,
      constData,
      fftData,
      fs,
      fc,
      N
    };
  }, [active, windowType, maxSamples]);
  const accent = theme.accent;

  // Time unit display
  function fmtTime(s) {
    if (s < 1e-6) return `${(s * 1e9).toFixed(2)} ns`;
    if (s < 1e-3) return `${(s * 1e6).toFixed(2)} μs`;
    if (s < 1) return `${(s * 1e3).toFixed(2)} ms`;
    return `${s.toFixed(3)} s`;
  }
  function fmtFreq(f) {
    if (f === 0) return '0';
    const a = Math.abs(f);
    if (a < 1e3) return `${f.toFixed(2)} Hz`;
    if (a < 1e6) return `${(f / 1e3).toFixed(3)} kHz`;
    if (a < 1e9) return `${(f / 1e6).toFixed(3)} MHz`;
    return `${(f / 1e9).toFixed(4)} GHz`;
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    onDragOver: onDragOver,
    onDragLeave: onDragLeave,
    onDrop: onDrop,
    className: `border-2 border-dashed transition-all ${dragging ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-hard)] bg-[var(--bg-panel)]'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-8 py-12 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.3em] text-[var(--ink-muted)] mb-4",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('iq_upload')), /*#__PURE__*/React.createElement("p", {
    className: "mb-7 italic leading-tight text-[var(--ink)]",
    style: {
      fontFamily: FONT_SERIF,
      fontSize: 'clamp(1.5rem, 3.5vw, 2rem)'
    }
  }, t('iq_drop_text')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => fileInputRef.current?.click(),
    className: "px-6 py-3 bg-[var(--ink)] text-[var(--bg)] uppercase tracking-[0.2em] text-xs hover:bg-[var(--accent)] transition-colors",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('pick_file')), /*#__PURE__*/React.createElement("input", {
    ref: fileInputRef,
    type: "file",
    multiple: true,
    accept: ".csv,.txt,.iq,.dat,.cfile,.fc32,.c32,.raw32,.sc16,.c16,.ci16,.raw16,.sc8,.cs8,.c8,.ci8,.bin,.sigmf-meta,.sigmf-data",
    className: "hidden",
    onChange: e => {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] mt-6",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('iq_formats_full')))), /*#__PURE__*/React.createElement(SampleGallery, {
    samples: samples,
    t: t
  }), iqFiles.length > 0 && /*#__PURE__*/React.createElement("section", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('iq_files'), " (", iqFiles.length, ")"), iqFiles.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    className: `bg-[var(--bg-panel)] border p-3 transition-colors ${active && active.id === f.id ? 'border-[var(--accent)]' : 'border-[var(--border)] hover:border-[var(--ink-muted)]'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveId(f.id),
    className: "flex-1 text-left min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm truncate text-[var(--ink)]",
    style: {
      fontFamily: FONT_MONO
    },
    title: f.name
  }, f.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-[var(--ink-muted)] mt-1",
    style: {
      fontFamily: FONT_MONO
    }
  }, f.samples.length, " ", t('iq_samples'), " \xB7 fs = ", fmtFreq(f.sampleRate), " \xB7 fc = ", fmtFreq(f.centerFreq))), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeFile(f.id),
    className: "text-[10px] uppercase tracking-widest text-[var(--ink-muted)] hover:text-[var(--danger)] transition-colors",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('remove'))), active && active.id === f.id && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[var(--border-soft)]"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] uppercase tracking-wider text-[var(--ink-muted)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('iq_sample_rate')), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: f.sampleRate,
    onChange: e => updateFile(f.id, {
      sampleRate: parseFloat(e.target.value) || 1
    }),
    className: "w-full text-xs bg-[var(--bg-input)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none px-2 py-1 rounded-sm text-[var(--ink)] mt-1",
    style: {
      fontFamily: FONT_MONO
    }
  })), /*#__PURE__*/React.createElement("label", {
    className: "block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] uppercase tracking-wider text-[var(--ink-muted)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('iq_center_freq')), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: f.centerFreq,
    onChange: e => updateFile(f.id, {
      centerFreq: parseFloat(e.target.value) || 0
    }),
    className: "w-full text-xs bg-[var(--bg-input)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none px-2 py-1 rounded-sm text-[var(--ink)] mt-1",
    style: {
      fontFamily: FONT_MONO
    }
  })))))), active && charts && /*#__PURE__*/React.createElement("section", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border-soft)] pb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('iq_views'), " \xB7 ", active.name), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-[10px]",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--ink-muted)] uppercase tracking-wider"
  }, t('iq_window')), /*#__PURE__*/React.createElement("select", {
    value: windowType,
    onChange: e => setWindowType(e.target.value),
    className: "bg-[var(--bg-input)] border border-[var(--border)] text-[var(--ink)] px-1.5 py-0.5 focus:outline-none focus:border-[var(--accent)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "rect"
  }, "rect"), /*#__PURE__*/React.createElement("option", {
    value: "hann"
  }, "hann"), /*#__PURE__*/React.createElement("option", {
    value: "hamming"
  }, "hamming"), /*#__PURE__*/React.createElement("option", {
    value: "blackman"
  }, "blackman"))), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--ink-muted)] uppercase tracking-wider"
  }, t('iq_fft_size')), /*#__PURE__*/React.createElement("select", {
    value: maxSamples,
    onChange: e => setMaxSamples(parseInt(e.target.value)),
    className: "bg-[var(--bg-input)] border border-[var(--border)] text-[var(--ink)] px-1.5 py-0.5 focus:outline-none focus:border-[var(--accent)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "1024"
  }, "1024"), /*#__PURE__*/React.createElement("option", {
    value: "2048"
  }, "2048"), /*#__PURE__*/React.createElement("option", {
    value: "4096"
  }, "4096"), /*#__PURE__*/React.createElement("option", {
    value: "8192"
  }, "8192"), /*#__PURE__*/React.createElement("option", {
    value: "16384"
  }, "16384"))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(MiniChart, {
    initialTitle: t('iq_view_iq_time'),
    datasets: [{
      label: 'I',
      data: charts.iData,
      borderColor: accent,
      backgroundColor: accent + '22',
      borderWidth: 1.4,
      pointRadius: 0,
      tension: 0
    }, {
      label: 'Q',
      data: charts.qData,
      borderColor: theme.danger || '#c14953',
      backgroundColor: '#c1495322',
      borderWidth: 1.4,
      pointRadius: 0,
      tension: 0
    }],
    initialXLabel: `${t('iq_axis_time')} (s)`,
    initialYLabel: t('iq_axis_amp'),
    theme: theme,
    t: t,
    height: 240,
    baseFileName: `${active.name.replace(/\.\w+$/, '')}_iq_time`
  }), /*#__PURE__*/React.createElement(MiniChart, {
    initialTitle: t('iq_view_magnitude'),
    datasets: [{
      label: '|I+jQ|',
      data: charts.magData,
      borderColor: accent,
      backgroundColor: accent + '33',
      borderWidth: 1.4,
      pointRadius: 0,
      tension: 0
    }],
    initialXLabel: `${t('iq_axis_time')} (s)`,
    initialYLabel: t('iq_axis_amp'),
    theme: theme,
    t: t,
    height: 240,
    baseFileName: `${active.name.replace(/\.\w+$/, '')}_envelope`
  }), /*#__PURE__*/React.createElement(MiniChart, {
    initialTitle: t('iq_view_constellation'),
    datasets: [{
      label: 'I-Q',
      data: charts.constData,
      borderColor: 'transparent',
      backgroundColor: accent,
      pointRadius: 1.5,
      pointHoverRadius: 4,
      showLine: false
    }],
    initialXLabel: "I",
    initialYLabel: "Q",
    theme: theme,
    t: t,
    height: 240,
    isScatter: true,
    baseFileName: `${active.name.replace(/\.\w+$/, '')}_constellation`
  }), /*#__PURE__*/React.createElement(MiniChart, {
    initialTitle: t('iq_view_spectrum'),
    datasets: [{
      label: '|FFT| (dB)',
      data: charts.fftData,
      borderColor: accent,
      backgroundColor: accent + '22',
      borderWidth: 1.2,
      pointRadius: 0,
      tension: 0
    }],
    initialXLabel: `${t('iq_axis_freq')} (Hz)`,
    initialYLabel: t('iq_axis_psd'),
    theme: theme,
    t: t,
    height: 240,
    baseFileName: `${active.name.replace(/\.\w+$/, '')}_spectrum`
  }))));
}

// ─── Waveform Page ─────────────────────────────────────────────
// Multi-channel zaman alanı + FFT spektrum.
function WaveformPage({
  wfFiles,
  onWfFilesChange,
  theme,
  t
}) {
  const [activeId, setActiveId] = useState(null);
  const [windowType, setWindowType] = useState('hann');
  const [activeChannel, setActiveChannel] = useState(0); // FFT için
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const active = wfFiles.find(f => f.id === activeId) || wfFiles[0];
  function handleFiles(fileList) {
    const arr = Array.from(fileList);
    const tasks = arr.map(f => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (ext === 'wav' || ext === 'wave') {
        return f.arrayBuffer().then(buf => {
          try {
            const data = parseWAV(buf, f.name);
            return {
              ...data,
              id: Date.now() + Math.random()
            };
          } catch (err) {
            alert(`${f.name}: ${err.message}`);
            return null;
          }
        });
      }
      return f.text().then(text => {
        try {
          const data = parseWaveformData(text, f.name);
          return {
            ...data,
            id: Date.now() + Math.random()
          };
        } catch (err) {
          console.error('Waveform parse error:', f.name, err);
          alert(`${f.name}: ${err.message}`);
          return null;
        }
      });
    });
    Promise.all(tasks).then(parsed => {
      const valid = parsed.filter(Boolean);
      onWfFilesChange([...wfFiles, ...valid]);
      if (valid.length && !activeId) setActiveId(valid[0].id);
    });
  }
  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }
  function loadFromText(text, filename) {
    try {
      const data = parseWaveformData(text, filename);
      const item = {
        ...data,
        id: Date.now() + Math.random()
      };
      onWfFilesChange([...wfFiles, item]);
      setActiveId(item.id);
    } catch (err) {
      console.error('Waveform load error:', filename, err);
      alert(`${filename}: ${err.message}`);
    }
  }
  // Binary üretici çıktısından (Uint8Array) WAV yükleme — sample galerisinde
  // .wav butonlarında kullanılır.
  function loadFromBinary(uint8, filename) {
    try {
      const buf = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
      const data = parseWAV(buf, filename);
      const item = {
        ...data,
        id: Date.now() + Math.random()
      };
      onWfFilesChange([...wfFiles, item]);
      setActiveId(item.id);
    } catch (err) {
      console.error('WF WAV load error:', filename, err);
      alert(`${filename}: ${err.message}`);
    }
  }
  function loadSample() {
    loadFromText(makeWF_csv_2tone(), 'wf_2tone_AM.csv');
  }
  const samples = [{
    key: 'wf_2tone_csv',
    label: '2-tone + AM',
    format: '.csv · 2 kolon, başlıklı',
    description: '2 kanal: (250+800 Hz harmonikler) ve 1.5 kHz taşıyıcının 5 Hz AM modülasyonu. fs=10 kHz, 2000 örnek.',
    filename: 'wf_2tone_AM.csv',
    mimeType: 'text/csv;charset=utf-8',
    generator: makeWF_csv_2tone,
    onLoad: () => loadFromText(makeWF_csv_2tone(), 'wf_2tone_AM.csv')
  }, {
    key: 'wf_scope_csv',
    label: 'Osiloskop yakalama',
    format: '.csv · zaman ekseni dahil',
    description: 'İlk kolon zaman (otomatik algılanır), 2 kanal: kare dalga (1 kHz, taşma+ringing) ve referans sinüs (500 Hz). fs=100 kHz.',
    filename: 'wf_scope_squarewave.csv',
    mimeType: 'text/csv;charset=utf-8',
    generator: makeWF_csv_scope,
    onLoad: () => loadFromText(makeWF_csv_scope(), 'wf_scope_squarewave.csv')
  }, {
    key: 'wf_audio_txt',
    label: 'Mono ses (PCM-tarz)',
    format: '.txt · tek kolon',
    description: '440 Hz tek ton + 880 Hz harmonik, vibrato modülasyonlu. fs=44100 Hz, 4410 örnek (0.1 s). Spektrumda iki harmonik tepe.',
    filename: 'wf_mono_audio.txt',
    mimeType: 'text/plain;charset=utf-8',
    generator: makeWF_txt_audio_mono,
    onLoad: () => loadFromText(makeWF_txt_audio_mono(), 'wf_mono_audio.txt')
  }, {
    key: 'wf_wav_mono',
    label: 'Mono ton · WAV PCM16',
    format: '.wav · RIFF/WAVE 22050 Hz',
    description: '1 saniye, 440 Hz fundamental + 880 Hz harmonik, üstel sönüm. WAV PCM 16-bit mono. Audacity, ffmpeg, MATLAB ile incelenebilir.',
    filename: 'wf_tone_440Hz_22050.wav',
    mimeType: 'audio/wav',
    binary: true,
    generator: makeWAV_mono_440Hz,
    onLoad: () => loadFromBinary(makeWAV_mono_440Hz(), 'wf_tone_440Hz_22050.wav')
  }, {
    key: 'wf_wav_stereo',
    label: 'Stereo chirp · WAV PCM16',
    format: '.wav · RIFF/WAVE 44.1 kHz',
    description: '2 saniye stereo. Sol kanal: 200→3000 Hz lineer chirp. Sağ kanal: 1 kHz referans tonu. PCM 16-bit, 44100 Hz.',
    filename: 'wf_chirp_stereo_44100.wav',
    mimeType: 'audio/wav',
    binary: true,
    generator: makeWAV_stereo_chirp,
    onLoad: () => loadFromBinary(makeWAV_stereo_chirp(), 'wf_chirp_stereo_44100.wav')
  }];
  function removeFile(id) {
    onWfFilesChange(wfFiles.filter(f => f.id !== id));
    if (activeId === id) setActiveId(null);
  }
  function updateFile(id, partial) {
    onWfFilesChange(wfFiles.map(f => f.id === id ? {
      ...f,
      ...partial
    } : f));
  }

  // Palette her kanal için
  const palette = ['#3a8c8a', '#c14953', '#e3a14b', '#7b6cd9', '#5b8b3e', '#c25fa6'];
  const charts = useMemo(() => {
    if (!active) return null;
    const fs = active.sampleRate || 1;
    const channelDatasets = active.channels.map((ch, ci) => {
      const data = ch.samples.map((v, n) => ({
        x: n / fs,
        y: v
      }));
      return {
        label: ch.name,
        data,
        borderColor: palette[ci % palette.length],
        backgroundColor: palette[ci % palette.length] + '22',
        borderWidth: 1.2,
        pointRadius: 0,
        tension: 0
      };
    });
    // FFT: aktif kanal
    const ch = active.channels[activeChannel] || active.channels[0];
    let fftData = [];
    if (ch && ch.samples.length > 1) {
      const N = ch.samples.length;
      const windowed = applyWindow(ch.samples, windowType);
      const X = fft(windowed);
      // Real input → tek-taraflı spektrum
      const N2 = X.length;
      const half = Math.floor(N2 / 2);
      fftData = new Array(half + 1);
      for (let k = 0; k <= half; k++) {
        const c = X[k];
        const mag = Math.sqrt(c.re * c.re + c.im * c.im);
        const norm = k === 0 || k === half ? mag / N : 2 * mag / N;
        fftData[k] = {
          x: k * fs / N2,
          y: 20 * Math.log10(norm + 1e-30)
        };
      }
    }
    return {
      channelDatasets,
      fftData,
      fs
    };
  }, [active, windowType, activeChannel]);
  function fmtFreq(f) {
    if (f === 0) return '0';
    const a = Math.abs(f);
    if (a < 1e3) return `${f.toFixed(2)} Hz`;
    if (a < 1e6) return `${(f / 1e3).toFixed(3)} kHz`;
    if (a < 1e9) return `${(f / 1e6).toFixed(3)} MHz`;
    return `${(f / 1e9).toFixed(4)} GHz`;
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    onDragOver: onDragOver,
    onDragLeave: onDragLeave,
    onDrop: onDrop,
    className: `border-2 border-dashed transition-all ${dragging ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-hard)] bg-[var(--bg-panel)]'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-8 py-12 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.3em] text-[var(--ink-muted)] mb-4",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('wf_upload')), /*#__PURE__*/React.createElement("p", {
    className: "mb-7 italic leading-tight text-[var(--ink)]",
    style: {
      fontFamily: FONT_SERIF,
      fontSize: 'clamp(1.5rem, 3.5vw, 2rem)'
    }
  }, t('wf_drop_text')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => fileInputRef.current?.click(),
    className: "px-6 py-3 bg-[var(--ink)] text-[var(--bg)] uppercase tracking-[0.2em] text-xs hover:bg-[var(--accent)] transition-colors",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('pick_file')), /*#__PURE__*/React.createElement("input", {
    ref: fileInputRef,
    type: "file",
    multiple: true,
    accept: ".csv,.txt,.dat,.tsv,.wav,.wave",
    className: "hidden",
    onChange: e => {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] mt-6",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('wf_formats_full')))), /*#__PURE__*/React.createElement(SampleGallery, {
    samples: samples,
    t: t
  }), wfFiles.length > 0 && /*#__PURE__*/React.createElement("section", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('wf_files'), " (", wfFiles.length, ")"), wfFiles.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.id,
    className: `bg-[var(--bg-panel)] border p-3 transition-colors ${active && active.id === f.id ? 'border-[var(--accent)]' : 'border-[var(--border)] hover:border-[var(--ink-muted)]'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveId(f.id),
    className: "flex-1 text-left min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm truncate text-[var(--ink)]",
    style: {
      fontFamily: FONT_MONO
    },
    title: f.name
  }, f.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-[var(--ink-muted)] mt-1",
    style: {
      fontFamily: FONT_MONO
    }
  }, f.channels.length, " ", t('wf_channels'), " \xB7 ", f.channels[0]?.samples.length || 0, " ", t('wf_samples'), " \xB7 fs = ", fmtFreq(f.sampleRate), f.timeAxisProvided && /*#__PURE__*/React.createElement("span", {
    className: "ml-1 italic text-[var(--accent)]"
  }, "(", t('wf_time_detected'), ")"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeFile(f.id),
    className: "text-[10px] uppercase tracking-widest text-[var(--ink-muted)] hover:text-[var(--danger)] transition-colors",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('remove'))), active && active.id === f.id && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-[var(--border-soft)]"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block max-w-xs"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] uppercase tracking-wider text-[var(--ink-muted)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('wf_sample_rate')), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: f.sampleRate,
    onChange: e => updateFile(f.id, {
      sampleRate: parseFloat(e.target.value) || 1
    }),
    className: "w-full text-xs bg-[var(--bg-input)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none px-2 py-1 rounded-sm text-[var(--ink)] mt-1",
    style: {
      fontFamily: FONT_MONO
    }
  })))))), active && charts && /*#__PURE__*/React.createElement("section", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border-soft)] pb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('wf_views'), " \xB7 ", active.name), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-[10px]",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--ink-muted)] uppercase tracking-wider"
  }, t('wf_window')), /*#__PURE__*/React.createElement("select", {
    value: windowType,
    onChange: e => setWindowType(e.target.value),
    className: "bg-[var(--bg-input)] border border-[var(--border)] text-[var(--ink)] px-1.5 py-0.5 focus:outline-none focus:border-[var(--accent)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "rect"
  }, "rect"), /*#__PURE__*/React.createElement("option", {
    value: "hann"
  }, "hann"), /*#__PURE__*/React.createElement("option", {
    value: "hamming"
  }, "hamming"), /*#__PURE__*/React.createElement("option", {
    value: "blackman"
  }, "blackman"))), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--ink-muted)] uppercase tracking-wider"
  }, t('wf_fft_channel')), /*#__PURE__*/React.createElement("select", {
    value: activeChannel,
    onChange: e => setActiveChannel(parseInt(e.target.value)),
    className: "bg-[var(--bg-input)] border border-[var(--border)] text-[var(--ink)] px-1.5 py-0.5 focus:outline-none focus:border-[var(--accent)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, active.channels.map((ch, ci) => /*#__PURE__*/React.createElement("option", {
    key: ci,
    value: ci
  }, ch.name)))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-3"
  }, /*#__PURE__*/React.createElement(MiniChart, {
    initialTitle: t('wf_view_time'),
    datasets: charts.channelDatasets,
    initialXLabel: `${t('wf_axis_time')} (s)`,
    initialYLabel: t('wf_axis_amp'),
    theme: theme,
    t: t,
    height: 280,
    baseFileName: `${active.name.replace(/\.\w+$/, '')}_time`
  }), /*#__PURE__*/React.createElement(MiniChart, {
    initialTitle: t('wf_view_spectrum'),
    datasets: [{
      label: `|FFT(${active.channels[activeChannel]?.name || 'ch1'})|`,
      data: charts.fftData,
      borderColor: theme.accent,
      backgroundColor: theme.accent + '22',
      borderWidth: 1.2,
      pointRadius: 0,
      tension: 0
    }],
    initialXLabel: `${t('wf_axis_freq')} (Hz)`,
    initialYLabel: t('wf_axis_psd'),
    theme: theme,
    t: t,
    height: 260,
    baseFileName: `${active.name.replace(/\.\w+$/, '')}_spectrum`
  }))));
}

// ─── SampleGallery: indir + tek tıkla yükle ────────────────────
// ─── BilgiPage — terim sözlüğü, açıklayıcı şekiller ───────────
function BilgiPage({
  t,
  lang
}) {
  // Yardımcı bileşenler
  const Section = ({
    id,
    title,
    children
  }) => /*#__PURE__*/React.createElement("section", {
    id: id,
    className: "border border-[var(--border)] bg-[var(--bg-panel)] p-6 md:p-8"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-[var(--ink)] mb-5 pb-3 border-b border-[var(--border)]",
    style: {
      fontFamily: FONT_SERIF,
      fontSize: 'clamp(1.5rem, 3vw, 1.875rem)',
      fontWeight: 500
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "space-y-5 text-[var(--ink-soft)] leading-relaxed",
    style: {
      fontFamily: FONT_SERIF,
      fontSize: '15px'
    }
  }, children));
  const Term = ({
    name,
    formula,
    children
  }) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-3 flex-wrap mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--ink)]",
    style: {
      fontFamily: FONT_MONO,
      fontSize: '14px',
      fontWeight: 600,
      letterSpacing: '0.02em'
    }
  }, name), formula && /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--accent)]",
    style: {
      fontFamily: FONT_MONO,
      fontSize: '13px'
    }
  }, formula)), /*#__PURE__*/React.createElement("div", {
    className: "text-[var(--ink-soft)]",
    style: {
      fontSize: '14.5px'
    }
  }, children));

  // SVG: 2-port S-parameter blok diyagramı
  const SParamDiagram = () => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 480 200",
    style: {
      width: '100%',
      maxWidth: 480,
      height: 'auto'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("marker", {
    id: "arrowAcc",
    viewBox: "0 0 10 10",
    refX: "9",
    refY: "5",
    markerWidth: "6",
    markerHeight: "6",
    orient: "auto"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0,0 L10,5 L0,10 Z",
    fill: "var(--accent)"
  })), /*#__PURE__*/React.createElement("marker", {
    id: "arrowInk",
    viewBox: "0 0 10 10",
    refX: "9",
    refY: "5",
    markerWidth: "6",
    markerHeight: "6",
    orient: "auto"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0,0 L10,5 L0,10 Z",
    fill: "var(--ink-soft)"
  }))), /*#__PURE__*/React.createElement("rect", {
    x: "180",
    y: "60",
    width: "120",
    height: "80",
    fill: "none",
    stroke: "var(--ink)",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("text", {
    x: "240",
    y: "105",
    textAnchor: "middle",
    fill: "var(--ink)",
    fontSize: "13",
    fontFamily: "serif",
    fontStyle: "italic"
  }, "DUT"), /*#__PURE__*/React.createElement("line", {
    x1: "80",
    y1: "100",
    x2: "180",
    y2: "100",
    stroke: "var(--ink-soft)",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("text", {
    x: "100",
    y: "90",
    fill: "var(--ink)",
    fontSize: "12",
    fontFamily: "monospace"
  }, "Port 1"), /*#__PURE__*/React.createElement("line", {
    x1: "300",
    y1: "100",
    x2: "400",
    y2: "100",
    stroke: "var(--ink-soft)",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("text", {
    x: "365",
    y: "90",
    fill: "var(--ink)",
    fontSize: "12",
    fontFamily: "monospace"
  }, "Port 2"), /*#__PURE__*/React.createElement("line", {
    x1: "90",
    y1: "85",
    x2: "175",
    y2: "85",
    stroke: "var(--accent)",
    strokeWidth: "1.4",
    markerEnd: "url(#arrowAcc)"
  }), /*#__PURE__*/React.createElement("text", {
    x: "130",
    y: "78",
    fill: "var(--accent)",
    fontSize: "12",
    fontFamily: "monospace"
  }, "a\u2081"), /*#__PURE__*/React.createElement("line", {
    x1: "175",
    y1: "115",
    x2: "90",
    y2: "115",
    stroke: "var(--ink-soft)",
    strokeWidth: "1.4",
    markerEnd: "url(#arrowInk)"
  }), /*#__PURE__*/React.createElement("text", {
    x: "130",
    y: "130",
    fill: "var(--ink-soft)",
    fontSize: "12",
    fontFamily: "monospace"
  }, "b\u2081"), /*#__PURE__*/React.createElement("line", {
    x1: "395",
    y1: "115",
    x2: "305",
    y2: "115",
    stroke: "var(--accent)",
    strokeWidth: "1.4",
    markerEnd: "url(#arrowAcc)"
  }), /*#__PURE__*/React.createElement("text", {
    x: "345",
    y: "130",
    fill: "var(--accent)",
    fontSize: "12",
    fontFamily: "monospace"
  }, "a\u2082"), /*#__PURE__*/React.createElement("line", {
    x1: "305",
    y1: "85",
    x2: "395",
    y2: "85",
    stroke: "var(--ink-soft)",
    strokeWidth: "1.4",
    markerEnd: "url(#arrowInk)"
  }), /*#__PURE__*/React.createElement("text", {
    x: "345",
    y: "78",
    fill: "var(--ink-soft)",
    fontSize: "12",
    fontFamily: "monospace"
  }, "b\u2082"), /*#__PURE__*/React.createElement("text", {
    x: "240",
    y: "175",
    textAnchor: "middle",
    fill: "var(--ink-muted)",
    fontSize: "11",
    fontFamily: "monospace"
  }, "b = S\xB7a \xB7 b\u2081 = S\u2081\u2081a\u2081 + S\u2081\u2082a\u2082 \xB7 b\u2082 = S\u2082\u2081a\u2081 + S\u2082\u2082a\u2082"));

  // SVG: IQ kompleks düzlem
  const IQDiagram = () => /*#__PURE__*/React.createElement("svg", {
    viewBox: "-180 -180 360 360",
    style: {
      width: '100%',
      maxWidth: 320,
      height: 'auto'
    }
  }, /*#__PURE__*/React.createElement("line", {
    x1: "-160",
    y1: "0",
    x2: "160",
    y2: "0",
    stroke: "var(--ink-muted)",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "-160",
    x2: "0",
    y2: "160",
    stroke: "var(--ink-muted)",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("text", {
    x: "155",
    y: "-8",
    fill: "var(--ink-soft)",
    fontSize: "11",
    fontFamily: "monospace"
  }, "I"), /*#__PURE__*/React.createElement("text", {
    x: "8",
    y: "-155",
    fill: "var(--ink-soft)",
    fontSize: "11",
    fontFamily: "monospace"
  }, "Q"), [-90, -30, 30, 90].map(x => [-90, -30, 30, 90].map(y => /*#__PURE__*/React.createElement("circle", {
    key: `${x},${y}`,
    cx: x,
    cy: -y,
    r: "4",
    fill: "var(--accent)",
    opacity: "0.8"
  }))), /*#__PURE__*/React.createElement("text", {
    x: "-170",
    y: "170",
    fill: "var(--ink-muted)",
    fontSize: "10",
    fontFamily: "monospace"
  }, "16-QAM konstelasyonu"), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "0",
    x2: "60",
    y2: "-100",
    stroke: "var(--accent)",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("text", {
    x: "35",
    y: "-55",
    fill: "var(--accent)",
    fontSize: "10",
    fontFamily: "monospace"
  }, "|I+jQ|"), /*#__PURE__*/React.createElement("path", {
    d: "M 25 0 A 25 25 0 0 0 14 -20",
    fill: "none",
    stroke: "var(--accent)",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("text", {
    x: "30",
    y: "-12",
    fill: "var(--accent)",
    fontSize: "9",
    fontFamily: "monospace"
  }, "\u03C6"));

  // SVG: Smith chart simgesi
  const SmithDiagram = () => /*#__PURE__*/React.createElement("svg", {
    viewBox: "-110 -110 220 220",
    style: {
      width: '100%',
      maxWidth: 240,
      height: 'auto'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "0",
    cy: "0",
    r: "100",
    fill: "none",
    stroke: "var(--ink-soft)",
    strokeWidth: "1.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "33",
    cy: "0",
    r: "66",
    fill: "none",
    stroke: "var(--ink-muted)",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "0",
    r: "50",
    fill: "none",
    stroke: "var(--ink-muted)",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "66",
    cy: "0",
    r: "33",
    fill: "none",
    stroke: "var(--ink-muted)",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "-100",
    r: "100",
    fill: "none",
    stroke: "var(--ink-muted)",
    strokeWidth: "0.6",
    clipPath: "inset(0 0 50% 50%)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 0 -100 A 100 100 0 0 1 100 0",
    fill: "none",
    stroke: "var(--ink-muted)",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 0 100 A 100 100 0 0 0 100 0",
    fill: "none",
    stroke: "var(--ink-muted)",
    strokeWidth: "0.6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "-100",
    y1: "0",
    x2: "100",
    y2: "0",
    stroke: "var(--ink-soft)",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "40",
    cy: "-30",
    r: "3",
    fill: "var(--accent)"
  }), /*#__PURE__*/React.createElement("text", {
    x: "-95",
    y: "-95",
    fill: "var(--ink-muted)",
    fontSize: "9",
    fontFamily: "monospace"
  }, "|\u0393|\u22641"), /*#__PURE__*/React.createElement("text", {
    x: "-95",
    y: "105",
    fill: "var(--ink-muted)",
    fontSize: "9",
    fontFamily: "monospace"
  }, "\u0393 = (Z\u2212Z\u2080)/(Z+Z\u2080)"));

  // SVG: pencere fonksiyonları
  const WindowDiagram = () => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 320 140",
    style: {
      width: '100%',
      maxWidth: 360,
      height: 'auto'
    }
  }, /*#__PURE__*/React.createElement("line", {
    x1: "20",
    y1: "120",
    x2: "310",
    y2: "120",
    stroke: "var(--ink-muted)",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "20",
    y1: "20",
    x2: "20",
    y2: "120",
    stroke: "var(--ink-muted)",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("text", {
    x: "14",
    y: "25",
    textAnchor: "end",
    fill: "var(--ink-muted)",
    fontSize: "9",
    fontFamily: "monospace"
  }, "1"), /*#__PURE__*/React.createElement("text", {
    x: "14",
    y: "124",
    textAnchor: "end",
    fill: "var(--ink-muted)",
    fontSize: "9",
    fontFamily: "monospace"
  }, "0"), /*#__PURE__*/React.createElement("text", {
    x: "160",
    y: "138",
    textAnchor: "middle",
    fill: "var(--ink-muted)",
    fontSize: "10",
    fontFamily: "monospace"
  }, "n / N"), /*#__PURE__*/React.createElement("path", {
    d: "M 20 20 L 300 20 L 300 120 L 20 120 Z",
    fill: "none",
    stroke: "var(--ink-soft)",
    strokeWidth: "1",
    strokeDasharray: "3,3"
  }), /*#__PURE__*/React.createElement("path", {
    d: (() => {
      const pts = [];
      for (let i = 0; i <= 100; i++) {
        const x = 20 + 280 * i / 100;
        const w = 0.5 * (1 - Math.cos(2 * Math.PI * i / 100));
        const y = 120 - w * 100;
        pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      return pts.join(' ');
    })(),
    fill: "none",
    stroke: "var(--accent)",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: (() => {
      const pts = [];
      for (let i = 0; i <= 100; i++) {
        const x = 20 + 280 * i / 100;
        const t2 = 2 * Math.PI * i / 100;
        const w = 0.42 - 0.5 * Math.cos(t2) + 0.08 * Math.cos(2 * t2);
        const y = 120 - Math.max(0, w) * 100;
        pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      return pts.join(' ');
    })(),
    fill: "none",
    stroke: "#7b6cd9",
    strokeWidth: "1.2"
  }), /*#__PURE__*/React.createElement("g", {
    style: {
      fontFamily: 'monospace',
      fontSize: '10px'
    }
  }, /*#__PURE__*/React.createElement("text", {
    x: "240",
    y: "40",
    fill: "var(--ink-soft)"
  }, "rect"), /*#__PURE__*/React.createElement("text", {
    x: "240",
    y: "55",
    fill: "var(--accent)"
  }, "hann"), /*#__PURE__*/React.createElement("text", {
    x: "240",
    y: "70",
    fill: "#7b6cd9"
  }, "blackman")));
  const TR = lang === 'tr';
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-8",
    style: {
      fontFamily: FONT_SERIF
    }
  }, /*#__PURE__*/React.createElement("nav", {
    className: "border border-[var(--border)] bg-[var(--bg-panel)] p-5 md:p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-muted)] mb-3",
    style: {
      fontFamily: FONT_MONO
    }
  }, TR ? 'İçindekiler' : 'Table of Contents'), /*#__PURE__*/React.createElement("ol", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm",
    style: {
      fontFamily: FONT_SERIF
    }
  }, [['rf-temel', TR ? '1. RF Temelleri: Z₀, Γ, dalga' : '1. RF basics: Z₀, Γ, waves'], ['s-param', TR ? '2. S-Parametreleri (S₁₁, S₂₁, S₁₂, S₂₂)' : '2. S-parameters (S₁₁, S₂₁, S₁₂, S₂₂)'], ['format', TR ? '3. Touchstone formatı (.s1p, .s2p, MA/DB/RI)' : '3. Touchstone format (.s1p, .s2p, MA/DB/RI)'], ['gorunum', TR ? '4. Görünümler: Genlik, Faz, VSWR, RL, Grup Gecikme' : '4. Views: magnitude, phase, VSWR, RL, group delay'], ['smith', TR ? '5. Smith Chart, empedans (Z), admitans (Y)' : '5. Smith chart, impedance (Z), admittance (Y)'], ['iq', TR ? '6. I/Q gösterimi, taşıyıcı, örnekleme hızı' : '6. I/Q representation, carrier, sample rate'], ['iq-views', TR ? '7. Konstelasyon, zarf, faz, |I+jQ|' : '7. Constellation, envelope, phase, |I+jQ|'], ['iq-format', TR ? '8. Binary IQ formatları (cfile, sc16, SigMF)' : '8. Binary IQ formats (cfile, sc16, SigMF)'], ['wf', TR ? '9. Dalga formu, sample rate türetme, kanallar' : '9. Waveform, sample rate derivation, channels'], ['fft', TR ? '10. FFT, spektrum, frekans çözünürlüğü (Δf=fs/N)' : '10. FFT, spectrum, frequency resolution (Δf=fs/N)'], ['window', TR ? '11. Pencere fonksiyonları (rect, hann, hamming, blackman)' : '11. Window functions (rect, hann, hamming, blackman)'], ['marker', TR ? '12. İmleç (marker), aktif kanal, dB normalleştirme' : '12. Marker, active channel, dB normalization']].map(([id, label]) => /*#__PURE__*/React.createElement("li", {
    key: id
  }, /*#__PURE__*/React.createElement("a", {
    href: `#${id}`,
    onClick: e => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    },
    className: "text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors"
  }, label))))), /*#__PURE__*/React.createElement(Section, {
    id: "rf-temel",
    title: TR ? '1. RF Temelleri' : '1. RF basics'
  }, /*#__PURE__*/React.createElement("p", null, TR ? 'Bir RF/mikrodalga sisteminde sinyal, iletim hattı boyunca ileri ve geri yönde dalgalar olarak yayılır. Her port için iki temel büyüklük tanımlanır: porta giren dalga a ve porttan çıkan (yansıyan) dalga b. Tüm S-parametreleri bu dalga oranlarına dayanır.' : 'In an RF/microwave system, signals propagate as forward and backward waves along the transmission line. For each port we define two basic quantities: a (incident wave) and b (reflected wave). All S-parameters are ratios of these waves.'), /*#__PURE__*/React.createElement(Term, {
    name: "Z\u2080",
    formula: "referans empedans, genelde 50 \u03A9"
  }, TR ? 'S-parametrelerinin tanımlandığı sabit. Cihaz Z₀ ile sonlandırıldığında yansıma olmaz. Çoğu lab cihazı (VNA, spektrum analizör) 50 Ω; bazı video/CATV sistemleri 75 Ω.' : 'The reference impedance against which S-parameters are defined. With a Z₀ termination no reflection occurs. Most lab instruments are 50 Ω; some video/CATV systems are 75 Ω.'), /*#__PURE__*/React.createElement(Term, {
    name: "\u0393 (Gamma)",
    formula: "\u0393 = b/a = (Z \u2212 Z\u2080)/(Z + Z\u2080)"
  }, TR ? 'Yansıma katsayısı. Kompleks bir sayı (|Γ| ≤ 1 pasif sistemlerde). |Γ|=0 mükemmel eşleşme, |Γ|=1 tam yansıma (açık devre veya kısa devre). Smith chart bu kompleks sayının görsel haritasıdır.' : 'Reflection coefficient — a complex number with |Γ| ≤ 1 in passive systems. |Γ|=0 is a perfect match, |Γ|=1 a total reflection (open or short). The Smith chart visualizes this complex value.'), /*#__PURE__*/React.createElement(Term, {
    name: "dB (desibel)",
    formula: "20\xB7log\u2081\u2080(|x|) genlik i\xE7in, 10\xB7log\u2081\u2080(P) g\xFC\xE7 i\xE7in"
  }, TR ? 'Logaritmik birim. 20 dB kayıp = genlik ×0.1; 3 dB ≈ güç yarıya iner. S-parametreleri sıklıkla dB olarak çizilir çünkü filtreler birkaç onlarca dB dinamik aralığa yayılır.' : 'Logarithmic unit. 20 dB loss = ×0.1 amplitude; 3 dB ≈ half power. S-parameters are usually plotted in dB because filters span tens of dB dynamic range.')), /*#__PURE__*/React.createElement(Section, {
    id: "s-param",
    title: TR ? '2. S-Parametreleri' : '2. S-parameters'
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center my-3"
  }, /*#__PURE__*/React.createElement(SParamDiagram, null)), /*#__PURE__*/React.createElement("p", null, TR ? 'N-portlu bir cihaz için S-matrisi her port çiftine ait dalga oranlarını tanımlar. 2-port için 4 parametre vardır.' : 'For an N-port device, the S-matrix defines wave ratios for every port pair. A 2-port has 4 parameters.'), /*#__PURE__*/React.createElement(Term, {
    name: "S\u2081\u2081",
    formula: "b\u2081/a\u2081 (a\u2082=0)"
  }, TR ? 'Giriş yansıma katsayısı: Port 1\'e bir dalga gönderildiğinde geri yansıyan miktar. Antenler için "ne kadar iyi eşleştiği"nin ölçütü. |S₁₁| → 0 iyidir (radyasyona dönüşür).' : 'Input reflection: how much of the wave injected at port 1 bounces back. For antennas, lower |S₁₁| means better match (more radiation, less reflection).'), /*#__PURE__*/React.createElement(Term, {
    name: "S\u2082\u2081",
    formula: "b\u2082/a\u2081 (a\u2082=0)"
  }, TR ? 'İleri iletim katsayısı: Port 1\'den giren sinyalin Port 2\'ye ulaşan kısmı. Filtreler için "geçiş bandı"; LNA/amplifier için "kazanç" (S₂₁ > 0 dB). Pasif filtrelerde S₂₁ ≤ 0 dB.' : 'Forward transmission: portion of the input at port 1 that reaches port 2. For filters this is the passband; for an LNA/amplifier it is the gain (S₂₁ > 0 dB). Passive filters have S₂₁ ≤ 0 dB.'), /*#__PURE__*/React.createElement(Term, {
    name: "S\u2081\u2082",
    formula: "b\u2081/a\u2082 (a\u2081=0)"
  }, TR ? 'Ters iletim (izolasyon). Bir LNA için S₁₂ çok düşük olmalı — geri yönde kazanç istenmez (osilasyon riski). Pasif resiprok bir cihazda S₁₂ = S₂₁.' : 'Reverse transmission (isolation). For an LNA, S₁₂ should be very small to avoid reverse gain (oscillation risk). A passive reciprocal device has S₁₂ = S₂₁.'), /*#__PURE__*/React.createElement(Term, {
    name: "S\u2082\u2082",
    formula: "b\u2082/a\u2082 (a\u2081=0)"
  }, TR ? 'Çıkış yansıma katsayısı: Port 2\'ye uygulanan sinyalin yansıması. Yük tarafında ne kadar iyi eşleştirildiğini gösterir.' : 'Output reflection: reflection seen looking into port 2. Indicates how well the output is matched to its load.')), /*#__PURE__*/React.createElement(Section, {
    id: "format",
    title: TR ? '3. Touchstone Dosya Formatı' : '3. Touchstone file format'
  }, /*#__PURE__*/React.createElement("p", null, TR ? 'Tüm VNA üreticileri (R&S, Keysight, Anritsu, vb.) S-parametrelerini düz metin .sNp dosyalarında saklar. N port sayısıdır.' : 'All VNA vendors (R&S, Keysight, Anritsu, etc.) store S-parameters in plain-text .sNp files where N is the number of ports.'), /*#__PURE__*/React.createElement(Term, {
    name: ".s1p / .s2p / .s3p / .s4p ..."
  }, TR ? 'N = port sayısı. .s2p en yaygın (filtre, amplifikatör, kablo). Bilgi başlığı "!" ile, opsiyon satırı "#" ile başlar.' : 'N = number of ports. .s2p is most common (filters, amplifiers, cables). Comment lines start with "!", the options line starts with "#".'), /*#__PURE__*/React.createElement(Term, {
    name: "# Hz S MA R 50",
    formula: "opsiyonel ba\u015Fl\u0131k sat\u0131r\u0131"
  }, TR ? 'Sırayla: frekans birimi (Hz/kHz/MHz/GHz), parametre tipi (S), veri formatı (MA/DB/RI), referans empedans. Eksikse varsayılan: GHz S MA R 50.' : 'Sequentially: frequency unit (Hz/kHz/MHz/GHz), parameter type (S), data format (MA/DB/RI), reference impedance. Defaults: GHz S MA R 50.'), /*#__PURE__*/React.createElement(Term, {
    name: "MA",
    formula: "magnitude / angle (derece)"
  }, TR ? 'Lineer genlik + derece cinsinden faz. En yaygın saklama formatı.' : 'Linear magnitude + phase in degrees. The most common storage format.'), /*#__PURE__*/React.createElement(Term, {
    name: "DB",
    formula: "20\xB7log\u2081\u2080|S| / angle (derece)"
  }, TR ? 'dB cinsinden genlik + derece cinsinden faz.' : 'Magnitude in dB + phase in degrees.'), /*#__PURE__*/React.createElement(Term, {
    name: "RI",
    formula: "real / imaginary"
  }, TR ? 'Kompleks sayı doğrudan reel ve sanal bileşenleriyle.' : 'Complex number stored as real and imaginary parts.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? '2-port kolon sırası' : '2-port column ordering',
    formula: "f  S11  S21  S12  S22"
  }, TR ? '2-portta sıra önemlidir: S₁₁\'den sonra S₂₁ gelir (S₁₂ değil). 1-port: f S11. 3+ portlarda satır satır 3×3, 4×4 matris saklanır.' : 'For 2-port the column order is critical: S₁₁ is followed by S₂₁ (not S₁₂). 1-port: f S11. 3+ ports use multi-line block storage.')), /*#__PURE__*/React.createElement(Section, {
    id: "gorunum",
    title: TR ? '4. Görünümler' : '4. Views'
  }, /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Genlik (Magnitude)' : 'Magnitude',
    formula: "|S| veya 20\xB7log\u2081\u2080|S| [dB]"
  }, TR ? 'En yaygın görünüm. dB ekseninde filtre geçirgenliği ve geri dönüş zayıflaması net görünür. Lineer genlik ölçek dar dinamik aralık için tercih edilir.' : 'The most common view. dB scale clearly shows filter passband and return loss across a wide dynamic range; linear scale is useful for narrow dynamic range.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Faz' : 'Phase',
    formula: "\u2220S [\xB0]"
  }, TR ? 'Kompleks S\'nin açısı, ±180° aralığında. Sürekli faz için "unwrap" gerekir — sıçramaları (örn. 179° → −179°) düzgün eğriye dönüştürür.' : 'The angle of complex S, in the ±180° range. For a continuous phase you need to "unwrap" — turning ±180° jumps into a smooth curve.'), /*#__PURE__*/React.createElement(Term, {
    name: "VSWR",
    formula: "(1+|\u0393|)/(1\u2212|\u0393|)"
  }, TR ? 'Voltage Standing Wave Ratio. Yansıma katsayısının pratik bir göstergesi. VSWR=1 mükemmel eşleşme, VSWR=2 (|Γ|≈0.33) çoğu uygulama için kabul edilebilir. VSWR ≥ 100 olarak sınırlanmıştır (sayısal kararlılık için).' : 'Voltage Standing Wave Ratio — a practical reflection metric. VSWR=1 is a perfect match, VSWR=2 (|Γ|≈0.33) is acceptable for most uses. We clamp VSWR ≤ 100 for numerical stability.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Geri Dönüş Kaybı (RL)' : 'Return Loss (RL)',
    formula: "RL = \u221220\xB7log\u2081\u2080|\u0393| [dB]"
  }, TR ? 'Bir portta ne kadar enerjinin geri yansımadığını dB olarak ifade eder. RL = 10 dB → güç yansıması ~%10; RL = 20 dB → ~%1. Anten standardı genelde RL ≥ 10 dB.' : 'Tells you how much energy is NOT reflected, in dB. RL = 10 dB → ~10% reflected power; RL = 20 dB → ~1%. Antenna spec is usually RL ≥ 10 dB.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Grup Gecikme' : 'Group Delay',
    formula: "\u03C4 = \u2212d\u03C6/d\u03C9 [s]"
  }, TR ? 'Fazın frekansa göre türevinin negatifi. Sinyalin filtreden geçme süresi. Düz grup gecikme = bozulmasız iletim. Filtre kenarlarında genelde tepe yapar (sallanma). Birim: s, μs, ns, ps (otomatik seçilir).' : 'Negative derivative of phase w.r.t. angular frequency. The signal transit time through the network. Flat group delay = distortion-free transmission. Filter edges typically show peaks. Units auto-selected: s, μs, ns, ps.')), /*#__PURE__*/React.createElement(Section, {
    id: "smith",
    title: TR ? '5. Smith Chart' : '5. Smith chart'
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center my-3"
  }, /*#__PURE__*/React.createElement(SmithDiagram, null)), /*#__PURE__*/React.createElement("p", null, TR ? 'Smith chart, kompleks yansıma katsayısı Γ\'yı bir birim daire içine yerleştirir ve aynı düzlemde normalize empedans z = Z/Z₀ veya admitans y = Y·Z₀ okunabilir. Anten, filtre ve eşleme ağı tasarımının görsel dili.' : 'The Smith chart maps complex reflection Γ onto a unit circle while letting you read normalized impedance z = Z/Z₀ or admittance y = Y·Z₀ in the same plane. The visual language of antenna, filter, and matching network design.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Birim daire' : 'Unit circle',
    formula: "|\u0393| = 1"
  }, TR ? 'Pasif sistemlerin sınırı. Çember üstündeki noktalar = saf reaktif (kayıpsız) yansıtıcılar (açık, kısa, reaktans).' : 'Boundary for passive systems. Points on the circle are purely reactive (lossless) reflectors (open, short, pure reactance).'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Direnç (r) çemberleri' : 'Resistance (r) circles'
  }, TR ? 'Reel eksen boyunca, soldan sağa: r=0 (kısa), r=0.2, r=0.5, r=1 (eşleşme), r=2, r=5, r=∞ (açık).' : 'Along the real axis, left to right: r=0 (short), r=0.2, r=0.5, r=1 (match), r=2, r=5, r=∞ (open).'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Reaktans (x) yayları' : 'Reactance (x) arcs'
  }, TR ? 'Üst yarım = +jx (endüktif), alt yarım = −jx (kapasitif). x=±1 yayı r=1 ile kesişiyorsa nokta z = 1±j1.' : 'Upper half = +jx (inductive), lower half = −jx (capacitive). The x=±1 arc meets r=1 at z = 1±j1.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Z = R + jX' : 'Z = R + jX',
    formula: "Z = Z\u2080 \xB7 (1 + \u0393)/(1 \u2212 \u0393)"
  }, TR ? 'Empedans = direnç (R, kaybı temsil eder) + reaktans (X, enerji depolama). X>0 endüktif, X<0 kapasitif. Smith chart üzerinde hover yaparken popup\'ta görüntülenir.' : 'Impedance = resistance (R, loss) + reactance (X, energy storage). X>0 inductive, X<0 capacitive. Shown in the hover popup on the chart.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Y = G + jB' : 'Y = G + jB',
    formula: "Y = 1/Z = G + jB [S]"
  }, TR ? 'Admitans: empedansın tersi. G iletkenlik (siemens, S), B suseptans. Paralel devre analizinde kullanışlı.' : 'Admittance: inverse of impedance. G conductance (siemens, S), B susceptance. Useful for parallel network analysis.')), /*#__PURE__*/React.createElement(Section, {
    id: "iq",
    title: TR ? '6. I/Q Sinyal Gösterimi' : '6. I/Q signal representation'
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center my-3"
  }, /*#__PURE__*/React.createElement(IQDiagram, null)), /*#__PURE__*/React.createElement("p", null, TR ? 'Bir RF sinyali s(t) = A(t)·cos(2πfc·t + φ(t)) şeklinde yazılabilir. Bu, kompleks bir baseband sinyal I(t)+jQ(t) ile temsil edilir: I = A·cos(φ), Q = A·sin(φ). Tüm modern SDR\'ler bu çiftli akışı kaydeder.' : 'An RF signal s(t) = A(t)·cos(2πfc·t + φ(t)) can be written as a complex baseband signal I(t)+jQ(t): I = A·cos(φ), Q = A·sin(φ). All modern SDRs record this complex stream.'), /*#__PURE__*/React.createElement(Term, {
    name: "I (In-phase)",
    formula: "I = Re{z} = A\xB7cos(\u03C6)"
  }, TR ? 'Kompleks örneğin reel bileşeni. Taşıyıcının cosinüs bileşeni ile çarpılıp alçak geçiren filtreden geçirilerek elde edilir.' : 'Real part of the complex sample. Obtained by mixing with the cosine of the carrier and low-pass filtering.'), /*#__PURE__*/React.createElement(Term, {
    name: "Q (Quadrature)",
    formula: "Q = Im{z} = A\xB7sin(\u03C6)"
  }, TR ? 'Kompleks örneğin sanal bileşeni. Taşıyıcının sinüs bileşeniyle çarpılıp alçak geçiren filtre.' : 'Imaginary part. Obtained by mixing with the sine of the carrier and low-pass filtering.'), /*#__PURE__*/React.createElement(Term, {
    name: "fs (sample rate)",
    formula: "\xF6rnek/saniye [Hz]"
  }, TR ? 'Bir saniyede kaç (I,Q) çifti kaydedildi. Nyquist kuralı: temsil edilebilen maksimum sinyal bant genişliği = fs (baseband\'de tek taraflı değil, çift taraflı). 1 MS/s = 1 MHz bant genişliği.' : 'Pairs of (I,Q) recorded per second. Nyquist: the representable signal bandwidth equals fs (two-sided at baseband). 1 MS/s = 1 MHz of bandwidth.'), /*#__PURE__*/React.createElement(Term, {
    name: "fc (center frequency)",
    formula: "ta\u015F\u0131y\u0131c\u0131 frekans\u0131 [Hz]"
  }, TR ? 'RF örnekleme noktası. Baseband\'de I/Q ile temsil edilen sinyal, gerçekte fc etrafında merkezlenmiş bir banttır. Spektrum görünümünde X ekseni (k·fs/N + fc) olarak ölçeklenir.' : 'RF capture frequency. The I/Q baseband represents a band centered at fc. The spectrum view scales the x-axis as (k·fs/N + fc).')), /*#__PURE__*/React.createElement(Section, {
    id: "iq-views",
    title: TR ? '7. I/Q Görünümleri' : '7. I/Q views'
  }, /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Zaman alanı (I & Q üst üste)' : 'Time domain (I & Q overlaid)'
  }, TR ? 'I(t) ve Q(t) iki ayrı eğri olarak. Modülasyon tipini tahmin etmek zor; daha çok envelope/konstelasyon kullanışlı.' : 'I(t) and Q(t) as two overlaid traces. Hard to identify modulation; envelope/constellation usually more useful.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Zarf (envelope)' : 'Envelope',
    formula: "|z(t)| = \u221A(I\xB2 + Q\xB2)"
  }, TR ? 'Kompleks sinyalin anlık genliği. AM demodülasyonu doğrudan budur. Modülasyon olmayan sabit ton için sabittir.' : 'Instantaneous amplitude of the complex signal. AM demodulation IS this. Constant for an unmodulated carrier.'), /*#__PURE__*/React.createElement(Term, {
    name: "\u2220z(t)",
    formula: "\u03C6(t) = atan2(Q, I)"
  }, TR ? 'Anlık faz, radyan veya derece. FM demodülasyonu d/dt[φ(t)] ile yapılır.' : 'Instantaneous phase. FM demodulation = d/dt[φ(t)].'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Konstelasyon' : 'Constellation',
    formula: "scatter(I, Q)"
  }, TR ? 'I-Q düzlemindeki nokta bulutu. BPSK 2 nokta, QPSK 4 nokta, 16-QAM 4×4 grid, 64-QAM 8×8. Nokta yığılması = düşük gürültü, dağılım = SNR düşük. Senkronlanmamış yakalamalarda halka şeklinde görünür.' : 'Point cloud in the I-Q plane. BPSK: 2 points, QPSK: 4, 16-QAM: 4×4 grid, 64-QAM: 8×8. Tight clusters = low noise; spread = poor SNR. Unsynchronized captures appear as rings.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'FFT spektrumu' : 'FFT spectrum'
  }, TR ? 'Kompleks FFT, çift taraflı spektrum verir (negatif ve pozitif frekanslar). fftshift ile 0 Hz merkeze alınır. dB normalize: 20·log₁₀(|X[k]|/N).' : 'Complex FFT yields a two-sided spectrum (negative and positive frequencies). fftshift centers 0 Hz. dB normalization: 20·log₁₀(|X[k]|/N).')), /*#__PURE__*/React.createElement(Section, {
    id: "iq-format",
    title: TR ? '8. Binary IQ formatları' : '8. Binary IQ formats'
  }, /*#__PURE__*/React.createElement(Term, {
    name: ".cfile / .fc32 (complex float32 LE)"
  }, TR ? 'GNU Radio File Source/Sink\'in yaygın formatı. Her örnek: 4 bayt float I + 4 bayt float Q, little-endian. Yüksek dinamik aralık (~138 dB), ama 2× yer kaplar.' : 'GNU Radio File Source/Sink default. Each sample: 4-byte float I + 4-byte float Q, little-endian. High dynamic range (~138 dB) but takes 2× the space.'), /*#__PURE__*/React.createElement(Term, {
    name: ".sc16 / .ci16 (complex int16 LE)"
  }, TR ? 'USRP/Ettus over-the-wire formatı. 2 bayt int I + 2 bayt int Q. Daha kompakt, ~96 dB dinamik. Genellikle ±32767 aralığı.' : 'USRP/Ettus over-the-wire format. 2-byte int I + 2-byte int Q. More compact, ~96 dB dynamic range. Usually ±32767.'), /*#__PURE__*/React.createElement(Term, {
    name: ".cs8 / .ci8 (complex int8)"
  }, TR ? 'RTL-SDR\'nin doğal formatı. 1 bayt I + 1 bayt Q, genelde offset binary (128 = 0). En kompakt, ~48 dB dinamik.' : 'Native RTL-SDR format. 1-byte I + 1-byte Q, usually offset binary (128 = zero). Most compact, ~48 dB dynamic.'), /*#__PURE__*/React.createElement(Term, {
    name: "SigMF (.sigmf-data + .sigmf-meta)"
  }, TR ? 'Signal Metadata Format — açık standart. Binary veri (.sigmf-data, çoğu zaman cf32_le) + JSON metadata (.sigmf-meta) çifti. JSON\'da sample_rate, center_frequency, datatype, annotations vb. saklanır.' : 'Signal Metadata Format — open standard. Binary data (.sigmf-data, typically cf32_le) paired with a JSON metadata file (.sigmf-meta) that stores sample_rate, center_frequency, datatype, annotations, etc.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Otomatik fs/fc algılama' : 'Auto fs/fc detection'
  }, TR ? 'Text dosyalarda parser ilk 20 satırdaki yorum satırlarını (#, %, !) tarar ve "fs = 44100 Hz", "sample_rate: 1e6", "fc = 433 MHz" gibi notları okur. Birimler (kHz, MHz, GHz, kS/s, MS/s, GS/s) otomatik dönüştürülür.' : 'For text files, the parser scans up to 20 leading comment lines (#, %, !) for "fs = 44100 Hz", "sample_rate: 1e6", "fc = 433 MHz" tags. Units (kHz, MHz, GHz, kS/s, MS/s, GS/s) auto-convert.')), /*#__PURE__*/React.createElement(Section, {
    id: "wf",
    title: TR ? '9. Dalga formu' : '9. Waveform'
  }, /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Tek kolon' : 'Single column'
  }, TR ? 'Satır başına bir örnek (genlik). Zaman sırası örtüktür; fs kullanıcı veya yorum satırından gelir.' : 'One sample (amplitude) per row. Time order is implicit; fs comes from the user or comment line.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Çok kolon (her kolon ayrı kanal)' : 'Multi-column (each column a channel)'
  }, TR ? 'CSV başlığı varsa kanal adları olarak kullanılır. Aksi halde CH1, CH2, ...' : 'CSV header is used as channel names. Otherwise CH1, CH2, ...'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'İlk kolon zaman' : 'First column is time'
  }, TR ? 'Parser ilk kolonun monotonik artan değerler içerip içermediğini kontrol eder; eğer öyleyse zaman ekseni olarak yorumlar ve fs = 1/Δt türetir. Kalan kolonlar kanal olarak alınır.' : 'The parser checks whether the first column is monotonically increasing; if so it is treated as a time axis and fs = 1/Δt is derived. Remaining columns become channels.'), /*#__PURE__*/React.createElement(Term, {
    name: "WAV (RIFF/WAVE PCM16)"
  }, TR ? 'Mono veya çok kanallı PCM16. fs RIFF başlığından okunur (44100, 22050, 48000 vb. yaygın). Astropy/Audacity/ffmpeg ile uyumlu. Her kanal ayrı bir izleme olarak görüntülenir.' : 'Mono or multi-channel PCM16. fs is read from the RIFF header (44100, 22050, 48000 are common). Compatible with Audacity/ffmpeg/MATLAB. Each channel is a separate trace.')), /*#__PURE__*/React.createElement(Section, {
    id: "fft",
    title: TR ? '10. FFT ve Spektrum' : '10. FFT and spectrum'
  }, /*#__PURE__*/React.createElement("p", null, TR ? 'Discrete Fourier Transform (DFT), N örneklik bir sinyali N frekans bileşenine ayrıştırır. FFT, bunu O(N·logN) zamanda hesaplayan algoritmadır.' : 'The Discrete Fourier Transform decomposes an N-sample signal into N frequency components. FFT computes this in O(N·logN) time.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Bin frekansı' : 'Bin frequency',
    formula: "f_k = k \xB7 fs / N"
  }, TR ? '0-indeksli k\'inci bin\'in temsil ettiği frekans. Tek taraflı reel-girdi FFT\'de k = 0..N/2; çift taraflı kompleks-girdi FFT\'de fftshift sonrası k = −N/2..N/2.' : 'Frequency represented by the k-th bin (0-indexed). For one-sided real FFT k = 0..N/2; for two-sided complex FFT after fftshift, k = −N/2..N/2.'), /*#__PURE__*/React.createElement(Term, {
    name: "\u0394f",
    formula: "\u0394f = fs / N"
  }, TR ? 'Frekans çözünürlüğü: iki bin arası mesafe. Daha büyük N → daha ince çözünürlük (daha yakın spektral hatları ayırt eder). Veri Atlası\'nda FFT boyutu seçici (1024–16384) bu Δf\'i kontrol eder; örnek yetersizse zero-pad uygulanır.' : 'Frequency resolution: spacing between bins. Larger N → finer resolution (separates closely spaced lines). The FFT size selector (1024–16384) controls Δf; insufficient samples are zero-padded.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'fftshift' : 'fftshift'
  }, TR ? 'Kompleks FFT çıktısının ilk yarısı (pozitif freq) + ikinci yarısı (negatif freq) sıralıdır. fftshift bu sırayı (negatif | 0 | pozitif) şeklinde dizer, görselleştirme için gereklidir.' : 'A complex FFT outputs positive-freq first half + negative-freq second half. fftshift reorders it as (negative | 0 | positive) for visualization.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Zero-padding' : 'Zero-padding'
  }, TR ? 'Sinyal sonuna sıfır ekleyerek FFT boyutunu artırır. Daha ince frekans örnekleme verir ama gerçek çözünürlüğü artırmaz — sadece interpolasyon. Pik konumlarını okumak için faydalı.' : 'Padding the signal with zeros to increase FFT size. Gives finer frequency sampling but not actual resolution — it interpolates. Useful for picking peak positions.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'dB normalleştirme' : 'dB normalization',
    formula: "20\xB7log\u2081\u2080(|X[k]|/N)"
  }, TR ? 'Spektrumu ölçek-bağımsız hale getirmek için. Sinyalin RMS güç-yoğunluğuna karşılık gelir (Parseval).' : 'Makes the spectrum scale-independent. Corresponds to RMS power-spectral density (Parseval).')), /*#__PURE__*/React.createElement(Section, {
    id: "window",
    title: TR ? '11. Pencere fonksiyonları' : '11. Window functions'
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center my-3"
  }, /*#__PURE__*/React.createElement(WindowDiagram, null)), /*#__PURE__*/React.createElement("p", null, TR ? 'FFT, sinyalin sonsuza dek tekrar ettiğini varsayar. Gerçekte sinyal aniden kesilir → ana spektral hattan etrafa yan-loblar saçılır ("spektral kaçak"). Pencere fonksiyonu sinyalin uçlarını yumuşatır.' : 'FFT assumes the signal repeats forever. In reality the signal is abruptly cut → energy leaks into side-lobes around the main spectral line ("spectral leakage"). Window functions taper the signal edges.'), /*#__PURE__*/React.createElement(Term, {
    name: "Rectangular (rect)",
    formula: "w[n] = 1"
  }, TR ? 'Pencere yok. En keskin ana lob, en yüksek yan loblar (−13 dB). Frekansı tam bilinen sinüs için iyi; gürültülü/karışık sinyal için kötü.' : 'No window. Narrowest main lobe, highest side lobes (−13 dB). Good for known-frequency sines, bad for noisy/multi-tone signals.'), /*#__PURE__*/React.createElement(Term, {
    name: "Hann",
    formula: "w[n] = 0.5\xB7(1 \u2212 cos(2\u03C0n/N))"
  }, TR ? 'Dengeli seçim — orta genişlikli ana lob, yan lob −31 dB. Genel amaçlı default.' : 'Balanced — medium main lobe, side lobes at −31 dB. The general-purpose default.'), /*#__PURE__*/React.createElement(Term, {
    name: "Hamming",
    formula: "w[n] = 0.54 \u2212 0.46\xB7cos(2\u03C0n/N)"
  }, TR ? 'Hann\'a benzer ama ilk yan-lob daha bastırılmış (−42 dB). Tek-tonlu pikleri yakalamak için biraz daha iyi.' : 'Similar to Hann but first side-lobe more suppressed (−42 dB). Slightly better for single-tone detection.'), /*#__PURE__*/React.createElement(Term, {
    name: "Blackman",
    formula: "0.42 \u2212 0.5\xB7cos(2\u03C0n/N) + 0.08\xB7cos(4\u03C0n/N)"
  }, TR ? '3-terimli. En düşük yan-loblar (−58 dB), en geniş ana lob. Geniş dinamik aralık spektrum analizi için.' : '3-term. Lowest side-lobes (−58 dB), widest main lobe. For wide-dynamic-range spectrum analysis.')), /*#__PURE__*/React.createElement(Section, {
    id: "marker",
    title: TR ? '12. İmleç & diğer' : '12. Marker & misc'
  }, /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'İmleç (marker)' : 'Marker'
  }, TR ? 'S-parametre grafiklerinde sol tıkla bir frekans seçilir. Tüm kutular ve sağdaki panel o frekansta okur: |S| dB, ∠S °, VSWR, RL, Z = R+jX Ω, Y = G+jB mS, grup gecikme. Smith chart\'ta hover edilen noktanın yanında popup çıkar.' : 'Left-click on any S-parameter plot picks a frequency. All tiles and the right-hand panel read at that frequency: |S| dB, ∠S °, VSWR, RL, Z = R+jX Ω, Y = G+jB mS, group delay. On Smith chart the popup anchors to the hovered point.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Aktif kanal (FFT)' : 'Active channel (FFT)'
  }, TR ? 'Dalga formu/IQ sekmelerinde, çoklu dosya yüklendiğinde dropdown ile aktif olan seçilir. FFT/konstelasyon/zarf görünümleri sadece aktif olana uygulanır; zaman alanı tüm kanalları gösterir.' : 'In Waveform/IQ tabs, the active file/channel is selected via a dropdown when multiple are loaded. FFT/constellation/envelope views apply to the active one only; the time-domain view shows all channels.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Normalleştirme & noktalar' : 'Normalization & points'
  }, TR ? 'CSV/dalga formu grafiklerinde "normalize" maks-mutlak değere böler (eğriler aynı ölçekte karşılaştırılır). "Noktaları göster" örnek noktalarını işaretler — düşük sample rate sinyallerde işe yarar.' : '"Normalize" divides curves by max-abs (so different scales overlay). "Show points" marks sample points — useful for low sample-rate signals.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'PNG/JPG/SVG dışa aktarma' : 'PNG/JPG/SVG export'
  }, TR ? 'Her grafik kartının üst köşesinde mevcut. PNG/JPG 3× çözünürlüklü raster, SVG vektör. Tema arka planı korunur.' : 'On the top of each chart card. PNG/JPG are 3× raster, SVG is vector. Theme background is preserved.'), /*#__PURE__*/React.createElement(Term, {
    name: TR ? 'Tema ve dil' : 'Theme & language'
  }, TR ? 'Sağ üstte; açık/gri/koyu tema ve TR/EN. Seçim tarayıcıda saklanır.' : 'Top-right; light/gray/dark theme and TR/EN. Stored in the browser.')), /*#__PURE__*/React.createElement("div", {
    className: "text-center text-[10px] text-[var(--ink-muted)] italic py-4",
    style: {
      fontFamily: FONT_SERIF
    }
  }, TR ? 'Eksik bir terim varsa veya örnek istiyorsan, sayfayı kapatıp İletişim üzerinden yazabilirsin.' : 'If a term is missing or you want an example, feel free to reach out via Contact.'));
}

// ─── NavTabs ───────────────────────────────────────────────────
function NavTabs({
  route,
  onNav,
  t
}) {
  const items = [{
    key: 'csv',
    label: t('nav_csv')
  }, {
    key: 'sparams',
    label: t('nav_sparams')
  }, {
    key: 'iq',
    label: t('nav_iq')
  }, {
    key: 'waveform',
    label: t('nav_waveform')
  }, {
    key: 'bilgi',
    label: t('nav_bilgi')
  }];
  return /*#__PURE__*/React.createElement("nav", {
    className: "border-b border-[var(--border)] bg-[var(--bg-panel)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-6 md:px-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 overflow-x-auto",
    style: {
      fontFamily: FONT_MONO
    }
  }, items.map(it => {
    const isActive = route === it.key;
    const isEnabled = ENABLED_ROUTES.has(it.key);
    return /*#__PURE__*/React.createElement("div", {
      key: it.key,
      className: "flex items-center group"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => isEnabled && onNav(it.key),
      disabled: !isEnabled,
      className: `px-4 py-3 text-[11px] uppercase tracking-[0.22em] border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-[var(--accent)] text-[var(--ink)]' : isEnabled ? 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]' : 'border-transparent text-[var(--placeholder)] cursor-not-allowed'}`
    }, it.label, !isEnabled && /*#__PURE__*/React.createElement("span", {
      className: "ml-2 text-[9px] tracking-wide italic text-[var(--ink-muted)]",
      style: {
        fontFamily: FONT_SERIF
      }
    }, t('coming_soon'))), isEnabled && /*#__PURE__*/React.createElement("a", {
      href: `#/${it.key}`,
      target: "_blank",
      rel: "noopener",
      className: "opacity-0 group-hover:opacity-60 text-[10px] text-[var(--ink-muted)] hover:text-[var(--accent)] transition-all px-1",
      title: t('nav_open_new_tab'),
      onClick: e => e.stopPropagation()
    }, "\u2197"));
  }))));
}

// ─── Theme & Lang selectors ────────────────────────────────────
function Selectors({
  theme,
  lang,
  onTheme,
  onLang,
  t
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2 items-end"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em]",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--ink-muted)] mr-1"
  }, t('theme_label')), THEME_KEYS.map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => onTheme(k),
    className: `px-2 py-1 transition-colors ${theme === k ? 'bg-[var(--accent)] text-[var(--bg)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'}`
  }, t('theme_' + k)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em]",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--ink-muted)] mr-1"
  }, t('lang_label')), LANG_KEYS.map(L => /*#__PURE__*/React.createElement("button", {
    key: L,
    onClick: () => onLang(L),
    className: `px-2 py-1 transition-colors ${lang === L ? 'bg-[var(--accent)] text-[var(--bg)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'}`
  }, L))));
}

// ─── Main app ──────────────────────────────────────────────────
function App() {
  const [themeKey, setThemeKey] = useState(() => {
    try {
      return localStorage.getItem('vatlas-theme') || 'light';
    } catch (_) {
      return 'light';
    }
  });
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('vatlas-lang') || 'tr';
    } catch (_) {
      return 'tr';
    }
  });
  const [route, navigateTo] = useHashRoute();
  const theme = THEMES[themeKey] || THEMES.light;
  const t = useMemo(() => makeT(lang), [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = themeKey;
    try {
      localStorage.setItem('vatlas-theme', themeKey);
    } catch (_) {}
  }, [themeKey]);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('vatlas-lang', lang);
    } catch (_) {}
  }, [lang]);

  // ─── CSV state ───
  const [files, setFiles] = useState([]);
  const [charts, setCharts] = useState(() => [{
    id: 1,
    title: makeT(lang)('default_chart_title'),
    selectedSeries: new Set(),
    normalize: false,
    isPrimary: true,
    xLabel: '',
    yLabel: ''
  }]);
  const nextFileIdRef = useRef(1);
  const nextChartIdRef = useRef(2);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // ─── S-Params state ───
  const [spFiles, setSpFiles] = useState([]);
  const [spSelectedSeries, setSpSelectedSeries] = useState(() => new Set());
  const [spFreqUnit, setSpFreqUnit] = useState('auto');
  const [spUnwrapPhase, setSpUnwrapPhase] = useState(true);
  const [spTileSettings, setSpTileSettings] = useState({
    topLeft: {
      viewMode: 'mag',
      xLabel: '',
      yLabel: '',
      swapXY: false
    },
    topRight: {
      viewMode: 'phase',
      xLabel: '',
      yLabel: '',
      swapXY: false
    },
    bottomLeft: {
      viewMode: 'smith',
      xLabel: '',
      yLabel: '',
      swapXY: false
    },
    bottomRight: {
      viewMode: 'vswr',
      xLabel: '',
      yLabel: '',
      swapXY: false
    }
  });
  const [spMaximized, setSpMaximized] = useState(null); // 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | null
  const [spMarkerFreq, setSpMarkerFreq] = useState(null); // Hz, tüm tile'lar arasında paylaşılan marker frekansı

  // IQ ve Waveform state'leri
  const [iqFiles, setIqFiles] = useState([]);
  const [wfFiles, setWfFiles] = useState([]);
  const nextSpFileIdRef = useRef(1);
  const spFileInputRef = useRef(null);
  const [isSpDragging, setIsSpDragging] = useState(false);
  const fileIndexById = useMemo(() => {
    const m = new Map();
    files.forEach((f, i) => m.set(f.id, i));
    return m;
  }, [files]);
  const palette = useMemo(() => paletteFor(themeKey), [themeKey]);
  const seriesColorMap = useMemo(() => {
    const map = {};
    let idx = 0;
    files.forEach(f => {
      f.numericColumns.forEach(col => {
        map[`${f.id}::${col}`] = palette[idx % palette.length];
        idx++;
      });
    });
    return map;
  }, [files, palette]);
  const ingestFiles = useCallback(parsed => {
    if (parsed.length === 0) return;
    setFiles(prev => [...prev, ...parsed]);
    setCharts(prev => prev.map(c => {
      if (!c.isPrimary) return c;
      const next = new Set(c.selectedSeries);
      parsed.forEach(file => file.numericColumns.forEach(col => next.add(`${file.id}::${col}`)));
      return {
        ...c,
        selectedSeries: next
      };
    }));
  }, []);
  const handleFiles = useCallback(async fileList => {
    const arr = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.csv'));
    const parsed = [];
    for (const f of arr) {
      const text = await f.text();
      const result = await parseCSV(text, f.name);
      result.id = nextFileIdRef.current++;
      parsed.push(result);
    }
    ingestFiles(parsed);
  }, [ingestFiles]);
  const loadSampleClimate = async () => {
    const istanbul = await parseCSV(SAMPLE_ISTANBUL, 'istanbul_2024.csv');
    const ankara = await parseCSV(SAMPLE_ANKARA, 'ankara_2024.csv');
    istanbul.id = nextFileIdRef.current++;
    ankara.id = nextFileIdRef.current++;
    ingestFiles([istanbul, ankara]);
  };
  const loadSampleS21 = async () => {
    const cableA_csv = makeS21CSV({
      lengthM: 1,
      alphaCoef: 0.0048,
      ripplePeriodMHz: 150,
      rippleAmp: 0.12,
      noiseAmp: 0.04,
      seed: 42
    });
    const cableB_csv = makeS21CSV({
      lengthM: 3,
      alphaCoef: 0.019,
      ripplePeriodMHz: 50,
      rippleAmp: 0.28,
      noiseAmp: 0.09,
      seed: 84
    });
    const cableA = await parseCSV(cableA_csv, 'kablo_A_1m_LMR400.csv');
    const cableB = await parseCSV(cableB_csv, 'kablo_B_3m_RG58.csv');
    cableA.id = nextFileIdRef.current++;
    cableB.id = nextFileIdRef.current++;
    ingestFiles([cableA, cableB]);
  };

  // Tek dosya çoklu kanal sensor log örneği
  const loadSampleSensorLog = async () => {
    const text = makeCSV_sensor_log();
    const file = await parseCSV(text, 'sensor_log_5min.csv');
    file.id = nextFileIdRef.current++;
    ingestFiles([file]);
  };

  // CSV sayfası örnek galerisi
  const csvSamples = useMemo(() => [{
    key: 'csv_istanbul',
    label: 'İstanbul iklimi 2024',
    format: '.csv · 5 kolon, başlıklı',
    description: 'İstanbul ve Ankara aylık iklim verileri: sıcaklık, yağış, nem, güneş saati. Çok dosyalı karşılaştırma için ideal.',
    filename: 'istanbul_2024.csv',
    mimeType: 'text/csv;charset=utf-8',
    generator: () => SAMPLE_ISTANBUL,
    onLoad: loadSampleClimate
  }, {
    key: 'csv_cable_s21',
    label: 'Kablo S21 ölçümleri',
    format: '.csv · frekans + dB',
    description: 'İki farklı koaksiyel kablo (1m LMR-400 ve 3m RG-58) için S21 ekleme kaybı, 50 MHz – 6 GHz arası. Üst üste karşılaştırma.',
    filename: 'kablo_A_1m_LMR400.csv',
    mimeType: 'text/csv;charset=utf-8',
    generator: () => makeS21CSV({
      lengthM: 1,
      alphaCoef: 0.0048,
      ripplePeriodMHz: 150,
      rippleAmp: 0.12,
      noiseAmp: 0.04,
      seed: 42
    }),
    onLoad: loadSampleS21
  }, {
    key: 'csv_sensor_log',
    label: 'Çoklu sensor günlüğü',
    format: '.csv · 5 kolon, zaman ekseni',
    description: 'Sıcaklık, nem, basınç, ışık şiddeti 5 dakikalık kayıt. İlk kolon t(s). Çok değişkenli zaman serisi analizi.',
    filename: 'sensor_log_5min.csv',
    mimeType: 'text/csv;charset=utf-8',
    generator: makeCSV_sensor_log,
    onLoad: loadSampleSensorLog
  }], []);
  const removeFile = id => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setCharts(prev => prev.map(c => {
      const next = new Set();
      c.selectedSeries.forEach(k => {
        const [fid] = k.split('::');
        if (Number(fid) !== id) next.add(k);
      });
      return {
        ...c,
        selectedSeries: next
      };
    }));
  };
  const updateFile = useCallback((id, partial) => {
    setFiles(prev => prev.map(f => f.id === id ? {
      ...f,
      ...partial
    } : f));
  }, []);
  const addChart = () => {
    setCharts(prev => [...prev, {
      id: nextChartIdRef.current++,
      title: t('chart_title_n', {
        n: prev.length + 1
      }),
      selectedSeries: new Set(),
      normalize: false,
      isPrimary: false,
      xLabel: '',
      yLabel: ''
    }]);
  };
  const updateChart = (id, updated) => setCharts(prev => prev.map(c => c.id === id ? updated : c));
  const deleteChart = id => setCharts(prev => prev.filter(c => c.id !== id));
  const onDragOver = e => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = e => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };
  const totalSeries = useMemo(() => files.reduce((acc, f) => acc + f.numericColumns.length, 0), [files]);

  // ─── S-Params memo + handlers ───
  const spFileIndexById = useMemo(() => {
    const m = new Map();
    spFiles.forEach((f, i) => m.set(f.id, i));
    return m;
  }, [spFiles]);
  const spSeriesColorMap = useMemo(() => {
    const map = {};
    let idx = 0;
    spFiles.forEach(f => {
      Object.keys(f.data || {}).forEach(param => {
        map[`${f.id}::${param}`] = palette[idx % palette.length];
        idx++;
      });
    });
    return map;
  }, [spFiles, palette]);
  const spTotalParams = useMemo(() => spFiles.reduce((acc, f) => acc + Object.keys(f.data || {}).length, 0), [spFiles]);
  const ingestSpFiles = useCallback(parsed => {
    if (parsed.length === 0) return;
    setSpFiles(prev => [...prev, ...parsed]);
    setSpSelectedSeries(prev => {
      const next = new Set(prev);
      parsed.forEach(file => {
        // İlk yüklemede S11 ve S21 default seçili
        Object.keys(file.data || {}).forEach(param => {
          if (param === 'S11' || param === 'S21') next.add(`${file.id}::${param}`);
        });
      });
      return next;
    });
  }, []);
  const handleSpFiles = useCallback(async fileList => {
    const arr = Array.from(fileList).filter(f => /\.s\d+p$/i.test(f.name));
    const parsed = [];
    const failed = [];
    for (const f of arr) {
      const text = await f.text();
      const result = parseTouchstone(text, f.name);
      if (result && result.frequencies.length > 0) {
        result.id = nextSpFileIdRef.current++;
        parsed.push(result);
      } else {
        failed.push(f.name);
      }
    }
    if (failed.length > 0) {
      alert(t('sparams_invalid') + '\n' + failed.join('\n'));
    }
    ingestSpFiles(parsed);
  }, [ingestSpFiles, t]);
  const loadSpSample = useCallback(() => {
    const sampleText = makeSampleS2P();
    const result = parseTouchstone(sampleText, 'sample_bandpass_1.5GHz.s2p');
    if (result) {
      result.id = nextSpFileIdRef.current++;
      ingestSpFiles([result]);
    }
  }, [ingestSpFiles]);

  // Touchstone örnek dosyaları — 4 farklı format/port
  const loadSpFromText = useCallback((text, filename) => {
    try {
      const result = parseTouchstone(text, filename);
      if (result) {
        result.id = nextSpFileIdRef.current++;
        ingestSpFiles([result]);
      }
    } catch (err) {
      console.error('SParam load error:', filename, err);
      alert(`${filename}: ${err.message}`);
    }
  }, [ingestSpFiles]);
  const spSamples = useMemo(() => [{
    key: 'sp_bandpass_MA',
    label: 'Bandpass filtresi',
    format: '.s2p · MA + dB',
    description: '4. derece Butterworth bant-geçirgen, f0=1.5 GHz, BW=500 MHz. Z₀=50 Ω. Klasik 2-port ölçüm, DB format.',
    filename: 'bp_butterworth_1.5GHz_500MHz.s2p',
    mimeType: 'text/plain;charset=utf-8',
    generator: makeSampleS2P,
    onLoad: () => loadSpFromText(makeSampleS2P(), 'bp_butterworth_1.5GHz_500MHz.s2p')
  }, {
    key: 'sp_lpf_DB',
    label: 'Low-pass filtresi',
    format: '.s2p · DB',
    description: '3. derece Butterworth alçak-geçirgen, fc=2 GHz. S21 dB cinsinden -3 dB civarında düşer, S11 reflekte yükselir.',
    filename: 'lpf_butterworth_2GHz.s2p',
    mimeType: 'text/plain;charset=utf-8',
    generator: makeS2P_LPF_DB,
    onLoad: () => loadSpFromText(makeS2P_LPF_DB(), 'lpf_butterworth_2GHz.s2p')
  }, {
    key: 'sp_antenna_S1P',
    label: 'Yama anten S11',
    format: '.s1p · MA',
    description: 'Tek-port refleksiyon: 2.45 GHz rezonanslı patch anten, Q≈25. Smith chart\'ta klasik rezonans çukuru görülür.',
    filename: 'antenna_patch_2.45GHz.s1p',
    mimeType: 'text/plain;charset=utf-8',
    generator: makeS1P_antenna_MA,
    onLoad: () => loadSpFromText(makeS1P_antenna_MA(), 'antenna_patch_2.45GHz.s1p')
  }, {
    key: 'sp_cable_RI',
    label: 'Koaksiyel kablo',
    format: '.s2p · RI',
    description: '1 m RG-58 kablo modeli, ~0.5 dB/m @ 1 GHz, vp=0.66c. Real/Imag formatında ham kompleks değerler — VNA tipik çıktısı.',
    filename: 'cable_RG58_1m.s2p',
    mimeType: 'text/plain;charset=utf-8',
    generator: makeS2P_cable_RI,
    onLoad: () => loadSpFromText(makeS2P_cable_RI(), 'cable_RG58_1m.s2p')
  }], [loadSpFromText]);
  const removeSpFile = id => {
    setSpFiles(prev => prev.filter(f => f.id !== id));
    setSpSelectedSeries(prev => {
      const next = new Set();
      prev.forEach(k => {
        const [fid] = k.split('::');
        if (Number(fid) !== id) next.add(k);
      });
      return next;
    });
  };
  const updateSpFile = useCallback((id, partial) => {
    setSpFiles(prev => prev.map(f => f.id === id ? {
      ...f,
      ...partial
    } : f));
  }, []);
  const toggleSpSeries = key => {
    setSpSelectedSeries(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);else next.add(key);
      return next;
    });
  };
  const selectAllSpSeries = () => {
    const all = new Set();
    spFiles.forEach(f => Object.keys(f.data || {}).forEach(p => all.add(`${f.id}::${p}`)));
    setSpSelectedSeries(all);
  };
  const clearAllSpSeries = () => setSpSelectedSeries(new Set());
  const onSpDragOver = e => {
    e.preventDefault();
    setIsSpDragging(true);
  };
  const onSpDragLeave = () => setIsSpDragging(false);
  const onSpDrop = e => {
    e.preventDefault();
    setIsSpDragging(false);
    if (e.dataTransfer.files) handleSpFiles(e.dataTransfer.files);
  };
  const updateSpTileSettings = (slot, partial) => {
    setSpTileSettings(prev => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        ...partial
      }
    }));
  };

  // Maximize modal: ok tuşları ile aktif tile değiştir (4 slot dolaşır)
  useEffect(() => {
    if (!spMaximized) return;
    const slots = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    const handler = e => {
      if (e.key === 'Escape') setSpMaximized(null);else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setSpMaximized(s => slots[(slots.indexOf(s) + 1) % slots.length]);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setSpMaximized(s => slots[(slots.indexOf(s) - 1 + slots.length) % slots.length]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [spMaximized]);
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-[var(--bg)] text-[var(--ink)]",
    style: {
      fontFamily: FONT_SANS
    }
  }, /*#__PURE__*/React.createElement("header", {
    className: "border-b border-[var(--border)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-6 md:px-8 py-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between flex-wrap gap-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] mb-3",
    style: {
      fontFamily: FONT_MONO
    }
  }, route === 'sparams' ? t('sparams_subtitle') : route === 'iq' ? t('iq_subtitle') : route === 'waveform' ? t('wf_subtitle') : route === 'bilgi' ? t('bilgi_subtitle') : t('subtitle')), /*#__PURE__*/React.createElement("h1", {
    className: "leading-none text-[var(--ink)]",
    style: {
      fontFamily: FONT_SERIF,
      fontWeight: 500,
      fontSize: 'clamp(2.5rem, 6vw, 4rem)',
      letterSpacing: '-0.02em'
    }
  }, route === 'sparams' ? t('sparams_title_a') : route === 'iq' ? t('iq_title_a') : route === 'waveform' ? t('wf_title_a') : route === 'bilgi' ? t('bilgi_title_a') : t('title_a'), ' ', /*#__PURE__*/React.createElement("span", {
    className: "italic text-[var(--accent)]"
  }, route === 'sparams' ? t('sparams_title_b') : route === 'iq' ? t('iq_title_b') : route === 'waveform' ? t('wf_title_b') : route === 'bilgi' ? t('bilgi_title_b') : t('title_b'))), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-[var(--ink-soft)] mt-4 max-w-xl italic leading-relaxed",
    style: {
      fontFamily: FONT_SERIF
    }
  }, route === 'sparams' ? t('sparams_intro') : route === 'iq' ? t('iq_intro') : route === 'waveform' ? t('wf_intro') : route === 'bilgi' ? t('bilgi_intro') : t('intro'))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-end gap-4"
  }, /*#__PURE__*/React.createElement(Selectors, {
    theme: themeKey,
    lang: lang,
    onTheme: setThemeKey,
    onLang: setLang,
    t: t
  }), route === 'csv' && files.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: FONT_MONO
    },
    className: "text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-muted)]"
  }, t('status_label')), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl text-[var(--ink)] mt-1"
  }, /*#__PURE__*/React.createElement("span", null, files.length), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-[var(--ink-muted)] mx-1.5"
  }, t('status_files')), /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--border-hard)]"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "ml-1.5"
  }, totalSeries), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-[var(--ink-muted)] mx-1.5"
  }, t('status_variables')), /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--border-hard)]"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "ml-1.5"
  }, charts.length), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-[var(--ink-muted)] ml-1.5"
  }, t('status_charts')))), route === 'sparams' && spFiles.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: FONT_MONO
    },
    className: "text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-muted)]"
  }, t('status_label')), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl text-[var(--ink)] mt-1"
  }, /*#__PURE__*/React.createElement("span", null, spFiles.length), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-[var(--ink-muted)] mx-1.5"
  }, t('status_files')), /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--border-hard)]"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "ml-1.5"
  }, spTotalParams), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-[var(--ink-muted)] mx-1.5"
  }, t('sparams_parameters')))))))), /*#__PURE__*/React.createElement(NavTabs, {
    route: route,
    onNav: navigateTo,
    t: t
  }), /*#__PURE__*/React.createElement("main", {
    className: "max-w-7xl mx-auto px-6 md:px-8 py-10 space-y-12"
  }, route === 'csv' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    onDragOver: onDragOver,
    onDragLeave: onDragLeave,
    onDrop: onDrop,
    className: `border-2 border-dashed transition-all ${isDragging ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-hard)] bg-[var(--bg-panel)]'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-8 py-12 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.3em] text-[var(--ink-muted)] mb-4",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('section_upload')), /*#__PURE__*/React.createElement("p", {
    className: "mb-7 italic leading-tight text-[var(--ink)]",
    style: {
      fontFamily: FONT_SERIF,
      fontSize: 'clamp(1.5rem, 3.5vw, 2rem)'
    }
  }, t('drop_csv')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => fileInputRef.current?.click(),
    className: "px-6 py-3 bg-[var(--ink)] text-[var(--bg)] uppercase tracking-[0.2em] text-xs hover:bg-[var(--accent)] transition-colors",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('pick_file'))), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] mt-6",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('csv_hint')), /*#__PURE__*/React.createElement("input", {
    ref: fileInputRef,
    type: "file",
    accept: ".csv,text/csv",
    multiple: true,
    onChange: e => {
      handleFiles(e.target.files);
      e.target.value = '';
    },
    className: "hidden"
  }))), /*#__PURE__*/React.createElement(SampleGallery, {
    samples: csvSamples,
    t: t
  }), files.length > 0 && /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-[10px] uppercase tracking-[0.3em] text-[var(--ink-muted)] mb-4",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('section_files')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
  }, files.map((file, idx) => /*#__PURE__*/React.createElement("div", {
    key: file.id,
    className: "bg-[var(--bg-panel)] border border-[var(--border)] p-4 group hover:border-[var(--accent)] transition-colors"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.2em] mb-1 font-bold flex items-center gap-1.5",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement(EditableLabel, {
    value: getFileLabel(file, idx),
    onChange: val => updateFile(file.id, {
      label: val
    }),
    className: "text-[var(--accent)]",
    style: {
      fontFamily: FONT_MONO,
      fontWeight: 700
    },
    title: t('edit_file_label'),
    placeholder: `D${idx + 1}`
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--ink-muted)] not-italic opacity-0 group-hover:opacity-100 transition-opacity"
  }, "\u270E")), /*#__PURE__*/React.createElement("div", {
    className: "text-sm truncate text-[var(--ink)]",
    title: file.name,
    style: {
      fontFamily: FONT_MONO
    }
  }, file.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-[var(--ink-muted)] mt-2 italic",
    style: {
      fontFamily: FONT_SERIF
    }
  }, t('file_stats', {
    rows: file.data.length,
    cols: file.columns.length,
    nums: file.numericColumns.length
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeFile(file.id),
    className: "text-[10px] uppercase tracking-widest text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition-all flex-shrink-0",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('remove')))))), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-[var(--ink-muted)] italic mt-3 leading-snug",
    style: {
      fontFamily: FONT_SERIF
    }
  }, t('files_hint'))), files.length > 0 && /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-between mb-4 flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-[10px] uppercase tracking-[0.3em] text-[var(--ink-muted)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('section_charts')), /*#__PURE__*/React.createElement("button", {
    onClick: addChart,
    className: "text-xs uppercase tracking-[0.2em] text-[var(--accent)] hover:text-[var(--ink)] transition-colors flex items-center gap-2",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base leading-none"
  }, "+"), " ", t('add_chart'))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, charts.map(chart => /*#__PURE__*/React.createElement(ChartCard, {
    key: chart.id,
    chart: chart,
    files: files,
    fileIndexById: fileIndexById,
    seriesColorMap: seriesColorMap,
    theme: theme,
    t: t,
    onUpdate: c => updateChart(chart.id, c),
    onDelete: () => deleteChart(chart.id),
    onUpdateFile: updateFile,
    canDelete: charts.length > 1
  }))), charts.length >= 2 && /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex justify-center"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: addChart,
    className: "px-6 py-3 border border-[var(--border-hard)] text-[var(--ink-soft)] uppercase tracking-[0.2em] text-xs hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors flex items-center gap-2",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base leading-none"
  }, "+"), " ", t('new_chart'))))), route === 'sparams' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    onDragOver: onSpDragOver,
    onDragLeave: onSpDragLeave,
    onDrop: onSpDrop,
    className: `border-2 border-dashed transition-all ${isSpDragging ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-hard)] bg-[var(--bg-panel)]'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-8 py-12 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.3em] text-[var(--ink-muted)] mb-4",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('section_upload')), /*#__PURE__*/React.createElement("p", {
    className: "mb-7 italic leading-tight text-[var(--ink)]",
    style: {
      fontFamily: FONT_SERIF,
      fontSize: 'clamp(1.5rem, 3.5vw, 2rem)'
    }
  }, t('sparams_drop')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-3 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => spFileInputRef.current?.click(),
    className: "px-6 py-3 bg-[var(--ink)] text-[var(--bg)] uppercase tracking-[0.2em] text-xs hover:bg-[var(--accent)] transition-colors",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('pick_file'))), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] mt-6",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('sparams_ext_hint')), /*#__PURE__*/React.createElement("input", {
    ref: spFileInputRef,
    type: "file",
    accept: ".s1p,.s2p,.s3p,.s4p,.s5p,.s6p,.s7p,.s8p",
    multiple: true,
    onChange: e => {
      handleSpFiles(e.target.files);
      e.target.value = '';
    },
    className: "hidden"
  }))), /*#__PURE__*/React.createElement(SampleGallery, {
    samples: spSamples,
    t: t
  }), spFiles.length > 0 && /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-[10px] uppercase tracking-[0.3em] text-[var(--ink-muted)] mb-4",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('section_files')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
  }, spFiles.map((file, idx) => /*#__PURE__*/React.createElement("div", {
    key: file.id,
    className: "bg-[var(--bg-panel)] border border-[var(--border)] p-4 group hover:border-[var(--accent)] transition-colors"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.2em] mb-1 font-bold flex items-center gap-1.5",
    style: {
      fontFamily: FONT_MONO
    }
  }, /*#__PURE__*/React.createElement(EditableLabel, {
    value: getFileLabel(file, idx),
    onChange: val => updateSpFile(file.id, {
      label: val
    }),
    className: "text-[var(--accent)]",
    style: {
      fontFamily: FONT_MONO,
      fontWeight: 700
    },
    title: t('edit_file_label'),
    placeholder: `D${idx + 1}`
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--ink-muted)] not-italic opacity-0 group-hover:opacity-100 transition-opacity"
  }, "\u270E")), /*#__PURE__*/React.createElement("div", {
    className: "text-sm truncate text-[var(--ink)]",
    title: file.name,
    style: {
      fontFamily: FONT_MONO
    }
  }, file.name), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-[var(--ink-muted)] mt-2 italic",
    style: {
      fontFamily: FONT_SERIF
    }
  }, file.numPorts, "-", t('sparams_file_ports'), " \xB7 ", file.frequencies.length, " ", t('sparams_file_points'), " \xB7 ", t('sparams_file_z0'), "=", file.z0[0], " \u03A9 \xB7 ", file.dataFormat.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-[var(--ink-muted)] mt-1",
    style: {
      fontFamily: FONT_MONO
    }
  }, (file.frequencies[0] / 1e9).toFixed(3), "\u2013", (file.frequencies[file.frequencies.length - 1] / 1e9).toFixed(3), " GHz"), /*#__PURE__*/React.createElement("details", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "text-[9px] uppercase tracking-[0.2em] text-[var(--ink-muted)] hover:text-[var(--accent)] cursor-pointer transition-colors",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('sparams_first_freq_preview')), /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 space-y-0.5 text-[10px]",
    style: {
      fontFamily: FONT_MONO
    }
  }, Object.keys(file.data).map(param => {
    const c0 = file.data[param][0];
    if (!c0) return null;
    const mag = Math.sqrt(c0.re * c0.re + c0.im * c0.im);
    const magDb = 20 * Math.log10(mag || 1e-30);
    const phaseDeg = Math.atan2(c0.im, c0.re) * 180 / Math.PI;
    const isOne = Math.abs(c0.re - 1) < 1e-6 && Math.abs(c0.im) < 1e-6;
    const isZero = Math.abs(c0.re) < 1e-6 && Math.abs(c0.im) < 1e-6;
    const warn = isOne || isZero;
    return /*#__PURE__*/React.createElement("div", {
      key: param,
      className: warn ? 'text-[var(--danger)]' : 'text-[var(--ink-soft)]'
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-semibold"
    }, param), ' = ', c0.re.toFixed(4), " ", c0.im >= 0 ? '+' : '−', " ", Math.abs(c0.im).toFixed(4), "j", /*#__PURE__*/React.createElement("span", {
      className: "text-[var(--ink-muted)] ml-1"
    }, "(", magDb.toFixed(1), " dB \u2220", phaseDeg.toFixed(0), "\xB0)"), warn && /*#__PURE__*/React.createElement("span", {
      className: "ml-1 italic"
    }, "\u26A0 ", isOne ? t('sparams_warn_open') : t('sparams_warn_zero')));
  })))), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeSpFile(file.id),
    className: "text-[10px] uppercase tracking-widest text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition-all flex-shrink-0",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('remove'))))))), spFiles.length > 0 && /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3"
  }, ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map(slot => {
    const cfg = spTileSettings[slot];
    return /*#__PURE__*/React.createElement(SParamChartCard, {
      key: slot,
      viewMode: cfg.viewMode,
      title: `sparam_${spFiles.map(f => getFileLabel(f, spFileIndexById.get(f.id))).join('_')}_${slot}`,
      files: spFiles,
      fileIndexById: spFileIndexById,
      selectedSeries: spSelectedSeries,
      seriesColorMap: spSeriesColorMap,
      freqUnit: spFreqUnit,
      unwrapPhase: spUnwrapPhase,
      xLabel: cfg.xLabel,
      yLabel: cfg.yLabel,
      swapXY: cfg.swapXY,
      onUpdateLabels: p => updateSpTileSettings(slot, p),
      onViewModeChange: vm => updateSpTileSettings(slot, {
        viewMode: vm
      }),
      onMaximize: () => setSpMaximized(slot),
      markerFreq: spMarkerFreq,
      onSetMarker: f => setSpMarkerFreq(f),
      markerFreq: spMarkerFreq,
      onSetMarker: setSpMarkerFreq,
      theme: theme,
      t: t
    });
  })), /*#__PURE__*/React.createElement("aside", {
    className: "bg-[var(--bg-panel)] border border-[var(--border)] rounded-sm p-4 space-y-5 self-start sticky top-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('sparams_parameters')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: selectAllSpSeries,
    className: "text-[10px] uppercase tracking-wider text-[var(--accent)] hover:underline",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('select_all')), /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--border-hard)]"
  }, "\xB7"), /*#__PURE__*/React.createElement("button", {
    onClick: clearAllSpSeries,
    className: "text-[10px] uppercase tracking-wider text-[var(--ink-muted)] hover:underline",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('clear_all')))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 max-h-[360px] overflow-y-auto pr-1 scroll-soft"
  }, spFiles.map((file, fi) => {
    const lbl = getFileLabel(file, fi);
    const params = Object.keys(file.data || {});
    return /*#__PURE__*/React.createElement("div", {
      key: file.id
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] uppercase tracking-[0.15em] mb-1.5 flex items-baseline gap-2",
      style: {
        fontFamily: FONT_MONO,
        color: theme.inkSubtle
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[var(--accent)] font-bold"
    }, lbl), /*#__PURE__*/React.createElement("span", {
      className: "truncate text-[var(--ink-subtle)]",
      title: file.name
    }, file.name)), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-1 pl-1"
    }, params.map(param => {
      const key = `${file.id}::${param}`;
      const active = spSelectedSeries.has(key);
      const color = spSeriesColorMap[key];
      return /*#__PURE__*/React.createElement("label", {
        key: key,
        className: "flex items-center gap-1.5 cursor-pointer select-none py-0.5"
      }, /*#__PURE__*/React.createElement("span", {
        className: "w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center transition-all flex-shrink-0",
        style: {
          borderColor: active ? color : theme.borderHard,
          backgroundColor: active ? color : 'transparent'
        }
      }, active && /*#__PURE__*/React.createElement("svg", {
        width: "9",
        height: "9",
        viewBox: "0 0 12 12",
        fill: "none"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M2 6L5 9L10 3",
        stroke: "white",
        strokeWidth: "2.2",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }))), /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: active,
        onChange: () => toggleSpSeries(key),
        className: "sr-only"
      }), /*#__PURE__*/React.createElement("span", {
        className: "text-[11px]",
        style: {
          fontFamily: FONT_MONO,
          color: active ? theme.ink : theme.inkSoft
        }
      }, param));
    })));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-[var(--border-soft)] pt-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)] block mb-2",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('sparams_freq_unit')), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1 flex-wrap",
    style: {
      fontFamily: FONT_MONO
    }
  }, ['auto', 'Hz', 'kHz', 'MHz', 'GHz'].map(u => /*#__PURE__*/React.createElement("button", {
    key: u,
    onClick: () => setSpFreqUnit(u),
    className: `px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${spFreqUnit === u ? 'bg-[var(--accent)] text-[var(--bg)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--border)]'}`
  }, u)))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-[var(--border-soft)] pt-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-3 cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-5 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0",
    style: {
      backgroundColor: spUnwrapPhase ? theme.accent : theme.borderHard
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
    style: {
      transform: spUnwrapPhase ? 'translateX(16px)' : 'translateX(0)'
    }
  })), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: spUnwrapPhase,
    onChange: e => setSpUnwrapPhase(e.target.checked),
    className: "sr-only"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-[0.15em] text-[var(--ink-soft)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('sparams_unwrap_phase')))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-[var(--border-soft)] pt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)]",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('marker')), spMarkerFreq != null && /*#__PURE__*/React.createElement("button", {
    onClick: () => setSpMarkerFreq(null),
    className: "text-[10px] text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('marker_clear'))), spMarkerFreq == null ? /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] italic text-[var(--placeholder)] leading-snug",
    style: {
      fontFamily: FONT_SERIF
    }
  }, t('marker_hint')) : (() => {
    // Display unit'i hesapla
    let maxFreq = 0;
    spFiles.forEach(f => f.frequencies.forEach(fr => {
      if (fr > maxFreq) maxFreq = fr;
    }));
    let displayUnit = spFreqUnit;
    if (displayUnit === 'auto') {
      displayUnit = maxFreq >= 1e9 ? 'GHz' : maxFreq >= 1e6 ? 'MHz' : maxFreq >= 1e3 ? 'kHz' : 'Hz';
    }
    const displayDiv = displayUnit === 'GHz' ? 1e9 : displayUnit === 'MHz' ? 1e6 : displayUnit === 'kHz' ? 1e3 : 1;
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] font-semibold text-[var(--ink)]",
      style: {
        fontFamily: FONT_MONO
      }
    }, "f = ", (spMarkerFreq / displayDiv).toPrecision(6), " ", displayUnit), /*#__PURE__*/React.createElement("div", {
      className: "space-y-2 max-h-72 overflow-y-auto pr-1"
    }, Array.from(spSelectedSeries).map(key => {
      const [fileIdStr, param] = key.split('::');
      const file = spFiles.find(f => f.id === Number(fileIdStr));
      if (!file || !file.data[param]) return null;
      const freqs = file.frequencies;
      // En yakın freq indeksi
      let idx = 0;
      let minDiff = Math.abs(freqs[0] - spMarkerFreq);
      for (let i = 1; i < freqs.length; i++) {
        const diff = Math.abs(freqs[i] - spMarkerFreq);
        if (diff < minDiff) {
          minDiff = diff;
          idx = i;
        }
      }
      const c = file.data[param][idx];
      const mag = Math.sqrt(c.re * c.re + c.im * c.im);
      const magDb = 20 * Math.log10(mag || 1e-30);
      const phaseDeg = Math.atan2(c.im, c.re) * 180 / Math.PI;
      const isReflection = /^S(\d+)(\d+)$/i.test(param) && (() => {
        const m = /^S(\d+)(\d+)$/i.exec(param);
        return m[1] === m[2];
      })();
      const vswr = mag >= 0.999 ? Infinity : (1 + mag) / (1 - mag);
      const rlDb = -20 * Math.log10(mag || 1e-30);
      let zStr = null,
        yStr = null;
      if (isReflection) {
        const z0 = file.z0 && file.z0[0] || 50;
        const denom = (1 - c.re) * (1 - c.re) + c.im * c.im;
        if (denom > 1e-30) {
          const zr = z0 * ((1 - c.re * c.re - c.im * c.im) / denom);
          const zi = z0 * (2 * c.im / denom);
          zStr = `${zr.toFixed(2)} ${zi >= 0 ? '+' : '−'} ${Math.abs(zi).toFixed(2)}j Ω`;
          const zMag2 = zr * zr + zi * zi;
          if (zMag2 > 1e-30) {
            const yr = zr / zMag2;
            const yi = -zi / zMag2;
            yStr = `${(yr * 1000).toFixed(2)} ${yi >= 0 ? '+' : '−'} ${Math.abs(yi * 1000).toFixed(2)}j mS`;
          }
        }
      }
      // Group delay (finite diff, local)
      let gdStr = null;
      if (freqs.length >= 3) {
        const iPrev = Math.max(0, idx - 1);
        const iNext = Math.min(freqs.length - 1, idx + 1);
        const cPrev = file.data[param][iPrev];
        const cNext = file.data[param][iNext];
        let pPrev = Math.atan2(cPrev.im, cPrev.re);
        let pCurr = Math.atan2(c.im, c.re);
        let pNext = Math.atan2(cNext.im, cNext.re);
        // Local unwrap
        while (pCurr - pPrev > Math.PI) pCurr -= 2 * Math.PI;
        while (pCurr - pPrev < -Math.PI) pCurr += 2 * Math.PI;
        while (pNext - pCurr > Math.PI) pNext -= 2 * Math.PI;
        while (pNext - pCurr < -Math.PI) pNext += 2 * Math.PI;
        const dPhi = pNext - pPrev;
        const dOmega = 2 * Math.PI * (freqs[iNext] - freqs[iPrev]);
        const gd = dOmega === 0 ? 0 : -dPhi / dOmega;
        const gdAbs = Math.abs(gd);
        let gdScale = 1,
          gdUnit = 's';
        if (gdAbs < 1e-9) {
          gdScale = 1e12;
          gdUnit = 'ps';
        } else if (gdAbs < 1e-6) {
          gdScale = 1e9;
          gdUnit = 'ns';
        } else if (gdAbs < 1e-3) {
          gdScale = 1e6;
          gdUnit = 'μs';
        }
        gdStr = `${(gd * gdScale).toFixed(3)} ${gdUnit}`;
      }
      const color = spSeriesColorMap[key];
      const fileLabel = getFileLabel(file, spFileIndexById.get(file.id));
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "border-l-2 pl-2 py-1 space-y-0.5",
        style: {
          borderColor: color,
          fontFamily: FONT_MONO,
          fontSize: '10px'
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "font-semibold text-[var(--ink)]"
      }, fileLabel, " \xB7 ", param), /*#__PURE__*/React.createElement("div", {
        className: "text-[var(--ink-soft)]"
      }, "|S| = ", magDb.toFixed(2), " dB"), /*#__PURE__*/React.createElement("div", {
        className: "text-[var(--ink-soft)]"
      }, "\u2220S = ", phaseDeg.toFixed(2), "\xB0"), isReflection && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        className: "text-[var(--ink-soft)]"
      }, "VSWR = ", isFinite(vswr) ? vswr.toFixed(3) : '∞'), /*#__PURE__*/React.createElement("div", {
        className: "text-[var(--ink-soft)]"
      }, "RL = ", rlDb.toFixed(2), " dB"), zStr && /*#__PURE__*/React.createElement("div", {
        className: "text-[var(--ink-soft)]"
      }, "Z = ", zStr), yStr && /*#__PURE__*/React.createElement("div", {
        className: "text-[var(--ink-soft)]"
      }, "Y = ", yStr)), gdStr && /*#__PURE__*/React.createElement("div", {
        className: "text-[var(--ink-soft)]"
      }, "\u03C4", /*#__PURE__*/React.createElement("sub", null, "g"), " = ", gdStr));
    })));
  })()), spFiles.some(f => f.numPorts === 2) && /*#__PURE__*/React.createElement("div", {
    className: "border-t border-[var(--border-soft)] pt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)] mb-1.5",
    style: {
      fontFamily: FONT_MONO
    }
  }, t('two_port_order')), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] italic text-[var(--placeholder)] leading-snug mb-2",
    style: {
      fontFamily: FONT_SERIF
    }
  }, t('two_port_order_hint')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5"
  }, spFiles.filter(f => f.numPorts === 2).map(f => {
    const fileIdx = spFileIndexById.get(f.id);
    const label = getFileLabel(f, fileIdx);
    return /*#__PURE__*/React.createElement("label", {
      key: f.id,
      className: "flex items-center gap-2 cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-7 h-4 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0",
      style: {
        backgroundColor: f.tpdoSwap ? theme.accent : theme.borderHard
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "w-3 h-3 bg-white rounded-full shadow-sm transition-transform",
      style: {
        transform: f.tpdoSwap ? 'translateX(12px)' : 'translateX(0)'
      }
    })), /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: !!f.tpdoSwap,
      onChange: () => {
        setSpFiles(files => files.map(file => {
          if (file.id !== f.id) return file;
          // S12 ile S21'i takasla
          return {
            ...file,
            tpdoSwap: !file.tpdoSwap,
            data: {
              ...file.data,
              S12: file.data.S21,
              S21: file.data.S12
            }
          };
        }));
      },
      className: "sr-only"
    }), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-[var(--ink-soft)] truncate",
      style: {
        fontFamily: FONT_MONO
      }
    }, label, ": S12\u2194S21"));
  })))))), spMaximized && spTileSettings[spMaximized] && (() => {
    const slots = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
    const cfg = spTileSettings[spMaximized];
    const goPrev = () => setSpMaximized(slots[(slots.indexOf(spMaximized) - 1 + slots.length) % slots.length]);
    const goNext = () => setSpMaximized(slots[(slots.indexOf(spMaximized) + 1) % slots.length]);
    const viewTitle = cfg.viewMode === 'mag' ? t('sparams_view_magnitude') : cfg.viewMode === 'phase' ? t('sparams_view_phase') : cfg.viewMode === 'vswr' ? t('sparams_view_vswr') : cfg.viewMode === 'groupdelay' ? t('sparams_view_group_delay') : cfg.viewMode === 'smith' ? t('sparams_view_smith') : cfg.viewMode;
    return /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-50 flex items-center justify-center p-6 bg-[var(--bg)]/90 backdrop-blur-sm",
      onClick: e => {
        if (e.target === e.currentTarget) setSpMaximized(null);
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-[var(--bg)] border border-[var(--border-hard)] rounded-sm w-full max-w-6xl"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between px-4 py-2 border-b border-[var(--border-soft)]",
      style: {
        fontFamily: FONT_MONO
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)]"
    }, viewTitle), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 text-[10px] uppercase tracking-wider"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: goPrev,
      className: "text-[var(--ink-soft)] hover:text-[var(--accent)] px-2 py-0.5"
    }, "\u2190 ", t('prev_chart')), /*#__PURE__*/React.createElement("span", {
      className: "text-[var(--border-hard)]"
    }, "\xB7"), /*#__PURE__*/React.createElement("button", {
      onClick: goNext,
      className: "text-[var(--ink-soft)] hover:text-[var(--accent)] px-2 py-0.5"
    }, t('next_chart'), " \u2192"), /*#__PURE__*/React.createElement("span", {
      className: "text-[var(--border-hard)]"
    }, "\xB7"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setSpMaximized(null),
      className: "text-[var(--ink)] hover:text-[var(--accent)] px-2 py-0.5"
    }, t('close'), " \u2715"))), /*#__PURE__*/React.createElement("div", {
      className: "p-2"
    }, /*#__PURE__*/React.createElement(SParamChartCard, {
      key: `max-${spMaximized}`,
      viewMode: cfg.viewMode,
      title: `sparam_${spFiles.map(f => getFileLabel(f, spFileIndexById.get(f.id))).join('_')}_${spMaximized}`,
      files: spFiles,
      fileIndexById: spFileIndexById,
      selectedSeries: spSelectedSeries,
      seriesColorMap: spSeriesColorMap,
      freqUnit: spFreqUnit,
      unwrapPhase: spUnwrapPhase,
      xLabel: cfg.xLabel,
      yLabel: cfg.yLabel,
      swapXY: cfg.swapXY,
      onUpdateLabels: p => updateSpTileSettings(spMaximized, p),
      onViewModeChange: vm => updateSpTileSettings(spMaximized, {
        viewMode: vm
      }),
      onMaximize: () => setSpMaximized(null),
      markerFreq: spMarkerFreq,
      onSetMarker: f => setSpMarkerFreq(f),
      isMaximized: true,
      markerFreq: spMarkerFreq,
      onSetMarker: setSpMarkerFreq,
      theme: theme,
      t: t
    }))));
  })()), route === 'iq' && /*#__PURE__*/React.createElement("section", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement(IQPage, {
    iqFiles: iqFiles,
    onIQFilesChange: setIqFiles,
    theme: theme,
    t: t
  })), route === 'waveform' && /*#__PURE__*/React.createElement("section", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement(WaveformPage, {
    wfFiles: wfFiles,
    onWfFilesChange: setWfFiles,
    theme: theme,
    t: t
  })), route === 'bilgi' && /*#__PURE__*/React.createElement("section", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement(BilgiPage, {
    t: t,
    lang: lang
  })), /*#__PURE__*/React.createElement("footer", {
    className: "pt-8 pb-4 border-t border-[var(--border)] text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-[var(--ink-muted)] italic",
    style: {
      fontFamily: FONT_SERIF
    }
  }, t('footer')))));
}
document.getElementById('loading').remove();
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/React.createElement(App, null));
