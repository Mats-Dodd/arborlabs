CREATE TYPE "public"."node_kind" AS ENUM('folder', 'file');--> statement-breakpoint
CREATE TABLE "collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"metadata" jsonb NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"kind" "node_kind" NOT NULL,
	"loro_snapshot" "bytea" NOT NULL,
	"parent_id" uuid,
	"metadata" jsonb NOT NULL,
	"collection_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node" ADD CONSTRAINT "node_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "node" ADD CONSTRAINT "node_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."node"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "idx_node_parent" ON "node" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_node_collection" ON "node" USING btree ("collection_id");