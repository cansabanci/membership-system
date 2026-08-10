IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='kullanicilar' AND xtype='U')
CREATE TABLE kullanicilar (
  id INT IDENTITY(1,1) PRIMARY KEY,
  email NVARCHAR(255) NOT NULL UNIQUE,
  password NVARCHAR(255) NOT NULL,
  rol NVARCHAR(50) NOT NULL DEFAULT 'viewer'
)
GO
IF NOT EXISTS (SELECT * FROM kullanicilar WHERE email='admin@gmail.com')
INSERT INTO kullanicilar (email, password, rol) VALUES ('admin@gmail.com', 'admin123', 'admin')
GO
IF NOT EXISTS (SELECT * FROM kullanicilar WHERE email='viewer@gmail.com')
INSERT INTO kullanicilar (email, password, rol) VALUES ('viewer@gmail.com', 'viewer123', 'viewer')
GO
