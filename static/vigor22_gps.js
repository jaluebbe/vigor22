var info = L.control({
    position: 'bottomright'
});
info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this.showText('No geolocation information available.');
    return this._div;
};
info.showText = function(infoText) {
    this._div.innerHTML = infoText;
};
info.updateContent = function(heading, speed) {
    this._div.innerHTML = "<div style='text-align: left;'>heading&nbsp;" + heading +
        "&nbsp;deg<br>speed&nbsp;" + speed + "&nbsp;m/s</div>";
};
info.addTo(map);
var myMarker = L.marker([], {
    zIndexOffset: 1000,
    pmIgnore: true
});
var myCircle = L.circle([], {
    radius: 0,
    pmIgnore: true
});

function onLocationFound(e) {
    console.log(e);
    myMarker.setLatLng(e.latlng);
    myCircle.setLatLng(e.latlng);
    myCircle.setRadius(e.accuracy);
    if (!map.hasLayer(myMarker)) {
        myMarker.addTo(map);
        myCircle.addTo(map);
    }
    if (!map.getBounds().contains(e.latlng)) {
        map.setView(e.latlng);
    }
    info.updateContent(e.heading, e.speed);
}

map.setZoom(9)

function onLocationError(e) {
    info.showText('No geolocation information available.');
}
map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);
map.locate({
    watch: true,
    enableHighAccuracy: true
});
