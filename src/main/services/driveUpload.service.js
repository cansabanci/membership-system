const fs = require('fs');
const { google } = require('googleapis');
const { credentialsPath } = require('../paths');

const FOLDER_ID = '1fFjRiP9QXLU4UJCzWD6RqdMg9o4jNX4j';

async function uploadToDrive(filePath, fileName) {
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    // "drive.file" kapsamı yalnızca uygulamanın kendi oluşturduğu dosyaları görebiliyor;
    // normal Paylaş menüsüyle paylaşılan bir klasöre erişmek için geniş "drive" kapsamı gerekiyor.
    scopes: ['https://www.googleapis.com/auth/drive'],
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
