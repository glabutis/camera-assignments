# camera-assignments

A small web app for displaying production role assignments on a TV screen during church services. Role data is managed through a built-in admin page at `/admin` and persisted in PostgreSQL. The display at `/` updates live over WebSocket whenever assignments change.

---

## Running locally

Requires Docker and Docker Compose.

```bash
cp .env.example .env
docker compose up -d
```

Open `http://localhost:3000/admin` to add assignments. The display is at `http://localhost:3000`.

To build and run from source without Docker, you'll need Node.js 18+ and a running PostgreSQL instance:

```bash
cp .env.example .env
# edit .env and set DATABASE_URL to your local Postgres connection string
npm install
npm start
```

---

## Running with Docker

**One-shot:**

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://camapp:changeme@your-postgres-host:5432/camapp \
  ghcr.io/glabutis/camera-assignments:latest
```

**Docker Compose** (includes a Postgres container):

```bash
docker compose up -d
```

Edit `docker-compose.yml` to change the default database credentials before running in anything beyond a local dev environment.

---

## Kubernetes

The `k8s/` directory contains manifests for the app, a Postgres StatefulSet, and supporting resources.

**1. Create the Postgres credentials secret**

```bash
kubectl create secret generic postgres-credentials \
  --from-literal=POSTGRES_USER=camapp \
  --from-literal=POSTGRES_PASSWORD=yourpassword
```

**2. Create the app database URL secret**

The connection string here must match the credentials above and point to the `postgres` service:

```bash
kubectl create secret generic camera-db-secret \
  --from-literal=DATABASE_URL=postgresql://camapp:yourpassword@postgres:5432/camapp
```

**3. Apply**

```bash
kubectl apply -f k8s/
```

This creates the Postgres StatefulSet (with a 10Gi PVC), its ClusterIP service, the app Deployment, and the app Service. The app Service is `ClusterIP` by default — change it to `LoadBalancer` in `k8s/service.yaml`, or set up an ingress, to expose it externally.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `DATABASE_URL` | — | PostgreSQL connection string (required) |

---

## CI/CD

Pushing to `main` triggers a GitHub Actions workflow that builds the Docker image and pushes it to GitHub Container Registry as `ghcr.io/glabutis/camera-assignments:latest` and `:<commit-sha>`. No secrets beyond the default `GITHUB_TOKEN` are needed.

---

## License

MIT
