# furkanbasoglu.com

Personal website built with [Astro](https://astro.build) and hosted on
[Cloudflare Pages](https://pages.cloudflare.com). Includes a public personal
portfolio, an in-browser data visualization tool, and a sandboxed LaTeX
compilation service.

**Live site:** [furkanbasoglu.com](https://furkanbasoglu.com)

---

## What's in here

- **Public site** (`src/pages/`) — Astro pages: home, about, blog, contact, projects.
- **Data Atlas** (`public/veri_atlasi/`) — A self-contained, offline-first CSV
  visualization tool. Open `index.html` in any browser; no server, no network
  required.
- **LaTeX compiler** (`src/pages/latex.astro`, `public/_latex/`,
  `functions/api/compile.ts`) — Browser-based editor with a backend that
  compiles LaTeX in a sandboxed environment and returns a PDF. Currently in
  beta. See [SECURITY.md](./SECURITY.md) for the security model.
- **Contact endpoint** (`functions/api/report.ts`) — A Cloudflare Pages
  Function that validates a bug-report form, performs CAPTCHA verification
  and rate limiting, and forwards messages via a transactional email
  provider.

---

## Tech stack

- **Frontend:** Astro, vanilla TypeScript, Tailwind utility classes
- **Edge functions:** Cloudflare Pages Functions, Cloudflare KV
- **Authentication:** [Clerk](https://clerk.com)
- **Compilation backend:** containerized TeX Live, isolated from the public
  network via an outbound-only tunnel. See [SECURITY.md](./SECURITY.md).

---

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build
npm run preview  # preview built site
```

Build artifacts go to `dist/` and are deployed automatically on push to
`main` via Cloudflare Pages.

---

## Security

This is a multi-tier service handling user authentication, file uploads,
and remote code execution (LaTeX is, in effect, a programming language).
The security posture is documented in [SECURITY.md](./SECURITY.md).

**Found a security issue?** Please use the contact form on the website
rather than filing a public issue. Coordinated disclosure preferred.

---

## License

See [LICENSE](./LICENSE).
