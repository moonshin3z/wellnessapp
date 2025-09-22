# WellnessApp

## Requisitos
- Java 21 (Temurin)
- Docker Desktop
- VS Code
- Maven

## Cómo correr 
```bash
docker compose up -d --build
# API:    http://localhost:8082/health  -> ok
# Web:    http://localhost:5173
```

 **solo DB en Docker** y **API local**:
```bash
docker compose up -d db
# en otra terminal
cd backend
mvn -Dspring-boot.run.profiles=local spring-boot:run
# API local: http://localhost:8080/health
```

## Estructura
```
backend/  -> Spring Boot 3.3 (Java 21)
frontend/ -> estáticos (Nginx)
docker-compose.yml -> DB (5432), API (8082), Web (5173)
```

## Endpoints
- GET `/health` -> "ok"
- POST `/assessments/gad7` -> body: `{ "answers": [0..3]*7 }`
```json
{
  "total": 6,
  "category": "leve",
  "message": "Prueba respiración guiada y seguimiento."
}
```

## Notas
- CORS habilitado para `http://localhost:5173`.
- Flyway corre al arrancar y crea tablas básicas.
- Ajusta `.env` si quieres otra DB/usuario/clave.
```
