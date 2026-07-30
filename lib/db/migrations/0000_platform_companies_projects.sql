-- PLEXON: companies, platform projects, product bindings, user platform assignments
-- Apply with `drizzle-kit push` after schema change, or run manually against PostgreSQL.

CREATE TABLE IF NOT EXISTS "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "companies_slug_unique" ON "companies" USING btree ("slug");

CREATE TABLE IF NOT EXISTS "company_users" (
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_users_company_id_user_id_pk" PRIMARY KEY("company_id","user_id")
);

CREATE INDEX IF NOT EXISTS "company_users_user_id_idx" ON "company_users" USING btree ("user_id");

DO $$ BEGIN
 ALTER TABLE "company_users" ADD CONSTRAINT "company_users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "company_users" ADD CONSTRAINT "company_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "platform_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"metadata" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "platform_projects_company_id_idx" ON "platform_projects" USING btree ("company_id");

DO $$ BEGIN
 ALTER TABLE "platform_projects" ADD CONSTRAINT "platform_projects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "platform_projects" ADD CONSTRAINT "platform_projects_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "platform_project_product_bindings" (
	"platform_project_id" text NOT NULL,
	"product_id" text NOT NULL,
	"external_project_id" text,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"sync_message" text,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_project_product_bindings_platform_project_id_product_id_pk" PRIMARY KEY("platform_project_id","product_id")
);

DO $$ BEGIN
 ALTER TABLE "platform_project_product_bindings" ADD CONSTRAINT "platform_project_product_bindings_platform_project_id_platform_projects_id_fk" FOREIGN KEY ("platform_project_id") REFERENCES "public"."platform_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "user_platform_project_assignments" (
	"user_id" text NOT NULL,
	"platform_project_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_platform_project_assignments_user_id_platform_project_id_pk" PRIMARY KEY("user_id","platform_project_id")
);

CREATE INDEX IF NOT EXISTS "user_platform_project_assignments_project_idx" ON "user_platform_project_assignments" USING btree ("platform_project_id");

DO $$ BEGIN
 ALTER TABLE "user_platform_project_assignments" ADD CONSTRAINT "user_platform_project_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_platform_project_assignments" ADD CONSTRAINT "user_platform_project_assignments_platform_project_id_platform_projects_id_fk" FOREIGN KEY ("platform_project_id") REFERENCES "public"."platform_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
