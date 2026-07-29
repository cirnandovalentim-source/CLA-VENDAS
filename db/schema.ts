import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userProfileEnum = pgEnum("user_profile", ["admin", "vendedor"]);
export const saleStatusEnum = pgEnum("sale_status", [
  "ABERTA",
  "PARCIAL",
  "QUITADA",
  "DEVOLVIDO",
]);
export const cashFlowTypeEnum = pgEnum("cash_flow_type", ["ENTRADA", "SAIDA"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nome: text("nome").notNull(),
  perfil: userProfileEnum("perfil").default("vendedor").notNull(),
  telefone: text("telefone"),
  ativo: boolean("ativo").default(true).notNull(),
  comissaoPorcentagem: numeric("comissao_porcentagem", {
    precision: 5,
    scale: 2,
  })
    .default("0")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nome: text("nome").notNull(),
    telefone: text("telefone").notNull(),
    endereco: text("endereco").notNull(),
    bairro: text("bairro").notNull(),
    cidade: text("cidade").notNull(),
    observacoes: text("observacoes"),
    vendedorId: uuid("vendedor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    fotoUrl: text("foto_url"),
    isMumbuca: boolean("is_mumbuca").default(false).notNull(),
    cpf: text("cpf"),
    mumbucaPassword: text("mumbuca_password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("clients_vendedor_id_idx").on(table.vendedorId),
    index("clients_nome_idx").on(table.nome),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nome: text("nome").notNull(),
    categoria: text("categoria").notNull(),
    valorAvista: numeric("valor_avista", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    valorParcelado: numeric("valor_parcelado", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    ativo: boolean("ativo").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("products_categoria_idx").on(table.categoria)],
);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    vendedorId: uuid("vendedor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    valorTotal: numeric("valor_total", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    qtdParcelas: integer("qtd_parcelas").default(1).notNull(),
    dataVenda: timestamp("data_venda", { withTimezone: true }).defaultNow().notNull(),
    status: saleStatusEnum("status").default("ABERTA").notNull(),
    isMumbuca: boolean("is_mumbuca").default(false).notNull(),
    descricao: text("descricao"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sales_cliente_id_idx").on(table.clienteId),
    index("sales_vendedor_id_idx").on(table.vendedorId),
    index("sales_data_venda_idx").on(table.dataVenda),
    index("sales_status_idx").on(table.status),
  ],
);

export const installments = pgTable(
  "installments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vendaId: uuid("venda_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    numeroParcela: integer("numero_parcela").notNull(),
    valor: numeric("valor", { precision: 12, scale: 2 }).default("0").notNull(),
    dataVencimento: timestamp("data_vencimento", { withTimezone: true }).notNull(),
    pago: boolean("pago").default(false).notNull(),
    dataPagamento: timestamp("data_pagamento", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("installments_venda_numero_uidx").on(
      table.vendaId,
      table.numeroParcela,
    ),
    index("installments_data_vencimento_idx").on(table.dataVencimento),
    index("installments_pago_idx").on(table.pago),
  ],
);

export const cashFlow = pgTable(
  "cash_flow",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    data: timestamp("data", { withTimezone: true }).defaultNow().notNull(),
    tipo: cashFlowTypeEnum("tipo").notNull(),
    valor: numeric("valor", { precision: 12, scale: 2 }).default("0").notNull(),
    descricao: text("descricao").notNull(),
    categoria: text("categoria"),
    vendedorId: uuid("vendedor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    vendaId: uuid("venda_id").references(() => sales.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("cash_flow_vendedor_id_idx").on(table.vendedorId),
    index("cash_flow_venda_id_idx").on(table.vendaId),
    index("cash_flow_data_idx").on(table.data),
    index("cash_flow_tipo_idx").on(table.tipo),
  ],
);

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
export type ClientRecord = typeof clients.$inferSelect;
export type NewClientRecord = typeof clients.$inferInsert;
export type ProductRecord = typeof products.$inferSelect;
export type NewProductRecord = typeof products.$inferInsert;
export type SaleRecord = typeof sales.$inferSelect;
export type NewSaleRecord = typeof sales.$inferInsert;
export type InstallmentRecord = typeof installments.$inferSelect;
export type NewInstallmentRecord = typeof installments.$inferInsert;
export type CashFlowRecord = typeof cashFlow.$inferSelect;
export type NewCashFlowRecord = typeof cashFlow.$inferInsert;
