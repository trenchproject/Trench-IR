# TrEnCh-IR
**Tr**anslating **En**vironmental **Ch**ange into organismal responses, using **I**nfra**R**ed imaging.

[Website](https://trench-ir.trenchproject.com/) | [Trench Project](https://www.trenchproject.com/)

<img src="/public/images/logo.png" width="200px" height="200px">

## Seeing the world from a thermal perspective
Infrared imagery offers a unique opportunity to see biophysical properties in real time. We can watch organisms heat up, cool down, and generally transfer heat back and forth throughout their environment. In the TrEnCh Project, we use infrared imagery to help people see the world from a thermal perspective because we believe it’s an intuitive first step to understanding microclimate and the impacts of warming.

<img src="/public/images/gallery_2.jpg" height="200px">

## Tech Stack
TrEnCh-IR is built using Azure Web Services, Node.js, Handlebars, exiftool, imagemagick, and ffmpeg. The website is continuously deployed and updated from this git repo. 

## How To Contribute

### Adding educational resources
* Copy one of the educational pages (e.g. views > koalas.hbs), rename the copy and keep in the views folder.
* Create your educational case study.
* Once ready, a couple things need to be edited to have it show up correctly on the website.
  * Add a link for it in the dropdown menu. This will look like the line of code below. Obviously change the "koalas" to what your short title is. This then has to be pasted in EACH of the .hbs files (so it shows up on each page).
    * <a class="dropdown-item" href="/koalas">Case Study: Koalas</a>
  * Open routes > index.js. Add the following line of code to the file. Again, change the "koalas" to the name of your file. 
    * router.get('/koalas', async (req, res, next) => { res.render('koalas'); });
* Push your code to this repo and it should show up on the website!

### Server-side
Trench-IR is hosted on Azure web services from Microsoft. Access to the resource group is managed by Dr. Buckley. Once authorized, Trench-IR can be managed from the [azure portal](https://portal.azure.com/#home). The following resources can be accessed through the portal:
- Biology (Lab) assigned to SADM_LBUCKLEY (Subscription), huckley (Resource group), appservice (App service plan): These 3 are high-level subscription management, mostly finalized and not important for code changes
- trenchir (Storage account): Holds all of the thermal images and metadata uploaded to the website. All updates are done through the Azure portal. View the stored data through trenchir > Stroage explorer (preview) > Blob containers
  - uploads: This container houses every image (which successfully converted or not) that has been uploaded. It also contains all the necessary metadata for thermal conversions and all the blob index tags used for filtering. Every following container houses pieces or conversions of these uploads files.
  - originals: This container thouses the uploaded images which were successfully converted by the website. It does not imclude the metadata for thermal conversions or the blob index tags.
  - raw: This container houses the raw thermal image data within the uploaded image.
  - embedded: This container houses the (optional) "normal" digital camera image the thermal image is of. 
  - param: This container houses the thermal parameters within the uploaded image useful in thermal conversion.
  - iron, grey, rain: These three containers house the created temperature-coded images with ironbow, rainbow, and grayscale palettes. They do not have the underlying thermal data, but are the most visually distinctive and understandble exports. 
- trench-ir (App service): The app service controls the front-end of Trench-IR (the website itself). It is updated anytime this git repository is updated. More information is found in comments throughout the code files. The bulk of work is within the index.js file and the many .hbs files.
- trenchir (Function app): The function app is called everytime a new image is uploaded the website. The app service sends the image, metadata, and blob index tags to the function app. The function app takes the image, extracts and produces the various secondary images (raw, iron, greyscale, rainbow, embedded, and parameter files), and saves them to their respoective containers in the storage account. The function app is regularly deployed and updated by its own [github repository](https://github.com/trenchproject/trenchir-functions) and more details are in the comments of the code at that repo.

### Local-side
To work on the code and contribute to this project:
- Clone this git repository
- Install VS Code
- Open the folder in VSCode and peruse the file structure. Understand how the various files connect. 
- Use "npm start" to locally deploy at localhost:3000
- Push working code

The function app is located in its own [github repository](https://github.com/trenchproject/trenchir-functions) 

### Debugging
Most debugging will be within the function app. My general process:
- Open azure portal
- Navigate to trenchir (function app) > Functions > flir_to_raw > Code and test
- DO NOT EDIT THIS COPY OF THE FUNCTION APP. All edits should be done through the [github repository](https://github.com/trenchproject/trenchir-functions) 
- Open "Logs", located at the bottom of the screen.
- You will be connected to the server-hosted function app.
- Send an image through the [website](https://trench-ir.trenchproject.com/) and you will be able to see the error thrown.

### Quick explanation of TrenchIR under-the-hood
#### Image Upload
- User upload FLIR JPG and custom metadata on Upload page on web app
- Web app saves image and metadata to “uploads” blob container
- Function app is triggered by new image in “uploads” blob container
- Function app extracts metadata, RAW image, embedded image
- Function app uses metadata and RAW image to create temperature-coded images with ironbow, rainbow, and grayscale palettes
- Function app saves: Ironbow image to “iron” blob container, Rainbow image to “rain” blob container, Grayscale image to “grey” blob container, FLIR jpg (original, uploaded image) image to “originals” blob container, Raw data to “raw” blob container, Digital image to “embedded” blob container, Internal image parameters to “param” blob container

#### Gallery and Map Generation
- Web app gallery page populated by the “iron” blob container, each image links to a dynamically generated web page
- Web app map page populated by the “iron” blob container, each image links to a dynamically generated web page
- Individual image webpage hosts slider between digital image and temperature-coded image, download links, and image metadata
