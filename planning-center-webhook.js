// planning-center-webhook.js
// Node.js application to receive Planning Center webhooks and send data to Airtable

const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import our Airtable methods
const { 
  writeToAirtable, 
  readFromAirtable,
  transformWebhookToAirtableRecord 
} = require('./airtable-methods');

const app = express();
app.use(bodyParser.json());

// Root route for easy testing
app.get('/', (req, res) => {
  res.send('Planning Center to Airtable webhook service is running!');
});

// Route to test reading from Airtable
app.get('/test-read', async (req, res) => {
  try {
    const records = await readFromAirtable({
      maxRecords: 10,
      view: 'Grid view'
    });
    
    res.json({
      message: 'Successfully read records from Airtable',
      recordCount: records.length,
      records: records
    });
  } catch (error) {
    console.error('Error reading from Airtable:', error);
    res.status(500).json({
      message: 'Error reading from Airtable',
      error: error.message
    });
  }
});

// Route to test writing to Airtable
app.get('/test-write', async (req, res) => {
  try {
    const testRecords = [
      {
        fields: {
          'Name': 'Test User',
          'Notes': 'This is a test record created via API',
          'Status': 'TEST'
        }
      }
    ];
    
    const createdRecords = await writeToAirtable(testRecords);
    
    res.json({
      message: 'Successfully created test record in Airtable',
      records: createdRecords.map(record => ({
        id: record.getId(),
        fields: record.fields
      }))
    });
  } catch (error) {
    console.error('Error writing to Airtable:', error);
    res.status(500).json({
      message: 'Error writing to Airtable',
      error: error.message
    });
  }
});

// Handle Planning Center webhooks
app.post('/webhook', async (req, res) => {
  try {
    console.log('Received webhook from Planning Center:', JSON.stringify(req.body, null, 2));
    
    // Transform webhook data to Airtable format
    const airtableRecord = transformWebhookToAirtableRecord(req.body);
    
    console.log('Sending to Airtable:', airtableRecord);
    
    // Add record to Airtable
    const createdRecords = await writeToAirtable([airtableRecord]);
    
    console.log('Successfully added record to Airtable:', createdRecords);
    res.status(200).json({
      message: 'Successfully processed webhook and added to Airtable',
      recordId: createdRecords[0].getId()
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      message: 'Error processing webhook',
      error: error.message
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- Test read route: http://localhost:${PORT}/test-read`);
  console.log(`- Test write route: http://localhost:${PORT}/test-write`);
  console.log(`- Webhook endpoint: http://localhost:${PORT}/webhook`);
});