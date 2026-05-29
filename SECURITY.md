# Security Architecture

This document outlines the security principles and operational practices applied to
`furkanbasoglu.com` and its LaTeX compilation service. It is published as a statement
of intent and a transparency commitment to users.

Operational specifics — IP addresses, package versions, file paths, port numbers,
network topology, account identifiers, secret formats — are intentionally **omitted**.
Security through transparency at the *principle* level; security through opacity at
the *implementation* level.

---

## Threat Model

The system is designed with these adversaries in mind, in rough order of expected
frequency:

1. **Automated mass scanners** — bots probing for common vulnerabilities, brute-forcing
   SSH, scanning for exposed services, scraping for credentials.
2. **Abuse traffic** — spam compile requests, resource exhaustion, scraping.
3. **Malicious compile payloads** — LaTeX documents crafted to escape the sandbox,
   access the host filesystem, exfiltrate data, or trigger remote network calls.
4. **Account-level attacks** — credential stuffing, session hijacking, abuse of free
   tier to obtain paid features.
5. **Targeted attackers** — adversaries specifically focused on this service.

Each layer is designed to remain effective **even if the layer immediately outside
it has been bypassed**. This is the principle of *defense in depth*.

---

## Layered Defenses

### Layer 1 — Edge

All public traffic terminates at a managed edge platform before reaching origin.
At this layer the system benefits from:

- Always-on DDoS mitigation
- Web Application Firewall with managed rule sets
- Per-IP and per-user rate limiting
- Bot detection and challenge mechanisms
- TLS termination with modern cipher suites only

The origin server is never directly addressable from the internet.

### Layer 2 — Application

All API endpoints require authentication before processing any request body.

- Authentication uses a third-party identity provider with industry-standard token
  formats. Tokens are cryptographically verified on every request — the origin
  performs full signature validation, not just presence checks.
- Authorization is enforced server-side based on the user's tier; client-side
  signals are not trusted.
- Inputs are validated for size, type, structure, and content before any further
  processing. Requests exceeding declared limits are rejected at this layer.
- Rate limits are enforced per authenticated identity in addition to the edge-level
  per-IP limits.

### Layer 3 — Origin Reachability

The compilation backend is **not exposed via inbound network ports**. Instead,
the backend establishes an outbound-only encrypted tunnel to the edge platform.
This means:

- There are no public IP addresses to scan, no open ports to find, no listening
  services on the public internet.
- The local network router has no port forwarding configured.
- Even if all upstream layers are bypassed, an attacker cannot directly reach
  the compilation backend; they would need to compromise the edge platform itself.
- The tunnel itself is authenticated; only requests carrying a valid service token
  issued by the edge platform are forwarded to the backend.

### Layer 4 — Backend Isolation

The compilation workload runs inside a fully virtualized guest, not directly on
the host serving the public website or holding personal data.

- The guest's virtual network is isolated from the host's home network. Traffic
  between the two is filtered: the guest cannot initiate connections to the home
  network, and the home network cannot reach the guest except through specifically
  authorized administrative paths.
- The host firewall enforces this segmentation at the packet level, independent
  of any guest-side configuration.

If the guest is fully compromised, the attacker still does not have a path into
the host's personal data or other devices on the home network.

### Layer 5 — Guest Hardening

The compilation guest is configured following CIS-aligned hardening practices:

- Remote access permits only public-key authentication; password authentication
  and root login are disabled.
- A host-based firewall denies all inbound traffic by default; only the minimum
  required ports are open, and only from explicitly authorized sources.
- Brute-force protection automatically bans IPs exhibiting authentication abuse.
- Security updates are applied automatically; the system reboots itself during
  a low-traffic window if a kernel update requires it.
- Mandatory access control (kernel-level confinement) is enabled and enforced
  for system services.
- Authentication credentials for inter-service communication are stored with
  least-privilege file permissions and are never present in version control.

### Layer 6 — Compilation Sandbox

Every compilation runs inside an ephemeral container with aggressive restrictions:

- **No network access** — the container cannot make any outbound connections,
  preventing data exfiltration and remote payload retrieval.
- **Read-only filesystem** with a small writable scratch space; the container
  cannot modify any persistent state.
- **Non-root execution** — even within the container, the compile process runs
  as an unprivileged user.
- **Hard resource limits** — CPU, memory, process count, and total runtime are
  capped. A malicious document cannot exhaust host resources.
- **Shell escape disabled** — LaTeX's ability to execute external commands
  (`\write18` and equivalents) is disabled at the engine level.
- **Kernel syscall filtering** restricts the container to a minimal syscall
  surface.
- Containers are destroyed after each compilation; nothing persists between users.

### Layer 7 — Observability

Every compilation request is logged with timestamp, authenticated identity,
input size, outcome, and duration. This enables:

- Detection of anomalous patterns (sudden failure rate spikes, unusual payload
  sizes, off-hours traffic bursts).
- Audit trails for billing and abuse investigation.
- Forensic capability if an incident is suspected.

Logs are retained with appropriate access controls. Personal data in logs is
minimized to what is needed for operation and abuse prevention.

---

## Infrastructure Resilience

Beyond security, the system is designed to recover automatically from common
failure modes without manual intervention:

- **Power loss recovery** — when the physical host loses power and is later
  restored, all required services (virtualization, isolated network, the guest
  itself, in-guest daemons) are configured to start automatically. No human
  action is required to bring the system back online.
- **Boot health reporting** — every host boot triggers a self-diagnostic that
  collects system health metrics, verifies the guest is reachable, and emails
  a summary to the operator. This means unplanned reboots, kernel-update reboots,
  or hardware-triggered restarts are never silent.
- **Configuration hardening persists across reboots** — security settings are
  encoded in systemd units, drop-in configuration files, and persistent firewall
  rules, not in interactive sessions.
- **Automatic security updates** — package security patches are applied without
  manual intervention. The system will reboot itself if a kernel patch requires
  it, but only during a configured low-impact window.

---

## What This System Does **Not** Claim

In the interest of honest transparency:

- This is a single-operator project, not an enterprise-grade managed service.
  There is no 24/7 NOC, no formal SLA, no SOC 2 audit.
- The service is hosted on consumer hardware. Hardware failure is a real risk;
  backups are taken but recovery time is not instantaneous.
- New vulnerabilities are discovered constantly. The hardening described above
  reduces exposure but cannot eliminate it. Users should treat the service as
  appropriate for documents they would also be comfortable preparing on any
  other web-based LaTeX service.
- No system is unbreakable. The goal of this architecture is to make compromise
  *expensive enough* that it is not worth attempting, not to claim mathematical
  impossibility.

---

## Reporting Vulnerabilities

If you believe you have found a security issue in this service, please report
it via the contact form on the website. Please do not file public GitHub issues
for security matters.

Acknowledgment within 72 hours; reasonable effort to triage and respond.
Coordinated disclosure preferred — please give the operator a reasonable window
to remediate before public disclosure.

There is currently no bug bounty program.

---

## Document Status

This document describes the *intended and currently implemented* security posture.
It is updated as the system evolves. The absence of a particular control from
this document does not necessarily mean it is not implemented; some details are
omitted intentionally.

Last reviewed: 2026-05.
