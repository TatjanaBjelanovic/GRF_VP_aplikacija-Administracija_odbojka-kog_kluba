# Uputstvo za pokretanje projekta (korak po korak)

## 1. Raspakuj fajlove
Preuzmi sve fajlove i stavi ih u folder `odbojka-projekat/` po strukturi:
```
odbojka-projekat/
├── docker-compose.yml
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app.py
└── frontend/
    └── Dockerfile
```

## 2. Generiši React aplikaciju (jednom, lokalno)
Frontend Dockerfile očekuje da već postoji React projekat u folderu `frontend/`.
Otvori terminal, uđi u folder `frontend/` i pokreni:

```bash
npx create-react-app .
```
(tačka na kraju znači "generiši ovde, u trenutnom folderu")

Zatim instaliraj Bootstrap za React:
```bash
npm install react-bootstrap bootstrap
```

## 3. Pokreni ceo projekat kroz Docker
Vrati se u glavni folder `odbojka-projekat/` (gde je docker-compose.yml) i pokreni:

```bash
docker-compose up --build
```

`--build` govori Docker-u da napravi slike iz Dockerfile-ova (obavezno prvi put
i svaki put kad promeniš requirements.txt ili package.json).

## 4. Proveri da li sve radi
- Frontend: otvori u browseru `http://localhost:3000`
- Backend health check: `http://localhost:5000/api/health`
- Test konekcije sa bazom: `http://localhost:5000/api/db-test`

Ako `db-test` vrati `{"baza": "povezana uspešno"}` — sve je spremno za sutra,
kad krećemo na prave modele (tabele) i rute.

## 5. Gašenje kontejnera
Kad završiš rad:
```bash
docker-compose down
```
(dodaj `-v` na kraj ako želiš i da obrišeš podatke iz baze: `docker-compose down -v`)
