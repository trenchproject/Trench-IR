if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  newPipeline
} = require('@azure/storage-blob');

const express = require('express');
const router = express.Router();
const containerName1 = 'originals';
const multer = require('multer');
const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).array('image');
const getStream = require('into-stream');
const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };
const ONE_MINUTE = 60 * 1000;

const sharedKeyCredential = new StorageSharedKeyCredential(
  String(process.env.AZURE_STORAGE_ACCOUNT_NAME),
  String(process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY));
const pipeline = newPipeline(sharedKeyCredential);

const blobServiceClient = new BlobServiceClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
  pipeline
);

const getBlobName = originalName => {
  // Use a random number to generate a unique file name, 
  // removing "0." from the start of the string.
  const identifier = Math.random().toString().replace(/0\./, '');
  return `${identifier}-${originalName}`;
};

router.get('/gallery', async (req, res, next) => {

  let viewData;

  try {
    const containerClient = blobServiceClient.getContainerClient(containerName1);
    const listBlobsResponse = await containerClient.listBlobFlatSegment();

    for await (const blob of listBlobsResponse.segment.blobItems) {
      console.log(`Blob: ${blob.name}`);
    }

    viewData = {
      title: 'Home',
      viewName: 'gallery',
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
      containerName: containerName1
    };

    if (listBlobsResponse.segment.blobItems.length) {
      viewData.images = listBlobsResponse.segment.blobItems;
    }
  } catch (err) {
    viewData = {
      title: 'Error',
      viewName: 'error',
      message: 'There was an error contacting the blob storage container.',
      error: err
    };
    res.status(500);
  } finally {
    res.render(viewData.viewName, viewData);
  }
});

router.get('/', async (req, res, next) => {
  res.render('index');
});

router.get('/about', async (req, res, next) => {
  res.render('about');
});

router.get('/science', async (req, res, next) => {
  res.render('science');
});

router.get('/map', async (req, res, next) => {

  let viewData;

  try {
    const containerClient = blobServiceClient.getContainerClient(containerName1);
    const listBlobsResponse = await containerClient.listBlobFlatSegment(
      Aborter.None,
      undefined,
      {
        include: [
          ListBlobsIncludeItem.Metadata
        ]
      }
    );

    for await (const blob of listBlobsResponse.segment.blobItems) {
      console.log(`Blob: ${blob.name}`);
    }

    viewData = {
      title: 'Home',
      viewName: 'map',
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
      containerName: containerName1
    };

    if (listBlobsResponse.segment.blobItems.length) {
      viewData.images = listBlobsResponse.segment.blobItems;
    }
  } catch (err) {
    viewData = {
      title: 'Error',
      viewName: 'error',
      message: 'There was an error contacting the blob storage container.',
      error: err
    };
    res.status(500);
  } finally {
    res.render(viewData.viewName, viewData);
  }
});

router.get('/upload', async (req, res, next) => {
  res.render('upload');
});

router.get('/case-studies', async (req, res, next) => {
  res.render('case-studies');
});

router.post('/', uploadStrategy, async (req, res) => {
  var fileKeys = Object.keys(req.files);

  fileKeys.forEach(async function(key){
    const blobName = getBlobName(req.files[key].originalname);
    const stream = getStream(req.files[key].buffer);
    const containerClient = blobServiceClient.getContainerClient('uploads');
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    var biome, biomespecific, substrate;
    if(!req.body.biome) biome = 'NA';
    else biome = req.body.biome;

    if(!req.body.biomespecific) biomespecific = 'NA';
    else biomespecific = req.body.biomespecific;

    if(!req.body.substrate) substrate = 'NA';
    else substrate = req.body.substrate;

    try {
      await blockBlobClient.uploadStream(stream,
        uploadOptions.bufferSize, uploadOptions.maxBuffers,
        { blobHTTPHeaders: { blobContentType: "image/jpeg" }, metadata:{'GPSLatitude': req.body.geoLat, 'GPSLongitude': req.body.geoLon,
        'ScientificName': req.body.species, 'CommonName': req.body.common, 'Description': req.body.desc, 'Fauna1': req.body.fauna1,
        'Fauna2': req.body.fauna2, 'Flora1': req.body.flora1, 'Flora2': req.body.flora2, 'Biome': biome, 
        'SpecificBiome': biomespecific, 'Substrate': substrate} });
      res.render('success', { message: 'File uploaded to Azure Blob storage.' });
    } catch (err) {
      res.render('error', { message: err.message });
    }
  });
});

router.get('/page', async (req, res, next) => {
  try {
    let viewData = {name:''};
    viewData.name = req.query.name;
    res.render('page', viewData);
  } catch(err){}
});

module.exports = router;