# syntax=docker/dockerfile:1
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl git \
    && rm -rf /var/lib/apt/lists/*

COPY --chmod=0755 container/web-search /usr/local/bin/web-search
COPY --chmod=0755 container/web-extract /usr/local/bin/web-extract

COPY container/parallel_usage.py /usr/local/bin/parallel_usage.py

WORKDIR /opt/f1bench
RUN mkdir --parents /workspace /input /history /memory /output \
    && chmod 0777 /workspace /memory /output

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_PROGRESS_BAR=off
WORKDIR /workspace
