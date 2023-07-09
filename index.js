#!/usr/bin/env node

import {program} from 'commander';
import axios from 'axios'
import dotenv from 'dotenv';

dotenv.config();

async function createSite() {
  try {
    const { NETLIFY_API_TOKEN } = process.env;

    if (!NETLIFY_API_TOKEN) {
      console.error('Error: Netlify API token is missing. Make sure to provide NETLIFY_API_TOKEN in your environment variables.');
      return;
    }

    const apiUrl = 'https://api.netlify.com/api/v1/sites';

    const response = await axios.post(apiUrl, {}, {
      headers: {
        Authorization: `Bearer ${NETLIFY_API_TOKEN}`
      }
    });

    const siteId = response.data.site_id;
    console.log('New site created. Site ID:', siteId);

    // Perform any additional operations with the created site ID
    return siteId;

  } catch (error) {
    console.error('Error creating new site in Netlify:', error.response.data);
  }
}

async function deployToNetlify(path) {
  try {
    const { NETLIFY_API_TOKEN } = process.env;

    if (!NETLIFY_API_TOKEN || !path) {
      console.error('Error: Netlify credentials or path are missing. Make sure to provide NETLIFY_API_TOKEN and NETLIFY_PATH in your .env file, or pass the path argument when running the command.');
      return;
    }

    console.log('Deploying to Netlify...');

    const siteId = await createSite();
    if (!siteId) {
      console.error('Error: Could not retrieve the site ID. Make sure the site has been previously deployed.');
      return;
    }

    const buildPath = path.join(process.cwd(), path);
    console.log("build directory path", buildPath);
    const zipPath = await zipDirectory(buildPath);
    console.log("zip create path", zipPath);
    const deployUrl = `https://api.netlify.com/api/v1/sites/${siteId}/deploys`;

    const formData = new FormData();
    formData.append('functionsZip', fs.createReadStream(zipPath));

    const response = await axios.post(deployUrl, formData, {
      headers: {
        Authorization: `Bearer ${NETLIFY_API_TOKEN}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    const deployId = response.data.id;
    console.log('Deployment initiated. Deploy ID:', deployId);
    console.log('You can monitor the deployment status in the Netlify dashboard.');

  } catch (error) {
    console.error('Error deploying to Netlify:', error);
  }
}


// Helper function to create a zip file of the build directory
function zipDirectory(source, output) {
  const archiver = require('archiver');
  const zipPath = path.join(process.cwd(), 'build.zip');

  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(zipPath);

    archive
      .directory(source, false)
      .on('error', (error) => reject(error))
      .pipe(stream);

    stream.on('close', () => resolve(zipPath));
    archive.finalize();
  });
}

program
  .command('deploy [path]')
  .description('Redeploy the previously deployed React app to Netlify')
  .action(async (path) => {
    if (!path) {
      // Set a default path if none is provided
      path = path.join(process.cwd(), 'build');
    }
    await deployToNetlify(path);
  });

program.parse(process.argv);