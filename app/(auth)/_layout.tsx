import { Stack } from "expo-router";
import { colors } from "@/src/theme/tokens";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="recuperar-senha" options={{ headerShown: false }} />
    </Stack>
  );
}
