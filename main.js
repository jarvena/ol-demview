import './style.css';
import { Map, View } from 'ol';
import { Image as ImageLayer, Tile as TileLayer} from 'ol/layer';
import WebGLTileLayer from 'ol/layer/WebGLTile.js';
import { XYZ, Raster as RasterSource, OSM, GeoTIFF, ImageWMS, TileWMS, WMTS } from 'ol/source';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import Link from 'ol/interaction/Link.js';

import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';
import {get, get as getProjection} from 'ol/proj';

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
// const elevation = new XYZ({
//   url: './tiles/{z}/{x}/{y}.png',
//   maxZoom: 15,
//   interpolate: false,
// });

// const raster = new RasterSource({
//   sources: [elevation],
//   operation: (pixels, data) => {
//     if (pixels[3] === 0) {
//       return [0, 0, 0, 0];
//     }
//     const elevation = decodeElevation(pixels[0].slice(0, 3));
//     if (elevation === -10000) {
//       return [0, 0, 0, 0];
//     }
//     if (elevation > data.dataMax) {
//       data.dataMax = elevation;
//     }
//     if (elevation < data.dataMin) {
//       data.dataMin = elevation;
//     }
//     const v = scaleElevation(elevation, data.displayMin, data.displayMax)
//     return [v, v, v, 255];
//   },
//   lib: {
//     decodeElevation: decodeElevation,
//     scaleElevation: scaleElevation,
//   }
// });

// raster.set('dataMax', -10000);
// raster.set('displayMax', -10000);
// raster.set('dataMin', 1667721.5);
// raster.set('displayMin', 1667721.5);

// raster.on('beforeoperations', (event) => {
//   event.data.dataMax = 0;
//   event.data.dataMin = 1000;
//   event.data.displayMax = raster.get('displayMax');
//   event.data.displayMin = raster.get('displayMin');
// });

// raster.on('afteroperations', (event) => {
//     if ((event.data.dataMax !== event.data.displayMax) || (event.data.dataMin !== event.data.displayMin)) {
//       raster.set('displayMax', event.data.dataMax);
//       raster.set('displayMin', event.data.dataMin);
//       raster.refresh();
//     }
//   }
// );

// Dynaaminen värjäys parsien min/max-arvot näkyvästä kuvasta
// const elevation3067 = new XYZ({
//   url: './tiles3067/{z}/{x}/{-y}.png',
//   maxZoom: 12,
//   interpolate: false,
//   projection: 'EPSG:3067',
//   tileGrid: new WMTSTileGrid({ //JHS180 TM35FIN tilegrid
//     extent: [-548576.000000,6291456.000000,1548576.000000,8388608.000000],
//     resolutions: [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1, 0.5],
//     matrixIds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
//   }),
// });

const U4333GTiff = new GeoTIFF({ // HUOMIO!! Tämä palikka hoitaa geotiff haun palvelimelta
  sources: [{
    url: './U4333Gcog.tif',
    // min: 25,
    // max: 82,
    nodata: -9999
  }],
  projection: 'EPSG:3067',
  normalize: false,
});

const U4334GTiff = new GeoTIFF({
  sources: [{
    url: './U4334Gcog.tif',
    // min: 25,
    // max: 82,
    nodata: -9999
  }],
  projection: 'EPSG:3067',
  normalize: false,
});

const U5111CTiff = new GeoTIFF({
  sources: [{
    url: './U5111Ccog.tif',
    // min: 25,
    // max: 82,
    nodata: -9999
  }],
  projection: 'EPSG:3067',
  normalize: false,
});

const U5112CTiff = new GeoTIFF({
  sources: [{
    url: './U5112Ccog.tif',
    // min: 25,
    // max: 82,
    nodata: -9999
  }],
  projection: 'EPSG:3067',
  normalize: false,
  interpolate: false,
});


const vinovaloLayer = new TileLayer({
  title: "Maastonmuodot",
  source: new XYZ({
      attribution: "Trailmap.fi",
      url: 'https://static.trailmap.fi/varjomap/{z}/{x}/{y}.png',
      maxZoom: 14
  }),
  visible: false,
  opacity: 0.75,
})

const combinedHillshadeLayer = new TileLayer({
  title: "Combined Hillshade",
  source: new XYZ({
      url: './hillshade/{z}/{x}/{y}.png',
      minZoom: 12,
      maxZoom: 16
  }),
  visible: false,
  opacity: 0.8,
});

// combinedHillshadeLayer.on('prerender', (event) => { // Could be used for multiply blending mode, but does not support WebGL layers under
//   const ctx = event.context;
//   ctx.globalCompositeOperation = 'multiply';
// });

