# Backend Ribossomo - Protein Translator

Backend FastAPI para a Fase III do projeto: mRNA maduro -> proteína.

## Instalação

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Execução

Na raiz do repositório:

```powershell
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Endpoints principais:

- `GET /api/health`
- `POST /api/translate`
- `POST /api/translate/export`
- `GET /api/translate/examples`
- `GET /api/translate/genetic-code`

O contrato de `POST /api/translate` segue `docs/API_CONTRACT.md` e entrega o mesmo formato consumido pelo front-end em `frontend/src/utils/apiClient.ts`.
