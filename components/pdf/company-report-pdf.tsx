import "@/lib/pdf-fonts";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CompanyReport } from "@/app/relatorios/page";

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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "DM Sans",
    fontWeight: "bold",
    color: "#A87C20",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  periodText: {
    fontSize: 9,
    color: "#64748B",
    marginBottom: 16,
  },
  cardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  card: {
    width: "30%",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardHighlight: {
    width: "30%",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 4,
  },
  cardLabelLight: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111111",
  },
  cardValueGold: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#A87C20",
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
  colUnit: { flex: 2, fontSize: 9 },
  colRevenue: { flex: 2, fontSize: 9, textAlign: "right" },
  colOpened: { flex: 1, fontSize: 9, textAlign: "center" },
  colConcluded: { flex: 1, fontSize: 9, textAlign: "center" },
  colUnitHeader: { flex: 2, fontSize: 9, fontWeight: "bold", color: "#666666" },
  colRevenueHeader: { flex: 2, fontSize: 9, fontWeight: "bold", color: "#666666", textAlign: "right" },
  colOpenedHeader: { flex: 1, fontSize: 9, fontWeight: "bold", color: "#666666", textAlign: "center" },
  colConcludedHeader: { flex: 1, fontSize: 9, fontWeight: "bold", color: "#666666", textAlign: "center" },
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

function formatDateDisplay(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

type CompanyReportPdfProps = {
  report: CompanyReport;
  companyName: string;
  unitName: string;
  startDate: string;
  endDate: string;
};

export function CompanyReportPdf({ report, companyName, unitName, startDate, endDate }: CompanyReportPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader
          companyName={companyName}
          unitName={unitName !== "Todas as unidades" ? unitName : undefined}
          title="Relatório da Empresa"
        />

        <Text style={styles.periodText}>
          Período: {formatDateDisplay(startDate)} a {formatDateDisplay(endDate)}
          {unitName ? ` · ${unitName}` : ""}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo do período</Text>
          <View style={styles.cardsRow}>
            <View style={styles.cardHighlight}>
              <Text style={styles.cardLabelLight}>Faturamento</Text>
              <Text style={styles.cardValueGold}>{formatCurrency(report.totalRevenue)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>A receber</Text>
              <Text style={styles.cardValue}>{formatCurrency(report.totalReceivable)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>A pagar</Text>
              <Text style={styles.cardValue}>{formatCurrency(report.totalPayable)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>OS abertas</Text>
              <Text style={styles.cardValue}>{String(report.ordersOpened)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>OS concluídas</Text>
              <Text style={styles.cardValue}>{String(report.ordersConcluded)}</Text>
            </View>
          </View>
        </View>

        {report.byUnit.length > 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comparativo por unidade</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.colUnitHeader}>Unidade</Text>
              <Text style={styles.colRevenueHeader}>Faturamento</Text>
              <Text style={styles.colOpenedHeader}>OS abertas</Text>
              <Text style={styles.colConcludedHeader}>OS concluídas</Text>
            </View>
            {report.byUnit.map((unit) => (
              <View key={unit.unitName} style={styles.tableRow}>
                <Text style={styles.colUnit}>{unit.unitName}</Text>
                <Text style={styles.colRevenue}>{formatCurrency(unit.revenue)}</Text>
                <Text style={styles.colOpened}>{String(unit.ordersOpened)}</Text>
                <Text style={styles.colConcluded}>{String(unit.ordersConcluded)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          Documento gerado pelo Aparecida ERP
        </Text>
      </Page>
    </Document>
  );
}
