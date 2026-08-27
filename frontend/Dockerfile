# Dockerfile za frontend (React)
# Ovaj fajl pravi Docker sliku naše React aplikacije

FROM node:20-alpine
# polazimo od zvanične Node.js slike, verzija 20, "alpine" varijanta je manja po veličini

WORKDIR /app
# postavljamo /app kao radni direktorijum unutar kontejnera

COPY package.json package-lock.json ./
# kopiramo SAMO fajlove sa listom zavisnosti prvo
# ovo ubrzava build jer se ovaj sloj kešira ako se zavisnosti ne menjaju

RUN npm install
# instaliramo sve npm pakete navedene u package.json (React, Bootstrap, itd.)

COPY . .
# kopiramo sav ostatak koda frontend-a (src/, public/...) u kontejner

EXPOSE 3000
# obaveštavamo Docker da aplikacija koristi port 3000

CMD ["npm", "start"]
# komanda koja pokreće React development server kad se kontejner podigne
