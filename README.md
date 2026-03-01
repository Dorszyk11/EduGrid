# EduGrid

Aplikacja do planowania przydziału godzin w szkołach (Next.js, Payload CMS).

## PostgreSQL SSL (deploy)

Jeśli na deploy pojawia się błąd `self-signed certificate in certificate chain`, ustaw:

- `DB_SSL_MODE=require`
- `DB_SSL_SELF_SIGNED=true`

Opcjonalnie można sterować wprost:

- `DB_SSL_REJECT_UNAUTHORIZED=false` (akceptacja certyfikatów self-signed)
- `DB_SSL_REJECT_UNAUTHORIZED=true` (wymagana pełna weryfikacja certyfikatu)

Domyślnie (`DB_SSL_MODE=auto`) aplikacja używa SSL dla zdalnych hostów PostgreSQL.
