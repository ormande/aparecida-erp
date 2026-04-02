import "@/lib/pdf-fonts";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { OrderDetails } from "@/hooks/use-os-page";

import { PdfHeader } from "./pdf-header";

const styles = StyleSheet.create({
  page: {
    fontFamily: "DM Sans",
    fontSize: 10,
    padding: 40,
    color: "#111111",
    backgroundColor: "#FFFFFF",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "DM Sans",
    fontWeight: "bold",
    color: "#A87C20",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridItem: {
    width: "48%",
    marginBottom: 6,
  },
  label: {
    fontSize: 8,
    color: "#64748B",
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: "#111111",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  colDesc: { flex: 3, fontSize: 9 },
  colValue: { flex: 1, fontSize: 9, textAlign: "right" },
  colDescHeader: { flex: 3, fontSize: 9, fontWeight: "bold", color: "#666666" },
  colValueHeader: { flex: 1, fontSize: 9, fontWeight: "bold", color: "#666666", textAlign: "right" },
  totalCard: {
    marginTop: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalCardLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111111",
  },
  totalCardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#A87C20",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#666666",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
}

type FechamentoPdfProps = {
  order: OrderDetails;
  companyName: string;
  unitName: string;
};

export function FechamentoPdf({ order, companyName, unitName }: FechamentoPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader companyName={companyName} unitName={unitName} title={`Fechamento Mensal — ${order.number}`} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do cliente e período</Text>
          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{order.clientName || "—"}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Data do fechamento</Text>
              <Text style={styles.value}>{order.openedAt ? formatDate(order.openedAt) : "—"}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Vencimento</Text>
              <Text style={styles.value}>
                {order.paymentTerm === "A_PRAZO" && order.dueDate ? formatDate(order.dueDate) : "À vista"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Forma de pagamento</Text>
              <Text style={styles.value}>{order.paymentMethod || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serviços consolidados</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescHeader}>Descrição</Text>
            <Text style={styles.colValueHeader}>Valor</Text>
          </View>
          {order.services.map((svc, i) => (
            <View key={`${svc.id}-${i}`} style={styles.tableRow}>
              <Text style={styles.colDesc}>{svc.description}</Text>
              <Text style={styles.colValue}>{formatCurrency(svc.laborPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalCardLabel}>Valor total gasto</Text>
          <Text style={styles.totalCardValue}>{formatCurrency(order.total)}</Text>
        </View>

        <Text style={styles.footer} fixed>
          Documento gerado pelo Aparecida ERP
        </Text>
      </Page>
    </Document>
  );
}
