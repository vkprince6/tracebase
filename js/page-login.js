/**
 * TRACEBASE — Login page controller
 */
import { login, resetPassword, onAuthChange } from "./auth.js";
import { validateForm, required, email as emailRule } from "./validation.js";

// Restore theme preference even on the login screen.
const savedTheme = localStorage.getItem("tracebase-theme");
if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

// If already authenticated, skip straight to the dashboard.
onAuthChange((session) => {
  if (session && session.profile) window.location.href = "dashboard.html";
});

const form = document.getElementById("login-form");
const alertBox = document.getElementById("login-alert");
const submitBtn = document.getElementById("login-submit-btn");

function showAlert(message, type = "error") {
  alertBox.textContent = message;
  alertBox.className = `auth-alert show ${type}`;
}
function hideAlert() { alertBox.className = "auth-alert"; }

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const emailValue = document.getElementById("login-email").value.trim();
  const passwordValue = document.getElementById("login-password").value;
  const rememberMe = document.getElementById("remember-me").checked;

  const { valid, errors } = validateForm(
    { email: emailValue, password: passwordValue },
    { email: [required("Email is required."), emailRule()], password: [required("Password is required.")] }
  );
  document.getElementById("fg-email").classList.toggle("invalid", !!errors.email);
  document.getElementById("fg-password").classList.toggle("invalid", !!errors.password);
  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in…";

  const result = await login(emailValue, passwordValue, rememberMe);
  if (!result.success) {
    showAlert(result.message, "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Log In";
    return;
  }
  window.location.href = "dashboard.html";
});

document.getElementById("forgot-password-link").addEventListener("click", async (e) => {
  e.preventDefault();
  const emailValue = document.getElementById("login-email").value.trim();
  if (!emailValue) {
    showAlert("Enter your email above first, then click 'Forgot password?' again.", "error");
    document.getElementById("login-email").focus();
    return;
  }
  const result = await resetPassword(emailValue);
  showAlert(result.message, result.success ? "success" : "error");
});
