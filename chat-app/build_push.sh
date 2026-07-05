#!/bin/sh
set -e

IMAGE_NAME="chat-app"
TAG="$1"
DOCKER_USERNAME="$2"
DOCKER_PASSWORD="$3"

if [ -z "$TAG" ] || [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ]; then
    echo "Usage: $0 <TAG> <DOCKER_USERNAME> <DOCKER_PASSWORD>"
    exit 1
fi

echo "Login Docker Hub..."
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

echo "Building & pushing image..."

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "phamthanhhuy/${IMAGE_NAME}:${TAG}" \
    --push .

echo "Done!"