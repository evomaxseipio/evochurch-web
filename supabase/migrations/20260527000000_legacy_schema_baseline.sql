-- Legacy schema baseline recovered from the linked Supabase project.
-- This captures objects that predate the repository migration history.
-- Later migrations intentionally evolve church_ministries and member_roles to UUID.
-- On an existing linked project, mark this version as applied; do not replay it.


DO $baseline$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'app_role_kind') THEN
    CREATE TYPE public.app_role_kind AS ENUM ('system_locked', 'system_editable', 'custom');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'authorization_status_type') THEN
    CREATE TYPE public.authorization_status_type AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'contributions_type') THEN
    CREATE TYPE public.contributions_type AS ENUM ('tithes', 'offerings', 'donations');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'donor_type') THEN
    CREATE TYPE public.donor_type AS ENUM ('member', 'visitor', 'anonymous', 'company');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'oauthprovider') THEN
    CREATE TYPE public.oauthprovider AS ENUM ('EMAIL', 'GOOGLE', 'APPLE');
  END IF;
END
$baseline$;

CREATE SEQUENCE IF NOT EXISTS "public"."address_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS "public"."app_users_role_app_users_role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS "public"."app_users_role_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS "public"."church_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS "public"."collection_type_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    MAXVALUE 2147483647
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS "public"."contacts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS "public"."expenses_type_expenses_type_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS "public"."income_type_catalog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS "public"."membership_history_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS "public"."transactions_transaction_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS "public"."address" (
    "id" integer NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "street_address" character varying(255) NOT NULL,
    "state_province" character varying(255) NOT NULL,
    "city_state" character varying(255) NOT NULL,
    "country" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."app_users_role" (
    "app_users_role_id" integer NOT NULL,
    "app_users_role_name" character varying(255) NOT NULL,
    "app_users_role_description" "text" NOT NULL,
    "app_users_role_status" character varying(50) DEFAULT 'active'::character varying NOT NULL,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "church_id" integer,
    "role_key" "text",
    "role_kind" "public"."app_role_kind",
    "role_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "app_users_role_app_users_role_status_check" CHECK ((("app_users_role_status")::"text" = ANY (ARRAY[('active'::character varying)::"text", ('inactive'::character varying)::"text", ('archived'::character varying)::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."auth_sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "refresh_token" character varying(500) NOT NULL,
    "device_info" "text",
    "ip_address" character varying(50),
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."auth_users" (
    "id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "hashed_password" character varying(255),
    "profile_id" "uuid",
    "oauth_provider" "public"."oauthprovider" NOT NULL,
    "google_id" character varying(255),
    "apple_id" character varying(255),
    "is_active" boolean NOT NULL,
    "is_verified" boolean NOT NULL,
    "email_verified_at" timestamp with time zone,
    "failed_login_attempts" integer NOT NULL,
    "locked_until" timestamp with time zone,
    "reset_token" character varying(255),
    "reset_token_expires_at" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "last_login_ip" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "app_role_id" integer,
    "is_temp_password" boolean DEFAULT false NOT NULL,
    "temp_password_plain" "text",
    "preferred_locale" "text" DEFAULT 'es'::"text" NOT NULL,
    CONSTRAINT "auth_users_preferred_locale_check" CHECK (("preferred_locale" = ANY (ARRAY['es'::"text", 'en'::"text", 'fr'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."church" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "sub_title" "text",
    "main_organization" "text",
    "is_principal" boolean DEFAULT true NOT NULL,
    "principal_church_id" integer,
    "logo" "text",
    "secondary_logo" "text",
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "province" "text" NOT NULL,
    "country" "text" NOT NULL,
    "contact_phone" "text" NOT NULL,
    "contact_email" "text" NOT NULL,
    "company_number" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "founding_date" "date",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "timezone" "text" DEFAULT 'America/Santo_Domingo'::"text" NOT NULL,
    "short_name" "text",
    "legal_name" "text",
    "slug" "text" NOT NULL,
    "address_line1" "text",
    "address_line2" "text",
    "state_province" "text",
    "country_code" character(2) DEFAULT 'DO'::"bpchar",
    "postal_code" "text",
    "phone" "text",
    "email" "text",
    "website_url" "text",
    "logo_url" "text",
    "primary_color" character(7) DEFAULT '#5B21B6'::"bpchar" NOT NULL,
    "secondary_color" character(7) DEFAULT '#4C1D95'::"bpchar" NOT NULL,
    "accent_color" character(7) DEFAULT '#1E0A4C'::"bpchar" NOT NULL,
    "external_code" "text",
    "presbytery_name" "text",
    "default_locale" "text" DEFAULT 'es'::"text" NOT NULL,
    "updated_by_profile_id" "uuid",
    "parent_church_id" integer,
    "church_kind" "text" DEFAULT 'standalone'::"text" NOT NULL,
    "organization_id" integer,
    "org_unit_id" integer,
    "billing_plan" "text" DEFAULT 'standard'::"text" NOT NULL,
    "billing_status" "text" DEFAULT 'active'::"text" NOT NULL,
    CONSTRAINT "church_accent_color_check" CHECK (("accent_color" ~ '^#[0-9A-Fa-f]{6}$'::"text")),
    CONSTRAINT "church_billing_plan_check" CHECK (("billing_plan" = ANY (ARRAY['trial'::"text", 'standard'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "church_billing_status_check" CHECK (("billing_status" = ANY (ARRAY['active'::"text", 'past_due'::"text", 'suspended'::"text"]))),
    CONSTRAINT "church_church_kind_check" CHECK (("church_kind" = ANY (ARRAY['standalone'::"text", 'headquarters'::"text", 'campus'::"text"]))),
    CONSTRAINT "church_default_locale_check" CHECK (("default_locale" = ANY (ARRAY['es'::"text", 'en'::"text", 'fr'::"text"]))),
    CONSTRAINT "church_parent_kind_check" CHECK (((("church_kind" = 'campus'::"text") AND ("parent_church_id" IS NOT NULL)) OR (("church_kind" = ANY (ARRAY['standalone'::"text", 'headquarters'::"text"])) AND ("parent_church_id" IS NULL)))),
    CONSTRAINT "church_primary_color_check" CHECK (("primary_color" ~ '^#[0-9A-Fa-f]{6}$'::"text")),
    CONSTRAINT "church_secondary_color_check" CHECK (("secondary_color" ~ '^#[0-9A-Fa-f]{6}$'::"text"))
);

CREATE TABLE IF NOT EXISTS "public"."collection_type" (
    "collection_type_id" integer DEFAULT "nextval"('"public"."collection_type_id_seq"'::"regclass") NOT NULL,
    "collection_type_name" character varying(255) NOT NULL,
    "collection_type_description" "text" NOT NULL,
    "collection_type_status" character varying(50) DEFAULT 'active'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "is_primary" boolean DEFAULT false,
    "church_id" integer DEFAULT 1,
    CONSTRAINT "collection_type_collection_type_status_check" CHECK ((("collection_type_status")::"text" = ANY (ARRAY[('active'::character varying)::"text", ('inactive'::character varying)::"text", ('archived'::character varying)::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."collections_legacy" (
    "collection_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "profile_id" "uuid",
    "collection_type" integer NOT NULL,
    "collection_amount" numeric(12,2) NOT NULL,
    "collection_date" "date" NOT NULL,
    "is_anonymous" boolean DEFAULT false,
    "payment_method" "text",
    "comments" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "church_id" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."collections_review" (
    "collection_id" "uuid",
    "fund_id" "uuid",
    "profile_id" "uuid",
    "collection_type" integer,
    "collection_amount" numeric(12,2),
    "collection_date" "date",
    "is_anonymous" boolean,
    "payment_method" "text",
    "comments" "text",
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "is_active" boolean,
    "church_id" integer,
    "motivo" "text"
);

CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" integer NOT NULL,
    "profile_id" "uuid",
    "phone" character varying(20),
    "mobile_phone" character varying(20),
    "email" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."contributions_legacy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "church_id" integer,
    "fund_id" "uuid",
    "donor_type" "public"."donor_type" NOT NULL,
    "contribution_type" "public"."contributions_type" NOT NULL,
    "profile_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "payment_method" character varying(50),
    "payment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "receipt_number" character varying(50),
    "tithes_description" "text",
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    CONSTRAINT "amount_positive" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "valid_donor" CHECK (((("donor_type" = 'anonymous'::"public"."donor_type") AND ("profile_id" IS NULL)) OR (("donor_type" <> 'anonymous'::"public"."donor_type") AND ("profile_id" IS NOT NULL))))
);

CREATE TABLE IF NOT EXISTS "public"."contributors" (
    "contributor_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "church_id" integer NOT NULL,
    "contributor_type" character varying NOT NULL,
    "profile_id" "uuid",
    "company_name" character varying,
    "contact_name" character varying,
    "tax_id" character varying,
    "email" character varying,
    "phone" character varying,
    "is_anonymous" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_anonymous_no_identity" CHECK (((("contributor_type")::"text" <> 'anonymous'::"text") OR (("profile_id" IS NULL) AND ("company_name" IS NULL) AND ("contact_name" IS NULL)))),
    CONSTRAINT "chk_company_has_name" CHECK (((("contributor_type")::"text" <> 'company'::"text") OR ("company_name" IS NOT NULL))),
    CONSTRAINT "chk_member_has_profile" CHECK (((("contributor_type")::"text" <> 'member'::"text") OR ("profile_id" IS NOT NULL))),
    CONSTRAINT "contributors_contributor_type_check" CHECK ((("contributor_type")::"text" = ANY ((ARRAY['member'::character varying, 'visitor'::character varying, 'company'::character varying, 'anonymous'::character varying])::"text"[])))
);

CREATE TABLE IF NOT EXISTS "public"."donations_legacy" (
    "donation_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid",
    "profile_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "date" "date" NOT NULL,
    "anonymous" boolean DEFAULT false,
    "payment_method" "text",
    "remarks" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."expenses_type" (
    "expenses_type_id" integer NOT NULL,
    "church_id" numeric,
    "expenses_name" "text" NOT NULL,
    "expenses_category" "text" NOT NULL,
    "expenses_description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."funds" (
    "fund_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "church_id" integer NOT NULL,
    "fund_name" "text" NOT NULL,
    "description" "text",
    "target_amount" numeric(12,2),
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "total_contributions" numeric(12,2) DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "is_primary" boolean DEFAULT false,
    "ministry_id" "uuid",
    "fund_kind" "text" DEFAULT 'operating'::"text" NOT NULL,
    CONSTRAINT "funds_fund_kind_check" CHECK (("fund_kind" = ANY (ARRAY['operating'::"text", 'project'::"text", 'event'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."income_contributors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "income_id" "uuid" NOT NULL,
    "contributor_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "is_primary" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "income_contributors_amount_check" CHECK (("amount" > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS "public"."income_entries" (
    "income_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fund_id" "uuid" NOT NULL,
    "church_id" integer NOT NULL,
    "income_type_id" integer,
    "collection_mode" character varying DEFAULT 'individual'::character varying NOT NULL,
    "amount" numeric NOT NULL,
    "payment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "payment_method" character varying,
    "receipt_number" character varying,
    "is_anonymous" boolean DEFAULT false,
    "notes" "text",
    "recorded_by" "uuid",
    "migrated_from" character varying,
    "migrated_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "contribution_kind" character varying DEFAULT 'monetary'::character varying NOT NULL,
    "in_kind_description" "text",
    CONSTRAINT "income_entries_amount_check" CHECK ((((("contribution_kind")::"text" = 'monetary'::"text") AND ("amount" > (0)::numeric)) OR ((("contribution_kind")::"text" = 'in_kind'::"text") AND ("amount" >= (0)::numeric)))),
    CONSTRAINT "income_entries_collection_mode_check" CHECK ((("collection_mode")::"text" = ANY ((ARRAY['individual'::character varying, 'collective'::character varying])::"text"[]))),
    CONSTRAINT "income_entries_contribution_kind_check" CHECK ((("contribution_kind")::"text" = ANY ((ARRAY['monetary'::character varying, 'in_kind'::character varying])::"text"[]))),
    CONSTRAINT "income_entries_payment_method_check" CHECK ((("payment_method")::"text" = ANY ((ARRAY['Cash'::character varying, 'Transfer'::character varying, 'Check'::character varying, 'Card'::character varying, 'Deposit'::character varying, 'Other'::character varying])::"text"[])))
);

CREATE TABLE IF NOT EXISTS "public"."income_type_catalog" (
    "id" integer NOT NULL,
    "church_id" integer,
    "type_name" character varying NOT NULL,
    "category" character varying NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_operational" boolean DEFAULT false NOT NULL,
    CONSTRAINT "income_type_catalog_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['tithe'::character varying, 'offering'::character varying, 'donation'::character varying, 'special'::character varying])::"text"[])))
);

CREATE TABLE IF NOT EXISTS "public"."membership_history" (
    "id" integer NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "date_start" "date" NOT NULL,
    "date_returned" "date",
    "observations" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "church_id" integer
);

CREATE TABLE IF NOT EXISTS "public"."offering_legacy" (
    "offering_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid",
    "fund_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "offering_date" "date" NOT NULL,
    "purpose" "text",
    "payment_method" "text",
    "anonymous" boolean DEFAULT false,
    "remarks" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "nick_name" character varying(100),
    "date_of_birth" "date",
    "gender" character varying(10),
    "marital_status" character varying(20),
    "nationality" character varying(100),
    "id_type" character varying(50),
    "id_number" character varying(100),
    "is_member" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "church_id" integer,
    "profile_picture_url" "text",
    "blood_type" "text",
    "allergies" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "professions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_child" boolean DEFAULT false NOT NULL,
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    CONSTRAINT "profiles_gender_check" CHECK ((("gender")::"text" = ANY (ARRAY[('Male'::character varying)::"text", ('Female'::character varying)::"text", ('Other'::character varying)::"text"]))),
    CONSTRAINT "profiles_marital_status_check" CHECK ((("marital_status")::"text" = ANY (ARRAY[('Single'::character varying)::"text", ('Married'::character varying)::"text", ('Divorced'::character varying)::"text", ('Widowed'::character varying)::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "transaction_id" integer NOT NULL,
    "church_id" numeric,
    "expenses_type_id" integer,
    "fund_id" "uuid",
    "created_by_profile_id" "uuid" NOT NULL,
    "authorized_by_profile_id" "uuid",
    "authorization_status" character varying(20) DEFAULT 'PENDING'::character varying,
    "authorization_date" timestamp without time zone,
    "authorization_comments" "text",
    "transaction_amount" numeric(10,2) NOT NULL,
    "transaction_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "transaction_description" "text",
    "payment_method" "text",
    "reference_number" "text",
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_authorization_status_check" CHECK ((("authorization_status")::"text" = ANY (ARRAY[('PENDING'::character varying)::"text", ('APPROVED'::character varying)::"text", ('REJECTED'::character varying)::"text"]))),
    CONSTRAINT "transactions_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['Cash'::"text", 'Transfer'::"text", 'Check'::"text", 'Deposit'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."v_result" (
    "json_build_object" json
);

CREATE TABLE IF NOT EXISTS public.church_ministries (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  church_id integer NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.member_roles (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  role_name varchar(255) NOT NULL,
  role_description text NOT NULL,
  role_status varchar(50) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membership (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  profile_id uuid NOT NULL,
  baptism_date date,
  baptism_church varchar(255),
  baptism_pastor varchar(255),
  membership_role varchar(255),
  baptism_church_city varchar(100),
  baptism_church_country varchar(100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  church_id integer DEFAULT 1,
  hascredential boolean DEFAULT false,
  isbaptizedinspirit boolean DEFAULT false
);

ALTER TABLE ONLY "public"."address" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."address_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."app_users_role" ALTER COLUMN "app_users_role_id" SET DEFAULT "nextval"('"public"."app_users_role_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."church" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."church_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."contacts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."contacts_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."expenses_type" ALTER COLUMN "expenses_type_id" SET DEFAULT "nextval"('"public"."expenses_type_expenses_type_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."income_type_catalog" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."income_type_catalog_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."membership" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."membership_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."membership_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."membership_history_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."transactions" ALTER COLUMN "transaction_id" SET DEFAULT "nextval"('"public"."transactions_transaction_id_seq"'::"regclass");

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'address_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."address"
        ADD CONSTRAINT "address_pkey" PRIMARY KEY ("id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'app_users_role_app_users_role_name_key'
  ) THEN
    ALTER TABLE ONLY "public"."app_users_role"
        ADD CONSTRAINT "app_users_role_app_users_role_name_key" UNIQUE ("app_users_role_name");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'app_users_role_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."app_users_role"
        ADD CONSTRAINT "app_users_role_pkey" PRIMARY KEY ("app_users_role_id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'auth_sessions_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."auth_sessions"
        ADD CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'auth_users_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."auth_users"
        ADD CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'auth_users_profile_id_key'
  ) THEN
    ALTER TABLE ONLY "public"."auth_users"
        ADD CONSTRAINT "auth_users_profile_id_key" UNIQUE ("profile_id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'church_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."church"
        ADD CONSTRAINT "church_pkey" PRIMARY KEY ("id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'collection_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."collections_legacy"
        ADD CONSTRAINT "collection_pkey" PRIMARY KEY ("collection_id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'collection_type_name_unique'
  ) THEN
    ALTER TABLE ONLY "public"."collection_type"
        ADD CONSTRAINT "collection_type_name_unique" UNIQUE ("collection_type_name");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'collection_type_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."collection_type"
        ADD CONSTRAINT "collection_type_pkey" PRIMARY KEY ("collection_type_id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'contacts_email_key'
  ) THEN
    ALTER TABLE ONLY "public"."contacts"
        ADD CONSTRAINT "contacts_email_key" UNIQUE ("email");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'contacts_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."contacts"
        ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'contributions_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."contributions_legacy"
        ADD CONSTRAINT "contributions_pkey" PRIMARY KEY ("id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'contributors_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."contributors"
        ADD CONSTRAINT "contributors_pkey" PRIMARY KEY ("contributor_id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'donations_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."donations_legacy"
        ADD CONSTRAINT "donations_pkey" PRIMARY KEY ("donation_id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'expenses_type_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."expenses_type"
        ADD CONSTRAINT "expenses_type_pkey" PRIMARY KEY ("expenses_type_id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'funds_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."funds"
        ADD CONSTRAINT "funds_pkey" PRIMARY KEY ("fund_id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'income_contributors_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."income_contributors"
        ADD CONSTRAINT "income_contributors_pkey" PRIMARY KEY ("id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'income_entries_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."income_entries"
        ADD CONSTRAINT "income_entries_pkey" PRIMARY KEY ("income_id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'income_type_catalog_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."income_type_catalog"
        ADD CONSTRAINT "income_type_catalog_pkey" PRIMARY KEY ("id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'membership_history_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."membership_history"
        ADD CONSTRAINT "membership_history_pkey" PRIMARY KEY ("id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'offering_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."offering_legacy"
        ADD CONSTRAINT "offering_pkey" PRIMARY KEY ("offering_id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'one_primary_collection_constraint'
  ) THEN
    ALTER TABLE ONLY "public"."collection_type"
        ADD CONSTRAINT "one_primary_collection_constraint" EXCLUDE USING "btree" ("is_primary" WITH =) WHERE (("is_primary" = true));
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'one_primary_funds_constraint'
  ) THEN
    ALTER TABLE ONLY "public"."funds"
        ADD CONSTRAINT "one_primary_funds_constraint" EXCLUDE USING "btree" ("is_primary" WITH =) WHERE (("is_primary" = true));
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'one_primary_role_constraint'
  ) THEN
    ALTER TABLE ONLY "public"."app_users_role"
        ADD CONSTRAINT "one_primary_role_constraint" EXCLUDE USING "btree" ("is_primary" WITH =) WHERE ("is_primary");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'profiles_id_number_key'
  ) THEN
    ALTER TABLE ONLY "public"."profiles"
        ADD CONSTRAINT "profiles_id_number_key" UNIQUE ("id_number");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'profiles_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."profiles"
        ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
  END IF;
END
$baseline$;

DO $baseline$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname = 'transactions_pkey'
  ) THEN
    ALTER TABLE ONLY "public"."transactions"
        ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("transaction_id");
  END IF;
END
$baseline$;

NOTIFY pgrst, 'reload schema';

