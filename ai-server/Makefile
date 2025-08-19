.PHONY: env-dev env-prod dev prod build up down logs

# --- Env switching ---
env-dev:
	cp .env.dev .env

env-prod:
	cp .env.prod .env

# --- Compose helpers (현재 docker-compose.yml은 service env_file: .env 사용) ---
build:
	docker compose build --build-arg PRECACHE_CLIP=1 --build-arg PRECACHE_BLIP=1

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f ai-server

# --- One-shot shortcuts ---
dev: env-dev build up

prod: env-prod build up
