#!/usr/bin/env python3
"""
Полные E2E тесты для bot_manager — UI (Selenium) + API (httpx).
"""

import os
import sys
import time
import json
import httpx
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

BASE_URL = os.getenv("TEST_URL", "http://localhost:3000")
ADMIN_LOGIN = os.getenv("ADMIN_LOGIN", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "559123")

results = {"passed": 0, "failed": 0, "errors": []}


def log(test_name, status, detail=""):
    icon = "✅" if status == "PASS" else "❌"
    results[status == "PASS" and "passed" or "failed"] += 1
    msg = f"  {icon} {test_name}"
    if detail:
        msg += f" — {detail}"
    print(msg)
    if status == "FAIL" and detail:
        results["errors"].append(f"{test_name}: {detail}")


# ═══════════════════════════════════════════════════════════════
#  API Tests
# ═══════════════════════════════════════════════════════════════

def api_tests():
    print("\n" + "=" * 50)
    print("  API Tests")
    print("=" * 50)

    client = httpx.Client(base_url=BASE_URL, follow_redirects=False, timeout=10)
    bot_id = None

    # --- 1. Login page accessible ---
    try:
        r = client.get("/login")
        log("GET /login — page renders", "PASS" if r.status_code == 200 else "FAIL",
            f"HTTP {r.status_code}")
    except Exception as e:
        log("GET /login", "FAIL", str(e))

    # --- 2. Login API ---
    try:
        r = client.post("/api/auth/login", json={"login": ADMIN_LOGIN, "password": ADMIN_PASSWORD})
        if r.status_code == 200:
            log("POST /api/auth/login — success", "PASS")
            # httpx stores cookies as dict
            cookies = {c.name: c.value for c in r.cookies}
            cookie_header = "; ".join(f"{k}={v}" for k, v in cookies.items())
        else:
            log("POST /api/auth/login", "FAIL", f"HTTP {r.status_code}: {r.text[:200]}")
            return
    except Exception as e:
        log("POST /api/auth/login", "FAIL", str(e))
        return

    auth_headers = {"Cookie": cookie_header, "Content-Type": "application/json"}

    # --- 3. Protected page redirect without auth ---
    try:
        r = httpx.get(f"{BASE_URL}/dashboard", follow_redirects=False, timeout=10)
        is_redirect = r.status_code in (301, 302, 307, 308)
        log("GET /dashboard (no auth) — redirects", "PASS" if is_redirect else "FAIL",
            f"HTTP {r.status_code}")
    except Exception as e:
        log("GET /dashboard (no auth)", "FAIL", str(e))

    # --- 4. GET /api/bots (empty) ---
    try:
        r = client.get("/api/bots", headers=auth_headers)
        data = r.json()
        has_bots = "bots" in data
        log("GET /api/bots — returns array", "PASS" if has_bots else "FAIL",
            f"{len(data.get('bots', []))} bots")
    except Exception as e:
        log("GET /api/bots", "FAIL", str(e))

    # --- 5. POST /api/bots (create) ---
    try:
        r = client.post("/api/bots", json={
            "name": "API Test Bot",
            "type": "TELEGRAM",
            "token": "123456:API-TEST-TOKEN"
        }, headers=auth_headers)
        if r.status_code == 201:
            bot_id = r.json()["bot"]["id"]
            log("POST /api/bots — created", "PASS", f"id={bot_id[:8]}...")
        else:
            log("POST /api/bots", "FAIL", f"HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e:
        log("POST /api/bots", "FAIL", str(e))

    # --- 6. GET /api/bots/:id ---
    if bot_id:
        try:
            r = client.get(f"/api/bots/{bot_id}", headers=auth_headers)
            if r.status_code == 200:
                name = r.json()["bot"]["name"]
                log("GET /api/bots/:id — returns bot", "PASS", f"name={name}")
            else:
                log("GET /api/bots/:id", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            log("GET /api/bots/:id", "FAIL", str(e))

    # --- 7. PATCH /api/bots/:id ---
    if bot_id:
        try:
            r = client.patch(f"/api/bots/{bot_id}", json={
                "name": "API Test Bot Updated",
                "webhookUrl": "https://example.com/webhook"
            }, headers=auth_headers)
            if r.status_code == 200:
                log("PATCH /api/bots/:id — updated", "PASS")
            else:
                log("PATCH /api/bots/:id", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            log("PATCH /api/bots/:id", "FAIL", str(e))

    # --- 8. POST /api/bots/:id/toggle ---
    if bot_id:
        try:
            r = client.post(f"/api/bots/{bot_id}/toggle", headers=auth_headers)
            if r.status_code == 200:
                enabled = r.json()["bot"]["enabled"]
                log("POST /api/bots/:id/toggle — toggled", "PASS", f"enabled={enabled}")
            else:
                log("POST /api/bots/:id/toggle", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            log("POST /api/bots/:id/toggle", "FAIL", str(e))

    # --- 9. GET /api/logs ---
    try:
        r = client.get("/api/logs", headers=auth_headers)
        if r.status_code == 200:
            data = r.json()
            log("GET /api/logs — returns logs", "PASS", f"total={data.get('total', 0)}")
        else:
            log("GET /api/logs", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        log("GET /api/logs", "FAIL", str(e))

    # --- 10. GET /api/logs/error ---
    try:
        r = client.get("/api/logs/error", headers=auth_headers)
        if r.status_code == 200:
            data = r.json()
            log("GET /api/logs/error — returns errors", "PASS", f"total={data.get('total', 0)}")
        else:
            log("GET /api/logs/error", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        log("GET /api/logs/error", "FAIL", str(e))

    # --- 11. DELETE /api/bots/:id ---
    if bot_id:
        try:
            r = client.delete(f"/api/bots/{bot_id}", headers=auth_headers)
            if r.status_code == 200:
                log("DELETE /api/bots/:id — deleted", "PASS")
            else:
                log("DELETE /api/bots/:id", "FAIL", f"HTTP {r.status_code}")
        except Exception as e:
            log("DELETE /api/bots/:id", "FAIL", str(e))

    # --- 12. Wrong password ---
    try:
        r = client.post("/api/auth/login", json={"login": ADMIN_LOGIN, "password": "wrong"})
        if r.status_code == 401:
            log("POST /api/auth/login (wrong pw) — 401", "PASS")
        else:
            log("POST /api/auth/login (wrong pw)", "FAIL", f"HTTP {r.status_code}")
    except Exception as e:
        log("POST /api/auth/login (wrong pw)", "FAIL", str(e))

    client.close()


# ═══════════════════════════════════════════════════════════════
#  UI Tests (Selenium)
# ═══════════════════════════════════════════════════════════════

def create_driver():
    opts = Options()
    opts.add_argument("--headless")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    return webdriver.Firefox(options=opts)


def ui_tests():
    print("\n" + "=" * 50)
    print("  UI Tests (Selenium)")
    print("=" * 50)

    d = create_driver()
    try:
        # --- 1. Login page ---
        d.get(f"{BASE_URL}/login")
        h1 = d.find_element(By.CSS_SELECTOR, "h1").text
        log("Login page — title", "PASS" if "Bot Manager" in h1 else "FAIL", h1)

        # --- 2. Form elements ---
        try:
            d.find_element(By.CSS_SELECTOR, 'input[type="text"]')
            d.find_element(By.CSS_SELECTOR, 'input[type="password"]')
            d.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
            log("Login page — form elements", "PASS")
        except Exception:
            log("Login page — form elements", "FAIL")

        # --- 3. Successful login ---
        d.find_element(By.CSS_SELECTOR, 'input[type="text"]').send_keys(ADMIN_LOGIN)
        d.find_element(By.CSS_SELECTOR, 'input[type="password"]').send_keys(ADMIN_PASSWORD)
        d.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
        try:
            WebDriverWait(d, 10).until(EC.url_contains("/dashboard"))
            log("Login → redirect to dashboard", "PASS", d.current_url)
        except TimeoutException:
            log("Login → redirect", "FAIL", f"stayed at {d.current_url}")

        # --- 4. Dashboard page ---
        try:
            h1 = d.find_element(By.CSS_SELECTOR, "h1").text
            log("Dashboard page — renders", "PASS" if "Dashboard" in h1 else "FAIL", h1)
        except Exception as e:
            log("Dashboard page", "FAIL", str(e))

        # --- 5. Bots page ---
        d.get(f"{BASE_URL}/bots")
        try:
            WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "h1")))
            h1 = d.find_element(By.CSS_SELECTOR, "h1").text
            log("Bots page — renders", "PASS" if "Бот" in h1 else "FAIL", h1)
        except Exception as e:
            log("Bots page", "FAIL", str(e))

        # --- 6. Create bot via UI ---
        try:
            d.find_element(By.CSS_SELECTOR, 'a[href="/bots/new"]').click()
            WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="text"]')))

            d.find_element(By.CSS_SELECTOR, 'input[type="text"]').send_keys("Selenium Test Bot")
            inputs = d.find_elements(By.CSS_SELECTOR, 'input[type="password"]')
            # First password input is for token
            inputs[0].send_keys("123456:SELENIUM-TEST")
            d.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()

            time.sleep(2)
            page_source = d.page_source
            if "Selenium Test Bot" in page_source:
                log("Create bot via UI — success", "PASS")
            else:
                log("Create bot via UI", "FAIL", "Bot name not found after creation")
        except Exception as e:
            log("Create bot via UI", "FAIL", str(e))

        # --- 7. Logs page ---
        d.get(f"{BASE_URL}/logs")
        try:
            WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "h1")))
            h1 = d.find_element(By.CSS_SELECTOR, "h1").text
            log("Logs page — renders", "PASS" if "Лог" in h1 else "FAIL", h1)
        except Exception as e:
            log("Logs page", "FAIL", str(e))

        # --- 8. Settings page ---
        d.get(f"{BASE_URL}/settings")
        try:
            WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "h1")))
            h1 = d.find_element(By.CSS_SELECTOR, "h1").text
            log("Settings page — renders", "PASS" if "Настройки" in h1 else "FAIL", h1)
        except Exception as e:
            log("Settings page", "FAIL", str(e))

        # --- 9. Navbar present ---
        try:
            nav = d.find_element(By.CSS_SELECTOR, "nav").text
            log("Navbar — present", "PASS" if "Bot Manager" in nav else "FAIL")
        except Exception:
            log("Navbar", "FAIL", "not found")

        # --- 10. Logout ---
        try:
            d.find_element(By.XPATH, "//button[contains(text(), 'Выйти')]").click()
            time.sleep(1)
            if "login" in d.current_url.lower():
                log("Logout — redirects to login", "PASS")
            else:
                log("Logout", "FAIL", f"redirected to {d.current_url}")
        except Exception as e:
            log("Logout", "FAIL", str(e))

        # --- 11. Protected pages redirect without auth ---
        d2 = create_driver()
        try:
            for path in ["/dashboard", "/bots", "/logs"]:
                d2.get(f"{BASE_URL}{path}")
                time.sleep(1)
                if "login" in d2.current_url.lower():
                    log(f"Auth guard — {path} redirects", "PASS")
                else:
                    log(f"Auth guard — {path}", "FAIL", f"got {d2.current_url}")
        finally:
            d2.quit()

    finally:
        d.quit()


# ═══════════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print(f"  Bot Manager — Full Test Suite")
    print(f"  URL: {BASE_URL}")
    print("=" * 60)

    api_tests()
    ui_tests()

    total = results["passed"] + results["failed"]
    print("\n" + "=" * 60)
    print(f"  Results: {results['passed']}/{total} passed, {results['failed']} failed")
    if results["errors"]:
        print("\n  Failed tests:")
        for e in results["errors"]:
            print(f"    • {e}")
    print("=" * 60)
    sys.exit(0 if results["failed"] == 0 else 1)


if __name__ == "__main__":
    main()
