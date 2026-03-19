FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        iproute2 \
        iptables \
        iputils-ping \
        tcpdump \
        wireguard-tools \
    && rm -rf /var/lib/apt/lists/*

CMD ["sh", "-lc", "trap 'exit 0' TERM INT; while sleep 3600; do :; done"]
