map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);
map.locate({
    watch: true,
    enableHighAccuracy: true
});
function resetGPSConnection() {
    map.stopLocate();
    map.locate({
        watch: true,
        enableHighAccuracy: true
    });
};
