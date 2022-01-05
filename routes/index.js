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

// Use a random number to generate a unique file name, 
  // removing "0." from the start of the string.
const getBlobName = originalName => {
  const identifier = Math.random().toString().replace(/0\./, '');
  return `${identifier}-${originalName}`;
};

//
// Builds data for GALLERY page 
//
router.get('/gallery', async (req, res, next) => {

  // viewData is populated by this function and includes
  // all data displayed on the resulting page
  let viewData;

  try {
    const containerClientOG = blobServiceClient.getContainerClient('iron');
    const containerClientUP = blobServiceClient.getContainerClient('uploads');

    // Setting default filters for displaying on gallery
    if(!req.query.biome){
      req.query.biome = "terrestrial";
    }
    if(!req.query.substrate){
      req.query.substrate = "all";
    }
    if(!req.query.fauna){
      req.query.fauna = "all";
    }
    if(!req.query.flora){
      req.query.flora = "all";
    }
    
    // searchExpression must include at least biome selection
    var searchExpression = "@container='uploads' AND Biome = '"+req.query.biome+"'";

    // if substrate is filtered, add to search expression
    if(req.query.substrate != "all"){
      searchExpression = searchExpression + " AND Substrate = '"+req.query.substrate+"'";
    }

    // if fauna is filtered, add to search expression
    if(req.query.fauna != "all"){
      searchExpression = searchExpression + " AND Fauna1 = '"+req.query.fauna+"'";
    }

    // if flora is filtered, add to search expression
    if(req.query.flora != "all"){
      searchExpression = searchExpression + " AND Flora1 = '"+req.query.flora+"'";
    }

    // Getting blobs from UPLOADS container which match filters
    // UPLOADS container contains all the blob index tags you can filter on
    // IRON (containerClientOG) does not include blob index tags and cannot filter
    var listBlobsResponseUP = blobServiceClient.findBlobsByTags(searchExpression, );
    const listBlobsResponseOG = await containerClientOG.listBlobFlatSegment(undefined, { include: ["metadata","tags"] });

    // Matching filtered UPLOADS blobs with IRON blobs
    const blobs = [];
    for await (const blobUP of listBlobsResponseUP) {
      for await(const blobOG of listBlobsResponseOG.segment.blobItems){
        if(blobOG.name.slice(5) == blobUP.name){ // if the blobs are the same image
          const properties = await containerClientUP.getBlobClient(blobUP.name).getProperties();
          const tag = await containerClientUP.getBlobClient(blobUP.name).getTags();

          // adding all the metadata from UPOLOADS to the IRON image
          blobOG.tags = tag.tags;
          blobOG.metadata = properties.metadata;
          blobOG.name = blobUP.name;

          // Adding blob to list which will display on gallery page
          blobs.push(blobOG);
        }
      }
    }

    viewData = {
      title: 'Home',
      viewName: 'gallery',
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
      containerName: 'iron'
    };

    // If there are any matching filtered blobs
    if (blobs.length) {
      viewData.images = blobs;
    }

    // Tells the gallery page what the applied filters are
    viewData.biome = req.query.biome;
    viewData.substrate = req.query.substrate;
    viewData.fauna = req.query.fauna;
    viewData.flora = req.query.flora;
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

// No blob data needed for home page 
router.get('/', async (req, res, next) => {
  res.render('index');
});

// No blob data needed for about page 
router.get('/about', async (req, res, next) => {
  res.render('about');
});

// No blob data needed for science page 
router.get('/science', async (req, res, next) => {
  res.render('science');
});

// No blob data needed for king penguin page 
router.get('/king-penguins', async (req, res, next) => {
  res.render('king-penguins');
});

// No blob data needed for koala page 
router.get('/koalas', async (req, res, next) => {
  res.render('koalas');
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

    // Matching the UPLOADS blob including metadata with IRON blob
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

    // Adding all blobs to the map page
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

// No blob data needed for upload page 
router.get('/upload', async (req, res, next) => {
  res.render('upload');
});

// No blob data needed for case studies page 
router.get('/case-studies', async (req, res, next) => {
  res.render('case-studies');
});


//
// This function fires when an image was uploaded by a user
// and it sends it to the backend trench-ir function app
// to be converted
//
router.post('/', uploadStrategy, async (req, res) => {
  var fileKeys = Object.keys(req.files);

  fileKeys.forEach(async function(key){
    const blobName = getBlobName(req.files[key].originalname);
    const stream = getStream(req.files[key].buffer);
    const containerClient = blobServiceClient.getContainerClient('uploads');
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Getting all uploader-sent specifics for filtering later on
    var biome, biomespecific, substrate;
    if(!req.body.biome) biome = 'NA';
    else biome = req.body.biome;

    if(!req.body.biomespecific) biomespecific = 'NA';
    else biomespecific = req.body.biomespecific;

    if(!req.body.substrate) substrate = 'NA';
    else substrate = req.body.substrate;

    try {
      // Uploads the image to the uploads folder
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
// Builds and serves an individual image's page
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