IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uye_notlari' AND xtype='U')
CREATE TABLE uye_notlari (
  id INT IDENTITY(1,1) PRIMARY KEY,
  uye_id INT NOT NULL,
  kullanici_id INT NOT NULL,
  metin NVARCHAR(MAX) NOT NULL,
  olusturmaTarihi DATETIME DEFAULT GETDATE(),
  guncellemeTarihi DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (uye_id) REFERENCES uyeler(id) ON DELETE CASCADE,
  FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id) ON DELETE CASCADE,
  CONSTRAINT UQ_uye_notlari_uye_kullanici UNIQUE (uye_id, kullanici_id)
)
GO
