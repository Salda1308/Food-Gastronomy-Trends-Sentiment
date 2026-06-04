// mobile/__tests__/hooks/useAuth.test.ts
import * as SecureStore from "expo-secure-store";

jest.mock("expo-secure-store");
jest.mock("expo-auth-session/providers/google", () => ({
  useAuthRequest: () => [null, null, jest.fn()],
}));
jest.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn() }) }));

const mockGetItem = SecureStore.getItemAsync as jest.Mock;

import { renderHook, waitFor } from "@testing-library/react-native";
import { useAuth } from "../../hooks/useAuth";

describe("useAuth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("starts with loading=true, then false when no stored user", async () => {
    mockGetItem.mockResolvedValue(null);
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("restores user from SecureStore if present", async () => {
    const fakeUser = { email: "test@test.com", name: "Test" };
    mockGetItem.mockResolvedValue(JSON.stringify(fakeUser));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(fakeUser);
  });
});
