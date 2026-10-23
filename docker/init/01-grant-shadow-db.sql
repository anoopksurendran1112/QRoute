-- QRoute dev database bootstrap.
--
-- The MYSQL_USER created by the mysql image only receives privileges on
-- MYSQL_DATABASE. Prisma Migrate additionally needs to CREATE and DROP a
-- throwaway shadow database on every `migrate dev`, so without this grant
-- `prisma migrate dev` fails with P3014 "could not create the shadow database".
--
-- This file only runs on FIRST initialisation of an empty data volume. If the
-- volume already exists, apply it manually:
--   docker exec qroute-mysql mysql -uroot -pdevroot -e \
--     "GRANT ALL PRIVILEGES ON *.* TO 'qroute'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;"

GRANT ALL PRIVILEGES ON *.* TO 'qroute'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
