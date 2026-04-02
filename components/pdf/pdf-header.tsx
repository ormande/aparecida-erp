import "@/lib/pdf-fonts";
import { StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  companyName: {
    fontSize: 18,
    fontFamily: "DM Sans",
    fontWeight: "bold",
    color: "#111111",
  },
  unitName: {
    fontSize: 10,
    fontFamily: "DM Sans",
    color: "#64748B",
    marginTop: 2,
  },
  title: {
    fontSize: 13,
    fontFamily: "DM Sans",
    fontWeight: "bold",
    color: "#A87C20",
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dateText: {
    fontSize: 9,
    fontFamily: "DM Sans",
    color: "#64748B",
    marginTop: 3,
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: "#A87C20",
    marginTop: 10,
  },
});

type PdfHeaderProps = {
  companyName: string;
  unitName?: string;
  title: string;
};

function formatToday() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear());
  return `${day}/${month}/${year}`;
}

export function PdfHeader({ companyName, unitName, title }: PdfHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.companyName}>{companyName}</Text>
      {unitName ? <Text style={styles.unitName}>{unitName}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.dateText}>Gerado em {formatToday()}</Text>
      <View style={styles.divider} />
    </View>
  );
}
