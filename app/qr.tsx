import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";
import { useCurrentUser } from "@coinbase/cdp-hooks";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type Tab = "scan" | "pay-me";

function parseErc681(uri: string): string | null {
  const match = uri.match(/^ethereum:(0x[0-9a-fA-F]{40})/);
  return match ? match[1] : null;
}

function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function QRScreen() {
  const [tab, setTab] = useState<Tab>("scan");
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const { currentUser } = useCurrentUser();
  const router = useRouter();

  const walletAddress =
    currentUser?.evmSmartAccounts?.[0] ??
    currentUser?.evmAccounts?.[0] ??
    null;

  const erc681Uri = walletAddress
    ? `ethereum:${walletAddress}@8453`
    : null;

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    const address = parseErc681(data);
    if (address) {
      setScanned(true);
      router.dismiss();
      router.push({ pathname: "/(tabs)/pay", params: { address } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={28} color="#11181C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "scan" && styles.activeTab]}
          onPress={() => setTab("scan")}
        >
          <Text
            style={[styles.tabText, tab === "scan" && styles.activeTabText]}
          >
            Scan Code
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "pay-me" && styles.activeTab]}
          onPress={() => setTab("pay-me")}
        >
          <Text
            style={[styles.tabText, tab === "pay-me" && styles.activeTabText]}
          >
            Pay Me
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "scan" ? (
        <View style={styles.cameraContainer}>
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <MaterialIcons name="camera-alt" size={48} color="#999" />
              <Text style={styles.permissionText}>
                Camera access is needed to scan QR codes
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
              >
                <Text style={styles.permissionButtonText}>
                  Allow Camera Access
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
              <View style={styles.overlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>
                  Point at an ERC-681 QR code
                </Text>
              </View>
            </CameraView>
          )}
        </View>
      ) : (
        <View style={styles.payMeContainer}>
          {erc681Uri ? (
            <>
              <View style={styles.qrBox}>
                <QRCode value={erc681Uri} size={220} />
              </View>
              <Text style={styles.addressLabel}>
                {shortenAddress(walletAddress!)}
              </Text>
              <Text style={styles.networkLabel}>Base (USDC)</Text>
            </>
          ) : (
            <View style={styles.permissionBox}>
              <MaterialIcons name="account-balance-wallet" size={48} color="#999" />
              <Text style={styles.permissionText}>
                Connect a wallet to show your QR code
              </Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#11181C",
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#999",
  },
  activeTabText: {
    color: "#11181C",
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 20,
  },
  scanHint: {
    color: "#fff",
    fontSize: 14,
    marginTop: 16,
    fontWeight: "500",
  },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  permissionText: {
    fontSize: 16,
    color: "#687076",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: "#008CFF",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  payMeContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qrBox: {
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#11181C",
    marginTop: 20,
  },
  networkLabel: {
    fontSize: 14,
    color: "#687076",
    marginTop: 4,
  },
});
