import './style.css';
import { Map, View } from 'ol';
import { Image as ImageLayer, Tile as TileLayer } from 'ol/layer';
import { XYZ, Raster as RasterSource, OSM } from 'ol/source';

const elevation = new XYZ({
  url: './tiles/{z}/{x}/{y}.png',
  maxZoom: 15
});

const decodeElevation = ([R, G, B]) => {
  return -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1);
};

const scaleElevation = (elevation, min, max) => {
  return ((elevation - min) / (max - min)) * 255
}

const raster = new RasterSource({
  sources: [elevation],
  operation: (pixels, data) => {
    const elevation = decodeElevation(pixels[0].slice(0, 3));
    if (elevation === -10000) {
      return [0, 0, 0, 0];
    }
    if (elevation > data.dataMax) {
      data.dataMax = elevation;
    }
    if (elevation < data.dataMin) {
      data.dataMin = elevation;
    }
    const v = scaleElevation(elevation, data.displayMin, data.displayMax)
    return [v, v, v, 200];

  },
  lib: {
    decodeElevation: decodeElevation,
    scaleElevation: scaleElevation,
  }
});

raster.set('dataMax', 0);
raster.set('displayMax', 0);
raster.set('dataMin', 1000);
raster.set('displayMin', 1000);

raster.on('beforeoperations', (event) => {
  event.data.dataMax = 0;
  event.data.dataMin = 1000;
  event.data.displayMax = raster.get('displayMax');
  event.data.displayMin = raster.get('displayMin');
});

raster.on('afteroperations', (event) => {
    if ((event.data.dataMax !== event.data.displayMax) || (event.data.dataMin !== event.data.displayMin)) {
      raster.set('displayMax', event.data.dataMax);
      raster.set('displayMin', event.data.dataMin);
      raster.refresh();
    }
  }
);

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    new ImageLayer({
      source: raster
    })
  ],
  view: new View({
    center: [2566000, 9138000],
    zoom: 14
  })
});
