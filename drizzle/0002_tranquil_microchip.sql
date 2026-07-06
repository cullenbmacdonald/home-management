CREATE TABLE "rate_limit_hits" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_hits_key_at_idx" ON "rate_limit_hits" USING btree ("key","at");