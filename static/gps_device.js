map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);

function connectGPS() {
    map.locate({
        watch: true,
        enableHighAccuracy: true
    });
    noSleep.enable();
    statusLightGPS.style["background-color"] = "#2dc937";
    statusLabelGPS.innerHTML = "connected";
};

function disconnectGPS() {
    map.stopLocate();
    noSleep.disable();
    running = false;
    statusLightGPS.style["background-color"] = "#cc3232";
    statusLabelGPS.innerHTML = "disconnected";
};

function resetGPSConnection() {
    disconnectGPS();
    connectGPS();
    noSleep.enable();
};
