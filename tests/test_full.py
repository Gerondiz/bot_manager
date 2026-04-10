#!/usr/bin/env python3
"""
Selenium E2E тесты для bot_manager — полный функционал.
"""

import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

BASE_URL = os.getenv("TEST_URL", "http://localhost:3000")
ADMIN_LOGIN = os.getenv("ADMIN_LOGIN", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "559123")

driver = None


def create_driver():
    opts = Options()
    opts.add_argument("--headless")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    return webdriver.Firefox(options=opts)


def login(d):
    """Войти в систему."""
    d.get(f"{BASE_URL}/login")
    d.find_element(By.CSS_SELECTOR, 'input[type="text"]').send_keys(ADMIN_LOGIN)
    d.find_element(By.CSS_SELECTOR, 'input[type="password"]').send_keys(ADMIN_PASSWORD)
    d.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
    WebDriverWait(d, 10).until(EC.url_contains("/dashboard"))


def test_login():
    print("[TEST 1] Login page and authentication...")
    d = create_driver()
    try:
        d.get(f"{BASE_URL}/login")
        assert "Bot Manager" in d.find_element(By.CSS_SELECTOR, "h1").text
        print("  PASS: Login page renders")

        # Wrong password
        d.find_element(By.CSS_SELECTOR, 'input[type="text"]').send_keys(ADMIN_LOGIN)
        d.find_element(By.CSS_SELECTOR, 'input[type="password"]').send_keys("wrong")
        d.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
        time.sleep(1)
        errors = d.find_elements(By.CSS_SELECTOR, "div[class*='bg-red']")
        assert any(e.text for e in errors), "No error shown for wrong password"
        print("  PASS: Wrong password shows error")

        # Correct login
        d.get(f"{BASE_URL}/login")
        d.find_element(By.CSS_SELECTOR, 'input[type="text"]').send_keys(ADMIN_LOGIN)
        d.find_element(By.CSS_SELECTOR, 'input[type="password"]').send_keys(ADMIN_PASSWORD)
        d.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
        WebDriverWait(d, 10).until(EC.url_contains("/dashboard"))
        assert "/dashboard" in d.current_url
        print("  PASS: Successful login redirects to dashboard")
    finally:
        d.quit()


def test_navigation():
    print("[TEST 2] Navigation and pages...")
    d = create_driver()
    try:
        login(d)

        # Dashboard
        assert "Dashboard" in d.find_element(By.CSS_SELECTOR, "h1").text
        print("  PASS: Dashboard page")

        # Bots page
        d.get(f"{BASE_URL}/bots")
        WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "h1")))
        assert "Бот" in d.find_element(By.CSS_SELECTOR, "h1").text or "bot" in d.find_element(By.CSS_SELECTOR, "h1").text.lower()
        print("  PASS: Bots page")

        # Logs page
        d.get(f"{BASE_URL}/logs")
        WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "h1")))
        assert "Лог" in d.find_element(By.CSS_SELECTOR, "h1").text or "log" in d.find_element(By.CSS_SELECTOR, "h1").text.lower()
        print("  PASS: Logs page")

        # Settings page
        d.get(f"{BASE_URL}/settings")
        WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "h1")))
        assert "Настройки" in d.find_element(By.CSS_SELECTOR, "h1").text
        print("  PASS: Settings page")

        # Navbar present
        assert "Bot Manager" in d.find_element(By.CSS_SELECTOR, "nav").text
        print("  PASS: Navbar present")
    finally:
        d.quit()


def test_bot_crud():
    print("[TEST 3] Bot CRUD operations...")
    d = create_driver()
    try:
        login(d)

        # Go to new bot page
        d.get(f"{BASE_URL}/bots/new")
        WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="text"]')))

        d.find_element(By.CSS_SELECTOR, 'input[type="text"]').send_keys("Test Bot E2E")
        d.find_element(By.CSS_SELECTOR, 'input[type="password"]').send_keys("123456:ABC-DEF-TEST")
        d.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()

        # Wait for redirect to /bots
        WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "h1")))
        time.sleep(1)
        assert "Test Bot E2E" in d.page_source
        print("  PASS: Bot created and listed")

        # Edit bot - go to /bots/{id}
        d.find_element(By.LINK_TEXT, "Настроить").click()
        WebDriverWait(d, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="text"]')))
        time.sleep(0.5)

        name_input = d.find_element(By.CSS_SELECTOR, 'input[type="text"]')
        name_input.clear()
        name_input.send_keys("Test Bot E2E Updated")
        d.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
        time.sleep(1)

        assert "Test Bot E2E Updated" in d.page_source
        print("  PASS: Bot updated")

        # Toggle bot
        d.find_element(By.LINK_TEXT, "Отключить").click()
        time.sleep(1)
        assert "Включить" in d.page_source
        print("  PASS: Bot toggled")

        # Delete bot
        d.find_element(By.LINK_TEXT, "Удалить").click()
        WebDriverWait(d, 10).until(EC.alert_is_present())
        d.switch_to.alert.accept()
        time.sleep(1)
        assert "Test Bot E2E Updated" not in d.page_source
        print("  PASS: Bot deleted")
    finally:
        d.quit()


