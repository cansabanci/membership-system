// auth.ipc.js'teki passwordPolicyHatasi ile birebir ayni kural/mesajlar — Electron
// tarafindaki kopyaya bilerek dokunulmadi, bu API icin ayri ama ayni referans kopya.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function passwordPolicyHatasi(password) {
  if (password.length < PASSWORD_MIN_LENGTH) return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalı.`;
  if (!/[a-zğüşöçı]/.test(password)) return 'Şifre en az bir küçük harf içermeli.';
  if (!/[A-ZĞÜŞÖÇİ]/.test(password)) return 'Şifre en az bir büyük harf içermeli.';
  if (!/[0-9]/.test(password)) return 'Şifre en az bir rakam içermeli.';
  if (!/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ]/.test(password)) return 'Şifre en az bir özel karakter içermeli (*, ., , gibi).';
  return null;
}

module.exports = { EMAIL_REGEX, passwordPolicyHatasi };
