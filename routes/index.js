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

//
// Builds data for GALLERY page 
//
router.get('/gallery', async (req, res, next) => {

  let viewData;

  try {
    const containerClientOG = blobServiceClient.getContainerClient('iron');
    const containerClientUP = blobServiceClient.getContainerClient('uploads');
    
    var searchExpression = "@container='uploads' AND Fauna1 = 'Mammal'";
    var listBlobsResponseUP = blobServiceClient.findBlobsByTags(searchExpression, );

    const blobs = [];
    for await (const blobUP of listBlobsResponseUP) {
      const properties = containerClientUP.getBlobClient(blobUP.name).getProperties();
      var check = blobServiceClient.GetContainerReference('iron').GetBlockBlobReference('IRON-'+blobUP.name);
      if (check.exists()){
        var blobOG = containerClientOG.getBlobClient(blobUP.name);
        blobOG.metadata = properties.metatdata;
        blobOG.tags = blobUP.tags;
        blobs.push(blobOG);
      }
    }

    viewData = {
      title: 'Home',
      viewName: 'gallery',
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
      containerName: 'iron'
    };

    if (blobs.length) {
      viewData.images = blobs;
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


//
// Builds data for MAP page 
//
router.get('/map', async (req, res, next) => {

  let viewData;

  try {
    const containerClientOG = blobServiceClient.getContainerClient('iron');
    const containerClientUP = blobServiceClient.getContainerClient('uploads');
    const listBlobsResponseOG = await containerClientOG.listBlobFlatSegment(undefined, { include: ["metadata"] });
    const listBlobsResponseUP = await containerClientUP.listBlobFlatSegment(undefined, { include: ["metadata"] });

    for await (const blobOG of listBlobsResponseOG.segment.blobItems) {
      for await (const blobUP of listBlobsResponseUP.segment.blobItems) {
        if(blobOG.name.slice(5) == blobUP.name){
          blobOG.metadata = blobUP.metadata;
          blobOG.name = blobUP.name;
        }
      }
    }

    viewData = {
      title: 'Home',
      viewName: 'map',
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
      containerName: 'iron'
    };

    if (listBlobsResponseOG.segment.blobItems.length) {
      viewData.images = listBlobsResponseOG.segment.blobItems;
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


//
// Sends uploaded image to container
//
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

    // 'GPSLatitude': req.body.geoLat, 'GPSLongitude': req.body.geoLon
    try {
      await blockBlobClient.uploadStream(stream,
        uploadOptions.bufferSize, uploadOptions.maxBuffers,
        { blobHTTPHeaders: { blobContentType: "image/jpeg" }, 
        metadata: { 'Description': req.body.desc, 'ContributorLink': req.body.contributorlink, 'Location': req.body.location }, 
        tags: { 'ScientificName': req.body.species, 'CommonName': req.body.common, 'Fauna1': req.body.fauna1,
        'Fauna2': req.body.fauna2, 'Flora1': req.body.flora1, 'Flora2': req.body.flora2, 'Biome': biome, 
        'SpecificBiome': biomespecific, 'Substrate': substrate, 'Contributor': req.body.contributor} });
      res.render('success', { message: 'File uploaded to Azure Blob storage.' });
    } catch (err) {
      res.render('error', { message: err.message });
    }
  });
});


//
// Builds and serves individual page
//
router.get('/page', async (req, res, next) => {
  try {
    let viewData = {name:'', species:'', common:'', desc:'', fauna1:'', fauna2:'', flora1:'', flora2:'', biome:'', biomespecific:'', substrate:'', contributor:'', contributorlink:'', location:''};
    viewData.name = req.query.name;
    viewData.species = req.query.species;
    viewData.common = req.query.common;
    viewData.desc = req.query.desc;
    viewData.fauna1 = req.query.fauna1;
    viewData.fauna2 = req.query.fauna2;
    viewData.flora1 = req.query.flora1;
    viewData.flora2 = req.query.flora2;
    viewData.biome = req.query.biome;
    viewData.biomespecific = req.query.biomespecific;
    viewData.substrate = req.query.substrate;
    viewData.contributor = req.query.contributor;
    viewData.contributorlink = req.query.contributorlink;
    viewData.location = req.query.location;
    res.render('page', viewData);
  } catch(err){}
});


module.exports = router;