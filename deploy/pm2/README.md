# PM2 + systemd (backend)

This setup keeps the backend online and auto-starting after reboot.

## 1) Install PM2 globally
```bash
sudo npm install -g pm2
```

## 2) Prepare folders
```bash
sudo mkdir -p /var/log/delivery
sudo chown -R www-data:www-data /var/log/delivery
sudo mkdir -p /var/www/.pm2
sudo chown -R www-data:www-data /var/www/.pm2
```

## 3) Update ecosystem file
Edit `ecosystem.config.cjs` and confirm:
- `cwd` points to your backend directory
- env vars match production (`JWT_SECRET`, `JWT_REFRESH_SECRET`, DB vars, etc.)

## 4) Start app with PM2
```bash
cd /var/www/delivery/deploy/pm2
pm2 start ecosystem.config.cjs
pm2 save
```

## 5) Register systemd service
Copy `delivery-backend.service` to systemd and reload:
```bash
sudo cp /var/www/delivery/deploy/pm2/delivery-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable delivery-backend
sudo systemctl start delivery-backend
```

## 6) Verify status and logs
```bash
sudo systemctl status delivery-backend
pm2 list
pm2 logs delivery-backend --lines 200
```

## Optional: recreate service with PM2 helper
If PM2 binary path differs in your server:
```bash
sudo pm2 startup systemd -u www-data --hp /var/www
pm2 save
```

## Notes
- Keep `ENABLE_LEGACY_ROUTES=false` in production after frontend migration.
- Backend should remain behind Nginx (`/api/v1`).
