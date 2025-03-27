// airtable-methods.js
// Methods for reading from and writing to Airtable

var Airtable = require('airtable');

// Use environment variables in production
// For this example, we'll use the provided values
const API_KEY = process.env.AIRTABLE_API_KEY || 'your_api_key_here'; // Replace with env variable in production
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'app9RExLP4U518wyK';
const TABLE_NAME = 'Test';

var base = new Airtable({apiKey: API_KEY}).base(BASE_ID);

/**
 * Write data to Airtable
 * @param {Array} records - Array of record objects to create
 * @returns {Promise} - Resolves with created records
 */
async function writeToAirtable(records) {
  return new Promise((resolve, reject) => {
    base(TABLE_NAME).create(records, function(err, createdRecords) {
      if (err) {
        console.error('Error creating records in Airtable:', err);
        return reject(err);
      }
      
      console.log(`Created ${createdRecords.length} records in Airtable`);
      createdRecords.forEach(record => {
        console.log(`- Record ID: ${record.getId()}`);
      });
      
      resolve(createdRecords);
    });
  });
}

/**
 * Read data from Airtable
 * @param {Object} options - Query options
 * @returns {Promise} - Resolves with fetched records
 */
async function readFromAirtable(options = {}) {
  const queryOptions = {
    maxRecords: options.maxRecords || 100,
    view: options.view || 'Grid view',
    filterByFormula: options.filterByFormula || '',
    sort: options.sort || []
  };

  return new Promise((resolve, reject) => {
    const allRecords = [];
    
    base(TABLE_NAME)
      .select(queryOptions)
      .eachPage(
        function page(records, fetchNextPage) {
          records.forEach(record => {
            allRecords.push({
              id: record.getId(),
              fields: record.fields
            });
            console.log('Retrieved record:', record.get('Name'));
          });
          
          fetchNextPage();
        },
        function done(err) {
          if (err) {
            console.error('Error fetching records from Airtable:', err);
            return reject(err);
          }
          
          console.log(`Retrieved ${allRecords.length} records from Airtable`);
          resolve(allRecords);
        }
      );
  });
}

/**
 * Transform Planning Center webhook data into Airtable record format
 * @param {Object} webhookData - Data received from Planning Center webhook
 * @returns {Object} - Formatted record for Airtable
 */
function transformWebhookToAirtableRecord(webhookData) {
  const { data, action } = webhookData;
  
  if (!data) {
    return {
      fields: {
        'Name': 'Unknown',
        'Notes': 'No data received',
        'Status': 'ERROR'
      }
    };
  }
  
  return {
    fields: {
      'Name': extractName(data),
      'Notes': extractNotes(data),
      'Status': extractStatus(data, action)
    }
  };
}

// Helper functions for data extraction
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
  
  return `Raw data: ${JSON.stringify(data)}`;
}

function extractStatus(data, action) {
  if (action) {
    return action.toUpperCase();
  }
  
  if (data.attributes && data.attributes.status) {
    return data.attributes.status;
  }
  
  return "RECEIVED";
}

module.exports = {
  writeToAirtable,
  readFromAirtable,
  transformWebhookToAirtableRecord
};