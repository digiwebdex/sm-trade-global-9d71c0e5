Root cause likely:

1. The frontend is loading, but `/api/auth/login` returns `502 Bad Gateway`, so Nginx cannot reach the correct backend for `soft.smtradeint.com`.
2. Your earlier `curl http://localhost:3001/api/auth/login ...` returned `{"error":"Email and password required"}`. That response does not match this project’s backend code, because this project expects `username` and `password`. So port `3001` is probably another/old backend, not the correct SM Trade software backend.
3. Project memory says this app’s backend should run on port `3105`, with Nginx proxying only `soft.smtradeint.com/api` to `http://localhost:3105/api`.
4. The repeated login issue happens when deployment restarts/creates the wrong PM2 process or tests the wrong port, while Nginx still points `/api` to a backend that is down, wrong, or on a different port.

Safe advanced approach: isolate everything to `soft.smtradeint.com`, do not stop any shared PM2 apps, do not touch other live ports, and only restart this project’s backend after verifying the correct port/process.

Implementation/runbook plan:

1. Identify the correct isolated backend
   - Do not use `pm2 restart all`.
   - Do not kill Node processes manually.
   - Check only these:
     - PM2 process named `smtrade-api` or the soft project backend.
     - Nginx config for `/etc/nginx/sites-available/soft.smtradeint.com`.
     - Listening process on port `3105`.
   - Treat port `3001` as suspicious unless Nginx confirms it belongs to `soft.smtradeint.com`.

2. Verify without changing anything
   Run read-only diagnostics on VPS:

   ```bash
   pm2 status
   pm2 describe smtrade-api
   pm2 logs smtrade-api --lines 80 --nostream
   sudo nginx -T 2>/dev/null | grep -A30 -B5 "server_name soft.smtradeint.com"
   ss -tlnp | grep -E ':(3001|3105|8080|80|443)'
   curl -i http://localhost:3105/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}'
   curl -i https://soft.smtradeint.com/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}'
   ```

   Expected result:
   - `localhost:3105/api/auth/login` should respond from this project’s backend.
   - If it says `Email and password required`, it is the wrong backend.
   - If it says connection refused, backend is not running on `3105`.
   - If localhost works but domain returns 502, Nginx proxy is wrong.

3. Fix only the soft backend process
   If backend is not running on `3105`, update only `/var/www/smtradeapp/server/.env`:

   ```bash
   PORT=3105
   DB_HOST=localhost
   DB_USER=smtrade_user
   DB_PASSWORD=StrongPass123!
   DB_NAME=smtrade_db
   ```

   Then restart only this PM2 process:

   ```bash
   cd /var/www/smtradeapp/server
   npm install
   pm2 restart smtrade-api --update-env
   pm2 logs smtrade-api --lines 50 --nostream
   ```

   If `smtrade-api` does not exist, create only this project’s PM2 process:

   ```bash
   cd /var/www/smtradeapp/server
   PORT=3105 pm2 start index.js --name smtrade-api
   pm2 save
   ```

4. Fix only the soft.smtradeint.com Nginx location if needed
   If Nginx is proxying `/api` to the wrong port, edit only this file:

   ```bash
   sudo nano /etc/nginx/sites-available/soft.smtradeint.com
   ```

   `/api` block should be like:

   ```nginx
   location /api/ {
       proxy_pass http://127.0.0.1:3105/api/;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

   Then validate before reload:

   ```bash
   sudo nginx -t
   ```

   Only if validation succeeds:

   ```bash
   sudo systemctl reload nginx
   ```

   This reload is safer than restart and should not interrupt other sites if config test passes.

5. Add an isolated health check to prevent future repeated login failures
   Add a lightweight backend route later:

   ```text
   GET /api/health
   returns: { ok: true, app: "smtrade-api", port: 3105 }
   ```

   Then after every deploy, test:

   ```bash
   curl -i http://localhost:3105/api/health
   curl -i https://soft.smtradeint.com/api/health
   ```

   This prevents testing the wrong backend again.

6. Safer future deployment method
   For future updates like the PDF total-section fix:

   ```bash
   cd /var/www/smtradeapp
   git pull origin main
   npm install
   npm run build

   cd /var/www/smtradeapp/server
   npm install
   pm2 restart smtrade-api --update-env

   curl -i http://localhost:3105/api/health
   curl -I https://soft.smtradeint.com
   curl -i https://soft.smtradeint.com/api/health
   ```

Strict no-interruption rules:

- Do not run `pm2 restart all`.
- Do not run `pm2 delete all`.
- Do not stop `sm-trade-backend`, `ecotrippers`, `ecotripperstudy`, or any other unrelated PM2 app.
- Do not kill Node by PID unless we first confirm that PID belongs to `smtrade-api` and port `3105`.
- Do not edit `/etc/nginx/nginx.conf` globally.
- Do not edit configs for `smtradeint.com`; only edit `soft.smtradeint.com`.
- Do not change MySQL global settings.
- Do not drop/recreate database tables.

If you approve, I will prepare the exact safe command sequence for your VPS, step by step, focused only on `soft.smtradeint.com` and `smtrade-api`.