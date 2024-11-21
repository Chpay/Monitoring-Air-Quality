// Inisialisasi peta dengan zoom lebih dekat (level 17)
const map = L.map("map").setView([0, 0], 17); // Default koordinat (0, 0) dan zoom lebih dekat

// Peta standar OpenStreetMap
const osmLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
  }
);

// Peta satelit menggunakan OpenStreetMap Satellite
const satelliteLayer = L.tileLayer(
  "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
  }
);

// Menambahkan layer default (OSM) ke peta
osmLayer.addTo(map);

// Marker untuk menampilkan lokasi perangkat
const marker = L.marker([0, 0]).addTo(map);

// Polyline untuk jejak titik-titik
let path = []; // Array untuk menyimpan koordinat titik-titik jejak
let polyline = L.polyline([], { color: "blue", weight: 5 }).addTo(map); // Menambah ketebalan polyline

// Control untuk menampilkan nilai battery di pojok kanan bawah
const batteryControl = L.control({ position: "bottomright" });

batteryControl.onAdd = function () {
  const div = L.DomUtil.create("div", "battery-control");
  div.innerHTML = "Battery: --"; // Nilai default untuk battery
  return div;
};
batteryControl.addTo(map);

// Control untuk menampilkan waktu refresh di pojok kiri bawah
const refreshTimeControl = L.control({ position: "bottomleft" });

refreshTimeControl.onAdd = function () {
  const div = L.DomUtil.create("div", "refresh-time-control");
  div.innerHTML = "Last Refresh: --"; // Nilai default waktu refresh
  return div;
};
refreshTimeControl.addTo(map);

// Menyimpan checkpoint history untuk setiap data terbaru
const checkpointHistory = [];

// Fungsi untuk mendapatkan data dari ThingSpeak
async function fetchThingSpeakData() {
  const channelID = 2684072; // ID Channel ThingSpeak
  const apiKey = "66QV45REC75N6YA3"; // API Key
  const url = `https://api.thingspeak.com/channels/${channelID}/feeds.json?api_key=${apiKey}&results=2`; // URL API

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.feeds;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}

// Fungsi untuk memperbarui peta dengan data terbaru
async function updateMap() {
  const feeds = await fetchThingSpeakData();
  if (feeds.length > 0) {
    const latestFeed = feeds[0]; // Ambil data terbaru
    const { latitude, longitude, battery } = latestFeed; // Ambil latitude, longitude, dan battery level
    const timestamp = new Date(latestFeed.created_at); // Tanggal pembaruan data
    const timeStr = timestamp.toLocaleString(); // Format waktu yang mudah dibaca

    // Update posisi marker dan polyline
    marker.setLatLng([latitude, longitude]);
    path.push([latitude, longitude]);
    polyline.setLatLngs(path);

    // Update informasi kontrol
    document.querySelector(
      ".battery-control"
    ).innerHTML = `Battery: ${battery}`;
    document.querySelector(
      ".refresh-time-control"
    ).innerHTML = `Last Refresh: ${timeStr}`;

    // Simpan checkpoint history untuk keperluan log
    checkpointHistory.push({
      latitude,
      longitude,
      battery,
      time: timeStr,
    });
  }
}

// Fungsi untuk menangani tombol GO
function onGoButtonClick() {
  console.log("Tombol GO ditekan");
  updateMap();
}

// Fungsi untuk menangani tombol END
function onEndButtonClick() {
  console.log("Tombol END ditekan");
  // Implementasi logika untuk END
}

// Fungsi untuk menangani tombol RESET
function onResetButtonClick() {
  console.log("Tombol RESET ditekan");
  // Implementasi logika untuk RESET
}

// Fungsi untuk menangani tombol Satelit
function toggleSatellite() {
  if (map.hasLayer(satelliteLayer)) {
    map.removeLayer(satelliteLayer);
    map.addLayer(osmLayer); // Kembali ke peta standar OpenStreetMap
  } else {
    map.removeLayer(osmLayer);
    map.addLayer(satelliteLayer); // Menampilkan peta satelit
  }
}

// Set interval untuk update peta setiap 30 detik
setInterval(updateMap, 30000);
