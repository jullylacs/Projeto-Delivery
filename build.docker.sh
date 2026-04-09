#!/bin/bash
set -e

DEFAULT_REGISTRY="ghcr.io/jullylacs"
DEFAULT_BACKEND_IMAGE="delivery-backend"
DEFAULT_FRONTEND_IMAGE="delivery-frontend"
DEFAULT_VERSION="0.0.0"
DEFAULT_LATEST="latest"

echo "=== DELIVERY BUILD ==="
echo

# REGISTRY
read -p "Registry [${DEFAULT_REGISTRY}]: " REGISTRY
REGISTRY=${REGISTRY:-$DEFAULT_REGISTRY}

# IMAGES
read -p "Backend image [${DEFAULT_BACKEND_IMAGE}]: " BACKEND_IMAGE
BACKEND_IMAGE=${BACKEND_IMAGE:-$DEFAULT_BACKEND_IMAGE}

read -p "Frontend image [${DEFAULT_FRONTEND_IMAGE}]: " FRONTEND_IMAGE
FRONTEND_IMAGE=${FRONTEND_IMAGE:-$DEFAULT_FRONTEND_IMAGE}

# VERSION
read -p "Version/Tag [${DEFAULT_VERSION}]: " VERSION
VERSION=${VERSION:-$DEFAULT_VERSION}

# LATEST?
read -p "Also tag as 'latest'? (y/n) [y]: " USE_LATEST
USE_LATEST=${USE_LATEST:-y}
LATEST_TAG=""
if [[ "$USE_LATEST" =~ ^[Yy]$ ]]; then
    read -p "Tag name for 'latest' [${DEFAULT_LATEST}]: " LATEST_TAG
    LATEST_TAG=${LATEST_TAG:-$DEFAULT_LATEST}
fi

# PUSH?
read -p "Push after build? (y/n) [n]: " DO_PUSH
DO_PUSH=${DO_PUSH:-n}

echo
echo "=== CONFIRMATION ==="
echo "Registry : $REGISTRY"
echo "Backend  : ${REGISTRY}/${BACKEND_IMAGE}:${VERSION}"
echo "Frontend : ${REGISTRY}/${FRONTEND_IMAGE}:${VERSION}"
if [[ "$USE_LATEST" =~ ^[Yy]$ ]]; then
    echo "Latest   : $LATEST_TAG"
else
    echo "Latest   : no"
fi
echo "Push     : $DO_PUSH"
echo

read -p "Confirm build? (y/n): " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || exit 1

echo
echo "=== BUILDING ==="

make -f docker/Makefile build \
    REGISTRY="$REGISTRY" \
    BACKEND_IMAGE="$BACKEND_IMAGE" \
    FRONTEND_IMAGE="$FRONTEND_IMAGE" \
    TAG="$VERSION"

if [[ "$USE_LATEST" =~ ^[Yy]$ ]]; then
    make -f docker/Makefile build \
        REGISTRY="$REGISTRY" \
        BACKEND_IMAGE="$BACKEND_IMAGE" \
        FRONTEND_IMAGE="$FRONTEND_IMAGE" \
        TAG="$LATEST_TAG"
fi

if [[ "$DO_PUSH" =~ ^[Yy]$ ]]; then
    echo
    echo "=== PUSH ==="
    make -f docker/Makefile push \
        REGISTRY="$REGISTRY" \
        BACKEND_IMAGE="$BACKEND_IMAGE" \
        FRONTEND_IMAGE="$FRONTEND_IMAGE" \
        TAG="$VERSION"

    if [[ "$USE_LATEST" =~ ^[Yy]$ ]]; then
        make -f docker/Makefile push \
            REGISTRY="$REGISTRY" \
            BACKEND_IMAGE="$BACKEND_IMAGE" \
            FRONTEND_IMAGE="$FRONTEND_IMAGE" \
            TAG="$LATEST_TAG"
    fi
fi

echo
echo "✅ Completed successfully."