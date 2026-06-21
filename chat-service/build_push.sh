#!/bin/sh

set -e

IMAGE_NAME="chat-service"
TAG="$1"
DOCKER_USERNAME="$2"
DOCKER_PASSWORD="$3"

# Kiểm tra tham số đầu vào
if [ -z "$TAG" ] || [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ]; then
    echo "Usage: $0 <TAG> <DOCKER_USERNAME> <DOCKER_PASSWORD>"
    exit 1
fi

echo "Building image..."

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "phamthanhhuy/${IMAGE_NAME}:${TAG}" \
    -f Dockerfile \
    --push .

echo "Build image success..."

echo "Login Docker Hub..."
docker login -u "${DOCKER_USERNAME}" -p "${DOCKER_PASSWORD}"

echo "Push image..."
docker push "phamthanhhuy/${IMAGE_NAME}:${TAG}"

echo "Push success, image is phamthanhhuy/${IMAGE_NAME}:${TAG}"

echo "Remove local image..."
docker image rm -f "phamthanhhuy/${IMAGE_NAME}:${TAG}"

echo "Success!"
exit 0