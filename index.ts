import "react-native-get-random-values";
import structuredClone from "@ungap/structured-clone";
import { install } from "react-native-quick-crypto";

if (!("structuredClone" in globalThis)) {
  (globalThis as any).structuredClone = structuredClone;
}

install();

import "expo-router/entry";