// combinedHillshadeLayer.on('postrender', (event) => {
//   const ctx = event.context;
//   ctx.globalCompositeOperation = 'normal';
// });

const getColorSteps = (min, max, steps) => {
  const vars = {}
  for (let i = 0; i < steps; i++) {
    const step = min + (max - min) * (i / (steps - 1));
    vars[`step${i}`] = step;
  }
  return vars
}

const staticElevationLayer = new WebGLTileLayer({
  source: U5111CTiff,
  style: {
    color: ['interpolate', ['linear'], ['band', 1], ['var', 'step0'], '#000082', ['var', 'step1'], '#3bd429', ['var', 'step2'], '#e6e632', ['var', 'step3'], '#784614', ['var', 'step4'], '#c6b19c',  ['var', 'step5'], '#ffffff'],
    variables: getColorSteps(167, 208, 6), // apply static color steps
  }
})

const continuouslyAdaptiveLayer = new WebGLTileLayer({
  source: U4333GTiff,
  style: {
    color: ['interpolate', ['linear'], ['band', 1], ['var', 'step0'], '#000082', ['var', 'step1'], '#3bd429', ['var', 'step2'], '#e6e632', ['var', 'step3'], '#784614', ['var', 'step4'], '#c6b19c',  ['var', 'step5'], '#ffffff'],
    variables: getColorSteps(25, 1500, 6), // apply initial color steps
  }
})

const postMovementAdaptiveLayer = new WebGLTileLayer({
  source: U4334GTiff,
  style: {
    color: ['interpolate', ['linear'], ['band', 1], ['var', 'step0'], '#000082', ['var', 'step1'], '#3bd429', ['var', 'step2'], '#e6e632', ['var', 'step3'], '#784614', ['var', 'step4'], '#c6b19c',  ['var', 'step5'], '#ffffff'],
    variables: getColorSteps(25, 1500, 6), // apply initial color steps
  }
})

const rasterOperationAdaptiveDataLayer = new WebGLTileLayer({
  source: U5112CTiff,
  style: { // RGB encode elevation values
    color: ['color', ['floor', ['/', ['*', ['+', ['band', 1], 10000], 10], 256**2]], ['floor', ['/', ['%', ['*', ['+', ['band', 1], 10000], 10], 256**2], 256]], ['floor', ['%', ['*', ['+', ['band', 1], 10000], 10], 256]], 1],
  },
  visible: false,
})

const rasterOperationAdaptiveSource = new RasterSource({
  sources: [rasterOperationAdaptiveDataLayer], 
  operationType: 'image',
  operation: (imageData, data) => {
    const elevationImage = imageData[0].data;
    const pixelCount = imageData[0].width * imageData[0].height;
    let pixel
    const elevationData = new Array(pixelCount)
    let minE = 1667721.5, maxE = -10000;
    
    // Korkeusarvojen purkaminen ja minimi- ja maksimiarvojen määrittäminen
    for (let i = 0; i < pixelCount; i++) {
      pixel = elevationImage.slice(i*4, i*4+4);
      if (pixel[3] === 0) { // NoData-arvo
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
    
    // Väriarvot, 14 eri luokkaa
    const colors = [
      [0, 64, 128],   
      [0, 128, 128],  
      [0, 160, 64],   
      [0, 176, 64],   
      [0, 192, 64],   
      [64, 192, 64],  
      [128, 192, 64], 
      [160, 192, 32], 
      [192, 192, 32], 
      [224, 160, 0],  
      [255, 128, 0],  
      [255, 64, 0],   
      [255, 32, 0],   
      [255, 0, 0]     
    ];

    // Korkeusarvot luokkiin ja värit interpolointiin
    const elevationDisplayData = new Uint8ClampedArray(elevationImage.length);
    for (let i = 0; i < pixelCount; i++) {

      if (elevationData[i] === -10000) {
        elevationDisplayData[i*4] = 0;  // Musta väri, jos NoData
        elevationDisplayData[i*4+1] = 0;
        elevationDisplayData[i*4+2] = 0;
        elevationDisplayData[i*4+3] = 0;
        continue;
      }

      // Korkeusarvon normalisointi välillä 0-1
      const normalizedElevation = (elevationData[i] - minE) / (maxE - minE);

      // Löydetään oikea luokka
      const classIndex = Math.min(Math.floor(normalizedElevation * 14), 13);  // 14 luokkaa (0-13)

      // Interpoloidaan värit luokkien välillä
      const lowerClass = classIndex;
      const upperClass = Math.min(classIndex + 1, 13);
      const lowerColor = colors[lowerClass];
      const upperColor = colors[upperClass];

      // Interpoloidaan värit
      const weight = normalizedElevation * 14 - classIndex;
      const red = Math.round(lowerColor[0] * (1 - weight) + upperColor[0] * weight);
      const green = Math.round(lowerColor[1] * (1 - weight) + upperColor[1] * weight);
      const blue = Math.round(lowerColor[2] * (1 - weight) + upperColor[2] * weight);

      // Tallennetaan värit pikseliin
      elevationDisplayData[i*4] = red;
      elevationDisplayData[i*4+1] = green;
      elevationDisplayData[i*4+2] = blue;
      elevationDisplayData[i*4+3] = 255; // Täysi läpinäkyvyys
    }

    return {data: elevationDisplayData, width: imageData.width, height: imageData.height};
  },
  lib: {
    decodeElevation: decodeElevation,
    scaleElevation: scaleElevation,
  }
});

const rasterOperationAdaptiveLayer = new ImageLayer({
  source: rasterOperationAdaptiveSource,
})

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    staticElevationLayer,
    continuouslyAdaptiveLayer,
    postMovementAdaptiveLayer,
    rasterOperationAdaptiveDataLayer,
    rasterOperationAdaptiveLayer,
    combinedHillshadeLayer,
    vinovaloLayer,
  ],
  view: new View({
    zoom: 13,
    center: [503000, 7443000],
    projection: 'EPSG:3067'
  })
});

