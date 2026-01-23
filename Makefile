.PHONY: help install start dev init deploy logs clean

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

start: ## Start production server
	npm start

dev: ## Start development server
	npm run dev

init: ## Initialize project (check config, test connections)
	npm run init

deploy: ## Deploy to production server
	npm run deploy

logs: ## Show PM2 logs
	pm2 logs hrskipbot

status: ## Show PM2 process status
	pm2 list

restart: ## Restart PM2 process
	npm run pm2:restart

stop: ## Stop PM2 process
	npm run pm2:stop

clean: ## Clean up
	rm -rf node_modules
	rm -rf logs/*.log
	docker-compose down -v 2>/dev/null || true

docker-build: ## Build Docker image
	docker-compose build

docker-up: ## Start with Docker Compose
	docker-compose up -d

docker-down: ## Stop Docker Compose
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f app

test: ## Run tests (if any)
	npm test

lint: ## Run linter (if configured)
	npm run lint