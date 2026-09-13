IF COL_LENGTH('kullanicilar', 'uye_id') IS NULL
ALTER TABLE kullanicilar ADD uye_id INT NULL
GO
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_kullanicilar_uyeler')
ALTER TABLE kullanicilar ADD CONSTRAINT FK_kullanicilar_uyeler FOREIGN KEY (uye_id) REFERENCES uyeler(id) ON DELETE NO ACTION
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_kullanicilar_uye_id')
CREATE UNIQUE INDEX UQ_kullanicilar_uye_id ON kullanicilar(uye_id) WHERE uye_id IS NOT NULL
GO
