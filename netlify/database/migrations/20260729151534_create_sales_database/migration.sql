CREATE TYPE "cash_flow_type" AS ENUM('ENTRADA', 'SAIDA');--> statement-breakpoint
CREATE TYPE "sale_status" AS ENUM('ABERTA', 'PARCIAL', 'QUITADA', 'DEVOLVIDO');--> statement-breakpoint
CREATE TYPE "user_profile" AS ENUM('admin', 'vendedor');--> statement-breakpoint
CREATE TABLE "cash_flow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"data" timestamp with time zone DEFAULT now() NOT NULL,
	"tipo" "cash_flow_type" NOT NULL,
	"valor" numeric(12,2) DEFAULT '0' NOT NULL,
	"descricao" text NOT NULL,
	"categoria" text,
	"vendedor_id" uuid NOT NULL,
	"venda_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"endereco" text NOT NULL,
	"bairro" text NOT NULL,
	"cidade" text NOT NULL,
	"observacoes" text,
	"vendedor_id" uuid NOT NULL,
	"foto_url" text,
	"is_mumbuca" boolean DEFAULT false NOT NULL,
	"cpf" text,
	"mumbuca_password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"venda_id" uuid NOT NULL,
	"numero_parcela" integer NOT NULL,
	"valor" numeric(12,2) DEFAULT '0' NOT NULL,
	"data_vencimento" timestamp with time zone NOT NULL,
	"pago" boolean DEFAULT false NOT NULL,
	"data_pagamento" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"nome" text NOT NULL,
	"categoria" text NOT NULL,
	"valor_avista" numeric(12,2) DEFAULT '0' NOT NULL,
	"valor_parcelado" numeric(12,2) DEFAULT '0' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"cliente_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"valor_total" numeric(12,2) DEFAULT '0' NOT NULL,
	"qtd_parcelas" integer DEFAULT 1 NOT NULL,
	"data_venda" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "sale_status" DEFAULT 'ABERTA'::"sale_status" NOT NULL,
	"is_mumbuca" boolean DEFAULT false NOT NULL,
	"descricao" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"nome" text NOT NULL,
	"perfil" "user_profile" DEFAULT 'vendedor'::"user_profile" NOT NULL,
	"telefone" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"comissao_porcentagem" numeric(5,2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cash_flow_vendedor_id_idx" ON "cash_flow" ("vendedor_id");--> statement-breakpoint
CREATE INDEX "cash_flow_venda_id_idx" ON "cash_flow" ("venda_id");--> statement-breakpoint
CREATE INDEX "cash_flow_data_idx" ON "cash_flow" ("data");--> statement-breakpoint
CREATE INDEX "cash_flow_tipo_idx" ON "cash_flow" ("tipo");--> statement-breakpoint
CREATE INDEX "clients_vendedor_id_idx" ON "clients" ("vendedor_id");--> statement-breakpoint
CREATE INDEX "clients_nome_idx" ON "clients" ("nome");--> statement-breakpoint
CREATE UNIQUE INDEX "installments_venda_numero_uidx" ON "installments" ("venda_id","numero_parcela");--> statement-breakpoint
CREATE INDEX "installments_data_vencimento_idx" ON "installments" ("data_vencimento");--> statement-breakpoint
CREATE INDEX "installments_pago_idx" ON "installments" ("pago");--> statement-breakpoint
CREATE INDEX "products_categoria_idx" ON "products" ("categoria");--> statement-breakpoint
CREATE INDEX "sales_cliente_id_idx" ON "sales" ("cliente_id");--> statement-breakpoint
CREATE INDEX "sales_vendedor_id_idx" ON "sales" ("vendedor_id");--> statement-breakpoint
CREATE INDEX "sales_data_venda_idx" ON "sales" ("data_venda");--> statement-breakpoint
CREATE INDEX "sales_status_idx" ON "sales" ("status");--> statement-breakpoint
ALTER TABLE "cash_flow" ADD CONSTRAINT "cash_flow_vendedor_id_users_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cash_flow" ADD CONSTRAINT "cash_flow_venda_id_sales_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "sales"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_vendedor_id_users_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_venda_id_sales_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "sales"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cliente_id_clients_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_vendedor_id_users_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "users"("id") ON DELETE RESTRICT;