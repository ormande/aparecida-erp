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
  employeeSection: {
    marginBottom: 20,
  },
  employeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#A87C20",
  },
  employeeName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111111",
  },
  employeeEmail: {
    fontSize: 9,
    color: "#64748B",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  colOs: { flex: 1, fontSize: 8 },
  colDate: { flex: 1, fontSize: 8 },
  colDesc: { flex: 3, fontSize: 8 },
  colValue: { flex: 1, fontSize: 8, textAlign: "right" },
  colOsHeader: { flex: 1, fontSize: 8, fontWeight: "bold", color: "#666666" },
  colDateHeader: { flex: 1, fontSize: 8, fontWeight: "bold", color: "#666666" },
  colDescHeader: { flex: 3, fontSize: 8, fontWeight: "bold", color: "#666666" },
  colValueHeader: { flex: 1, fontSize: 8, fontWeight: "bold", color: "#666666", textAlign: "right" },
  cardsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  card: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
    padding: 8,
  },
  cardHighlight: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
    padding: 8,
  },
  cardLabel: {
    fontSize: 7,
    color: "#666666",
    marginBottom: 3,
  },
  cardLabelLight: {
    fontSize: 7,
    color: "#666666",
    marginBottom: 3,
  },
  cardValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111111",
  },
  cardValueGold: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#A87C20",
  },
  grandTotalSection: {
    marginTop: 24,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 16,
  },
  grandTotalTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111111",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  grandTotalLabel: {
    fontSize: 9,
    color: "#666666",
  },
  grandTotalValue: {
    fontSize: 9,
    color: "#111111",
    fontWeight: "bold",
  },
  grandTotalValueGold: {
    fontSize: 14,
    color: "#A87C20",
    fontWeight: "bold",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#CCCCCC",
    marginVertical: 8,
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

type EmployeesSummaryPdfProps = {
  employees: EmployeeReportRow[];
  companyName: string;
  startDate: string;
  endDate: string;
};

export function EmployeesSummaryPdf({ employees, companyName, startDate, endDate }: EmployeesSummaryPdfProps) {
  const grandTotal = employees.reduce((sum, e) => sum + e.totalValue, 0);
  const grandServices = employees.reduce((sum, e) => sum + e.totalServices, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader
          companyName={companyName}
          title="Relatório Geral de Funcionários"
        />

        <Text style={{ fontSize: 9, color: "#64748B", marginBottom: 16 }}>
          Período: {formatDateDisplay(startDate)} a {formatDateDisplay(endDate)}
        </Text>

        {employees.map((employee) => {
          const goalPct =
            employee.monthlyGoal != null && employee.monthlyGoal > 0
              ? ((employee.totalValue / employee.monthlyGoal) * 100).toFixed(1)
              : null;

          return (
            <View key={employee.id} style={styles.employeeSection}>
              <View style={styles.employeeHeader}>
                <View>
                  <Text style={styles.employeeName}>{employee.name}</Text>
                  <Text style={styles.employeeEmail}>{employee.email}</Text>
                </View>
                <Text style={{ fontSize: 9, color: "#64748B" }}>
                  {String(employee.totalServices)} serviço(s) · {formatCurrency(employee.totalValue)}
                </Text>
              </View>

              {employee.services.length > 0 ? (
                <>
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
                </>
              ) : (
                <Text style={{ fontSize: 9, color: "#666666", paddingLeft: 6 }}>
                  Nenhum serviço executado no período.
                </Text>
              )}

              <View style={styles.cardsRow}>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Serviços</Text>
                  <Text style={styles.cardValue}>{String(employee.totalServices)}</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Valor gerado</Text>
                  <Text style={styles.cardValue}>{formatCurrency(employee.totalValue)}</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Comissão</Text>
                  <Text style={styles.cardValue}>{formatCurrency(employee.totalCommission)}</Text>
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
            </View>
          );
        })}

        <View style={styles.grandTotalSection}>
          <Text style={styles.grandTotalTitle}>Totalizador geral</Text>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total de funcionários</Text>
            <Text style={styles.grandTotalValue}>{String(employees.length)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total de serviços executados</Text>
            <Text style={styles.grandTotalValue}>{String(grandServices)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Valor total gerado</Text>
            <Text style={styles.grandTotalValueGold}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Documento gerado pelo Aparecida ERP
        </Text>
      </Page>
    </Document>
  );
}
