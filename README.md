# TrEnCh-IR
**Tr**anslating **En**vironmental **Ch**ange into organismal responses, using **I**nfra**R**ed imaging.

[Website](http://trench-ir.azurewebsites.net/) | [Trench Project](https://trenchproject.github.io/)

<img src="/public/images/logo.png" width="200px" height="200px">

## Seeing the world from a thermal perspective
Infrared imagery offers a unique opportunity to see biophysical properties in real time. We can watch organisms heat up, cool down, and generally transfer heat back and forth throughout their environment. In the TrEnCh Project, we use infrared imagery to help people see the world from a thermal perspective because we believe it’s an intuitive first step to understanding microclimate and the impacts of warming.

<img src="/public/images/gallery_2.jpg" height="200px">

## Tech Stack
TrEnCh-IR is built using Azure Web Services, Node.js, Handlebars, exiftool, imagemagick, and ffmpeg. The website is continuously deployed and updated from this git repo. 

## How To Contribute

### Server-side
Trench-IR is hosted on Azure web services from Microsoft. Access to the resource group is managed by Dr. Buckley. Once authorized, Trench-IR can be managed from the [azure portal](https://portal.azure.com/#home). The following resources can be accessed through the portal:
- Biology (Lab) assigned to SADM_LBUCKLEY (Subscription), huckley (Resource group), appservice (App service plan): These 3 are high-level subscription management, mostly finalized and not important for code changes
- trenchir (Storage account): Holds all of the thermal images and metadata uploaded to the website. View the stored data through trenchir > Stroage explorer (preview) > Blob containers
- trench-ir (App service): The app service controls the front-end of Trench-IR (the website itself). It is updated anytime the git repository is updated.
- trenchir (Function app): The function app is called everytime a new image is uploaded the website. The app service sends the image and metadata to the function app. The function app takes the image, extracts and produces the various secondary images (raw, iron, greyscale, rainbow, parameter files), and saves them to the storage account. The function app is regularly deployed and updated by its own [github repository](https://github.com/trenchproject/trenchir-functions) 

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