const link = new Link() // Track map state in the URL
map.addInteraction(link);

const getVisibleMinMax = (layer) => {
  const mapSize = map.getSize();
  if (!mapSize || mapSize[0] === 0 || mapSize[1] === 0) {
    return;
  }
  let min = Infinity;
  let max = -Infinity;
  const decimationStep = 10
  for (let x = 0; x < mapSize[0]; x += decimationStep) {
    for (let y = 0; y < mapSize[1]; y += decimationStep) {
      const pixel = [x, y];
      const data = layer.getData(pixel);
      if (data) {
        min = Math.min(min, data[0]);
        max = Math.max(max, data[0]);
      }
    }
  }
  if (min < max) {
    layer.updateStyleVariables(getColorSteps(min, max, 6));
  }
}

continuouslyAdaptiveLayer.on('prerender', (event) => {
  getVisibleMinMax(continuouslyAdaptiveLayer)
})

map.on('moveend', () => {
  postMovementAdaptiveLayer.once('prerender', () => {
    getVisibleMinMax(postMovementAdaptiveLayer)
  })
})

const hillshadeButton = document.createElement('button');
hillshadeButton.textContent = 'Show combined hillshade';
hillshadeButton.style.position = 'absolute';
hillshadeButton.style.top = '10px';
hillshadeButton.style.right = '10px';
hillshadeButton.style.zIndex = 1000;
document.body.appendChild(hillshadeButton);

let hillshadeState = 0; // 0: none, 1: combined, 2: vinovalo

const updateHillshade = () => {
  combinedHillshadeLayer.setVisible(hillshadeState === 1);
  vinovaloLayer.setVisible(hillshadeState === 2);
  if (hillshadeState === 0) {
    hillshadeButton.textContent = 'Show combined hillshade';
  } else if (hillshadeState === 1) {
    hillshadeButton.textContent = 'Show directional hillshade';
  } else {
    hillshadeButton.textContent = 'Hide hillshade';
  }
};

hillshadeButton.addEventListener('click', () => {
  hillshadeState = (hillshadeState + 1) % 3;
  updateHillshade();
});

// Initialize state
combinedHillshadeLayer.setVisible(false);
vinovaloLayer.setVisible(false);
updateHillshade();

const rasterSwitchButton = document.createElement('button');
rasterSwitchButton.textContent = 'Show intermediate RGB DEM';
rasterSwitchButton.style.position = 'absolute';
rasterSwitchButton.style.top = '40px';
rasterSwitchButton.style.right = '10px';
rasterSwitchButton.style.zIndex = 1000;
document.body.appendChild(rasterSwitchButton);

let showingProcessed = true;

rasterSwitchButton.addEventListener('click', () => {
  if (showingProcessed) {
    rasterOperationAdaptiveLayer.setVisible(false);
    rasterOperationAdaptiveDataLayer.setVisible(true);
    rasterSwitchButton.textContent = 'Show elevation';
  } else {
    rasterOperationAdaptiveLayer.setVisible(true);
    rasterOperationAdaptiveDataLayer.setVisible(false);
    rasterSwitchButton.textContent = 'Show RGB DEM';
  }
  showingProcessed = !showingProcessed;
});