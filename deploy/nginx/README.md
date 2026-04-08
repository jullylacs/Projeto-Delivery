# Nginx Deploy Notes

This folder contains a production-ready Nginx config for:
- Frontend on `/`
- Backend API on `/api/v1`

## Files
- `delivery.nvxnetworks.com.conf`

## Related backend process setup
- PM2 + systemd files are available at `../pm2/`
- Main docs: `../pm2/README.md`

## Steps
1. Copy config to Nginx sites directory.
2. Adjust certificate paths (`ssl_certificate`, `ssl_certificate_key`).
3. Adjust frontend build path (`root /var/www/delivery-frontend/dist;`).
4. Ensure backend is running at `127.0.0.1:3000`.
5. Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Backend expected env
```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
API_BASE_PATH=/api/v1
ENABLE_LEGACY_ROUTES=false
FRONTEND_URL=https://delivery.nvxnetworks.com
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<another-strong-secret>
SYSTEM_API_TOKEN=<optional>
```

## Frontend expected env
```env
VITE_API_URL=https://delivery.nvxnetworks.com/api/v1
```

## Quick checks
- `https://delivery.nvxnetworks.com/`
- `https://delivery.nvxnetworks.com/api/v1/openapi.json`
- `https://delivery.nvxnetworks.com/api/v1/docs`
