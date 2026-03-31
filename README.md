# camera-assignments

A small web app for displaying production role assignments on a TV screen during church services. It pulls data from a Google Sheet and pushes live updates to the browser over WebSocket — no page refresh needed when assignments change.

---

## Google Sheets setup

The app reads from a Google Sheet using a service account. You'll need to do this once.

**1. Create a Google Cloud project**

Go to [console.cloud.google.com](https://console.cloud.google.com), create a new project, then enable the **Google Sheets API** under APIs & Services → Library.

**2. Create a service account**

Go to APIs & Services → Credentials → Create Credentials → Service Account. Give it a name, then open it, go to the Keys tab, and create a new JSON key. Save the downloaded file as `service-account.json` in the project root.

**3. Share your sheet**

Open the downloaded JSON and find the `client_email` field. Share your Google Sheet with that email address (Viewer access is enough).

**4. Sheet format**

Row 1 is treated as a header and skipped. Data starts at row 2:

| A — Role  | B — Name   | C — Lead |
|-----------|------------|----------|
| Director  | Sarah M.   | TRUE     |
| Camera 1  | Tom H.     | FALSE    |
| Audio     | Jake R.    | FALSE    |

Set `C` to `TRUE` for whoever is in charge that service. Only one lead is expected.

**5. Get your Sheet ID**

Copy the ID from the sheet URL:
```
https://docs.google.com/spreadsheets/d/SHEET_ID_IS_HERE/edit
```

---

## Running locally

Requires Node.js 18+.

```bash
cp .env.example .env
# edit .env and set SHEET_ID
npm install
npm start
```

Open `http://localhost:3000`.

---

## Running with Docker

**One-shot:**

```bash
docker run -d \
  -p 3000:3000 \
  -e SHEET_ID=your-sheet-id \
  -e SHEET_RANGE="Sheet1!A2:C" \
  -e POLL_INTERVAL_MS=30000 \
  -e GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/secrets/service-account.json \
  -v /absolute/path/to/service-account.json:/secrets/service-account.json:ro \
  ghcr.io/glabutis/camera-assignments:latest
```

**Docker Compose:**

Edit `docker-compose.yml` and set your `SHEET_ID`, then:

```bash
docker compose up -d
```

The compose file builds from source by default. To use the prebuilt image from GHCR instead, follow the comment at the top of `docker-compose.yml`.

---

## Kubernetes

The `k8s/` directory contains a Deployment, Service, ConfigMap, and a secret template.

**1. Update the ConfigMap**

Edit `k8s/configmap.yaml` and set `SHEET_ID` to your actual sheet ID.

**3. Create the secret**

```bash
kubectl create secret generic sheets-sa-key \
  --from-file=service-account.json=./service-account.json
```

**4. Apply**

```bash
kubectl apply -f k8s/
```

The Service is `ClusterIP` by default. To expose it directly, change `type: ClusterIP` to `type: LoadBalancer` in `k8s/service.yaml`, or set up an ingress.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `SHEET_ID` | — | Google Sheet ID (required) |
| `SHEET_RANGE` | `Sheet1!A2:C` | Range to read; update if your tab has a different name |
| `POLL_INTERVAL_MS` | `30000` | How often to check the sheet for changes, in milliseconds |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | `./service-account.json` | Path to the service account JSON key file |

---

## CI/CD

Pushing to `main` triggers a GitHub Actions workflow that builds the Docker image and pushes it to GitHub Container Registry as `ghcr.io/glabutis/camera-assignments:latest` and `:<commit-sha>`. No secrets beyond the default `GITHUB_TOKEN` are needed.

---

## License

MIT
