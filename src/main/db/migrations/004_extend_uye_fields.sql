IF COL_LENGTH('uyeler', 'tcKimlikNo') IS NULL
ALTER TABLE uyeler ADD tcKimlikNo NVARCHAR(20)
GO
IF COL_LENGTH('uyeler', 'cinsiyet') IS NULL
ALTER TABLE uyeler ADD cinsiyet NVARCHAR(20)
GO
IF COL_LENGTH('uyeler', 'dogumTarihi') IS NULL
ALTER TABLE uyeler ADD dogumTarihi NVARCHAR(MAX)
GO
IF COL_LENGTH('uyeler', 'ogrenimDurumu') IS NULL
ALTER TABLE uyeler ADD ogrenimDurumu NVARCHAR(255)
GO
IF COL_LENGTH('uyeler', 'uyeNiteligi') IS NULL
ALTER TABLE uyeler ADD uyeNiteligi NVARCHAR(20)
GO
IF COL_LENGTH('uyeler', 'uyeTur') IS NULL
ALTER TABLE uyeler ADD uyeTur NVARCHAR(50)
GO
IF COL_LENGTH('uyeler', 'onursalUye') IS NULL
ALTER TABLE uyeler ADD onursalUye BIT DEFAULT 0
GO
IF COL_LENGTH('uyeler', 'durum') IS NULL
ALTER TABLE uyeler ADD durum NVARCHAR(20)
GO
IF COL_LENGTH('uyeler', 'yonetimKuruluKararTarihi') IS NULL
ALTER TABLE uyeler ADD yonetimKuruluKararTarihi NVARCHAR(MAX)
GO
IF COL_LENGTH('uyeler', 'pasifOlmaNedeni') IS NULL
ALTER TABLE uyeler ADD pasifOlmaNedeni NVARCHAR(255)
GO
IF COL_LENGTH('uyeler', 'pasifOlmaBildirimTarihi') IS NULL
ALTER TABLE uyeler ADD pasifOlmaBildirimTarihi NVARCHAR(MAX)
GO
IF COL_LENGTH('uyeler', 'pozisyon') IS NOT NULL
ALTER TABLE uyeler DROP COLUMN pozisyon
GO
IF (SELECT is_nullable FROM sys.columns WHERE object_id = OBJECT_ID('uyeler') AND name = 'bolum') = 0
ALTER TABLE uyeler ALTER COLUMN bolum NVARCHAR(255) NULL
GO
IF (SELECT is_nullable FROM sys.columns WHERE object_id = OBJECT_ID('uyeler') AND name = 'mezuniyet') = 0
ALTER TABLE uyeler ALTER COLUMN mezuniyet NVARCHAR(255) NULL
GO
