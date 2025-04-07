// planning-center-webhook.js
// Node.js application to receive Planning Center webhooks and send data to Airtable

const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import our Airtable methods
const { 
  writeToAirtable, 
  readFromAirtable,
  transformWebhookToAirtableRecord,
  getTableSchema
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
app.post('/test-write', async (req, res) => {
  try {
    // Get schema info first to understand our table
    const schema = await getTableSchema();
    console.log('Table schema:', schema);
    
    // See what Status values might be valid
    const statusOptions = schema.recommendedValues?.Status || ['New', 'In Progress', 'Completed', 'Pending'];
    
    // Use the first available status option, or 'New' if that's not possible
    const safeStatus = statusOptions[0] || 'New';
    console.log('Using status:', safeStatus);
    
    const testRecord = {
      fields: {
        // 'Name': 'Test User ' + new Date().toISOString().split('T')[0],
        'Name': req.body.name,
        // 'Notes': 'This is a test record created via API at ' + new Date().toISOString(),
        'Notes': req.body.notes,
      }
    };
    
    // Only include Status if we have valid options
    if (safeStatus) {
      testRecord.fields['Status'] = safeStatus;
    }
    
    console.log('Creating record:', testRecord);
    const createdRecords = await writeToAirtable([testRecord]);
    
    res.json({
      message: 'Successfully created test record in Airtable',
      schema: schema,
      recordUsed: testRecord,
      records: createdRecords.map(record => ({
        id: record.getId(),
        fields: record.fields
      }))
    });
  } catch (error) {
    console.error('Error writing to Airtable:', error);
    res.status(500).json({
      message: 'Error writing to Airtable',
      error: error.message,
      stack: error.stack
    });
  }
});

// Handle Planning Center webhooks
app.post('/webhook', async (req, res) => {
  console.log('Received webhook:', req.body);
  try {
    console.log('Received webhook from Planning Center:', JSON.stringify(req.body, null, 2));
    
    // First, get schema to understand our table structure
    const schema = await getTableSchema();
    console.log('Table schema for webhook processing:', schema);
    
    // Transform webhook data to Airtable format
    const rawAirtableRecord = transformWebhookToAirtableRecord(req.body);
    
    // Create a safe version of the record by only including fields likely to work
    const safeRecord = {
      fields: {
        // Always include Name and Notes which are text fields
        'Name': rawAirtableRecord.fields.Name || 'Webhook ' + new Date().toISOString()
      }
    };
    
    // Add Notes if it exists
    if (rawAirtableRecord.fields.Notes) {
      safeRecord.fields.Notes = rawAirtableRecord.fields.Notes;
    }
    
    // Only include Status if we have valid options
    const statusOptions = schema.recommendedValues?.Status || ['New', 'In Progress', 'Completed', 'Pending'];
    if (statusOptions.length > 0) {
      // Check if the status from the webhook is in our allowed list
      const webhookStatus = rawAirtableRecord.fields.Status;
      if (webhookStatus && statusOptions.includes(webhookStatus)) {
        safeRecord.fields.Status = webhookStatus;
      } else {
        // Default to the first allowed value
        safeRecord.fields.Status = statusOptions[0];
      }
    }
    
    console.log('Sending to Airtable:', safeRecord);
    
    // Add record to Airtable
    const createdRecords = await writeToAirtable([safeRecord]);
    
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
// Route to inspect table schema
app.get('/inspect-schema', async (req, res) => {
  try {
    const schema = await getTableSchema();
    res.json({
      message: 'Table schema information',
      schema: schema
    });
  } catch (error) {
    console.error('Error getting table schema:', error);
    res.status(500).json({
      message: 'Error getting table schema',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- Test read route: http://localhost:${PORT}/test-read`);
  console.log(`- Test write route: http://localhost:${PORT}/test-write`);
  console.log(`- Inspect schema route: http://localhost:${PORT}/inspect-schema`);
  console.log(`- Webhook endpoint: http://localhost:${PORT}/webhook`);
});