# Jak wygenerować PAYLOAD_SECRET

`PAYLOAD_SECRET` to bezpieczny, losowy klucz używany przez Payload CMS do szyfrowania danych (np. sesji, tokenów).

## Metoda 1: Node.js (zalecane)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Metoda 2: OpenSSL

```bash
openssl rand -base64 32
```

## Metoda 3: PowerShell

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Metoda 4: Online generator

Możesz użyć generatora online, np.:
- https://generate-secret.vercel.app/32
- https://www.random.org/strings/

## Ważne!

- **NIGDY** nie udostępniaj `PAYLOAD_SECRET` publicznie
- **NIGDY** nie commituj pliku `.env` do repozytorium
- Używaj **różnych** kluczy dla różnych środowisk (dev, staging, production)
- Klucz powinien mieć **minimum 32 znaki**

## Przykładowy wygenerowany klucz

```
eqr3HoZLg/r3gNxIkqKkNDPvXApLh7cjBwNc/Pi1ipg=
```

Ten klucz został już ustawiony w Twoim pliku `.env` i jest bezpieczny do użycia.
