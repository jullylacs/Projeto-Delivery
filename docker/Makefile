SHELL := /bin/bash

REGISTRY       ?= ghcr.io/jullylacs
BACKEND_IMAGE  ?= delivery-backend
FRONTEND_IMAGE ?= delivery-frontend
TAG            ?= latest
TAG_LATEST     ?= false   # passe TAG_LATEST=true para retaggear como latest

.PHONY: build push

build:
	@if [ -z "$(TAG)" ]; then \
		echo "❌ Use: make build TAG=<versao>"; \
		exit 1; \
	fi
	docker build --no-cache \
		-f docker/Dockerfile.backend \
		-t $(REGISTRY)/$(BACKEND_IMAGE):$(TAG) .
	docker build --no-cache \
		-f docker/Dockerfile.frontend \
		-t $(REGISTRY)/$(FRONTEND_IMAGE):$(TAG) .
	@if [ "$(TAG_LATEST)" = "true" ] && [ "$(TAG)" != "latest" ]; then \
		echo "🏷️  Tagging $(TAG) → latest ..."; \
		docker tag $(REGISTRY)/$(BACKEND_IMAGE):$(TAG)  $(REGISTRY)/$(BACKEND_IMAGE):latest; \
		docker tag $(REGISTRY)/$(FRONTEND_IMAGE):$(TAG) $(REGISTRY)/$(FRONTEND_IMAGE):latest; \
	fi

push:
	docker push $(REGISTRY)/$(BACKEND_IMAGE):$(TAG)
	docker push $(REGISTRY)/$(FRONTEND_IMAGE):$(TAG)
	@if [ "$(TAG_LATEST)" = "true" ] && [ "$(TAG)" != "latest" ]; then \
		echo "📤 Pushing latest ..."; \
		docker push $(REGISTRY)/$(BACKEND_IMAGE):latest; \
		docker push $(REGISTRY)/$(FRONTEND_IMAGE):latest; \
	fi