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
        const url = `https://api.thingspeak.com/channels/${channelID}/feeds.json?api_key=${apiKey}&results=1`;

        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data.feeds && data.feeds.length > 0) {
            const feed = data.feeds[0]; // Ambil data terbaru
            const temperature = parseFloat(feed.field1);
            const humidity = parseFloat(feed.field2);
            const heatIndex = parseFloat(feed.field3);
            const mq7 = parseFloat(feed.field4);
            const mq135 = parseFloat(feed.field5);
            const battery = parseFloat(feed.field6);
            const latitude = parseFloat(feed.field7);
            const longitude = parseFloat(feed.field8);

            // Update peta dan marker
            if (!isNaN(latitude) && !isNaN(longitude)) {
              map.setView([latitude, longitude], 17); // Pusatkan peta dengan zoom level lebih dekat
              marker.setLatLng([latitude, longitude]); // Pindahkan marker ke lokasi perangkat

              // Membuat pop-up kecil di atas marker dengan data heat index dan air quality
              const popupContent = `
              <b>Temperature:</b> ${temperature.toFixed(2)} °C<br>
              <b>Kelembaban:</b> ${humidity.toFixed(2)} %<br>
              <b>Kadar CO:</b> ${mq7.toFixed(2)} ppm<br>
              <b>Kadar CO2:</b> ${mq135.toFixed(2)} ppm
            `;
              marker.bindPopup(popupContent).openPopup(); // Tampilkan pop-up

              // Update nilai battery pada control di pojok kanan bawah
              const batteryText = `Battery: ${battery.toFixed(2)} V`;
              batteryControl._container.innerHTML = batteryText; // Update nilai battery

              // Update waktu refresh pada control di pojok kiri bawah
              const refreshTime = new Date().toLocaleTimeString();
              refreshTimeControl._container.innerHTML = `Last Refresh: ${refreshTime}`;

              // Jika tombol GO ditekan, tambahkan titik ke jejak dan update polyline
              if (isTracking) {
                path.push([latitude, longitude]); // Menambahkan titik ke array path
                polyline.setLatLngs(path); // Update polyline dengan koordinat baru

                // Menambahkan checkpoint (titik yang lebih kecil) untuk setiap data terbaru
                const checkpoint = L.circle([latitude, longitude], {
                  color: "green", // Warna titik
                  radius: 3, // Ukuran titik lebih kecil
                }).addTo(map);

                // Simpan checkpoint ke history
                checkpointHistory.push({ checkpoint, temperature, humidity, mq7, mq135 });

                // Tambahkan event mouseover untuk menampilkan pop-up pada checkpoint
                checkpoint.on("mouseover", function () {
                  const historyData = checkpointHistory.find(
                    (item) => item.checkpoint === checkpoint
                  );
                  if (historyData) {
                    const historyPopup = `
                    <b>Temperature:</b> ${historyData.temperature.toFixed(
                      2
                    )} °C<br>
                    <b>Kelembaban:</b> ${historyData.humidity.toFixed(
                      2
                    )} %<br>
                    <b>Kadar CO:</b> ${historyData.mq7.toFixed(2)} ppm<br>
                    <b>Kadar CO2:</b> ${historyData.mq135.toFixed(2)} ppm
                  `;
                    checkpoint.bindPopup(historyPopup).openPopup(); // Menampilkan pop-up saat kursor mendekati checkpoint
                  }
                });
              }
            }
          }
        } catch (error) {
          console.error("Error fetching ThingSpeak data:", error);
        }
      }

      // Update data setiap 10 detik sekali (10000 ms)
      setInterval(fetchThingSpeakData, 10000); // Update data setiap 10 detik

      // Variabel untuk tracking status (GO / END)
      let isTracking = false;

      // Fungsi untuk menekan tombol GO
      function onGoButtonClick() {
        isTracking = true;
        path = []; // Reset path
        polyline.setLatLngs([]); // Clear existing polyline
      }

      // Fungsi untuk menekan tombol END
      function onEndButtonClick() {
        isTracking = false; // Stop tracking
      }

      // Fungsi untuk menekan tombol RESET
      function onResetButtonClick() {
        // Menghapus semua checkpoint
        checkpointHistory.forEach((item) => item.checkpoint.remove());
        checkpointHistory.length = 0; // Reset checkpoint history
        path = []; // Reset jejak
        polyline.setLatLngs([]); // Clear polyline
      }

      // Global variable to track map layer state (OSM or Satellite)
      let isSatelliteMode = false; // Initially, it's set to false, meaning OSM mode

      // Function to toggle between Satellite and Normal (OSM) map layers
      function toggleSatellite() {
        if (isSatelliteMode) {
          // If currently in satellite mode, switch to normal mode (OSM)
          map.removeLayer(satelliteLayer); // Remove satellite layer
          osmLayer.addTo(map); // Add OSM layer
          document.querySelector(".satellite-button").textContent = "Satelit"; // Change button text to "Satelit"
          isSatelliteMode = false; // Set mode to normal (OSM)
        } else {
          // If currently in normal mode (OSM), switch to satellite mode
          map.removeLayer(osmLayer); // Remove OSM layer
          satelliteLayer.addTo(map); // Add satellite layer
          document.querySelector(".satellite-button").textContent = "Normal"; // Change button text to "Normal"
          isSatelliteMode = true; // Set mode to satellite
        }
      }
