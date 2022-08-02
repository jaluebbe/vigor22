var myDrawnLayers = L.layerGroup().addTo(map);
map.pm.setGlobalOptions({
    layerGroup: myDrawnLayers
});
var myImportedLayers = L.geoJSON().addTo(map);
layerControl.addOverlay(myDrawnLayers, "my drawn layers");
layerControl.addOverlay(myImportedLayers, "my imported layers");
map.pm.addControls({
    position: 'topleft',
    drawCircle: false,
    drawPolyline: false,
    drawRectangle: false,
    drawCircleMarker: false,
    drawMarker: false,
    oneBlock: true,
});

function clickedShape(eo) {
    console.log(eo);
}

map.on('pm:create', function(e) {
    e.layer.on({
        click: clickedShape
    })
});

function importShapes() {
    if (document.getElementById("checkReplaceShapes").checked) {
        myImportedLayers.clearLayers();
    }
    let fileInput = document.getElementById("fileInput");
    for (var i = 0; i < fileInput.files.length; i++) {
        var fr = new FileReader();
        fr.onload = function(fileData) {
            var geojsonInput = JSON.parse(fileData.target.result);
            myImportedLayers.addData(geojsonInput);
            map.panInsideBounds(myImportedLayers.getBounds());
        };
        fr.readAsText(fileInput.files[i])
    }
};

function exportShapes() {
    let fileName = prompt('Choose file name', 'download.geojson');
    if (fileName === null || fileName.length == 0) {
        return;
    }
    
    if (document.getElementById("checkDrawnOnly").checked) {
        var dataExport = JSON.stringify(map.pm.getGeomanDrawLayers(true).toGeoJSON());
    } else {
        var dataExport = JSON.stringify(map.pm.getGeomanLayers(true).toGeoJSON());
    }
    
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:application/geo+json;charset=utf-8,' + encodeURIComponent(dataExport));
    pom.setAttribute('download', fileName);
    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
};

var legend = L.control({
    position: 'topright'
});
legend.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info legend');
    this._div.innerHTML =
        '<h4>Data transfer</h4><table>' +
        '<tr><td colspan="2"><input style="font-size: 9px;" type="file" id="fileInput" accept=".geojson,application/json,application/geo+json"></td></tr>' +
        '<tr><td><button onclick="importShapes();">import</button></td><td><input type="checkbox" id="checkReplaceShapes">&nbsp;and replace</td></tr>' +
        '<tr><td><button onclick="exportShapes();">export</button></td>' +
        '<td><input type="checkbox" id="checkDrawnOnly">&nbsp;drawn only</td></tr>'
        '</table>';
    L.DomEvent.disableClickPropagation(this._div);
    return this._div;
};

legend.addTo(map)
