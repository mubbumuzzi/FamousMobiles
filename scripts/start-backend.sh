#!/usr/bin/env bash
set -a
source "$(dirname "$0")/../.env.local"
set +a
cd "$(dirname "$0")/../backend"
exec mvn spring-boot:run
