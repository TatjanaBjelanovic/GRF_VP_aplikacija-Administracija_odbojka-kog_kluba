# Dockerfile za backend (Flask)
# Ovaj fajl govori Docker-u korak po korak kako da napravi sliku našeg backend-a

FROM python:3.11-slim
# polazimo od zvanične, "olakšane" (slim) Python 3.11 slike - manja je i brža za preuzimanje

WORKDIR /app
# postavljamo /app kao radni direktorijum unutar kontejnera
# sve naredne komande se izvršavaju iz ovog foldera

COPY requirements.txt .
# kopiramo SAMO requirements.txt prvo (pre ostatka koda)
# ovo ubrzava buduće build-ove jer se ovaj sloj kešira ako se requirements ne menjaju

RUN pip install --no-cache-dir -r requirements.txt
# instaliramo sve Python biblioteke iz requirements.txt
# --no-cache-dir smanjuje veličinu slike jer ne čuva keš pip-a

COPY . .
# kopiramo sav ostatak koda backend-a (app.py, models.py, routes...) u kontejner

EXPOSE 5000
# obaveštavamo Docker da će aplikacija koristiti port 5000 (informativno, ne otvara ga stvarno)

ENV FLASK_APP=app.py
# govorimo "flask run" komandi koji fajl da pokrene kao ulaznu tačku aplikacije

ENV FLASK_RUN_HOST=0.0.0.0
# dodatno osiguravamo da Flask sluša na svim mrežnim interfejsima unutar kontejnera

CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
# komanda koja se izvršava kad se kontejner pokrene
# --host=0.0.0.0 je OBAVEZNO u Docker-u da bi aplikacija bila dostupna van kontejnera
