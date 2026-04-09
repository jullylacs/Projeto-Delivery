SHELL := /bin/bash

REGISTRY       ?= ghcr.io/jullylacs
BACKEND_IMAGE  ?= delivery-backend
FRONTEND_IMAGE ?= delivery-frontend
TAG            ?= latest

.PHONY: build push

build:
	@if [ -z "$(TAG)" ]; then \
		echo "❌ Use ./build.sh"; \
		exit 1; \
	fi
	docker build --no-cache \
		-f docker/Dockerfile.backend \
		-t $(REGISTRY)/$(BACKEND_IMAGE):$(TAG) .
	docker build --no-cache \
		-f docker/Dockerfile.frontend \
		-t $(REGISTRY)/$(FRONTEND_IMAGE):$(TAG) .

push:
	docker push $(REGISTRY)/$(BACKEND_IMAGE):$(TAG)
	docker push $(REGISTRY)/$(FRONTEND_IMAGE):$(TAG)