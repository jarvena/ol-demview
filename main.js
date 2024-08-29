import './style.css';
import { Map, View } from 'ol';
import { Image as ImageLayer, Tile as TileLayer} from 'ol/layer';
import WebGLTileLayer from 'ol/layer/WebGLTile.js';
import { XYZ, Raster as RasterSource, OSM, GeoTIFF, ImageWMS, TileWMS } from 'ol/source';

import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';
import {get as getProjection} from 'ol/proj';

proj4.defs("EPSG:3067","+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);

const elevation = new XYZ({
  url: './tiles/{z}/{x}/{y}.png',
  maxZoom: 15,
  interpolate: false,
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
    if (pixels[3] === 0) {
      return [0, 0, 0, 0];
    }
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
    return [v, v, v, 255];
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

// const sampleTiff = new GeoTIFF({
//   sources: [{
//     url: './ortho_3857.tif'
//   }]
// });

const sampleTiff = new GeoTIFF({
  sources: [{
    url: './P3344E_3857.tif',
    min: 25,
    max: 82,
    nodata: -9999
  }],
  normalize: true,
});

console.log(sampleTiff)

// const orthoTiff = new GeoTIFF({
//   sources: [{
//     url: './ortho.tif'
//   }],
//   projection: 'EPSG:3067',
//   normalize: true
// });

// const wcsSource = new ImageWMS({
//   url: 'https://avoin-karttakuva.maanmittauslaitos.fi/ortokuvat-ja-korkeusmallit/wcs/v2?api-key=7cd2ddae-9f2e-481c-99d0-404e7bc7a0b2&service=WCS&version=2.0.1',
//   params: {
//     'LAYERS': 'korkeusmalli_2m',
//     'format': 'image/tiff',
//     'SubsettingCRS': 'EPSG:3857',
//   },
//   imageLoadFunction: (image, src) => {
//     const extent = image.extent
//     const url = `https://avoin-karttakuva.maanmittauslaitos.fi/ortokuvat-ja-korkeusmallit/wcs/v2?api-key=7cd2ddae-9f2e-481c-99d0-404e7bc7a0b2&service=WCS&version=2.0.1&request=GetCoverage&CoverageID=korkeusmalli_2m&SubsettingCRS=EPSG:3857&format=image/tiff&CRS=EPSG:3857&SUBSET=E(${extent[0]},${extent[2]})&SUBSET=N(${extent[1]},${extent[3]})`
//     image.getImage().src = url;
//   }
// });

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    new ImageLayer({
      source: raster,
    }),
    
    // new WebGLTileLayer({
    //   source: orthoTiff
    // }),
    // new WebGLTileLayer({ // Does not work
    //   source: new GeoTIFF({
    //     sources: [{
    //       url: 'https://avoin-karttakuva.maanmittauslaitos.fi/ortokuvat-ja-korkeusmallit/wcs/v2?api-key=7cd2ddae-9f2e-481c-99d0-404e7bc7a0b2&service=WCS&version=2.0.1&request=GetCoverage&CoverageID=ortokuva_vari&SubsettingCRS=EPSG:3857&format=image/tiff&CRS=EPSG:3857&SUBSET=E(2564768.8175240895,2566696.1461528568)&SUBSET=N(9136905.97726411,9138297.617682349)',
    //       min: 50,
    //       max: 65
    //     }]
    //   }),
    // })
    // new ImageLayer({
    //   source: wcsSource
    // }),
    new WebGLTileLayer({
      source: sampleTiff,
      style: {
        color: ['interpolate', ['linear'], ['band', 1], 0, '#000082', 0.2, '#3bd429', 0.4, '#e6e632', 0.6, '#784614', 0.8, '#c6b19c',  1, '#ffffff']
      }
    })
  ],
  view: new View({
    center: [2566000, 9138000],
    zoom: 14
  })
});
