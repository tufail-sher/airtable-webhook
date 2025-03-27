// planning-center-webhook.js
// Node.js application to receive Planning Center webhooks and send data to Airtable

const express = require('express');
const bodyParser = require('body-parser');
const Airtable = require('airtable');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Configure Airtable
const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY})
  .base(process.env.AIRTABLE_BASE_ID);
const tableName = 'Test'; // Your specified table name

// Root route for easy testing
app.get('/', (req, res) => {
  res.send('Planning Center to Airtable webhook service is running!');
});

// Handle Planning Center webhooks
app.post('/webhook', async (req, res) => {
  try {
    console.log('Received webhook from Planning Center:', JSON.stringify(req.body, null, 2));
    
    // Extract data from the webhook payload
    const { data, action } = req.body;
    
    if (!data) {
      console.log('No data received in webhook');
      return res.status(400).send('No data received');
    }
    
    // Transform the data for Airtable with your specific fields
    const airtableRecord = {
      fields: {
        'Name': extractName(data),
        'Notes': extractNotes(data),
        'Status': extractStatus(data, action)
      }
    };
    
    console.log('Sending to Airtable:', airtableRecord);
    
    // Add record to Airtable
    const result = await base(tableName).create([airtableRecord]);
    
    console.log('Successfully added record to Airtable:', result);
    res.status(200).send('Success');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Helper functions to extract data from Planning Center payload
function extractName(data) {
  if (data.attributes) {
    if (data.attributes.first_name && data.attributes.last_name) {
      return `${data.attributes.first_name} ${data.attributes.last_name}`;
    }
    if (data.attributes.name) {
      return data.attributes.name;
    }
    if (data.attributes.title) {
      return data.attributes.title;
    }
  }
  
  // If we can't find a name, return a default with timestamp
  return `Planning Center Item - ${new Date().toISOString()}`;
}

function extractNotes(data) {
  if (data.attributes) {
    if (data.attributes.description) {
      return data.attributes.description;
    }
    if (data.attributes.notes) {
      return data.attributes.notes;
    }
  }
  
  // Return raw data as notes if no specific notes field exists
  return `Raw data: ${JSON.stringify(data)}`;
}

function extractStatus(data, action) {
  // If the webhook provides an action, use it as status
  if (action) {
    return action.toUpperCase(); // e.g., "created", "updated"
  }
  
  // Check if data has a status field
  if (data.attributes && data.attributes.status) {
    return data.attributes.status;
  }
  
  // Default status
  return "RECEIVED";
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});