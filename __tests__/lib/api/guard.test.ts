import { toOwnerId, ownerIdOf, canAccessOwned } from "@/lib/api/ownership";

describe("toOwnerId", () => {
  it("zwraca liczbę dla numerycznego id (relacja Postgres)", () => {
    expect(toOwnerId("5")).toBe(5);
  });
  it("zwraca string dla nienumerycznego id", () => {
    expect(toOwnerId("abc")).toBe("abc");
  });
});

describe("ownerIdOf", () => {
  it("null/undefined -> null", () => {
    expect(ownerIdOf(null)).toBeNull();
    expect(ownerIdOf(undefined)).toBeNull();
  });
  it("id liczbowe lub string -> string", () => {
    expect(ownerIdOf(5)).toBe("5");
    expect(ownerIdOf("7")).toBe("7");
  });
  it("obiekt relacji (depth) -> string z id", () => {
    expect(ownerIdOf({ id: 9 })).toBe("9");
    expect(ownerIdOf({ id: "k1", inne: 1 })).toBe("k1");
  });
});

describe("canAccessOwned (izolacja per-konto)", () => {
  it("rekord legacy (bez właściciela) jest dostępny dla każdego konta", () => {
    expect(canAccessOwned(null, "5")).toBe(true);
    expect(canAccessOwned(undefined, "5")).toBe(true);
  });
  it("właściciel == konto -> dostęp", () => {
    expect(canAccessOwned(5, "5")).toBe(true);
    expect(canAccessOwned({ id: 5 }, "5")).toBe(true);
  });
  it("właściciel != konto -> BRAK dostępu (kluczowe: konto A nie widzi danych konta B)", () => {
    expect(canAccessOwned(5, "6")).toBe(false);
    expect(canAccessOwned({ id: 99 }, "5")).toBe(false);
  });
});
