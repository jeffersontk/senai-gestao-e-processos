CREATE TABLE IF NOT EXISTS "app_state" (
  "id" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_state_pkey" PRIMARY KEY ("id")
);

INSERT INTO "app_state" ("id", "data")
VALUES ('gestao-horas', '{}'::jsonb)
ON CONFLICT ("id") DO NOTHING;
