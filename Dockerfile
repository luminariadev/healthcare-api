FROM alpine:3.20

ARG PB_VERSION=0.22.20
ARG PB_ARCH=amd64

RUN apk add --no-cache unzip ca-certificates && \
    wget -q https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip -O /tmp/pb.zip && \
    unzip /tmp/pb.zip -d /pb/ && \
    rm /tmp/pb.zip && \
    chmod +x /pb/pocketbase

WORKDIR /pb
EXPOSE 8080

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--hooksDir=/pb/pb_hooks", "--migrationsDir=/pb/pb_migrations"]
