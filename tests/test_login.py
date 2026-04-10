#!/usr/bin/env python3
"""
Selenium тест для проверки аутентификации в bot_manager.
Запуск: python3 tests/test_login.py
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
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


def create_driver():
    """Создаёт headless Firefox драйвер."""
    opts = Options()
    opts.add_argument("--headless")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    return webdriver.Firefox(options=opts)


def test_login_page_loads(driver):
    """Тест 1: страница логина загружается."""
    print("[TEST 1] Loading login page...")
    driver.get(f"{BASE_URL}/login")
    h1 = driver.find_element(By.CSS_SELECTOR, "h1")
    assert "Bot Manager" in h1.text, f"Expected 'Bot Manager', got '{h1.text}'"
    print("  PASS: Login page loaded")


def test_login_fields_exist(driver):
    """Тест 2: поля логина/пароля и кнопка существуют."""
    print("[TEST 2] Checking form elements...")
    driver.find_element(By.CSS_SELECTOR, 'input[type="text"]')
    driver.find_element(By.CSS_SELECTOR, 'input[type="password"]')
    driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
    print("  PASS: Form elements exist")


def test_successful_login(driver):
    """Тест 3: успешный вход и редирект на dashboard."""
    print(f"[TEST 3] Login with {ADMIN_LOGIN}/*** ...")

    login_input = driver.find_element(By.CSS_SELECTOR, 'input[type="text"]')
    pass_input = driver.find_element(By.CSS_SELECTOR, 'input[type="password"]')
    submit_btn = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')

    login_input.clear()
    login_input.send_keys(ADMIN_LOGIN)
    pass_input.clear()
    pass_input.send_keys(ADMIN_PASSWORD)
    submit_btn.click()

    # Ждём редирект на /dashboard
    try:
        WebDriverWait(driver, 10).until(EC.url_contains("/dashboard"))
        current_url = driver.current_url
        if "/dashboard" in current_url:
            print(f"  PASS: Redirected to {current_url}")
        else:
            print(f"  FAIL: Redirected to {current_url} instead of /dashboard")
    except TimeoutException:
        print(f"  FAIL: No redirect after 10s. Current URL: {driver.current_url}")
        # Проверяем нет ли сообщения об ошибке
        error_divs = driver.find_elements(By.CSS_SELECTOR, "[class*='red']")
        for div in error_divs:
            if div.text:
                print(f"  Error message: {div.text}")


def test_failed_login(driver):
    """Тест 4: неудачный вход показывает ошибку."""
    print("[TEST 4] Login with wrong password...")
    driver.get(f"{BASE_URL}/login")

    login_input = driver.find_element(By.CSS_SELECTOR, 'input[type="text"]')
    pass_input = driver.find_element(By.CSS_SELECTOR, 'input[type="password"]')
    submit_btn = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')

    login_input.clear()
    login_input.send_keys(ADMIN_LOGIN)
    pass_input.clear()
    pass_input.send_keys("wrong_password_12345")
    submit_btn.click()

    time.sleep(2)

    # Проверяем что остались на /login и есть ошибка
    if "login" in driver.current_url:
        error_divs = driver.find_elements(By.CSS_SELECTOR, "div[class*='bg-red']")
        if error_divs and any(d.text for d in error_divs):
            print(f"  PASS: Error shown: {error_divs[0].text}")
        else:
            print("  FAIL: No error message shown")
    else:
        print(f"  FAIL: Redirected to {driver.current_url} (should stay on /login)")


def test_dashboard_requires_auth(driver):
    """Тест 5: /dashboard без авторизации редиректит на /login."""
    print("[TEST 5] Accessing /dashboard without auth...")

    # Новый драйвер = нет кук
    d2 = create_driver()
    d2.get(f"{BASE_URL}/dashboard")
    time.sleep(2)

    if "login" in d2.current_url:
        print(f"  PASS: Redirected to login ({d2.current_url})")
    else:
        print(f"  FAIL: Got access to {d2.current_url} without auth")
    d2.quit()


def main():
    print("=" * 60)
    print(f"  Bot Manager — Login Tests")
    print(f"  URL: {BASE_URL}")
    print("=" * 60)

    passed = failed = 0
    driver = None

    try:
        driver = create_driver()
        print(f"Browser: {driver.capabilities['browserName']} {driver.capabilities['browserVersion']}")
        print()

        tests = [
            test_login_page_loads,
            test_login_fields_exist,
            test_successful_login,
            test_failed_login,
            test_dashboard_requires_auth,
        ]

        for test_fn in tests:
            try:
                test_fn(driver)
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

    finally:
        if driver:
            driver.quit()

    print("=" * 60)
    print(f"  Results: {passed} passed, {failed} failed")
    print("=" * 60)
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
