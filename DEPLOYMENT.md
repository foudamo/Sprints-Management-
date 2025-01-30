## Deployment Steps

1. Clone repository:
```bash
git clone https://github.com/yourusername/sprints-management.git
```

2. Install dependencies:
```bash
npm install
cd client && npm install
```

3. Set environment variables:
```bash
cp .env.example .env
```

4. Run in development:
```bash
npm run dev:full
```

5. Production build:
```bash
npm run build
npm start
``` 