-- Runs once when the Docker database is first created.
-- `pulse_app` is the restricted role the API uses. It is NOT a superuser and
-- does not own the tables, so row-level security applies to it.
-- Development password only: change it for any real deployment.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pulse_app') THEN
        CREATE ROLE pulse_app LOGIN PASSWORD 'pulse_app_dev' NOSUPERUSER NOBYPASSRLS;
    END IF;
END
$$;
