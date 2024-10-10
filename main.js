import './style.css';
import { Map, View } from 'ol';
import { Image as ImageLayer, Tile as TileLayer} from 'ol/layer';
import WebGLTileLayer from 'ol/layer/WebGLTile.js';
import { XYZ, Raster as RasterSource, OSM, GeoTIFF, ImageWMS, TileWMS, WMTS } from 'ol/source';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';

import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';
import {get as getProjection} from 'ol/proj';

proj4.defs("EPSG:3067","+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);

// Apufunktioita rgb-enkoodatun korkeustiedon käsittelyyn (https://documentation.maptiler.com/hc/en-us/articles/4405444055313-RGB-Terrain-by-MapTiler)
const decodeElevation = ([R, G, B]) => {
  return -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1);
};

const scaleElevation = (elevation, min, max) => {
  return ((elevation - min) / (max - min)) * 255
}


// Dynaaminen värjäys parsien min/max-arvot pikseleittäin. Käytä mieluummin kuvaoperaatiota!
const elevation = new XYZ({
  url: './tiles/{z}/{x}/{y}.png',
  maxZoom: 15,
  interpolate: false,
});

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

raster.set('dataMax', -10000);
raster.set('displayMax', -10000);
raster.set('dataMin', 1667721.5);
raster.set('displayMin', 1667721.5);

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

// Dynaaminen värjäys parsien min/max-arvot näkyvästä kuvasta
const elevation3067 = new XYZ({
  url: './tiles3067/{z}/{x}/{-y}.png',
  maxZoom: 12,
  interpolate: false,
  projection: 'EPSG:3067',
  tileGrid: new WMTSTileGrid({ //JHS180 TM35FIN tilegrid
    extent: [-548576.000000,6291456.000000,1548576.000000,8388608.000000],
    resolutions: [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1, 0.5],
    matrixIds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  }),
});

const raster3067 = new RasterSource({ // HUOMIO! Tämä hoitaa värjäyksen dynaamisuuden
  sources: [elevation3067],
  operationType: 'image',
  operation: (imageData, data) => {
    const elevationImage = imageData[0].data;
    const pixelCount = imageData[0].width * imageData[0].height;
    let pixel, elevation, pixelValue;
    const elevationData = new Array(pixelCount)
    let minE = 1667721.5, maxE = -10000;
    for (let i = 0; i < pixelCount; i++) {
      pixel = elevationImage.slice(i*4, i*4+4);
      if (pixel[3] === 0) {
        elevationData[i] = -10000;
        continue;
      }
      elevationData[i] = decodeElevation(pixel.slice(0, 3));
      if (elevationData[i] === -10000) {
        continue;
      }
      if (elevationData[i] > maxE) {
        maxE = elevationData[i];
      }
      if (elevationData[i] < minE) {
        minE = elevationData[i];
      }
    }
    const elevationDisplayData = new Uint8ClampedArray(elevationImage.length);
    for (let i = 0; i < pixelCount; i++) {
      if (elevationData[i] === -10000) {
        elevationDisplayData[i*4] = 0;
        elevationDisplayData[i*4+1] = 0;
        elevationDisplayData[i*4+2] = 0;
        elevationDisplayData[i*4+3] = 0;
        continue;
      }
      pixelValue = scaleElevation(elevationData[i], minE, maxE);
      elevationDisplayData[i*4] = pixelValue;
      elevationDisplayData[i*4+1] = pixelValue;
      elevationDisplayData[i*4+2] = pixelValue;
      elevationDisplayData[i*4+3] = 255;
    }
    return {data: elevationDisplayData, width: imageData.width, height: imageData.height}
  },
  lib: {
    decodeElevation: decodeElevation,
    scaleElevation: scaleElevation,
  }
});

// const sampleTiff = new GeoTIFF({
//   sources: [{
//     url: './P3344E_3857.tif',
//     min: 25,
//     max: 82,
//     nodata: -9999
//   }],
//   normalize: true,
// });

// Geotiff kuvan staattinen esitys
const sampleTiff = new GeoTIFF({ // HUOMIO!! Tämä palikka hoitaa geotiff haun palvelimelta
  sources: [{
    url: './P3344Ecog.tif',
    min: 25,
    max: 82,
    nodata: -9999
  }],
  projection: 'EPSG:3067',
  normalize: true,
});

//https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/1.0.0/maastokartta/default/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png
const maastokarttaSource = new WMTS({
  url: 'https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts/',
  layer: 'maastokartta',
  matrixSet: 'ETRS-TM35FIN',
  projection: 'EPSG:3067',
  format: 'image/png?api-key=02ec4999-f9a5-4e20-905e-bdfc5b8da7d4',
  tileGrid: new WMTSTileGrid({
    extent: [-548576.000000,6291456.000000,1548576.000000,8388608.000000],
    resolutions: [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1, 0.5],
    matrixIds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  }),
  //  //maxExtent: 
  style: 'default',
});


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
    new TileLayer({
      source: maastokarttaSource
    }),
    // new TileLayer({ // Display the raw rgb dem tiles
    //   source: elevation
    // }),
    new ImageLayer({
      source: raster,
    }),
    // new TileLayer({ // Display the raw rgb dem tiles
    //   source: elevation3067
    // }),
    new ImageLayer({
      source: raster3067,
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
      style: { // HUOMIO!! Tyylillä saadaan värjättyä geotiff, esim rgb enkoodatuksi
        color: ['interpolate', ['linear'], ['band', 1], 0, '#000082', 0.2, '#3bd429', 0.4, '#e6e632', 0.6, '#784614', 0.8, '#c6b19c',  1, '#ffffff']
      }
    })
  ],
  view: new View({
    //center: [2566000, 9138000],
    zoom: 14,
    center: [300000, 7005000],
    projection: 'EPSG:3067'
  })
});
