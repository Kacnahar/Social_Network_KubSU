ALTER TABLE "accounts" ALTER COLUMN "email_encrypted" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "email_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "invite_code_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "patronymic" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "staff_id" text;--> statement-breakpoint
ALTER TABLE "email_login_codes" ADD COLUMN "signup" jsonb;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "birth_date" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "show_faculty" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "show_birth" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "show_friends" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "show_online" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_username_unique" UNIQUE("username");