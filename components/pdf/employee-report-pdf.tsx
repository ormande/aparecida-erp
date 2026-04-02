import "@/lib/pdf-fonts";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { EmployeeReportRow } from "@/app/relatorios/page";

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
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  colOs: { flex: 1, fontSize: 9 },
  colDate: { flex: 1, fontSize: 9 },
  colDesc: { flex: 3, fontSize: 9 },
  colValue: { flex: 1, fontSize: 9, textAlign: "right" },
  colOsHeader: { flex: 1, fontSize: 9, fontWeight: "bold", color: "#666666" },
  colDateHeader: { flex: 1, fontSize: 9, fontWeight: "bold", color: "#666666" },
  colDescHeader: { flex: 3, fontSize: 9, fontWeight: "bold", color: "#666666" },
  colValueHeader: { flex: 1, fontSize: 9, fontWeight: "bold", color: "#666666", textAlign: "right" },
  cardsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  card: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 10,
  },
  cardHighlight: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 10,
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
    fontSize: 13,
    fontWeight: "bold",
    color: "#111111",
  },
  cardValueGold: {
    fontSize: 13,
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

function formatDateDisplay(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

type EmployeeReportPdfProps = {
  employee: EmployeeReportRow;
  companyName: string;
  startDate: string;
  endDate: string;
};

export function EmployeeReportPdf({ employee, companyName, startDate, endDate }: EmployeeReportPdfProps) {
  const goalPct =
    employee.monthlyGoal != null && employee.monthlyGoal > 0
      ? ((employee.totalValue / employee.monthlyGoal) * 100).toFixed(1)
      : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader
          companyName={companyName}
          title={`Relatório de Funcionário — ${employee.name}`}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do funcionário</Text>
          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Nome</Text>
              <Text style={styles.value}>{employee.name}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>E-mail</Text>
              <Text style={styles.value}>{employee.email || "—"}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Período</Text>
              <Text style={styles.value}>{formatDateDisplay(startDate)} a {formatDateDisplay(endDate)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Meta mensal</Text>
              <Text style={styles.value}>
                {employee.monthlyGoal != null ? formatCurrency(employee.monthlyGoal) : "Sem meta definida"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serviços executados</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colOsHeader}>OS</Text>
            <Text style={styles.colDateHeader}>Data</Text>
            <Text style={styles.colDescHeader}>Descrição</Text>
            <Text style={styles.colValueHeader}>Valor</Text>
          </View>
          {employee.services.map((svc, i) => (
            <View key={`${svc.orderNumber}-${i}`} style={styles.tableRow}>
              <Text style={styles.colOs}>{svc.orderNumber}</Text>
              <Text style={styles.colDate}>{formatDate(svc.date)}</Text>
              <Text style={styles.colDesc}>{svc.description}</Text>
              <Text style={styles.colValue}>{formatCurrency(svc.value)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Serviços executados</Text>
            <Text style={styles.cardValue}>{String(employee.totalServices)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Valor total gerado</Text>
            <Text style={styles.cardValue}>{formatCurrency(employee.totalValue)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Meta mensal</Text>
            <Text style={styles.cardValue}>
              {employee.monthlyGoal != null ? formatCurrency(employee.monthlyGoal) : "—"}
            </Text>
          </View>
          <View style={styles.cardHighlight}>
            <Text style={styles.cardLabelLight}>% atingido</Text>
            <Text style={styles.cardValueGold}>{goalPct != null ? `${goalPct}%` : "—"}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Documento gerado pelo Aparecida ERP
        </Text>
      </Page>
    </Document>
  );
}
