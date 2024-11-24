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
        const readAPIKey = "XXQ2EY2EFZ47UJ1S"; // API Key untuk membaca data
        const url = `https://api.thingspeak.com/channels/${channelID}/feeds/last.json?api_key=${readAPIKey}`;
        const response = await fetch(url);
        const data = await response.json();

        // Mengupdate lokasi marker dan peta
        const lat = data.field1; // Data latitude
        const lng = data.field2; // Data longitude
        marker.setLatLng([lat, lng]); // Update lokasi marker
        map.setView([lat, lng], 17); // Peta akan mengikuti marker

        // Menyimpan titik dalam polyline
        path.push([lat, lng]);
        polyline.setLatLngs(path); // Update polyline dengan titik terbaru

        // Menampilkan data Battery dan waktu refresh
        const batteryVoltage = data.field3 || "--";
        const refreshTime = new Date(data.created_at).toLocaleString();
        batteryControl.getContainer().innerHTML = `Battery: ${batteryVoltage}`;
        refreshTimeControl.getContainer().innerHTML = `Last Refresh: ${refreshTime}`;
      }

      // Fungsi untuk memulai tracking
      let isTracking = false;

      function onGoButtonClick() {
        isTracking = true;
        path = []; // Reset path setiap kali mulai tracking
        polyline.setLatLngs(path); // Reset polyline
      }

      // Fungsi untuk menghentikan tracking
      function onEndButtonClick() {
        isTracking = false;
      }

      // Fungsi untuk mereset jejak
      function onResetButtonClick() {
        path = []; // Reset path
        polyline.setLatLngs(path); // Reset polyline
        checkpointHistory.length = 0; // Reset history checkpoint
      }

      // Fungsi untuk toggle peta satelit
      let isSatellite = false;

      function toggleSatellite() {
        if (isSatellite) {
          osmLayer.addTo(map); // Kembali ke OpenStreetMap
          satelliteLayer.removeFrom(map); // Hapus peta satelit
        } else {
          satelliteLayer.addTo(map); // Menampilkan peta satelit
          osmLayer.removeFrom(map); // Hapus peta OpenStreetMap
        }
        isSatellite = !isSatellite; // Toggle status
      }

      // Fetch data setiap 10 detik
      setInterval(fetchThingSpeakData, 10000); // Fetch data setiap 10 detik
