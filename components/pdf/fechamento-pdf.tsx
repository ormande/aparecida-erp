import "@/lib/pdf-fonts";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { OrderDetails } from "@/hooks/use-os-page";
import {
  formatPdfCurrency,
  formatPdfDate,
  formatPdfDocument,
  formatPdfPhone,
  sanitizeClosurePdfDescription,
} from "@/lib/pdf-order-formatters";

const COMPANY_TITLE = "Borracharia Nossa Senhora Aparecida";
const COMPANY_PHONE = "(67) 99222-6129";
const COMPANY_EMAIL = "diego.pn@hotmail.com";

const styles = StyleSheet.create({
  page: {
    fontFamily: "DM Sans",
    fontSize: 10,
    paddingTop: 28,
    paddingRight: 32,
    paddingBottom: 54,
    paddingLeft: 32,
    color: "#111111",
    backgroundColor: "#FFFFFF",
  },
  centerBlock: {
    alignItems: "center",
    marginBottom: 28,
  },
  companyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111111",
  },
  companyBody: {
    fontSize: 10,
    marginTop: 3,
    color: "#64748B",
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 20,
    color: "#A87C20",
  },
  orderDate: {
    fontSize: 10,
    marginTop: 6,
    color: "#64748B",
  },
  section: {
    marginBottom: 22,
  },
  clientSection: {
    marginTop: 14,
    marginBottom: 28,
  },
  tableSection: {
    marginTop: 14,
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 14,
    color: "#A87C20",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  clientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  clientCell: {
    flex: 1,
  },
  clientCellCenter: {
    flex: 1,
    alignItems: "center",
  },
  clientCellRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  label: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: "#111111",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#A87C20",
    borderBottomColor: "#A87C20",
    paddingVertical: 6,
    paddingHorizontal: 6,
    color: "#666666",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#D4D4D4",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  colDescription: {
    flex: 4.4,
    fontSize: 9,
    paddingRight: 8,
  },
  colQty: {
    flex: 1,
    fontSize: 9,
    textAlign: "center",
  },
  colUnit: {
    flex: 1.4,
    fontSize: 9,
    textAlign: "right",
  },
  colTotal: {
    flex: 1.4,
    fontSize: 9,
    textAlign: "right",
  },
  summary: {
    marginTop: 22,
    alignItems: "flex-end",
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    width: 240,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569",
  },
  summaryValue: {
    fontSize: 10,
    color: "#111111",
  },
  totalValue: {
    color: "#A87C20",
    fontWeight: "bold",
  },
  orderReference: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 9,
    color: "#475569",
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 8,
    color: "#666666",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
});

type FechamentoPdfProps = {
  order: OrderDetails;
  companyName: string;
  unitName: string;
};

export function FechamentoPdf({ order }: FechamentoPdfProps) {
  const grouped = new Map<
    string,
    {
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }
  >();

  order.services.forEach((item, index) => {
    const quantity = item.quantity ?? 1;
    const total = item.lineTotal ?? quantity * item.laborPrice;
    const rawDescription = item.description;
    const itemType = /^\[Produto\]/i.test(rawDescription) ? "product" : "service";
    const description = sanitizeClosurePdfDescription(item.description);
    if (!description || description.startsWith("[Sem itens]")) {
      return;
    }
    const key = `${itemType}|${description}|${item.laborPrice.toFixed(2)}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += quantity;
      existing.total += total;
      return;
    }
    grouped.set(key, {
      id: `${item.id}-${index}`,
      description,
      quantity,
      unitPrice: item.laborPrice,
      total,
    });
  });

  const rows = Array.from(grouped.values());

  const total = rows.reduce((sum, item) => sum + item.total, 0);
  const discount = Math.max(order.total - total, 0);
  const documentLabel = order.clientDocument?.replace(/\D/g, "").length === 14 ? "CNPJ" : "CPF";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.centerBlock}>
          <Text style={styles.companyTitle}>{COMPANY_TITLE}</Text>
          <Text style={styles.companyBody}>Celular: {COMPANY_PHONE}</Text>
          <Text style={styles.companyBody}>E-mail: {COMPANY_EMAIL}</Text>
          <Text style={styles.orderTitle}>{order.number}</Text>
          <Text style={styles.orderDate}>Data de emissão: {formatPdfDate(order.openedAt)}</Text>
        </View>

        <View style={[styles.section, styles.clientSection]}>
          <Text style={styles.sectionTitle}>Dados do cliente</Text>
          <View style={styles.clientRow}>
            <View style={styles.clientCell}>
              <Text style={styles.label}>Nome</Text>
              <Text style={styles.value}>{order.clientName || "-"}</Text>
            </View>
            <View style={styles.clientCellCenter}>
              <Text style={styles.label}>{documentLabel}</Text>
              <Text style={styles.value}>{formatPdfDocument(order.clientDocument)}</Text>
            </View>
            <View style={styles.clientCellRight}>
              <Text style={styles.label}>Contato</Text>
              <Text style={styles.value}>{formatPdfPhone(order.clientContact)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, styles.tableSection]}>
          <Text style={styles.sectionTitle}>Dados dos produtos/serviços</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Nome do produto/serviço</Text>
            <Text style={styles.colQty}>Quantidade</Text>
            <Text style={styles.colUnit}>Valor unitário</Text>
            <Text style={styles.colTotal}>Valor total</Text>
          </View>
          {rows.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{String(item.quantity)}</Text>
              <Text style={styles.colUnit}>{formatPdfCurrency(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatPdfCurrency(item.total)}</Text>
            </View>
          ))}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Desconto</Text>
              <Text style={styles.summaryValue}>{formatPdfCurrency(discount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={[styles.summaryValue, styles.totalValue]}>{formatPdfCurrency(order.total)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Data de vencimento</Text>
              <Text style={styles.summaryValue}>
                {order.paymentTerm === "A_PRAZO" && order.dueDate ? formatPdfDate(order.dueDate) : "À vista"}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.orderReference}>Referente ao pedido de nº {order.number}</Text>

        <Text style={styles.footer} fixed>
          Documento gerado pelo Aparecida ERP
        </Text>
      </Page>
    </Document>
  );
}
