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
    backgroundcolor: "#111111",
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
  colEmployee: { flex: 2, fontSize: 9 },
  colValue: { flex: 1, fontSize: 9, textAlign: "right" },
  colDescHeader: { flex: 3, fontSize: 9, fontWeight: "bold", color: "#666666" },
  colEmployeeHeader: { flex: 2, fontSize: 9, fontWeight: "bold", color: "#666666" },
  colValueHeader: { flex: 1, fontSize: 9, fontWeight: "bold", color: "#666666", textAlign: "right" },
  colQty: { width: 40, fontSize: 9, textAlign: "center" },
  colUnit: { width: 30, fontSize: 9, textAlign: "center" },
  colQtyHeader: { width: 40, fontSize: 9, fontWeight: "bold", color: "#666666", textAlign: "center" },
  colUnitHeader: { width: 30, fontSize: 9, fontWeight: "bold", color: "#666666", textAlign: "center" },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
    paddingRight: 8,
  },
  subtotalLabel: {
    fontSize: 9,
    color: "#475569",
    marginRight: 12,
  },
  subtotalValue: {
    fontSize: 9,
    color: "#475569",
    fontWeight: "bold",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#A87C20",
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111111",
    marginRight: 12,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#A87C20",
  },
  notesBox: {
    backgroundColor: "#F5F5F5",
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  notesText: {
    fontSize: 9,
    color: "#475569",
    lineHeight: 1.5,
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

type OsPdfProps = {
  order: OrderDetails;
  companyName: string;
  unitName: string;
};

export function OsPdf({ order, companyName, unitName }: OsPdfProps) {
  const paymentTermLabel =
    order.paymentTerm === "A_PRAZO" ? "A prazo" : order.paymentTerm === "A_VISTA" ? "À vista" : "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader companyName={companyName} unitName={unitName} title={`Ordem de Serviço ${order.number}`} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do cliente</Text>
          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{order.clientName || "—"}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Data de abertura</Text>
              <Text style={styles.value}>{order.openedAt ? formatDate(order.openedAt) : "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados de pagamento</Text>
          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Forma de pagamento</Text>
              <Text style={styles.value}>{order.paymentMethod || "—"}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Condição</Text>
              <Text style={styles.value}>{paymentTermLabel}</Text>
            </View>
            {order.paymentTerm === "A_PRAZO" && order.dueDate ? (
              <View style={styles.gridItem}>
                <Text style={styles.label}>Vencimento</Text>
                <Text style={styles.value}>{formatDate(order.dueDate)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serviços</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colQtyHeader}>Qtd</Text>
            <Text style={styles.colDescHeader}>Descrição</Text>
            <Text style={styles.colEmployeeHeader}>Funcionário</Text>
            <Text style={styles.colValueHeader}>Valor</Text>
          </View>
          {order.services.map((svc, i) => (
            <View key={`${svc.id}-${i}`} style={styles.tableRow}>
              <Text style={styles.colQty}>{String(svc.quantity ?? 1)}</Text>
              <Text style={styles.colDesc}>{svc.description}</Text>
              <Text style={styles.colEmployee}>{svc.executedByName || "—"}</Text>
              <Text style={styles.colValue}>{formatCurrency((svc.quantity ?? 1) * svc.laborPrice)}</Text>
            </View>
          ))}
        </View>

        {order.products && order.products.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Produtos utilizados</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.colQtyHeader}>Qtd</Text>
              <Text style={styles.colDescHeader}>Descrição</Text>
              <Text style={styles.colUnitHeader}>Un.</Text>
              <Text style={styles.colValueHeader}>Vlr unit.</Text>
              <Text style={styles.colValueHeader}>Total</Text>
            </View>
            {order.products.map((p, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colQty}>{String(p.quantity)}</Text>
                <Text style={styles.colDesc}>{p.description}</Text>
                <Text style={styles.colUnit}>{p.unit}</Text>
                <Text style={styles.colValue}>{formatCurrency(p.unitPrice)}</Text>
                <Text style={styles.colValue}>{formatCurrency(p.totalPrice)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          {order.laborSubtotal != null ? (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal mão de obra</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(order.laborSubtotal)}</Text>
            </View>
          ) : null}
          {order.productsSubtotal != null && order.productsSubtotal > 0 ? (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal produtos</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(order.productsSubtotal)}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
          </View>
        </View>

        {order.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          Documento gerado pelo Aparecida ERP
        </Text>
      </Page>
    </Document>
  );
}
