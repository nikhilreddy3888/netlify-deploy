#!/usr/bin/env node

const { program } = require('commander');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

async function getSiteId() {
  try {
    const { NETLIFY_API_TOKEN, NETLIFY_SITE_ID } = process.env;

    if (NETLIFY_SITE_ID) {
      console.log('Using existing site ID from .env file:', NETLIFY_SITE_ID);
      return NETLIFY_SITE_ID;
    }

    if (!NETLIFY_API_TOKEN) {
      console.error('Error: Netlify API token is missing. Make sure to provide NETLIFY_API_TOKEN in your .env file.');
      return;
    }

    console.log('Retrieving the existing site ID...');

    const response = await axios.get('https://api.netlify.com/api/v1/sites', {
      headers: {
        Authorization: `Bearer ${NETLIFY_API_TOKEN}`
      }
    });

    const sites = response.data;
    if (!sites || sites.length === 0) {
      console.error('Error: No sites found. Make sure you have previously deployed the site.');
      return;
    }

    const existingSite = sites[0]; // Assuming you want the first site in the list
    const siteId = existingSite.site_id;

    console.log('Existing site ID:', siteId);

    // Save the site ID to the .env file
    fs.appendFileSync('.env', `\nNETLIFY_SITE_ID=${siteId}`);
    
    console.log('Site ID saved to .env file.');

    return siteId;
  } catch (error) {
    console.error('Error retrieving the existing site ID:', error);
    throw error;
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

    const siteId = await getSiteId();
    if (!siteId) {
      console.error('Error: Could not retrieve the site ID. Make sure the site has been previously deployed.');
      return;
    }

    const response = await axios.post(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      { dir: path },
      {
        headers: {
          Authorization: `Bearer ${NETLIFY_API_TOKEN}`
        }
      }
    );

    const deployId = response.data.id;
    console.log('Deployment initiated. Deploy ID:', deployId);
    console.log('You can monitor the deployment status in the Netlify dashboard.');

  } catch (error) {
    console.error('Error deploying to Netlify:', error);
  }
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