const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD ayarlanmamış — .env dosyasını kontrol edin.');
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

// Sade, duz metin icerik — link/resim/pazarlama-tarzi bicimlendirme yok, spam filtrelerini
// tetikleme ihtimalini azaltmak icin bilerek minimal tutuldu.
async function sendOtpEmail(toEmail, code) {
  await getTransporter().sendMail({
    from: `"Mersin ODTÜ Mezunları Derneği" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Doğrulama Kodunuz',
    text: `Merhaba,\n\nÜye Kayıt Sistemi'nde hesabınızla ilgili bir işlem için doğrulama kodunuz:\n\n${code}\n\nBu kod 10 dakika geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.\n\nMersin ODTÜ Mezunları Derneği`,
  });
}

module.exports = { sendOtpEmail };
