// mobile/__tests__/hooks/useApi.test.ts
import { renderHook, waitFor } from "@testing-library/react-native";
import { useApi } from "../../hooks/useApi";

describe("useApi", () => {
  it("returns loading=true initially then data on success", async () => {
    const fetcher = jest.fn().mockResolvedValue({ name: "omakase" });
    const { result } = renderHook(() => useApi(fetcher));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({ name: "omakase" });
    expect(result.current.error).toBeNull();
  });

  it("sets error on failure", async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error("API error 500"));
    const { result } = renderHook(() => useApi(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("API error 500");
    expect(result.current.data).toBeNull();
  });

  it("refetch increments tick and re-calls fetcher", async () => {
    const fetcher = jest.fn().mockResolvedValue("data");
    const { result } = renderHook(() => useApi(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(1);

    result.current.refetch();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});
