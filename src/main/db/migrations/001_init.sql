IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uyeler' AND xtype='U')
CREATE TABLE uyeler (
  id INT IDENTITY(1,1) PRIMARY KEY,
  adsoyad NVARCHAR(255) NOT NULL,
  bolum NVARCHAR(255) NOT NULL,
  mezuniyet NVARCHAR(255) NOT NULL,
  bursMiktar INT DEFAULT 0,
  bursTip NVARCHAR(255) DEFAULT 'Aylık',
  photo NVARCHAR(MAX) DEFAULT NULL,
  email NVARCHAR(MAX),
  telefon NVARCHAR(MAX),
  isyeri NVARCHAR(MAX),
  meslek NVARCHAR(MAX),
  pozisyon NVARCHAR(MAX),
  sehir NVARCHAR(MAX),
  uyelikGiris NVARCHAR(MAX),
  uyelikCikis NVARCHAR(MAX)
)
GO
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='aidatlar' AND xtype='U')
CREATE TABLE aidatlar (
  id INT IDENTITY(1,1) PRIMARY KEY,
  uye_id INT NOT NULL,
  donem NVARCHAR(255) NOT NULL,
  odendi INT DEFAULT 0,
  FOREIGN KEY (uye_id) REFERENCES uyeler(id) ON DELETE CASCADE
)
GO
