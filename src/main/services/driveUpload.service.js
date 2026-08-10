const fs = require('fs');
const { google } = require('googleapis');
const { credentialsPath } = require('../paths');

const FOLDER_ID = '15cQAlJ_iJobSO_II52Kd9alXBZJElfV-';

async function uploadToDrive(filePath, fileName) {
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  await drive.files.create({
    resource: {
      name: fileName,
      parents: [FOLDER_ID],
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: fs.createReadStream(filePath),
    },
    fields: 'id',
  });
}

module.exports = { uploadToDrive };
