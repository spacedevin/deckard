# Co-DJ gateway — pure Tish, AOT-compiled to a native Linux binary, shipped in distroless.
# Follows tishlang/tish examples/container-example: compile .tish -> Linux glibc binary -> distroless/cc.
# No Node, no JS, no package manager, no Rust toolchain in the runtime image — just the compiled binary.

# ---- build stage: AOT-compile the gateway to a native binary ----
# rust:bookworm gives a current cargo + C toolchain (tish's native backends build a cargo project, so a
# recent Rust is required — the distro's older cargo fails with "missing field `when`"). bookworm's glibc
# (2.36) matches the distroless/cc-debian12 runtime below (newer glibc would make the binary need 2.38+).
FROM rust:bookworm AS build
WORKDIR /src

# nodejs/npm only to fetch the prebuilt tish compiler; pkg-config/libssl-dev for the tish:ws openssl link.
RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Just the compiler. npm runs @tishlang/tish's postinstall (places the Linux binary) by default.
# Keep this version in sync with package.json's @tishlang/tish range.
RUN npm install --no-save --no-package-lock @tishlang/tish@2.12.0

# The gateway imports only built-in modules (tish:ws, tish:process) — this one file is the whole program.
# `cranelift` is the native backend that compiles real-world tish: it embeds bytecode + the VM runtime, so
# it sidesteps the default `rust` backend's codegen bug (E0382 move-of-reused-let — tishlang/tish#328).
COPY services/gateway/main.tish main.tish
RUN mkdir -p /out && node_modules/.bin/tish build --target native --native-backend cranelift \
    main.tish -o /out/gateway

# ---- runtime stage: distroless/cc (glibc, ~20MB, no shell / node / cargo / package manager) ----
FROM gcr.io/distroless/cc-debian12:nonroot
COPY --from=build /out/gateway /app/gateway
# App Platform injects $PORT and routes ingress + the (TCP) health check to it; main.tish reads PORT.
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/gateway"]
