import { Redirect } from "expo-router";

// Catches unmatched routes including Expo Go's exp://IP:PORT/--/ URL
export default function NotFound() {
  return <Redirect href="/" />;
}
