FROM ghcr.io/babelcloud/sandbox-unit-tester:main

WORKDIR /opt

COPY . .

SHELL ["/bin/bash", "-c"]

RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.1.18"

ENV PATH="/root/.bun/bin:$PATH"

RUN bun install