def test_api_endpoints():
    print("[TEST 4] API endpoints (via curl)...")
    import subprocess

    # Login to get cookies
    d = create_driver()
    try:
        login(d)
        cookies = d.get_cookies()
        cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
    finally:
        d.quit()

    headers = {"Cookie": cookie_str}

    # GET /api/bots
    result = subprocess.run(
        ["curl", "-s", f"{BASE_URL}/api/bots", "-H", f"Cookie: {cookie_str}"],
        capture_output=True, text=True
    )
    assert '"bots"' in result.stdout
    print("  PASS: GET /api/bots")

    # POST /api/bots
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", f"{BASE_URL}/api/bots",
         "-H", "Content-Type: application/json",
         "-H", f"Cookie: {cookie_str}",
         "-d", '{"name":"API Test Bot","type":"TELEGRAM","token":"test:token"}'],
        capture_output=True, text=True
    )
    assert '"bot"' in result.stdout
    import json
    bot_data = json.loads(result.stdout)
    bot_id = bot_data["bot"]["id"]
    print("  PASS: POST /api/bots")

    # GET /api/bots/:id
    result = subprocess.run(
        ["curl", "-s", f"{BASE_URL}/api/bots/{bot_id}", "-H", f"Cookie: {cookie_str}"],
        capture_output=True, text=True
    )
    assert '"bot"' in result.stdout
    print("  PASS: GET /api/bots/:id")

    # PATCH /api/bots/:id
    result = subprocess.run(
        ["curl", "-s", "-X", "PATCH", f"{BASE_URL}/api/bots/{bot_id}",
         "-H", "Content-Type: application/json",
         "-H", f"Cookie: {cookie_str}",
         "-d", '{"name":"API Test Bot Updated"}'],
        capture_output=True, text=True
    )
    assert '"API Test Bot Updated"' in result.stdout
    print("  PASS: PATCH /api/bots/:id")

    # POST /api/bots/:id/toggle
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", f"{BASE_URL}/api/bots/{bot_id}/toggle",
         "-H", f"Cookie: {cookie_str}"],
        capture_output=True, text=True
    )
    assert '"bot"' in result.stdout
    print("  PASS: POST /api/bots/:id/toggle")

    # DELETE /api/bots/:id
    result = subprocess.run(
        ["curl", "-s", "-X", "DELETE", f"{BASE_URL}/api/bots/{bot_id}",
         "-H", f"Cookie: {cookie_str}"],
        capture_output=True, text=True
    )
    assert '"success"' in result.stdout or 'true' in result.stdout
    print("  PASS: DELETE /api/bots/:id")


def test_unauthorized_access():
    print("[TEST 5] Unauthorized access protection...")
    d = create_driver()
    try:
        # Try to access protected pages without login
        for path in ["/dashboard", "/bots", "/logs", "/settings"]:
            d.get(f"{BASE_URL}{path}")
            time.sleep(1)
            assert "/login" in d.current_url or "login" in d.current_url.lower(), \
                f"Got access to {path} without auth"
        print("  PASS: All protected pages redirect to login")
    finally:
        d.quit()


def main():
    print("=" * 60)
    print(f"  Bot Manager — Full E2E Tests")
    print(f"  URL: {BASE_URL}")
    print("=" * 60)
    print()

    tests = [
        test_login,
        test_navigation,
        test_bot_crud,
        test_api_endpoints,
        test_unauthorized_access,
    ]

    passed = failed = 0
    for test_fn in tests:
        try:
            test_fn()
            passed += 1
        except AssertionError as e:
            print(f"  FAIL: {e}")
            failed += 1
        except WebDriverException as e:
            print(f"  ERROR: {e}")
            failed += 1
        except Exception as e:
            print(f"  ERROR: {type(e).__name__}: {e}")
            failed += 1
        print()

    print("=" * 60)
    print(f"  Results: {passed}/{passed + failed} passed")
    print("=" * 60)
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
