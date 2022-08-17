map.createPane('active');
map.createPane('vehicle');
map.getPane('active').style.zIndex = 394;
map.getPane('vehicle').style.zIndex = 395;
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
    this._div.innerHTML = "<div style='text-align: left;'>heading:&nbsp;" + Math.round(heading * 100) / 100 +
        "&nbsp;deg<br>speed:&nbsp;" + Math.round(speed * 100) / 100 + "&nbsp;m/s</div>";
};
info.addTo(map);
var myMarker = L.marker([], {
    zIndexOffset: 1000,
    pmIgnore: true
});
myMarker.bindTooltip("", {
    direction: 'top'
});
var myCircle = L.circle([], {
    radius: 0,
    pmIgnore: true
});
var myPolyline = L.polyline([], {
    pane: 'vehicle',
    color: 'red',
    pmIgnore: true
});
var leftPolygon = L.polygon([], {
    pane: 'active',
    color: 'green',
    pmIgnore: true
});
var rightPolygon = L.polygon([], {
    pane: 'active',
    color: 'green',
    pmIgnore: true
});

function formatTooltip(content) {
    return "<pre>" + JSON.stringify(content, undefined, 2) + "</pre>";
}

function onLocationFound(e) {
    console.log(e);
    myMarker.setLatLng(e.latlng);
    myCircle.setLatLng(e.latlng);
    myCircle.setRadius(e.accuracy);
    if (!map.hasLayer(myMarker)) {
        myMarker.addTo(map);
        myCircle.addTo(map);
        myPolyline.addTo(map);
        leftPolygon.addTo(map);
        rightPolygon.addTo(map);
    }
    if (!map.getBounds().contains(e.latlng)) {
        map.setView(e.latlng);
    }
    var centerPoint = turf.point([e.longitude, e.latitude]);
    if (typeof e.heading === "undefined") {
        info.showText('Speed and heading unavailable.');
        myPolyline.setLatLngs([]);
    } else if (e.speed < 1) {
        info.showText('' + Math.round(e.speed * 100) / 100 + '&nbsp;m/s is too slow.');
        if (!leftPolygon.isEmpty()) {
            protocolLayer.addData(leftPolygon.toGeoJSON());
            leftPolygon.setLatLngs([]);
        }
        if (!rightPolygon.isEmpty()) {
            protocolLayer.addData(rightPolygon.toGeoJSON());
            rightPolygon.setLatLngs([]);
        }
    } else {
        info.updateContent(e.heading, e.speed);
        let frontPoint = turf.destination(centerPoint, 5e-3, e.heading);
        let leftPoint = turf.destination(centerPoint, 15e-3, e.heading - 90);
        let rightPoint = turf.destination(centerPoint, 15e-3, e.heading + 90);
        myPolyline.setLatLngs([
            [centerPoint.geometry.coordinates.slice().reverse(),
                frontPoint.geometry.coordinates.slice().reverse()
            ],
            [centerPoint.geometry.coordinates.slice().reverse(),
                leftPoint.geometry.coordinates.slice().reverse()
            ],
            [centerPoint.geometry.coordinates.slice().reverse(),
                rightPoint.geometry.coordinates.slice().reverse()
            ]
        ]);
        let leftAreaPoints = leftPolygon.getLatLngs();
        leftAreaPoints[0].push(leftPoint.geometry.coordinates.slice().reverse());
        leftAreaPoints[0].unshift(centerPoint.geometry.coordinates.slice().reverse());
        leftPolygon.setLatLngs(leftAreaPoints);
        myMarker._tooltip.setContent('' + Math.round(e.speed * 100) / 100 + '&nbsp;m/s');
        let rightAreaPoints = rightPolygon.getLatLngs();
        rightAreaPoints[0].push(rightPoint.geometry.coordinates.slice().reverse());
        rightAreaPoints[0].unshift(centerPoint.geometry.coordinates.slice().reverse());
        rightPolygon.setLatLngs(rightAreaPoints);
    }
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
