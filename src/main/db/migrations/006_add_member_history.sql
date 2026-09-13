IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uye_gecmisi' AND xtype='U')
CREATE TABLE uye_gecmisi (
  id INT IDENTITY(1,1) PRIMARY KEY,
  uye_id INT NOT NULL,
  kullanici_id INT NULL,
  veri NVARCHAR(MAX) NOT NULL,
  olusturmaTarihi DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (uye_id) REFERENCES uyeler(id) ON DELETE CASCADE,
  FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id) ON DELETE SET NULL
)
GO
