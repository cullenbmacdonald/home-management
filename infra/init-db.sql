-- Runs once, on first initialization of the postgres volume.
-- The prod database (homebase) is created by POSTGRES_DB; this adds staging.
-- Both are owned by the same app role so no extra grants are needed.
CREATE DATABASE homebase_staging OWNER homebase;
