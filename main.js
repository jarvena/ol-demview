import './style.css';
import {Map, View} from 'ol';
import {Image as ImageLayer} from 'ol/layer';
import TileLayer from 'ol/layer/Tile';
import { XYZ } from 'ol/source';
import OSM from 'ol/source/OSM';
import RasterSource from 'ol/source/Raster';
import TileSource from 'ol/source/Tile.js';

// const elevation = new TileSource({
//   attribution: '© NLS Finland',
//   url: './tiles/{z}/{x}/{y}.png',
//   maxZoom: 15
// });

const elevation = new XYZ({
  url: './tiles/{z}/{x}/{y}.png',
  maxZoom: 15
});

const decodeElevation = ([R, G, B]) => {
  return -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1);
};

//const elevation2color = (elevation) => {

const raster = new RasterSource({
  sources: [elevation],
  operation: (pixels, data) => {
    const elevation = decodeElevation(pixels[0].slice(0, 3));
    if (elevation === -10000) {
      return [0, 0, 0, 0];
    }
    const v = elevation % 256
    return [v, v, v, 200];

  },
  lib: {
    decodeElevation: decodeElevation,
  }
});
raster.set('toggle', 1);
raster.set('max', 0);
raster.set('min', 1000);

raster.on('beforeoperations', (event) => {
  event.data.max = raster.get('max');
  event.data.min = raster.get('min');
  event.data.toggle = raster.get('toggle');
});

raster.on('afteroperations', (event) => {
    //event.data.counter = 1
    console.log(event);
    console.log('muumi')
    raster.set('toggle', 1);
  }
);

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    // new TileLayer({
    //   source: elevation
    // })
    new ImageLayer({
      source: raster
    })
  ],
  view: new View({
    center: [2566000, 9138000],
    zoom: 13
  })
});
